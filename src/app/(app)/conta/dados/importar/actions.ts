"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  parseAccountDataExportJson,
  type AccountImportSummary,
} from "@/lib/accountImport";
import { buildAccountRestorePlan } from "@/lib/accountRestore";

// Importação de um backup da conta. Dois passos com a MESMA validação de arquivo:
//   • conferência (dry-run): lê e valida, NÃO grava nada;
//   • restauração: grava o backup no banco, mas SÓ numa conta VAZIA — recusa se
//     já houver dados, para nunca sobrescrever/duplicar a carteira. Restaurar
//     numa conta vazia dispensa estratégia de conflito de ids (tudo nasce novo).
// Ver DECISIONS.md.

/** Teto de tamanho do arquivo aceito (evita ler uploads enormes). */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024; // 8 MB

export interface ImportState {
  /** Erros bloqueantes (arquivo inválido, conta não-vazia na restauração). */
  errors?: string[];
  /** Preenchido na conferência bem-sucedida. */
  summary?: AccountImportSummary;
  warnings?: string[];
  /** Preenchido na restauração bem-sucedida — o que foi gravado. */
  restored?: {
    shows: number;
    transactions: number;
    contacts: number;
    revenueGoals: number;
  };
  /** Ajustes aplicados durante a restauração (dedup, órfãos, coerções). */
  restoreNotes?: string[];
}

/** Lê e valida o arquivo enviado; comum aos dois passos. */
async function readBackupFile(
  formData: FormData,
): Promise<
  | { ok: true; text: string }
  | { ok: false; errors: string[] }
> {
  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: ["Selecione um arquivo .json de backup."] };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, errors: ["Arquivo muito grande (máximo 8 MB)."] };
  }
  return { ok: true, text: await file.text() };
}

/**
 * Ação única do formulário de importação. O botão apertado define
 * `intent` ("conferir" | "restaurar"); ambos revalidam o mesmo arquivo, então
 * conferir antes de restaurar é opcional (a restauração revalida por conta própria).
 */
export async function importAccountAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  // Gate de sessão: importar/conferir exige estar logado (mesma proteção do export).
  const user = await requireUser();

  const intent = formData.get("intent") === "restaurar" ? "restaurar" : "conferir";

  const fileRead = await readBackupFile(formData);
  if (!fileRead.ok) return { errors: fileRead.errors };

  const parsed = parseAccountDataExportJson(fileRead.text);
  if (!parsed.ok) return { errors: parsed.errors };

  // ── Conferência (dry-run): nada é gravado ────────────────────────────────────
  if (intent === "conferir") {
    return { summary: parsed.summary, warnings: parsed.warnings };
  }

  // ── Restauração: só numa conta VAZIA ─────────────────────────────────────────
  // Checagem de emptiness feita AQUI (não só na UI) para fechar a janela TOCTOU.
  const [shows, transactions, contacts, revenueGoals] = await Promise.all([
    prisma.show.count({ where: { userId: user.id } }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.contact.count({ where: { userId: user.id } }),
    prisma.revenueGoal.count({ where: { userId: user.id } }),
  ]);
  const existing = shows + transactions + contacts + revenueGoals;
  if (existing > 0) {
    return {
      errors: [
        "Sua conta já tem dados — a restauração só é permitida numa conta vazia, " +
          "para nunca sobrescrever ou duplicar sua carteira. Você tem " +
          `${shows} show(s), ${transactions} transação(ões), ${contacts} contato(s) e ` +
          `${revenueGoals} meta(s). Apague-os antes de restaurar, ou restaure numa conta nova.`,
      ],
    };
  }

  const planResult = buildAccountRestorePlan(parsed.data);
  if (!planResult.ok) return { errors: planResult.errors };
  const plan = planResult.plan;

  // Escreve tudo atomicamente: um backup não pode ser restaurado pela metade.
  await prisma.$transaction(
    async (tx) => {
      // Perfil: só campos de dados (nome artístico, alíquota). Nome/e-mail/senha
      // são a identidade da conta logada e NÃO vêm do backup.
      await tx.user.update({
        where: { id: user.id },
        data: {
          artistName: plan.profile.artistName,
          taxRatePercent: plan.profile.taxRatePercent,
        },
      });

      // Contatos primeiro — os shows dependem deles (vínculo N:N).
      const contactIdByKey = new Map<string, string>();
      for (const c of plan.contacts) {
        const created = await tx.contact.create({
          data: {
            userId: user.id,
            name: c.name,
            role: c.role,
            email: c.email,
            phone: c.phone,
            notes: c.notes,
          },
        });
        contactIdByKey.set(c.key, created.id);
      }

      // Shows — com os vínculos de contato já remapeados e o evento de criação
      // na linha do tempo do funil (from null → status inicial, como no cadastro
      // normal; o backup não guarda o histórico de transições). Ver D234.
      const showIdByKey = new Map<string, string>();
      for (const s of plan.shows) {
        const created = await tx.show.create({
          data: {
            userId: user.id,
            title: s.title,
            date: new Date(s.date),
            venue: s.venue,
            city: s.city,
            status: s.status,
            fee: s.fee,
            notes: s.notes,
            paymentPromisedAt: s.paymentPromisedAt
              ? new Date(s.paymentPromisedAt)
              : null,
            contacts: s.contactKeys.length
              ? {
                  create: s.contactKeys.map((k) => ({
                    contactId: contactIdByKey.get(k) as string,
                  })),
                }
              : undefined,
            statusEvents: {
              create: { userId: user.id, fromStatus: null, toStatus: s.status },
            },
          },
        });
        showIdByKey.set(s.key, created.id);
      }

      // Transações — com o showId remapeado (órfão já virou null no plano).
      for (const t of plan.transactions) {
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: t.type,
            description: t.description,
            category: t.category,
            amount: t.amount,
            date: new Date(t.date),
            received: t.received,
            showId: t.showKey ? (showIdByKey.get(t.showKey) as string) : null,
          },
        });
      }

      // Metas de faturamento (ano único por conta já garantido no plano).
      for (const g of plan.revenueGoals) {
        await tx.revenueGoal.create({
          data: { userId: user.id, year: g.year, amount: g.amount },
        });
      }
    },
    // Um backup grande (até o teto de 8 MB) pode ter muitos registros; folga no
    // tempo da transação interativa para não estourar o default de 5 s.
    { timeout: 30_000 },
  );

  // A restauração mexe em toda a carteira — revalida as áreas afetadas.
  for (const path of [
    "/dashboard",
    "/shows",
    "/financas",
    "/contatos",
    "/conta",
  ]) {
    revalidatePath(path);
  }

  return {
    restored: {
      shows: plan.shows.length,
      transactions: plan.transactions.length,
      contacts: plan.contacts.length,
      revenueGoals: plan.revenueGoals.length,
    },
    restoreNotes: plan.notes,
  };
}
