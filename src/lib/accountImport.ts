// Leitura + validação de um arquivo de backup da conta (o JSON produzido por
// `@/lib/accountExport`). É a metade SEGURA da importação/restauração: aqui só
// PARSEAMOS e VALIDAMOS o arquivo enviado — sem escrever nada no banco —, para
// que o músico confira se o backup está íntegro e é restaurável em princípio
// antes de qualquer gravação. Ver DECISIONS.md.
//
// Camada PURA: recebe o conteúdo já lido do arquivo (texto ou valor `unknown`
// já parseado) e devolve ou um snapshot validado + resumo, ou a lista de erros.
// Nenhum acesso a Prisma, `new Date()` ou I/O — determinística e testável.

import type { AccountDataExport } from "./accountExport";
import { ACCOUNT_EXPORT_APP, ACCOUNT_EXPORT_SCHEMA_VERSION } from "./accountExport";

/** Versões do formato que esta leitura sabe interpretar. */
export const SUPPORTED_ACCOUNT_IMPORT_SCHEMA_VERSIONS: readonly number[] = [
  ACCOUNT_EXPORT_SCHEMA_VERSION,
];

/** Resumo legível do que o arquivo contém (para exibir na tela de conferência). */
export interface AccountImportSummary {
  app: string;
  schemaVersion: number;
  exportedAt: string | null;
  counts: {
    shows: number;
    transactions: number;
    contacts: number;
    revenueGoals: number;
  };
}

export type AccountImportResult =
  | {
      ok: true;
      /** Snapshot validado, no mesmo formato do export. */
      data: AccountDataExport;
      summary: AccountImportSummary;
      /**
       * Avisos NÃO bloqueantes (o arquivo é válido, mas há detalhes a notar —
       * ex.: referência a um contato/show ausente, contagem do cabeçalho que
       * não bate, ids duplicados).
       */
      warnings: string[];
    }
  | { ok: false; errors: string[] };

// ── helpers de validação (defensivos: a entrada é NÃO CONFIÁVEL) ─────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Uma string presente e não vazia. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Uma string opcional (aceita `null`/ausente; nunca outro tipo). */
function isNullableString(value: unknown): value is string | null {
  return value == null || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

// Normalizadores: chamados só DEPOIS que o campo foi validado, para produzir o
// formato exato de `AccountDataExport` (opcionais ausentes → `null`).
function str(value: unknown): string {
  return value as string;
}
function nullableStr(value: unknown): string | null {
  return value == null ? null : (value as string);
}

/**
 * Valida um valor JÁ PARSEADO (`unknown`) contra o formato do backup. Não lança:
 * devolve `{ ok:false, errors }` para qualquer inconsistência estrutural. Erros
 * BLOQUEIAM (o arquivo não é restaurável); avisos apenas sinalizam.
 */
export function parseAccountDataExport(raw: unknown): AccountImportResult {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return { ok: false, errors: ["O arquivo não é um objeto JSON válido."] };
  }

  // ── meta ──────────────────────────────────────────────────────────────────
  const meta = raw.meta;
  if (!isRecord(meta)) {
    return {
      ok: false,
      errors: ['O arquivo não tem o cabeçalho "meta" esperado de um backup do Palco.'],
    };
  }
  if (meta.app !== ACCOUNT_EXPORT_APP) {
    errors.push(
      `Este arquivo não parece um backup do ${ACCOUNT_EXPORT_APP} (app: ${
        typeof meta.app === "string" ? `"${meta.app}"` : "ausente"
      }).`,
    );
  }
  const schemaVersion = meta.schemaVersion;
  if (!isInteger(schemaVersion)) {
    errors.push("A versão do formato (schemaVersion) está ausente ou inválida.");
  } else if (!SUPPORTED_ACCOUNT_IMPORT_SCHEMA_VERSIONS.includes(schemaVersion)) {
    errors.push(
      `Versão do formato não suportada: ${schemaVersion} (suportadas: ${SUPPORTED_ACCOUNT_IMPORT_SCHEMA_VERSIONS.join(
        ", ",
      )}).`,
    );
  }

  // ── conjuntos ───────────────────────────────────────────────────────────────
  const requireArray = (value: unknown, label: string): unknown[] => {
    if (!Array.isArray(value)) {
      errors.push(`A lista "${label}" está ausente ou não é uma lista.`);
      return [];
    }
    return value;
  };

  if (!isRecord(raw.profile)) {
    errors.push('O bloco "profile" está ausente ou inválido.');
  }

  const rawShows = requireArray(raw.shows, "shows");
  const rawTransactions = requireArray(raw.transactions, "transactions");
  const rawContacts = requireArray(raw.contacts, "contacts");
  const rawGoals = requireArray(raw.revenueGoals, "revenueGoals");

  // Se a estrutura de topo já falhou, não vale detalhar cada registro.
  if (errors.length > 0) return { ok: false, errors };

  const profile = raw.profile as Record<string, unknown>;
  if (!isNonEmptyString(profile.name)) errors.push('profile.name é obrigatório.');
  if (!isNonEmptyString(profile.email)) errors.push('profile.email é obrigatório.');
  if (!isNullableString(profile.artistName)) errors.push("profile.artistName inválido.");
  if (profile.taxRatePercent != null && !isFiniteNumber(profile.taxRatePercent)) {
    errors.push("profile.taxRatePercent inválido.");
  }

  // ── validação registro a registro ───────────────────────────────────────────
  const shows: AccountDataExport["shows"] = [];
  rawShows.forEach((item, i) => {
    if (!isRecord(item)) {
      errors.push(`shows[${i}] não é um objeto.`);
      return;
    }
    if (!isNonEmptyString(item.id)) errors.push(`shows[${i}].id é obrigatório.`);
    if (typeof item.title !== "string") errors.push(`shows[${i}].title inválido.`);
    if (!isNonEmptyString(item.date)) errors.push(`shows[${i}].date é obrigatório.`);
    if (!isNonEmptyString(item.status)) errors.push(`shows[${i}].status é obrigatório.`);
    if (!isFiniteNumber(item.fee)) errors.push(`shows[${i}].fee inválido.`);
    if (!isNullableString(item.venue)) errors.push(`shows[${i}].venue inválido.`);
    if (!isNullableString(item.city)) errors.push(`shows[${i}].city inválido.`);
    if (!isNullableString(item.notes)) errors.push(`shows[${i}].notes inválido.`);
    if (!isNullableString(item.paymentPromisedAt))
      errors.push(`shows[${i}].paymentPromisedAt inválido.`);
    const contactIds = item.contactIds;
    if (contactIds != null && !Array.isArray(contactIds)) {
      errors.push(`shows[${i}].contactIds inválido.`);
    } else if (Array.isArray(contactIds) && !contactIds.every((c) => isNonEmptyString(c))) {
      errors.push(`shows[${i}].contactIds tem entrada não textual.`);
    }
    shows.push({
      id: str(item.id),
      title: typeof item.title === "string" ? item.title : "",
      date: str(item.date),
      venue: nullableStr(item.venue),
      city: nullableStr(item.city),
      status: str(item.status),
      fee: isFiniteNumber(item.fee) ? item.fee : 0,
      notes: nullableStr(item.notes),
      paymentPromisedAt: nullableStr(item.paymentPromisedAt),
      contactIds: Array.isArray(contactIds) ? (contactIds as string[]) : [],
    });
  });

  const transactions: AccountDataExport["transactions"] = [];
  rawTransactions.forEach((item, i) => {
    if (!isRecord(item)) {
      errors.push(`transactions[${i}] não é um objeto.`);
      return;
    }
    if (!isNonEmptyString(item.id)) errors.push(`transactions[${i}].id é obrigatório.`);
    if (!isNonEmptyString(item.type)) errors.push(`transactions[${i}].type é obrigatório.`);
    if (typeof item.description !== "string")
      errors.push(`transactions[${i}].description inválido.`);
    if (typeof item.category !== "string") errors.push(`transactions[${i}].category inválido.`);
    if (!isFiniteNumber(item.amount)) errors.push(`transactions[${i}].amount inválido.`);
    if (!isNonEmptyString(item.date)) errors.push(`transactions[${i}].date é obrigatório.`);
    if (typeof item.received !== "boolean")
      errors.push(`transactions[${i}].received inválido.`);
    if (!isNullableString(item.showId)) errors.push(`transactions[${i}].showId inválido.`);
    transactions.push({
      id: str(item.id),
      type: str(item.type),
      description: typeof item.description === "string" ? item.description : "",
      category: typeof item.category === "string" ? item.category : "",
      amount: isFiniteNumber(item.amount) ? item.amount : 0,
      date: str(item.date),
      received: item.received === true,
      showId: nullableStr(item.showId),
    });
  });

  const contacts: AccountDataExport["contacts"] = [];
  rawContacts.forEach((item, i) => {
    if (!isRecord(item)) {
      errors.push(`contacts[${i}] não é um objeto.`);
      return;
    }
    if (!isNonEmptyString(item.id)) errors.push(`contacts[${i}].id é obrigatório.`);
    if (typeof item.name !== "string") errors.push(`contacts[${i}].name inválido.`);
    if (typeof item.role !== "string") errors.push(`contacts[${i}].role inválido.`);
    if (!isNullableString(item.email)) errors.push(`contacts[${i}].email inválido.`);
    if (!isNullableString(item.phone)) errors.push(`contacts[${i}].phone inválido.`);
    if (!isNullableString(item.notes)) errors.push(`contacts[${i}].notes inválido.`);
    contacts.push({
      id: str(item.id),
      name: typeof item.name === "string" ? item.name : "",
      role: typeof item.role === "string" ? item.role : "",
      email: nullableStr(item.email),
      phone: nullableStr(item.phone),
      notes: nullableStr(item.notes),
    });
  });

  const revenueGoals: AccountDataExport["revenueGoals"] = [];
  rawGoals.forEach((item, i) => {
    if (!isRecord(item)) {
      errors.push(`revenueGoals[${i}] não é um objeto.`);
      return;
    }
    if (!isInteger(item.year)) errors.push(`revenueGoals[${i}].year inválido.`);
    if (!isFiniteNumber(item.amount)) errors.push(`revenueGoals[${i}].amount inválido.`);
    revenueGoals.push({
      year: isInteger(item.year) ? item.year : 0,
      amount: isFiniteNumber(item.amount) ? item.amount : 0,
    });
  });

  if (errors.length > 0) return { ok: false, errors };

  // ── avisos NÃO bloqueantes (integridade referencial e consistência) ──────────
  const warnings: string[] = [];

  const contactIdSet = new Set(contacts.map((c) => c.id));
  const showIdSet = new Set(shows.map((s) => s.id));

  const orphanContactRefs = new Set<string>();
  for (const show of shows) {
    for (const cid of show.contactIds) {
      if (!contactIdSet.has(cid)) orphanContactRefs.add(cid);
    }
  }
  if (orphanContactRefs.size > 0) {
    warnings.push(
      `${orphanContactRefs.size} vínculo(s) de contato em shows apontam para contatos que não estão no arquivo.`,
    );
  }

  const orphanShowRefs = new Set<string>();
  for (const t of transactions) {
    if (t.showId != null && !showIdSet.has(t.showId)) orphanShowRefs.add(t.showId);
  }
  if (orphanShowRefs.size > 0) {
    warnings.push(
      `${orphanShowRefs.size} transação(ões) referenciam shows que não estão no arquivo.`,
    );
  }

  const dupWarn = (ids: string[], label: string) => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) dups.add(id);
      seen.add(id);
    }
    if (dups.size > 0) warnings.push(`${dups.size} id(s) duplicado(s) em ${label}.`);
  };
  dupWarn(shows.map((s) => s.id), "shows");
  dupWarn(transactions.map((t) => t.id), "transactions");
  dupWarn(contacts.map((c) => c.id), "contacts");

  const dupGoalYears = new Set<number>();
  const seenYears = new Set<number>();
  for (const g of revenueGoals) {
    if (seenYears.has(g.year)) dupGoalYears.add(g.year);
    seenYears.add(g.year);
  }
  if (dupGoalYears.size > 0) {
    warnings.push(`${dupGoalYears.size} ano(s) de meta duplicado(s) em revenueGoals.`);
  }

  // Contagem declarada no cabeçalho × contagem real (só avisa; não bloqueia).
  const declared = isRecord(meta.counts) ? meta.counts : null;
  if (declared) {
    const check = (key: keyof AccountImportSummary["counts"], actual: number) => {
      const d = declared[key];
      if (isInteger(d) && d !== actual) {
        warnings.push(
          `meta.counts.${key} (${d}) não bate com a quantidade encontrada (${actual}).`,
        );
      }
    };
    check("shows", shows.length);
    check("transactions", transactions.length);
    check("contacts", contacts.length);
    check("revenueGoals", revenueGoals.length);
  }

  const data: AccountDataExport = {
    meta: {
      app: str(meta.app),
      schemaVersion: schemaVersion as number,
      exportedAt: isNonEmptyString(meta.exportedAt) ? meta.exportedAt : "",
      counts: {
        shows: shows.length,
        transactions: transactions.length,
        contacts: contacts.length,
        revenueGoals: revenueGoals.length,
      },
    },
    profile: {
      name: str(profile.name),
      email: str(profile.email),
      artistName: nullableStr(profile.artistName),
      taxRatePercent:
        profile.taxRatePercent == null ? null : (profile.taxRatePercent as number),
    },
    shows,
    transactions,
    contacts,
    revenueGoals,
  };

  const summary: AccountImportSummary = {
    app: data.meta.app,
    schemaVersion: data.meta.schemaVersion,
    exportedAt: isNonEmptyString(meta.exportedAt) ? meta.exportedAt : null,
    counts: { ...data.meta.counts },
  };

  return { ok: true, data, summary, warnings };
}

/**
 * Conveniência: lê o TEXTO do arquivo (JSON), tratando erro de sintaxe como um
 * erro de validação amigável, e delega a `parseAccountDataExport`.
 */
export function parseAccountDataExportJson(text: string): AccountImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: ["O arquivo não é um JSON válido (não foi possível interpretá-lo)."],
    };
  }
  return parseAccountDataExport(parsed);
}
