// Plano de restauração de um backup da conta (o JSON produzido por
// `@/lib/accountExport`, já validado por `@/lib/accountImport`).
//
// Esta é a metade PURA da restauração: dado um snapshot VÁLIDO, monta o plano de
// escrita — os registros a criar, com o remapeamento de ids do arquivo para
// chaves estáveis (`key`) que a camada de ação (Prisma) resolve em ids novos ao
// gravar. A restauração de fato SÓ é permitida numa conta VAZIA (a ação recusa
// se já houver dados), então aqui não há estratégia de conflito novo×sobrescrever:
// tudo nasce do zero, com ids gerados pelo banco. Isto isola o risco da escrita
// (a metade insegura) da montagem determinística do plano (testável, sem I/O).
//
// Ver DECISIONS.md.

import type { AccountDataExport } from "./accountExport";
import {
  SHOW_STATUSES,
  TRANSACTION_TYPES,
  CONTACT_ROLES,
  type ShowStatus,
  type TransactionType,
  type ContactRole,
} from "./domain";

// ── Plano (registros normalizados a criar) ───────────────────────────────────

export interface AccountRestorePlanContact {
  /** id do contato no arquivo — chave de remapeamento para os vínculos. */
  key: string;
  name: string;
  role: ContactRole;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface AccountRestorePlanShow {
  /** id do show no arquivo — chave de remapeamento para transações. */
  key: string;
  title: string;
  /** ISO 8601 já validado (parseável). */
  date: string;
  venue: string | null;
  city: string | null;
  status: ShowStatus;
  fee: number;
  notes: string | null;
  paymentPromisedAt: string | null;
  /** chaves de contatos DO PLANO vinculados ao show (órfãos já removidos). */
  contactKeys: string[];
}

export interface AccountRestorePlanTransaction {
  type: TransactionType;
  description: string;
  category: string;
  amount: number;
  date: string;
  received: boolean;
  /** chave do show DO PLANO (órfão já vira `null`). */
  showKey: string | null;
}

export interface AccountRestorePlanGoal {
  year: number;
  amount: number;
}

export interface AccountRestorePlan {
  /** Só campos de perfil "de dados" — nome/e-mail/credenciais NÃO são tocados
   *  (a identidade é da conta logada, não do backup). */
  profile: {
    artistName: string | null;
    taxRatePercent: number | null;
  };
  contacts: AccountRestorePlanContact[];
  shows: AccountRestorePlanShow[];
  transactions: AccountRestorePlanTransaction[];
  revenueGoals: AccountRestorePlanGoal[];
  /** Ajustes NÃO bloqueantes aplicados ao montar o plano (dedup, órfãos, coerções). */
  notes: string[];
}

export type AccountRestorePlanResult =
  | { ok: true; plan: AccountRestorePlan }
  | { ok: false; errors: string[] };

// ── helpers ──────────────────────────────────────────────────────────────────

const SHOW_STATUS_SET = new Set<string>(SHOW_STATUSES);
const TRANSACTION_TYPE_SET = new Set<string>(TRANSACTION_TYPES);
const CONTACT_ROLE_SET = new Set<string>(CONTACT_ROLES);

/** Uma string de data é restaurável se `new Date` a interpreta (não-`NaN`). */
function isParseableDate(iso: string): boolean {
  return !Number.isNaN(new Date(iso).getTime());
}

/**
 * Monta o plano de restauração a partir de um snapshot JÁ VALIDADO
 * (`parseAccountDataExport` → `ok`). Não lança. Bloqueia (`ok:false`) só no que
 * não tem correção segura para uma escrita fiel: data não-parseável, status de
 * show desconhecido, tipo de transação desconhecido — casos que corromperiam as
 * análises se gravados às cegas. Ajustes com correção natural (papel de contato
 * inválido → OTHER, ids duplicados → mantém o primeiro, referências órfãs →
 * removidas) entram como `notes`, não bloqueiam.
 */
export function buildAccountRestorePlan(
  data: AccountDataExport,
): AccountRestorePlanResult {
  const errors: string[] = [];
  const notes: string[] = [];

  // ── contatos (dedup por id do arquivo; papel inválido → OTHER) ──────────────
  const contacts: AccountRestorePlanContact[] = [];
  const contactKeySet = new Set<string>();
  let dupContacts = 0;
  let coercedRoles = 0;
  for (const c of data.contacts) {
    if (contactKeySet.has(c.id)) {
      dupContacts++;
      continue;
    }
    contactKeySet.add(c.id);
    let role: ContactRole;
    if (CONTACT_ROLE_SET.has(c.role)) {
      role = c.role as ContactRole;
    } else {
      role = "OTHER";
      coercedRoles++;
    }
    contacts.push({
      key: c.id,
      name: c.name,
      role,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
    });
  }
  if (dupContacts > 0) {
    notes.push(
      `${dupContacts} contato(s) com id duplicado — mantido o primeiro de cada.`,
    );
  }
  if (coercedRoles > 0) {
    notes.push(
      `${coercedRoles} contato(s) com papel desconhecido — restaurado(s) como "Outro".`,
    );
  }

  // ── shows (dedup por id; data/status bloqueiam; órfãos de contato removidos) ─
  const shows: AccountRestorePlanShow[] = [];
  const showKeySet = new Set<string>();
  let dupShows = 0;
  let droppedContactRefs = 0;
  data.shows.forEach((s, i) => {
    if (showKeySet.has(s.id)) {
      dupShows++;
      return;
    }
    if (!isParseableDate(s.date)) {
      errors.push(`shows[${i}].date não é uma data válida ("${s.date}").`);
      return;
    }
    if (s.paymentPromisedAt !== null && !isParseableDate(s.paymentPromisedAt)) {
      errors.push(
        `shows[${i}].paymentPromisedAt não é uma data válida ("${s.paymentPromisedAt}").`,
      );
      return;
    }
    if (!SHOW_STATUS_SET.has(s.status)) {
      errors.push(`shows[${i}].status desconhecido ("${s.status}").`);
      return;
    }
    showKeySet.add(s.id);
    // Só mantém vínculos a contatos que estão no plano (o parser já avisou dos
    // órfãos; aqui, no passo de escrita, eles são removidos para não quebrar a FK).
    const contactKeys: string[] = [];
    for (const cid of s.contactIds) {
      if (contactKeySet.has(cid)) contactKeys.push(cid);
      else droppedContactRefs++;
    }
    shows.push({
      key: s.id,
      title: s.title,
      date: s.date,
      venue: s.venue,
      city: s.city,
      status: s.status as ShowStatus,
      fee: s.fee,
      notes: s.notes,
      paymentPromisedAt: s.paymentPromisedAt,
      contactKeys,
    });
  });
  if (dupShows > 0) {
    notes.push(`${dupShows} show(s) com id duplicado — mantido o primeiro de cada.`);
  }
  if (droppedContactRefs > 0) {
    notes.push(
      `${droppedContactRefs} vínculo(s) de contato apontavam para contatos ausentes — ignorado(s).`,
    );
  }

  // ── transações (data/tipo bloqueiam; showId órfão → null) ───────────────────
  const transactions: AccountRestorePlanTransaction[] = [];
  let droppedShowRefs = 0;
  data.transactions.forEach((t, i) => {
    if (!isParseableDate(t.date)) {
      errors.push(`transactions[${i}].date não é uma data válida ("${t.date}").`);
      return;
    }
    if (!TRANSACTION_TYPE_SET.has(t.type)) {
      errors.push(`transactions[${i}].type desconhecido ("${t.type}").`);
      return;
    }
    let showKey: string | null = null;
    if (t.showId !== null) {
      if (showKeySet.has(t.showId)) showKey = t.showId;
      else droppedShowRefs++;
    }
    transactions.push({
      type: t.type as TransactionType,
      description: t.description,
      category: t.category,
      amount: t.amount,
      date: t.date,
      received: t.received,
      showKey,
    });
  });
  if (droppedShowRefs > 0) {
    notes.push(
      `${droppedShowRefs} transação(ões) apontavam para shows ausentes — restaurada(s) sem vínculo de show.`,
    );
  }

  // ── metas (dedup por ano; o schema tem @@unique([userId, year])) ────────────
  const revenueGoals: AccountRestorePlanGoal[] = [];
  const goalYears = new Set<number>();
  let dupGoals = 0;
  for (const g of data.revenueGoals) {
    if (goalYears.has(g.year)) {
      dupGoals++;
      continue;
    }
    goalYears.add(g.year);
    revenueGoals.push({ year: g.year, amount: g.amount });
  }
  if (dupGoals > 0) {
    notes.push(
      `${dupGoals} meta(s) de faturamento com ano repetido — mantida a primeira de cada ano.`,
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    plan: {
      profile: {
        artistName: data.profile.artistName,
        taxRatePercent: data.profile.taxRatePercent,
      },
      contacts,
      shows,
      transactions,
      revenueGoals,
      notes,
    },
  };
}
