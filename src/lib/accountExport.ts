// Exportação completa dos dados da conta (backup / portabilidade).
//
// Enquanto as rotas `/shows/export`, `/financas/export` e `/contatos/export`
// exportam CADA lista como CSV (uma visão tabular por entidade), aqui montamos
// UM snapshot único, versionado e legível por máquina (JSON) com TODOS os dados
// do usuário — shows, transações, contatos, metas de faturamento e perfil — para
// que o músico possa baixar/levar sua carteira inteira num só arquivo ("são seus
// dados"), sem depender de reunir três CSVs de colunas diferentes. Ver DECISIONS.md.
//
// Camada PURA: recebe registros já carregados (objetos simples) e devolve o
// objeto de export + o serializador JSON. O carregamento (Prisma) e o carimbo de
// tempo (`new Date()`) ficam na rota, mantendo esta lógica testável e determinística.

/**
 * Versão do formato do arquivo de export — permite evolução/migração futura.
 * v2 acrescenta `shows[].statusEvents` (histórico do funil), aditivo em relação
 * a v1: um arquivo v1 (sem `statusEvents`) continua restaurável. Ver DECISIONS.md.
 */
export const ACCOUNT_EXPORT_SCHEMA_VERSION = 2;

/** Identificador do app gravado no cabeçalho do arquivo. */
export const ACCOUNT_EXPORT_APP = "Palco";

// ── Entrada (registros crus, como saem do banco) ────────────────────────────

export interface AccountExportProfileInput {
  name: string;
  email: string;
  artistName?: string | null;
  taxRatePercent?: number | null;
}

/** Um evento da linha do tempo do funil (criação / transição de status). */
export interface AccountExportShowStatusEventInput {
  /** `null`/ausente no evento de criação do show (ver D234). */
  fromStatus?: string | null;
  toStatus: string;
  createdAt: Date | string;
}

export interface AccountExportShowInput {
  id: string;
  title: string;
  date: Date | string;
  venue?: string | null;
  city?: string | null;
  status: string;
  fee: number;
  notes?: string | null;
  paymentPromisedAt?: Date | string | null;
  /** ids dos contatos vinculados ao show (preserva a relação N:N). */
  contactIds?: string[];
  /**
   * Histórico de mudanças de status do show (linha do tempo do funil), em ordem
   * cronológica. Ausente = sem histórico registrado (backup restaura só o evento
   * de criação). Adicionado no schema v2.
   */
  statusEvents?: AccountExportShowStatusEventInput[];
}

export interface AccountExportTransactionInput {
  id: string;
  type: string;
  description: string;
  category: string;
  amount: number;
  date: Date | string;
  received: boolean;
  showId?: string | null;
}

export interface AccountExportContactInput {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface AccountExportGoalInput {
  year: number;
  amount: number;
}

export interface AccountDataExportInput {
  profile: AccountExportProfileInput;
  shows: AccountExportShowInput[];
  transactions: AccountExportTransactionInput[];
  contacts: AccountExportContactInput[];
  revenueGoals: AccountExportGoalInput[];
  /** Momento em que o export foi gerado (a rota passa `new Date()`). */
  exportedAt: Date | string;
}

// ── Saída (snapshot normalizado) ─────────────────────────────────────────────

export interface AccountDataExport {
  meta: {
    app: string;
    schemaVersion: number;
    exportedAt: string; // ISO 8601 (UTC)
    counts: {
      shows: number;
      transactions: number;
      contacts: number;
      revenueGoals: number;
    };
  };
  profile: {
    name: string;
    email: string;
    artistName: string | null;
    taxRatePercent: number | null;
  };
  shows: Array<{
    id: string;
    title: string;
    date: string;
    venue: string | null;
    city: string | null;
    status: string;
    fee: number; // centavos (cru, como no banco)
    notes: string | null;
    paymentPromisedAt: string | null;
    contactIds: string[];
    statusEvents: Array<{
      fromStatus: string | null;
      toStatus: string;
      createdAt: string; // ISO 8601 (UTC)
    }>;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    description: string;
    category: string;
    amount: number; // centavos
    date: string;
    received: boolean;
    showId: string | null;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    role: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }>;
  revenueGoals: Array<{ year: number; amount: number }>;
}

/**
 * Normaliza uma data (Date ou string já-ISO) para ISO 8601. `Date` vira
 * `toISOString()`; uma string é preservada (a rota só passa `Date`, mas aceitar
 * string mantém a função robusta a chamadas já-serializadas).
 */
function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

/** Idem, tolerando ausência (`null`/`undefined` → `null`). */
function toIsoOrNull(value: Date | string | null | undefined): string | null {
  return value == null ? null : toIso(value);
}

/** `undefined`/`null` → `null` (normaliza campos opcionais do banco). */
function orNull<T>(value: T | null | undefined): T | null {
  return value == null ? null : value;
}

/**
 * Monta o snapshot completo da conta a partir dos registros crus. Preserva a
 * ordem recebida (a rota decide a ordenação via `orderBy`); datas viram ISO;
 * campos opcionais ausentes viram `null`; valores monetários ficam em centavos
 * (backup fiel ao banco, sem formatação).
 */
export function buildAccountDataExport(
  input: AccountDataExportInput,
): AccountDataExport {
  const shows = input.shows.map((s) => ({
    id: s.id,
    title: s.title,
    date: toIso(s.date),
    venue: orNull(s.venue),
    city: orNull(s.city),
    status: s.status,
    fee: s.fee,
    notes: orNull(s.notes),
    paymentPromisedAt: toIsoOrNull(s.paymentPromisedAt),
    contactIds: s.contactIds ?? [],
    statusEvents: (s.statusEvents ?? []).map((e) => ({
      fromStatus: orNull(e.fromStatus),
      toStatus: e.toStatus,
      createdAt: toIso(e.createdAt),
    })),
  }));

  const transactions = input.transactions.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    category: t.category,
    amount: t.amount,
    date: toIso(t.date),
    received: t.received,
    showId: orNull(t.showId),
  }));

  const contacts = input.contacts.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    email: orNull(c.email),
    phone: orNull(c.phone),
    notes: orNull(c.notes),
  }));

  const revenueGoals = input.revenueGoals.map((g) => ({
    year: g.year,
    amount: g.amount,
  }));

  return {
    meta: {
      app: ACCOUNT_EXPORT_APP,
      schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
      exportedAt: toIso(input.exportedAt),
      counts: {
        shows: shows.length,
        transactions: transactions.length,
        contacts: contacts.length,
        revenueGoals: revenueGoals.length,
      },
    },
    profile: {
      name: input.profile.name,
      email: input.profile.email,
      artistName: orNull(input.profile.artistName),
      taxRatePercent: orNull(input.profile.taxRatePercent),
    },
    shows,
    transactions,
    contacts,
    revenueGoals,
  };
}

/** Serializa o snapshot em JSON legível (indentado a 2 espaços). */
export function accountDataExportToJson(data: AccountDataExport): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Nome do arquivo de download, ancorado numa chave de dia "YYYY-MM-DD" já
 * calculada pela rota (mesma convenção UTC de `dayKey`). Ex.:
 * `palco-meus-dados-2026-07-17.json`.
 */
export function accountDataExportFilename(dateKey: string): string {
  return `palco-meus-dados-${dateKey}.json`;
}
