"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  parseAccountDataExportJson,
  type AccountImportSummary,
} from "@/lib/accountImport";
import { buildAccountRestorePlan } from "@/lib/accountRestore";
import {
  deleteAccountWallet,
  writeAccountRestorePlan,
  type WalletCounts,
} from "@/lib/accountWrite";
import { matchesResetConfirmation } from "@/lib/accountReset";

// Importação de um backup da conta. Três intents com a MESMA validação de arquivo:
//   • conferência (dry-run): lê e valida, NÃO grava nada;
//   • restauração: grava o backup no banco, mas SÓ numa conta VAZIA — recusa se
//     já houver dados, para nunca sobrescrever/duplicar a carteira. Restaurar
//     numa conta vazia dispensa estratégia de conflito de ids (tudo nasce novo);
//   • substituição: para quem JÁ tem dados — apaga a carteira e restaura o backup
//     na MESMA transação (estratégia de conflito "substituir tudo", sem merge).
//     É destrutiva e irreversível, então exige a frase de confirmação forte (a
//     mesma do reset em `/conta/dados/apagar`).
// Ver DECISIONS.md.

/** Teto de tamanho do arquivo aceito (evita ler uploads enormes). */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024; // 8 MB

export interface ImportState {
  /** Erros bloqueantes (arquivo inválido, conta não-vazia na restauração). */
  errors?: string[];
  /** Preenchido na conferência bem-sucedida. */
  summary?: AccountImportSummary;
  warnings?: string[];
  /** Preenchido na restauração/substituição bem-sucedida — o que foi gravado. */
  restored?: WalletCounts;
  /**
   * Preenchido só na SUBSTITUIÇÃO — o que foi apagado antes de restaurar. Sua
   * presença distingue a substituição da restauração numa conta vazia.
   */
  deletedBeforeRestore?: WalletCounts;
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

/** Conta as quatro entidades da carteira do usuário. */
async function countWallet(userId: string): Promise<WalletCounts> {
  const [shows, transactions, contacts, revenueGoals] = await Promise.all([
    prisma.show.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.revenueGoal.count({ where: { userId } }),
  ]);
  return { shows, transactions, contacts, revenueGoals };
}

const walletTotal = (c: WalletCounts): number =>
  c.shows + c.transactions + c.contacts + c.revenueGoals;

/**
 * Ação única do formulário de importação. O botão apertado define
 * `intent` ("conferir" | "restaurar" | "substituir"); todos revalidam o mesmo
 * arquivo, então conferir antes de gravar é opcional (a gravação revalida por
 * conta própria). `restaurar` só numa conta vazia; `substituir` apaga a carteira
 * e restaura na mesma transação (exige a frase de confirmação forte).
 */
export async function importAccountAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  // Gate de sessão: importar/conferir exige estar logado (mesma proteção do export).
  const user = await requireUser();

  const rawIntent = formData.get("intent");
  const intent =
    rawIntent === "restaurar" || rawIntent === "substituir"
      ? rawIntent
      : "conferir";

  const fileRead = await readBackupFile(formData);
  if (!fileRead.ok) return { errors: fileRead.errors };

  const parsed = parseAccountDataExportJson(fileRead.text);
  if (!parsed.ok) return { errors: parsed.errors };

  // ── Conferência (dry-run): nada é gravado ────────────────────────────────────
  if (intent === "conferir") {
    return { summary: parsed.summary, warnings: parsed.warnings };
  }

  // Checagem de emptiness feita AQUI (não só na UI) para fechar a janela TOCTOU.
  const existingCounts = await countWallet(user.id);
  const existing = walletTotal(existingCounts);

  if (intent === "restaurar" && existing > 0) {
    // Restauração simples só numa conta VAZIA (para nunca sobrescrever/duplicar).
    // Com dados, o caminho é a substituição (que apaga antes) — guardada por frase.
    return {
      errors: [
        "Sua conta já tem dados — a restauração simples só é permitida numa conta " +
          "vazia, para nunca sobrescrever ou duplicar sua carteira. Você tem " +
          `${existingCounts.shows} show(s), ${existingCounts.transactions} transação(ões), ` +
          `${existingCounts.contacts} contato(s) e ${existingCounts.revenueGoals} meta(s). ` +
          "Use “Substituir tudo pelo backup” para apagar a carteira atual e restaurar, " +
          "ou restaure numa conta nova.",
      ],
    };
  }

  if (intent === "substituir" && !matchesResetConfirmation(formData.get("confirmacao"))) {
    // A substituição APAGA a carteira antes de restaurar — mesma fricção do reset.
    return {
      errors: [
        "Para substituir tudo pelo backup (isto apaga sua carteira atual antes de " +
          "restaurar), digite a frase de confirmação exatamente como pedida.",
      ],
    };
  }

  const planResult = buildAccountRestorePlan(parsed.data);
  if (!planResult.ok) return { errors: planResult.errors };
  const plan = planResult.plan;

  // Escreve tudo atomicamente: um backup não pode ser restaurado pela metade — e
  // na substituição, apagar + restaurar acontecem na MESMA transação (nunca uma
  // conta meio-apagada se a restauração falhar).
  const deletedBeforeRestore = await prisma.$transaction(
    async (tx) => {
      const deleted =
        intent === "substituir"
          ? await deleteAccountWallet(tx, user.id)
          : null;
      await writeAccountRestorePlan(tx, user.id, plan);
      return deleted;
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
    "/conta/dados/importar",
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
    ...(deletedBeforeRestore ? { deletedBeforeRestore } : {}),
    restoreNotes: plan.notes,
  };
}
