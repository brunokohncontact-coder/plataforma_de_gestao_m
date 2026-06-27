// Serialização de CSV (pura, sem dependência de banco/UI). Testada em csv.test.ts.
//
// Convenção pt-BR: delimitador ";" (padrão do Excel em português) e decimal com
// vírgula, de modo que o arquivo abra corretamente no Excel/Sheets em pt-BR sem
// assistente de importação. A camada HTTP (route handler) prefixa um BOM UTF-8
// para preservar acentuação no Excel.

import {
  TRANSACTION_TYPE_LABELS,
  SHOW_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  type TransactionType,
  type ShowStatus,
  type ContactRole,
} from "./domain";
import {
  dayKey,
  MIN_MEDIAN_FEE_SAMPLE,
  MIN_MEDIAN_LAG_SAMPLE,
  PAYMENT_SPEED_BUCKET_LABELS,
  type AnnualSummary,
  type QuarterlySummary,
  type ShowLike,
  type ShowProfitRow,
  type VenueProfitRow,
  type ContactProfitRow,
  type RoleProfitRow,
  type PaymentPromiseStatus,
  type PaymentSpeedBucketKey,
  type GigSeasonality,
} from "./finance";
import { MONTH_NAMES_LONG } from "./calendar";

const DEFAULT_DELIMITER = ";";

/**
 * Escapa um campo CSV conforme RFC 4180: envolve em aspas se contiver o
 * delimitador, aspas ou quebra de linha, duplicando aspas internas.
 */
export function escapeCsvField(value: string, delimiter = DEFAULT_DELIMITER): string {
  const needsQuote =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/** Serializa uma matriz de linhas (cada uma um array de campos) em texto CSV (CRLF). */
export function toCsv(rows: string[][], delimiter = DEFAULT_DELIMITER): string {
  return rows
    .map((row) => row.map((field) => escapeCsvField(field, delimiter)).join(delimiter))
    .join("\r\n");
}

/**
 * Centavos -> reais com vírgula decimal e SEM separador de milhar ("1234,56").
 * Mantém o sinal e trabalha sobre inteiros para preservar precisão.
 */
export function centsToCsvAmount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.floor(abs / 100);
  const centPart = String(abs % 100).padStart(2, "0");
  return `${sign}${reais},${centPart}`;
}

/** Data -> "DD/MM/AAAA" (em UTC, mesma convenção de `dayKey`, estável em testes). */
export function csvDate(date: Date | string): string {
  const [year, month, day] = dayKey(date).split("-");
  return `${day}/${month}/${year}`;
}

/** Hora -> "HH:MM" (em UTC, mesma convenção de `csvDate`, estável em testes). */
export function csvTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Forma mínima de transação para exportação (desacoplada do Prisma). */
export interface CsvTransaction {
  date: Date | string;
  type: TransactionType;
  description: string;
  category: string;
  amount: number; // centavos
  received: boolean;
  show?: { title: string } | null;
}

export const TRANSACTION_CSV_HEADERS = [
  "Data",
  "Tipo",
  "Descrição",
  "Categoria",
  "Valor (R$)",
  "Situação",
  "Show",
] as const;

/** Rótulo de situação conforme tipo: Recebido/Pago quando concluído, senão Pendente. */
function situationLabel(t: CsvTransaction): string {
  if (!t.received) return "Pendente";
  return t.type === "INCOME" ? "Recebido" : "Pago";
}

/** Converte transações em texto CSV (cabeçalho + linhas), pronto para download. */
export function transactionsToCsv(
  txs: CsvTransaction[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const rows: string[][] = [Array.from(TRANSACTION_CSV_HEADERS)];
  for (const t of txs) {
    rows.push([
      csvDate(t.date),
      TRANSACTION_TYPE_LABELS[t.type],
      t.description,
      t.category,
      centsToCsvAmount(t.amount),
      situationLabel(t),
      t.show?.title ?? "",
    ]);
  }
  return toCsv(rows, delimiter);
}

/** Forma mínima de show para exportação (desacoplada do Prisma). */
export interface CsvShow {
  date: Date | string;
  title: string;
  venue?: string | null;
  city?: string | null;
  status: string;
  fee: number; // centavos
  notes?: string | null;
}

export const SHOW_CSV_HEADERS = [
  "Data",
  "Hora",
  "Título",
  "Local",
  "Cidade",
  "Status",
  "Cachê (R$)",
  "Observações",
] as const;

/** Rótulo de status legível; um status desconhecido sai como veio (defensivo). */
function showStatusLabel(status: string): string {
  return SHOW_STATUS_LABELS[status as ShowStatus] ?? status;
}

/**
 * Converte shows em texto CSV (cabeçalho + linhas), pronto para download.
 * Mesma convenção pt-BR de `transactionsToCsv` (delimitador ";", decimal com
 * vírgula, data/hora em UTC). A ordem das linhas é preservada (a página/route
 * decide a ordenação). Pura.
 */
export function showsToCsv(
  shows: CsvShow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const rows: string[][] = [Array.from(SHOW_CSV_HEADERS)];
  for (const s of shows) {
    rows.push([
      csvDate(s.date),
      csvTime(s.date),
      s.title,
      s.venue ?? "",
      s.city ?? "",
      showStatusLabel(s.status),
      centsToCsvAmount(s.fee),
      s.notes ?? "",
    ]);
  }
  return toCsv(rows, delimiter);
}

export const ANNUAL_SUMMARY_CSV_HEADERS = [
  "Mês",
  "Receitas (R$)",
  "Despesas (R$)",
  "Resultado (R$)",
] as const;

/**
 * Serializa o resumo anual (12 meses + total) em CSV, pronto para download.
 * Mesma convenção pt-BR de `transactionsToCsv` (delimitador ";", decimal com
 * vírgula). Os 12 meses saem sempre (jan→dez, zeros inclusive) seguidos de uma
 * linha "Total do ano", espelhando a tabela "Mês a mês" da página `/financas/anual`.
 */
export function annualSummaryToCsv(
  summary: AnnualSummary,
  delimiter = DEFAULT_DELIMITER,
): string {
  const rows: string[][] = [Array.from(ANNUAL_SUMMARY_CSV_HEADERS)];
  for (const m of summary.months) {
    rows.push([
      `${MONTH_NAMES_LONG[m.monthIndex - 1]} ${summary.year}`,
      centsToCsvAmount(m.income),
      centsToCsvAmount(m.expense),
      centsToCsvAmount(m.net),
    ]);
  }
  rows.push([
    `Total do ano (${summary.year})`,
    centsToCsvAmount(summary.totalIncome),
    centsToCsvAmount(summary.totalExpense),
    centsToCsvAmount(summary.net),
  ]);
  return toCsv(rows, delimiter);
}

export const QUARTERLY_SUMMARY_CSV_HEADERS = [
  "Trimestre",
  "Período",
  "Receitas (R$)",
  "Despesas (R$)",
  "Resultado (R$)",
] as const;

/** Período abreviado do trimestre, ex.: "Jan–Mar" (espelha a página). */
function quarterRangeLabel(monthIndexes: number[]): string {
  if (monthIndexes.length === 0) return "";
  const first = MONTH_NAMES_LONG[monthIndexes[0] - 1];
  const last = MONTH_NAMES_LONG[monthIndexes[monthIndexes.length - 1] - 1];
  return first === last ? first : `${first}–${last}`;
}

/**
 * Serializa o resumo trimestral (4 trimestres + total) em CSV, pronto para
 * download. Mesma convenção pt-BR de `annualSummaryToCsv` (delimitador ";",
 * decimal com vírgula). Os 4 trimestres saem sempre (Q1→Q4, zeros inclusive)
 * seguidos de uma linha "Total do ano", espelhando a tabela "Trimestre a
 * trimestre" da página `/financas/trimestral`.
 */
export function quarterlySummaryToCsv(
  summary: QuarterlySummary,
  delimiter = DEFAULT_DELIMITER,
): string {
  const rows: string[][] = [Array.from(QUARTERLY_SUMMARY_CSV_HEADERS)];
  for (const q of summary.quarters) {
    rows.push([
      `${q.label} ${summary.year}`,
      quarterRangeLabel(q.monthIndexes),
      centsToCsvAmount(q.income),
      centsToCsvAmount(q.expense),
      centsToCsvAmount(q.net),
    ]);
  }
  rows.push([
    `Total do ano (${summary.year})`,
    "",
    centsToCsvAmount(summary.totalIncome),
    centsToCsvAmount(summary.totalExpense),
    centsToCsvAmount(summary.net),
  ]);
  return toCsv(rows, delimiter);
}

// ── Rentabilidade por show (ranking de P&L, F4) ──────────────────────────────

/**
 * Forma mínima de show exigida para exportar a rentabilidade por show. O cálculo
 * (`ShowLike`) só precisa de `id`/`fee`/`status`, mas a planilha mostra também o
 * título e a data — incluídos aqui, desacoplados do Prisma.
 */
export interface CsvProfitShow extends ShowLike {
  title: string;
  date: Date | string;
}

export const SHOW_PROFIT_CSV_HEADERS = [
  "Show",
  "Data",
  "Status",
  "Cachê (R$)",
  "Extras (R$)",
  "Despesas (R$)",
  "Resultado (R$)",
  "Margem",
] as const;

/**
 * Margem (0..1) -> porcentagem inteira ("60%"); vazio quando não há receita
 * bruta (espelha o "—" da página, onde a margem não tem sentido sem receita).
 */
function csvMargin(grossIncome: number, margin: number): string {
  if (grossIncome <= 0) return "";
  return `${Math.round(margin * 100)}%`;
}

/**
 * Serializa o ranking de rentabilidade por show (P&L) em CSV, pronto para
 * download. Mesma convenção pt-BR de `transactionsToCsv` (delimitador ";",
 * decimal com vírgula, data em UTC). A ordem das linhas é preservada (a página/
 * route decide a ordenação — por resultado decrescente). Pura.
 */
export function showProfitToCsv(
  rows: ShowProfitRow<CsvProfitShow>[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(SHOW_PROFIT_CSV_HEADERS)];
  for (const { show, pnl } of rows) {
    out.push([
      show.title,
      csvDate(show.date),
      showStatusLabel(show.status ?? ""),
      centsToCsvAmount(pnl.fee),
      centsToCsvAmount(pnl.extraIncome),
      centsToCsvAmount(pnl.expenses),
      centsToCsvAmount(pnl.net),
      csvMargin(pnl.fee + pnl.extraIncome, pnl.margin),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Rentabilidade por local / cidade (agregada por casa ou cidade) ───────────

/**
 * Cabeçalhos da rentabilidade agregada por local OU cidade (mesma forma de
 * linha — `CityProfitRow` é `VenueProfitRow`). O primeiro rótulo varia ("Local"
 * × "Cidade") e é passado pela route; os demais são fixos.
 */
function venueProfitHeaders(groupLabel: string): readonly string[] {
  return [
    groupLabel,
    "Shows",
    "Cachê (R$)",
    "Cachê mediano (R$)",
    "Extras (R$)",
    "Despesas (R$)",
    "Resultado (R$)",
    "Média/show (R$)",
  ];
}

/**
 * Cachê mediano formatado, vazio abaixo da amostra mínima (`MIN_MEDIAN_FEE_SAMPLE`)
 * — espelha o "—" da página, onde a mediana só aparece com shows suficientes para
 * ser confiável (ver D123/D124).
 */
function csvMedianFee(showCount: number, medianFee: number): string {
  return showCount >= MIN_MEDIAN_FEE_SAMPLE ? centsToCsvAmount(medianFee) : "";
}

/**
 * Serializa a rentabilidade agregada por local ou por cidade em CSV, pronto para
 * download. `groupLabel` rotula a primeira coluna ("Local" ou "Cidade"). Mesma
 * convenção pt-BR de `transactionsToCsv`. A ordem das linhas é preservada (a
 * página ordena por resultado decrescente). Pura.
 */
export function venueProfitToCsv(
  rows: VenueProfitRow[],
  groupLabel: string,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(venueProfitHeaders(groupLabel))];
  for (const row of rows) {
    out.push([
      row.name,
      String(row.showCount),
      centsToCsvAmount(row.totalFee),
      csvMedianFee(row.showCount, row.medianFee),
      centsToCsvAmount(row.totalExtra),
      centsToCsvAmount(row.totalExpenses),
      centsToCsvAmount(row.totalNet),
      centsToCsvAmount(row.avgNet),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Rentabilidade por contratante (P&L agrupado por quem paga) ───────────────

export const CONTACT_PROFIT_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "Shows",
  "Cachê (R$)",
  "Extras (R$)",
  "Despesas (R$)",
  "Cachê médio (R$)",
  "Cachê mediano (R$)",
  "Resultado (R$)",
  "Média/show (R$)",
] as const;

/** Rótulo de papel legível; um papel desconhecido cai em "Outro" (defensivo). */
function contactRoleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? CONTACT_ROLE_LABELS.OTHER;
}

/**
 * Serializa a rentabilidade por contratante (P&L somado por quem paga) em CSV,
 * pronto para download. Mesma convenção pt-BR de `transactionsToCsv`. O grupo
 * "Sem contratante" (`contact: null`) sai com nome fixo e papel em branco. A
 * ordem das linhas é preservada (a página ordena por resultado decrescente,
 * "Sem contratante" por último). Pura.
 */
export function contactProfitToCsv(
  rows: ContactProfitRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CONTACT_PROFIT_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.contact ? row.contact.name : "Sem contratante",
      row.contact ? contactRoleLabel(row.contact.role) : "",
      String(row.showCount),
      centsToCsvAmount(row.totalFee),
      centsToCsvAmount(row.totalExtra),
      centsToCsvAmount(row.totalExpenses),
      centsToCsvAmount(row.avgFee),
      csvMedianFee(row.showCount, row.medianFee),
      centsToCsvAmount(row.totalNet),
      centsToCsvAmount(row.avgNet),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Rentabilidade por papel do contratante (rollup acima do contratante) ─────

export const ROLE_PROFIT_CSV_HEADERS = [
  "Papel",
  "Shows",
  "Cachê (R$)",
  "Extras (R$)",
  "Despesas (R$)",
  "Cachê médio (R$)",
  "Cachê mediano (R$)",
  "Resultado (R$)",
  "Média/show (R$)",
] as const;

/**
 * Serializa a rentabilidade por papel do contratante (P&L somado pelo papel de
 * quem paga) em CSV, pronto para download. É um rollup acima de
 * `contactProfitToCsv`: agrupa pelo papel, não pelo contratante, então não há
 * coluna "Contratante". Mesma convenção pt-BR de `transactionsToCsv`. O grupo
 * sem papel (`role: null`) sai como "Sem contratante" (espelha a página). O
 * cachê mediano só sai a partir de `MIN_MEDIAN_FEE_SAMPLE` shows (abaixo disso,
 * em branco — mesma regra de apresentação da UI). A ordem das linhas é
 * preservada (a página ordena por resultado decrescente, "Sem contratante" por
 * último). Pura.
 */
export function roleProfitToCsv(
  rows: RoleProfitRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(ROLE_PROFIT_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.role ? contactRoleLabel(row.role) : "Sem contratante",
      String(row.showCount),
      centsToCsvAmount(row.totalFee),
      centsToCsvAmount(row.totalExtra),
      centsToCsvAmount(row.totalExpenses),
      centsToCsvAmount(row.avgFee),
      csvMedianFee(row.showCount, row.medianFee),
      centsToCsvAmount(row.totalNet),
      centsToCsvAmount(row.avgNet),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Ranking de contatos por atividade (CRM) ──────────────────────────────────

export const CONTACT_ACTIVITY_CSV_HEADERS = [
  "Contato",
  "Papel",
  "Shows ativos",
  "Shows (total)",
  "Próximos",
  "Cachê total (R$)",
  "Último show",
] as const;

/**
 * Forma mínima de uma linha do ranking de contatos por atividade para a
 * exportação (desacoplada de `@/lib/contacts` para não criar dependência de
 * tipo cíclica; estruturalmente compatível com `ContactRankRow`). O cachê é por
 * contato — um show com vários contatos conta para cada um.
 */
export interface ContactActivityCsvRow {
  contact: { name: string; role: string };
  totalShows: number;
  activeShows: number;
  upcomingShows: number;
  totalFee: number; // centavos
  lastShowDate: Date | string | null;
}

/**
 * Serializa o ranking de contatos por atividade em CSV, pronto para download.
 * Mesma convenção pt-BR de `transactionsToCsv`. A ordem das linhas é preservada
 * (a página ordena por cachê total decrescente). As colunas espelham a tabela:
 * shows ativos e total separados (em vez de "ativos / total"), próximos, cachê
 * total e a data do último show (vazia quando não há). Pura.
 */
export function contactActivityToCsv(
  rows: ContactActivityCsvRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CONTACT_ACTIVITY_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.contact.name,
      contactRoleLabel(row.contact.role),
      String(row.activeShows),
      String(row.totalShows),
      String(row.upcomingShows),
      centsToCsvAmount(row.totalFee),
      row.lastShowDate ? csvDate(row.lastShowDate) : "",
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Cachês a receber (recebíveis em aberto, aging + promessas) ───────────────

export const RECEIVABLE_CSV_HEADERS = [
  "Show",
  "Data",
  "Local",
  "Cidade",
  "Dias em atraso",
  "Cachê (R$)",
  "Recebido (R$)",
  "A receber (R$)",
  "Situação",
  "Promessa",
  "Status promessa",
] as const;

/**
 * Forma mínima de um recebível em aberto para a exportação (desacoplada do
 * Prisma e de `ShowReceivableRow`, que só carrega `id`/`fee`/`status`; aqui a
 * planilha mostra título, local e cidade — incluídos explicitamente). `dias` já
 * vem calculado (de `bucketReceivablesByAge`) e `promiseStatus` de
 * `paymentPromiseStatus`, mantendo o serializador puro.
 */
export interface ReceivableCsvRow {
  show: {
    title: string;
    date: Date | string;
    venue?: string | null;
    city?: string | null;
  };
  fee: number; // centavos
  collected: number; // centavos já recebidos
  outstanding: number; // centavos a receber
  daysOutstanding: number; // dias desde o show
  /** True se nenhuma receita foi sequer lançada para o show. */
  unregistered: boolean;
  /** Receita lançada mas ainda pendente (centavos). */
  registeredPending: number;
  promiseStatus: PaymentPromiseStatus;
  /** Data prometida de pagamento (vazia quando não houver). */
  promisedAt: Date | string | null;
}

/**
 * Rótulo da situação da receita do recebível, espelhando os textos da página:
 * nada lançado → "Receita não lançada"; lançada mas pendente → "Lançada pendente";
 * caso contrário (parte já recebida) → "Parcial recebido".
 */
function receivableSituationLabel(row: ReceivableCsvRow): string {
  if (row.unregistered) return "Receita não lançada";
  if (row.registeredPending > 0) return "Lançada pendente";
  return "Parcial recebido";
}

/** Rótulo do status da promessa; "none" sai em branco (sem promessa registrada). */
function promiseStatusLabel(status: PaymentPromiseStatus): string {
  if (status === "broken") return "Vencida";
  if (status === "pending") return "No prazo";
  return "";
}

/**
 * Serializa os cachês a receber (recebíveis em aberto) em CSV, pronto para
 * download. Mesma convenção pt-BR de `transactionsToCsv` (delimitador ";",
 * decimal com vírgula, datas em UTC). A ordem das linhas é preservada (a página
 * lista do atraso mais longo ao mais curto). Pura.
 */
export function receivablesToCsv(
  rows: ReceivableCsvRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(RECEIVABLE_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.show.title,
      csvDate(row.show.date),
      row.show.venue ?? "",
      row.show.city ?? "",
      String(row.daysOutstanding),
      centsToCsvAmount(row.fee),
      centsToCsvAmount(row.collected),
      centsToCsvAmount(row.outstanding),
      receivableSituationLabel(row),
      row.promisedAt ? csvDate(row.promisedAt) : "",
      promiseStatusLabel(row.promiseStatus),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Cachês a receber por contratante (de quem cobrar primeiro) ───────────────

export const RECEIVABLE_BY_CONTACT_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "A receber (R$)",
  "Shows",
  "Pior atraso (dias)",
  "Atraso médio (dias)",
  "Participação",
  "Promessas vencidas",
  "A receber vencido (R$)",
] as const;

/**
 * Forma mínima de uma linha agregada por devedor para a exportação (desacoplada
 * de `ContactReceivableRow` de `@/lib/finance` para não acoplar `csv.ts` ao
 * núcleo de recebíveis; estruturalmente compatível). É a visão "por contratante"
 * dos cachês a receber: uma linha por devedor, não por show. `brokenCount`/
 * `brokenOutstanding` vêm de `summarizePaymentPromises` sobre os shows do grupo,
 * mantendo o serializador puro.
 */
export interface ReceivableByContactCsvRow {
  /** Contratante devedor; `null` agrega os shows sem contato vinculado. */
  contact: { name: string; role: string } | null;
  outstanding: number; // centavos a receber
  showCount: number;
  maxDaysOutstanding: number; // pior atraso (dias) entre os shows do devedor
  weightedAvgDays: number; // atraso médio ponderado pelo valor em aberto
  share: number; // participação no total a receber (0..1)
  brokenCount: number; // promessas vencidas do devedor
  brokenOutstanding: number; // centavos em promessas vencidas
}

/** Participação (0..1) -> porcentagem inteira ("37%"). Espelha o `pct` da página. */
function csvShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Serializa os cachês a receber agrupados por contratante (de quem cobrar
 * primeiro) em CSV, pronto para download. Uma linha por devedor, espelhando a
 * tabela de `/shows/a-receber/por-contratante`: total a receber, nº de shows,
 * pior atraso, atraso médio ponderado, participação no total e as promessas
 * vencidas (contagem + valor). Mesma convenção pt-BR de `transactionsToCsv`. O
 * grupo "Sem contratante" (`contact: null`) sai com nome fixo e papel em branco.
 * A ordem das linhas é preservada (a página ordena pelo maior saldo devedor,
 * "Sem contratante" por último). Pura.
 */
export function receivablesByContactToCsv(
  rows: ReceivableByContactCsvRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(RECEIVABLE_BY_CONTACT_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.contact ? row.contact.name : "Sem contratante",
      row.contact ? contactRoleLabel(row.contact.role) : "",
      centsToCsvAmount(row.outstanding),
      String(row.showCount),
      String(row.maxDaysOutstanding),
      String(row.weightedAvgDays),
      csvShare(row.share),
      String(row.brokenCount),
      centsToCsvAmount(row.brokenOutstanding),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Prazo de recebimento por contratante (quem paga rápido × devagar) ────────

export const PAYMENT_LAG_BY_CONTACT_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "Recebido (R$)",
  "Shows",
  "Prazo médio (dias)",
  "Prazo mediano (dias)",
  "Pior prazo (dias)",
  "Participação",
  "Velocidade",
] as const;

/**
 * Forma mínima de uma linha de prazo de recebimento por contratante para a
 * exportação (desacoplada de `ContactPaymentLagRow` de `@/lib/finance` para não
 * acoplar `csv.ts` ao núcleo de prazos; estruturalmente compatível). Uma linha
 * por contratante: quanto entrou, em quantos shows, e em quantos dias (médio,
 * mediano e pior). Prazos são inteiros e podem ser negativos (adiantado). O
 * `bucket` rotula a velocidade via `PAYMENT_SPEED_BUCKET_LABELS`.
 */
export interface PaymentLagByContactCsvRow {
  /** Contratante do grupo; `null` agrega os shows sem contato vinculado. */
  contact: { name: string; role: string } | null;
  received: number; // centavos recebidos atribuídos ao contratante
  showCount: number; // shows pagos do contratante
  avgDays: number; // prazo médio ponderado (dias)
  medianDays: number; // prazo mediano ponderado (dias)
  lastDays: number; // pior prazo entre os shows (dias)
  share: number; // participação no total recebido (0..1)
  bucket: PaymentSpeedBucketKey; // balde de velocidade derivado de avgDays
}

/**
 * Serializa o prazo de recebimento por contratante em CSV, pronto para download.
 * Uma linha por contratante, espelhando a tabela de
 * `/shows/prazo-recebimento/por-contratante`: recebido, nº de shows, prazo médio,
 * mediano e pior (em dias, inteiros — negativos = adiantado), participação no
 * total e o rótulo de velocidade. Mesma convenção pt-BR de `transactionsToCsv`.
 * O grupo "Sem contratante" (`contact: null`) sai com nome fixo e papel em
 * branco. O prazo mediano só sai a partir de `MIN_MEDIAN_LAG_SAMPLE` shows pagos
 * (abaixo disso, em branco — mesma regra de apresentação da UI, onde fica "—").
 * A ordem das linhas é preservada (a página ordena do mais lento ao mais rápido,
 * "Sem contratante" por último). Pura.
 */
export function paymentLagByContactToCsv(
  rows: PaymentLagByContactCsvRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(PAYMENT_LAG_BY_CONTACT_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.contact ? row.contact.name : "Sem contratante",
      row.contact ? contactRoleLabel(row.contact.role) : "",
      centsToCsvAmount(row.received),
      String(row.showCount),
      String(row.avgDays),
      row.showCount >= MIN_MEDIAN_LAG_SAMPLE ? String(row.medianDays) : "",
      String(row.lastDays),
      csvShare(row.share),
      PAYMENT_SPEED_BUCKET_LABELS[row.bucket],
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Prazo de recebimento por show (tela-mãe, do mais lento ao mais rápido) ────

export const PAYMENT_LAG_CSV_HEADERS = [
  "Show",
  "Data",
  "Local",
  "Cidade",
  "Recebido (R$)",
  "Recebimentos",
  "Prazo médio (dias)",
  "Pior prazo (dias)",
  "Velocidade",
] as const;

/**
 * Forma mínima de uma linha de prazo de recebimento por SHOW para a exportação
 * (desacoplada de `PaymentLagShowRow` de `@/lib/finance`, que carrega o show
 * inteiro; aqui a planilha mostra só título, data, local e cidade). É a visão da
 * tela-mãe `/shows/prazo-recebimento`: uma linha por show, com quanto entrou, em
 * quantos recebimentos e em quantos dias (médio e pior). Os prazos são inteiros e
 * podem ser negativos (pago adiantado). O `bucket` rotula a velocidade via
 * `PAYMENT_SPEED_BUCKET_LABELS`.
 */
export interface PaymentLagCsvRow {
  show: {
    title: string;
    date: Date | string;
    venue?: string | null;
    city?: string | null;
  };
  received: number; // centavos recebidos vinculados ao show
  paymentCount: number; // nº de recebimentos que compõem o total
  avgDays: number; // prazo médio ponderado (dias)
  lastDays: number; // pior prazo (recebimento mais tardio do show, dias)
  bucket: PaymentSpeedBucketKey; // balde de velocidade derivado de avgDays
}

/**
 * Serializa o prazo de recebimento por show (tela-mãe) em CSV, pronto para
 * download. Uma linha por show, espelhando a tabela de
 * `/shows/prazo-recebimento`: título, data, local, cidade, recebido, nº de
 * recebimentos, prazo médio e pior prazo (em dias, inteiros — negativos =
 * adiantado) e o rótulo de velocidade. Mesma convenção pt-BR de
 * `transactionsToCsv` (delimitador ";", decimal com vírgula, datas em UTC). A
 * ordem das linhas é preservada (a página lista do prazo médio mais lento ao
 * mais rápido). Pura.
 */
export function paymentLagToCsv(
  rows: PaymentLagCsvRow[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(PAYMENT_LAG_CSV_HEADERS)];
  for (const row of rows) {
    out.push([
      row.show.title,
      csvDate(row.show.date),
      row.show.venue ?? "",
      row.show.city ?? "",
      centsToCsvAmount(row.received),
      String(row.paymentCount),
      String(row.avgDays),
      String(row.lastDays),
      PAYMENT_SPEED_BUCKET_LABELS[row.bucket],
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Sazonalidade de shows por mês do ano (jan→dez, somando todos os anos) ─────

export const GIG_SEASONALITY_CSV_HEADERS = [
  "Mês",
  "Shows",
  "Cachê médio (R$)",
  "Faturamento (R$)",
  "% dos shows",
  "% do faturamento",
] as const;

/**
 * Serializa a sazonalidade de shows por mês do ano (`gigSeasonality`) em CSV,
 * pronto para download. Espelha a tabela de `/shows/sazonalidade`: uma linha por
 * mês (sempre as 12, de janeiro a dezembro, inclusive meses zerados, para revelar
 * os vales da temporada) com nº de shows, cachê médio, faturamento e as duas
 * participações (no nº de shows e no faturamento), seguida de uma linha "Total".
 * Diferente da UI (que mostra "—" nos meses vazios), o CSV registra 0 e 0,00 para
 * ficar legível por máquina. Mesma convenção pt-BR de `transactionsToCsv`
 * (delimitador ";", decimal com vírgula). As participações do Total ficam em
 * branco (são sempre 100% por construção). Pura.
 */
export function gigSeasonalityToCsv(
  season: GigSeasonality,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(GIG_SEASONALITY_CSV_HEADERS)];
  for (const m of season.months) {
    out.push([
      m.label,
      String(m.count),
      centsToCsvAmount(m.avgFee),
      centsToCsvAmount(m.totalFee),
      csvShare(m.countShare),
      csvShare(m.feeShare),
    ]);
  }
  out.push([
    "Total",
    String(season.totalShows),
    centsToCsvAmount(season.avgFee),
    centsToCsvAmount(season.totalFee),
    "",
    "",
  ]);
  return toCsv(out, delimiter);
}
