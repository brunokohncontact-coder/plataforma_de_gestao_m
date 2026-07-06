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
  classifyGigSeasonalityMonthChange,
  type AnnualSummary,
  type MonthlySeasonality,
  type QuarterlySummary,
  type SeasonalMonth,
  type ShowLike,
  type ShowProfitRow,
  type VenueProfitRow,
  type ContactProfitRow,
  type RoleProfitRow,
  type PaymentPromiseStatus,
  type PaymentSpeedBucketKey,
  type GigSeasonality,
  type GigSeasonalityComparison,
  type GigSeasonalityMonthTrend,
  type GigMonthStat,
  type GigCadence,
  type WeekdayPerformance,
  type WeekdayStat,
  type FeeDistribution,
  type FeeTrend,
  type CashFlowMonth,
  type CashflowProjection,
  type BookedRevenueForecast,
  type DueAgenda,
  type TxLike,
  DUE_BUCKET_LABELS,
  type YearlyHistory,
  type IncomeMix,
  type ExpenseMix,
  type ExpenseMixComparison,
  type MetricDelta,
  type FinanceSummary,
  type FinanceComparison,
  type CategoryDelta,
  type CategoryReportComparison,
  type ShowPipeline,
  type YearToDatePace,
  type MonthPace,
  type MonthYoYPace,
  type MonthlyGoalProgress,
  type MonthGoalStatus,
  type QuarterlyGoalProgress,
  type YearEndScenarioView,
  type RecurringExpensesReport,
  type TaxReserveReport,
  type BreakEvenAnalysis,
  type CityReengageList,
  type VenueReengageList,
} from "./finance";
import type {
  ClientRetention,
  ClientConcentration,
  ContactCancellations,
  ContactPipeline,
  ContactRankLike,
  ReengageList,
} from "./contacts";
import { indexClientShareChanges } from "./contacts";
import { MONTH_NAMES_LONG } from "./calendar";
import type {
  BookingLeadTime,
  OpenWeekendsReport,
  ScheduleConflicts,
  FunnelStageDurations,
} from "./shows";
import { summarizeMonthShows } from "./shows";

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

/** Participação relativa (0..1) -> porcentagem inteira com símbolo ("37%"). */
function csvShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Variação de participação (0..1) -> pontos percentuais inteiros com sinal:
 * 0,12 → "+12", -0,05 → "-5", 0 → "0". Para planilha ordenável. */
function csvSignedPoints(delta: number): string {
  const rounded = Math.round(delta * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
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

/** Data em horário LOCAL -> "DD/MM/AAAA" (casa a grade do calendário, que recorta
 * o mês pela data LOCAL, ver `summarizeMonthShows`/`buildMonthGrid`). */
function csvLocalDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/** Hora em horário LOCAL -> "HH:MM" (mesma convenção LOCAL de `csvLocalDate`). */
function csvLocalTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Forma mínima de show para o CSV do mês do calendário. */
export interface CsvCalendarShow {
  date: Date | string;
  title: string;
  venue?: string | null;
  status: string;
  fee?: number; // centavos
}

export const MONTH_CALENDAR_CSV_HEADERS = [
  "Data",
  "Hora",
  "Título",
  "Local",
  "Status",
  "Cachê (R$)",
] as const;

/**
 * Converte os shows do mês exibido no calendário (`/shows/calendario`) em CSV,
 * espelhando a faixa de resumo do mês (ver `summarizeMonthShows`/D216). Recebe os
 * shows que a página carrega para a grade (que inclui as bordas das semanas
 * vizinhas) e **recorta pela data LOCAL** ao mês pedido (`year`, `month` 1-12) —
 * exatamente o que a grade marca como "do mês" (`inMonth`) — usando data/hora
 * LOCAL nas colunas para casar esse recorte (distinto do UTC de `csvDate`, que
 * as leituras de rentabilidade usam). Lista uma linha por show do mês, em ordem
 * de data, e fecha (quando há linhas) com uma linha **"Total"** que reusa
 * `summarizeMonthShows`: contagem de shows (cancelados à parte, fora da soma) e
 * cachê total do mês (confirmado + a confirmar). Pura.
 */
export function monthCalendarToCsv(
  shows: CsvCalendarShow[],
  year: number,
  month: number,
  delimiter = DEFAULT_DELIMITER,
): string {
  const toDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));
  // Recorte LOCAL ao mês exibido — mesma convenção da grade e do resumo.
  const inMonth = shows.filter((s) => {
    const d = toDate(s.date);
    return d.getFullYear() === year && d.getMonth() === month - 1;
  });
  // Ordena por data crescente (a grade carrega ordenado, mas as bordas
  // descartadas podem deixar a lista do mês fora de ordem contígua).
  const sorted = [...inMonth].sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime(),
  );

  const out: string[][] = [Array.from(MONTH_CALENDAR_CSV_HEADERS)];
  for (const s of sorted) {
    out.push([
      csvLocalDate(s.date),
      csvLocalTime(s.date),
      s.title,
      s.venue ?? "",
      showStatusLabel(s.status),
      centsToCsvAmount(s.fee ?? 0),
    ]);
  }

  // Linha "Total" (só com linhas): reusa o resumo do mês (exclui cancelados do
  // total e do cachê, conta-os à parte no rótulo). Data/Hora em branco.
  if (sorted.length > 0) {
    const summary = summarizeMonthShows(inMonth, year, month);
    const label =
      `${summary.total} show${summary.total === 1 ? "" : "s"}` +
      (summary.cancelled > 0
        ? ` (${summary.cancelled} cancelado${summary.cancelled === 1 ? "" : "s"})`
        : "");
    out.push(["Total", "", label, "", "", centsToCsvAmount(summary.totalFee)]);
  }

  return toCsv(out, delimiter);
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

export const MONTHLY_SEASONALITY_CSV_HEADERS = [
  "Mês",
  "Receita média (R$)",
  "Despesa média (R$)",
  "Resultado médio (R$)",
  "Anos",
  "Destaque",
] as const;

/**
 * Rótulo de destaque de um mês na sazonalidade financeira, espelhando os dois
 * cards de destaque da página `/financas/sazonalidade` (melhor mês típico /
 * mês mais fraco, ambos por **resultado médio** `avgNet`). Diferente dos CSVs
 * irmãos `gigMonthHighlight`/`weekdayHighlight` (que acumulam vários papéis com
 * " / "), aqui há um único eixo — o resultado típico — e portanto no máximo um
 * papel por mês: um mês é o melhor OU o mais fraco, nunca os dois. Quando só há
 * um mês ativo, `best` e `worst` apontam para ele; nesse caso vence "Melhor mês
 * típico" (a supressão do "mais fraco" quando o mês é também o melhor, mesma
 * regra de `gigMonthHighlight`/D204). Meses sem movimento (`years === 0`) nunca
 * são destaque. Pura.
 */
function seasonalMonthHighlight(season: MonthlySeasonality, m: SeasonalMonth): string {
  if (m.years === 0) return "";
  if (season.best?.monthIndex === m.monthIndex) return "Melhor mês típico";
  if (season.worst?.monthIndex === m.monthIndex) return "Mês mais fraco";
  return "";
}

/**
 * Serializa a sazonalidade financeira por mês do ano (`monthlySeasonality`) em
 * CSV, pronto para download. Espelha a tabela "Média por mês do ano" da página
 * `/financas/sazonalidade`: uma linha por mês (sempre as 12, de janeiro a
 * dezembro, inclusive meses sem movimento — para revelar os vales da temporada),
 * com a média por ano-ativo de receita, despesa e resultado, e o nº de anos em
 * que aquele mês teve movimento. Diferente da UI (que mostra "—" nos meses
 * vazios), o CSV registra 0,00 e 0 para ficar legível por máquina.
 *
 * A linha "Total" é o **ano típico composto**: a soma das médias mensais
 * (receita/despesa/resultado de um ano em que cada mês rende o seu valor típico)
 * — um número de planejamento, não a soma dos totais brutos. Na coluna "Anos"
 * traz `yearsObserved`, a amplitude do histórico (anos distintos com qualquer
 * transação), conceitualmente distinta dos anos-ativos por mês.
 *
 * A coluna "Destaque" replica os dois cards da tela (melhor mês típico / mês
 * mais fraco, por resultado médio), para a planilha ficar auto-explicativa e
 * ordenável/filtrável por papel — espelho da coluna homônima de
 * `gigSeasonalityToCsv`/`weekdayPerformanceToCsv` (D205/D206), mas com um único
 * eixo (o resultado típico), então no máximo um papel por mês. Meses sem
 * movimento e a linha Total ficam em branco.
 *
 * Mesma convenção pt-BR de `transactionsToCsv` (delimitador ";", decimal com
 * vírgula). Irmão de `gigSeasonalityToCsv` no eixo das Finanças. Pura.
 */
export function monthlySeasonalityToCsv(
  seasonality: MonthlySeasonality,
  delimiter = DEFAULT_DELIMITER,
): string {
  const rows: string[][] = [Array.from(MONTHLY_SEASONALITY_CSV_HEADERS)];
  let typicalIncome = 0;
  let typicalExpense = 0;
  for (const m of seasonality.months) {
    typicalIncome += m.avgIncome;
    typicalExpense += m.avgExpense;
    rows.push([
      MONTH_NAMES_LONG[m.monthIndex - 1],
      centsToCsvAmount(m.avgIncome),
      centsToCsvAmount(m.avgExpense),
      centsToCsvAmount(m.avgNet),
      String(m.years),
      seasonalMonthHighlight(seasonality, m),
    ]);
  }
  rows.push([
    "Total",
    centsToCsvAmount(typicalIncome),
    centsToCsvAmount(typicalExpense),
    centsToCsvAmount(typicalIncome - typicalExpense),
    String(seasonality.yearsObserved),
    "",
  ]);
  return toCsv(rows, delimiter);
}

export const TAX_RESERVE_CSV_HEADERS = [
  "Mês",
  "Recebido (R$)",
  "Reserva (R$)",
  "Participação (%)",
] as const;

/**
 * Serializa a reserva para impostos por mês (`taxReserve`) em CSV, pronto para
 * download. Espelha a tabela "Mês a mês" de `/financas/reserva-impostos`: uma
 * linha por mês (sempre as 12, de janeiro a dezembro, inclusive os meses sem
 * receita recebida — o vazio importa para ver a sazonalidade do que entra), com
 * a receita recebida no caixa e a reserva sugerida (`round(recebido × alíquota)`),
 * mais a participação de cada mês na reserva do ano. Diferente da UI (que mostra
 * "—" nos meses sem movimento), o CSV registra 0,00 para ficar legível por
 * máquina.
 *
 * A linha "Total" soma o recebido e a reserva do ano (participação em branco =
 * 100% por construção, como `clientConcentrationToCsv`). A alíquota aplicada
 * **não** vira coluna (é uniforme em todas as linhas) — fica no nome do arquivo,
 * que carrega ano e alíquota; os cabeçalhos são genéricos. Irmão de
 * `monthlySeasonalityToCsv` no eixo mensal das Finanças. Mesma convenção pt-BR de
 * `transactionsToCsv` (delimitador ";", decimal com vírgula). Pura.
 */
export function taxReserveToCsv(
  report: TaxReserveReport,
  delimiter = DEFAULT_DELIMITER,
): string {
  const rows: string[][] = [Array.from(TAX_RESERVE_CSV_HEADERS)];
  const total = report.totalReserve;
  for (const m of report.months) {
    rows.push([
      MONTH_NAMES_LONG[m.monthIndex - 1],
      centsToCsvAmount(m.receivedIncome),
      centsToCsvAmount(m.reserve),
      csvShare(total > 0 ? m.reserve / total : 0),
    ]);
  }
  rows.push([
    "Total",
    centsToCsvAmount(report.totalReceivedIncome),
    centsToCsvAmount(report.totalReserve),
    "",
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
  // Linha "Total" (só com linhas): agrega cachê/extras/despesas/resultado e a
  // margem líquida AGREGADA do período (`totalNet / totalGross`, ponderada pela
  // receita — não a média das margens por show), espelhando a linha Total dos
  // CSVs irmãos (sazonalidade/faixas). A coluna Data/Status fica em branco.
  if (rows.length > 0) {
    const totalFee = rows.reduce((s, r) => s + r.pnl.fee, 0);
    const totalExtra = rows.reduce((s, r) => s + r.pnl.extraIncome, 0);
    const totalExpenses = rows.reduce((s, r) => s + r.pnl.expenses, 0);
    const totalNet = rows.reduce((s, r) => s + r.pnl.net, 0);
    const totalGross = totalFee + totalExtra;
    const totalMargin = totalGross === 0 ? 0 : totalNet / totalGross;
    out.push([
      "Total",
      "",
      "",
      centsToCsvAmount(totalFee),
      centsToCsvAmount(totalExtra),
      centsToCsvAmount(totalExpenses),
      centsToCsvAmount(totalNet),
      csvMargin(totalGross, totalMargin),
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
  /**
   * Situação da linha frente ao período anterior, para a coluna opcional
   * "vs. {ano-1}" (espelha `ContactPaymentLagRowStatus`/D195): variação do prazo
   * MÉDIO (atual − anterior, dias; negativo = passou a pagar mais rápido) quando o
   * contratante existe nos dois períodos. Só entra na saída quando o serializador
   * recebe `previousYear`; deixe `undefined`/`null` para as linhas não comparáveis
   * (grupo sem contratante, ou quando não há recorte por ano).
   */
  avgDaysDelta?: number | null;
  /** `true` quando o contratante só apareceu no período atual ("novo" na coluna). */
  isNew?: boolean;
}

/** Variação em dias com sinal para planilha: 12 → "+12", -1 → "-1", 0 → "0". */
function csvSignedDays(delta: number): string {
  const rounded = Math.round(delta);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
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
 *
 * Quando `previousYear` é informado (recorte por ano com comparativo, D196), a
 * planilha ganha uma última coluna "vs. {previousYear} (dias)" espelhando a coluna
 * da página: variação assinada do prazo médio para quem existe nos dois períodos
 * (negativo = passou a pagar mais rápido), "novo" para quem só apareceu no ano
 * atual (`isNew`) e em branco para as linhas não comparáveis (grupo sem
 * contratante / `avgDaysDelta` ausente). Sem `previousYear`, a saída é idêntica à
 * histórica (9 colunas).
 */
export function paymentLagByContactToCsv(
  rows: PaymentLagByContactCsvRow[],
  delimiter = DEFAULT_DELIMITER,
  previousYear?: number | null,
): string {
  const withTrend = previousYear != null;
  const header = Array.from(PAYMENT_LAG_BY_CONTACT_CSV_HEADERS) as string[];
  if (withTrend) header.push(`vs. ${previousYear} (dias)`);
  const out: string[][] = [header];
  for (const row of rows) {
    const cols = [
      row.contact ? row.contact.name : "Sem contratante",
      row.contact ? contactRoleLabel(row.contact.role) : "",
      centsToCsvAmount(row.received),
      String(row.showCount),
      String(row.avgDays),
      row.showCount >= MIN_MEDIAN_LAG_SAMPLE ? String(row.medianDays) : "",
      String(row.lastDays),
      csvShare(row.share),
      PAYMENT_SPEED_BUCKET_LABELS[row.bucket],
    ];
    if (withTrend) {
      cols.push(
        row.isNew
          ? "novo"
          : row.avgDaysDelta != null
            ? csvSignedDays(row.avgDaysDelta)
            : "",
      );
    }
    out.push(cols);
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
  "Destaque",
] as const;

/**
 * Rótulo de destaque de um mês na sazonalidade, espelhando os cards e selos da
 * página `/shows/sazonalidade` (mais cheio / mais faturamento / melhor cachê
 * médio / mais fraco). Um mês pode acumular papéis (o mais cheio costuma ser
 * também o de maior faturamento), então juntamos todos com " / ", na mesma ordem
 * dos cards. O selo "Mês mais fraco" é suprimido quando o mês é também o mais
 * cheio (só há um mês ativo), a mesma regra de supressão da tabela da UI. Meses
 * sem shows nunca são destaque. Pura.
 */
function gigMonthHighlight(season: GigSeasonality, m: GigMonthStat): string {
  if (m.count === 0) return "";
  const roles: string[] = [];
  const isBusiest = season.busiest?.month === m.month;
  if (isBusiest) roles.push("Mês mais cheio");
  if (season.bestByVolume?.month === m.month) roles.push("Mais faturamento");
  if (season.bestByAvg?.month === m.month) roles.push("Melhor cachê médio");
  if (season.quietest?.month === m.month && !isBusiest) roles.push("Mês mais fraco");
  return roles.join(" / ");
}

/**
 * Serializa a sazonalidade de shows por mês do ano (`gigSeasonality`) em CSV,
 * pronto para download. Espelha a tabela de `/shows/sazonalidade`: uma linha por
 * mês (sempre as 12, de janeiro a dezembro, inclusive meses zerados, para revelar
 * os vales da temporada) com nº de shows, cachê médio, faturamento e as duas
 * participações (no nº de shows e no faturamento), seguida de uma linha "Total".
 * Diferente da UI (que mostra "—" nos meses vazios), o CSV registra 0 e 0,00 para
 * ficar legível por máquina. A coluna "Destaque" replica os cards e selos da
 * tela (mais cheio / mais faturamento / melhor cachê médio / mais fraco), para a
 * planilha ficar auto-explicativa e ordenável/filtrável por papel sem recomputar
 * os desempates. Mesma convenção pt-BR de `transactionsToCsv` (delimitador ";",
 * decimal com vírgula). As participações e o destaque do Total ficam em branco
 * (participações são sempre 100% por construção). Pura.
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
      gigMonthHighlight(season, m),
    ]);
  }
  out.push([
    "Total",
    String(season.totalShows),
    centsToCsvAmount(season.avgFee),
    centsToCsvAmount(season.totalFee),
    "",
    "",
    "",
  ]);
  return toCsv(out, delimiter);
}

// ── Comparativo ano a ano da sazonalidade de shows (temporada X vs. X-1) ───────

export const GIG_SEASONALITY_COMPARISON_CSV_HEADERS = [
  "Mês",
  "Shows (ano anterior)",
  "Shows (ano corrente)",
  "Δ shows",
  "Δ faturamento (R$)",
  "Tendência",
] as const;

/** Contagem com sinal para planilha: 3 → "+3", -2 → "-2", 0 → "0". */
function csvSignedCount(delta: number): string {
  const rounded = Math.round(delta);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

/** Rótulo pt-BR da tendência de um mês no comparativo, espelhando a cor da UI. */
const GIG_SEASONALITY_TREND_LABELS: Record<GigSeasonalityMonthTrend, string> = {
  up: "Subiu",
  down: "Caiu",
  flat: "Estável",
};

/**
 * Serializa o comparativo ano a ano da sazonalidade de shows
 * (`compareGigSeasonality`) em CSV, pronto para download — espelha a tabela
 * "Ver os 12 meses" do card "Temporada {ano} vs. {ano-1}" de
 * `/shows/sazonalidade`. Uma linha por mês do calendário (sempre as 12, jan→dez,
 * inclusive meses sem shows nos dois anos, para revelar onde a temporada mudou de
 * forma) com o nº de shows de cada ano, a variação do nº de shows, a variação do
 * faturamento e a tendência (Subiu / Caiu / Estável), seguida de uma linha
 * "Total".
 *
 * Diferente da UI (que mostra "—" nos meses/deltas vazios), o CSV registra 0 e
 * 0,00 para ficar legível por máquina. A coluna "Tendência" replica a cor da
 * tabela on-screen reusando `classifyGigSeasonalityMonthChange` (ancora no nº de
 * shows, com o faturamento de desempate), tornando a planilha auto-explicativa e
 * filtrável por quem subiu/caiu. Os deltas saem assinados (`+`/`-`), o faturamento
 * via `centsToCsvAmount` (que já emite o "-" nos negativos). As colunas de nº de
 * shows do Total ficam em branco (o valor é a variação, como na UI); a tendência
 * do Total também. Os anos concretos vão no nome do arquivo, não nos cabeçalhos
 * (mesma convenção de `yearPaceToCsv`). Mesma convenção pt-BR dos irmãos (";" e
 * decimal com vírgula). Pura.
 */
export function gigSeasonalityComparisonToCsv(
  comparison: GigSeasonalityComparison,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(GIG_SEASONALITY_COMPARISON_CSV_HEADERS)];
  for (const m of comparison.months) {
    out.push([
      m.label,
      String(m.previousCount),
      String(m.currentCount),
      csvSignedCount(m.countDelta),
      centsToCsvAmount(m.feeDelta),
      GIG_SEASONALITY_TREND_LABELS[classifyGigSeasonalityMonthChange(m)],
    ]);
  }
  out.push([
    "Total",
    "",
    "",
    csvSignedCount(comparison.totalShowsDelta),
    centsToCsvAmount(comparison.totalFeeDelta),
    "",
  ]);
  return toCsv(out, delimiter);
}

// ── Desempenho por dia da semana (domingo→sábado) ────────────────────────────

export const WEEKDAY_PERFORMANCE_CSV_HEADERS = [
  "Dia",
  "Shows",
  "Cachê médio (R$)",
  "Faturamento (R$)",
  "% dos shows",
  "% do faturamento",
  "Destaque",
] as const;

/**
 * Rótulo de destaque de um dia da semana, espelhando os cards de destaque da
 * página `/shows/dias-semana` (mais cheio / mais faturamento / melhor cachê
 * médio). Um dia pode acumular papéis (o dia mais cheio costuma ser também o de
 * maior faturamento), então juntamos todos com " / ", na mesma ordem de
 * `gigMonthHighlight` (mais cheio → faturamento → cachê médio) para os dois CSVs
 * irmãos lerem igual. Diferente da sazonalidade, dias da semana não têm o papel
 * "mais fraco" (`WeekdayPerformance` não computa `quietest`, D205). Dias sem
 * shows nunca são destaque. Pura.
 */
function weekdayHighlight(wp: WeekdayPerformance, d: WeekdayStat): string {
  if (d.count === 0) return "";
  const roles: string[] = [];
  if (wp.busiest?.weekday === d.weekday) roles.push("Dia mais cheio");
  if (wp.bestByVolume?.weekday === d.weekday) roles.push("Mais faturamento");
  if (wp.bestByAvg?.weekday === d.weekday) roles.push("Melhor cachê médio");
  return roles.join(" / ");
}

/**
 * Serializa o desempenho por dia da semana (`weekdayPerformance`) em CSV, pronto
 * para download. Espelha a tabela de `/shows/dias-semana`: uma linha por dia
 * (sempre os 7, de domingo a sábado, inclusive dias zerados, para revelar as
 * lacunas da agenda que a tela destaca) com nº de shows, cachê médio,
 * faturamento e as duas participações (no nº de shows e no faturamento), seguida
 * de uma linha "Total". Diferente da UI (que mostra "—" nos dias vazios), o CSV
 * registra 0 e 0,00 para ficar legível por máquina. A coluna "Destaque" replica
 * os cards da tela (mais cheio / mais faturamento / melhor cachê médio), para a
 * planilha ficar auto-explicativa e ordenável/filtrável por papel — espelho da
 * coluna homônima de `gigSeasonalityToCsv` (D205), sem o papel "mais fraco" que
 * dias da semana não computam. Mesma convenção pt-BR de `transactionsToCsv`
 * (delimitador ";", decimal com vírgula). As participações e o destaque do Total
 * ficam em branco (as participações são sempre 100% por construção). Irmão de
 * `gigSeasonalityToCsv` (mesmo eixo Stat → linhas + Total). Pura.
 */
export function weekdayPerformanceToCsv(
  wp: WeekdayPerformance,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(WEEKDAY_PERFORMANCE_CSV_HEADERS)];
  for (const d of wp.days) {
    out.push([
      d.label,
      String(d.count),
      centsToCsvAmount(d.avgFee),
      centsToCsvAmount(d.totalFee),
      csvShare(d.countShare),
      csvShare(d.feeShare),
      weekdayHighlight(wp, d),
    ]);
  }
  out.push([
    "Total",
    String(wp.totalShows),
    centsToCsvAmount(wp.avgFee),
    centsToCsvAmount(wp.totalFee),
    "",
    "",
    "",
  ]);
  return toCsv(out, delimiter);
}

// ── Distribuição por faixa de cachê (Até R$ 500 → Acima de R$ 5.000) ──────────

export const FEE_DISTRIBUTION_CSV_HEADERS = [
  "Faixa",
  "Shows",
  "% dos shows",
  "Faturamento (R$)",
  "% do faturamento",
] as const;

/**
 * Serializa a distribuição por faixa de cachê (`feeDistribution`) em CSV, pronto
 * para download. Espelha a tabela de `/shows/faixas-de-cache`: uma linha por
 * faixa (sempre as 6 de `FEE_BANDS`, da mais barata à mais cara, inclusive faixas
 * zeradas, para o "formato da tabela de cachês" não pular degraus) com nº de
 * shows, participação no nº de shows, faturamento e participação no faturamento,
 * seguida de uma linha "Total". Diferente da UI (que mostra "—" nas faixas
 * vazias), o CSV registra 0, 0% e 0,00 para ficar legível por máquina. Mesma
 * convenção pt-BR de `transactionsToCsv` (delimitador ";", decimal com vírgula).
 * As participações do Total ficam em branco (são sempre 100% por construção).
 * Irmão de `gigSeasonalityToCsv`/`weekdayPerformanceToCsv` (mesmo eixo
 * faixa/balde → linhas + Total). Pura.
 */
export function feeDistributionToCsv(
  dist: FeeDistribution,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(FEE_DISTRIBUTION_CSV_HEADERS)];
  for (const b of dist.bands) {
    out.push([
      b.label,
      String(b.count),
      csvShare(b.countShare),
      centsToCsvAmount(b.totalFee),
      csvShare(b.feeShare),
    ]);
  }
  out.push([
    "Total",
    String(dist.totalShows),
    "",
    centsToCsvAmount(dist.totalFee),
    "",
  ]);
  return toCsv(out, delimiter);
}

// ── Fontes de renda / mix de receitas (de onde vem o dinheiro?) ──────────────

export const INCOME_MIX_CSV_HEADERS = [
  "Fonte",
  "Lançamentos",
  "Total (R$)",
  "Participação",
] as const;

/**
 * Serializa o mix de receitas por fonte (`incomeMix`) em CSV, pronto para
 * download. Espelha a tabela de `/financas/fontes-de-renda`: uma linha por fonte
 * (categoria de receita), na mesma ordem da página (valor decrescente, empate por
 * nome pt-BR), com nº de lançamentos, total e participação no total de receitas,
 * seguida de uma linha "Total". A participação do Total fica em branco (é sempre
 * 100% por construção). Mesma convenção pt-BR de `transactionsToCsv` (delimitador
 * ";", decimal com vírgula). Irmão de `feeDistributionToCsv` (mesmo eixo linhas +
 * Total). Pura.
 */
export function incomeMixToCsv(
  mix: IncomeMix,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(INCOME_MIX_CSV_HEADERS)];
  for (const s of mix.sources) {
    out.push([
      s.category,
      String(s.count),
      centsToCsvAmount(s.amount),
      csvShare(s.share),
    ]);
  }
  out.push(["Total", "", centsToCsvAmount(mix.total), ""]);
  return toCsv(out, delimiter);
}

// ── Composição de despesas / mix de gastos (para onde vai o dinheiro?) ───────

export const EXPENSE_MIX_CSV_HEADERS = [
  "Categoria",
  "Lançamentos",
  "Total (R$)",
  "Participação",
] as const;

/**
 * Serializa a composição das despesas por rubrica (`expenseMix`) em CSV, pronto
 * para download. Espelho exato de `incomeMixToCsv` no eixo de gastos: uma linha
 * por categoria de despesa, na mesma ordem da página `/financas/composicao-despesas`
 * (valor decrescente, empate por nome pt-BR), com nº de lançamentos, total e
 * participação na despesa total, seguida de uma linha "Total". A participação do
 * Total fica em branco (é sempre 100% por construção). Mesma convenção pt-BR de
 * `transactionsToCsv` (delimitador ";", decimal com vírgula). Pura.
 */
export function expenseMixToCsv(
  mix: ExpenseMix,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(EXPENSE_MIX_CSV_HEADERS)];
  for (const c of mix.categories) {
    out.push([
      c.category,
      String(c.count),
      centsToCsvAmount(c.amount),
      csvShare(c.share),
    ]);
  }
  out.push(["Total", "", centsToCsvAmount(mix.total), ""]);
  return toCsv(out, delimiter);
}

export const EXPENSE_MIX_COMPARISON_CSV_HEADERS = [
  "Categoria",
  "Gasto (ano anterior) (R$)",
  "Gasto (ano corrente) (R$)",
  "Δ gasto (R$)",
  "Participação (ano anterior)",
  "Participação (ano corrente)",
  "Situação",
] as const;

/** Rótulo pt-BR do rumo de uma rubrica no comparativo (só para as presentes nos
 * dois anos): "Subiu" gastou mais, "Caiu" gastou menos, "Estável" mesmo valor. */
function expenseChangeSituation(amountDelta: number): string {
  if (amountDelta > 0) return "Subiu";
  if (amountDelta < 0) return "Caiu";
  return "Estável";
}

/**
 * Serializa o comparativo ano a ano da composição de despesas
 * (`compareExpenseMix`) em CSV, pronto para download — a forma completa,
 * rubrica a rubrica, do card "Onde o gasto mudou · {ano} vs. {ano-1}" de
 * `/financas/composicao-despesas` (que na tela só destila os dois movers). Uma
 * linha por rubrica, em três blocos na ordem em que a tela os apresenta:
 * primeiro as rubricas presentes nos DOIS anos (ordem de `changes`: maior
 * aumento → maior queda), depois as "Novas" (só no ano corrente) e por fim as
 * que "Sumiram" (só no anterior), seguidas de uma linha "Total". Cada linha traz
 * o gasto de cada ano, a variação assinada, a participação de cada ano e a
 * situação (Subiu / Caiu / Estável / Nova / Sumiu), tornando a planilha
 * ordenável e filtrável por rumo — o valor que o card não cabe mostrar.
 *
 * Espelho de `gigSeasonalityComparisonToCsv` (D223) no eixo de despesa: o Δ sai
 * via `centsToCsvAmount` (que já emite o "-" nos negativos, sem "+" nos
 * positivos, mesma convenção do irmão); rubricas novas têm ano anterior 0 e
 * participação anterior 0%, as que sumiram têm ano corrente 0 e participação
 * corrente 0% — legível por máquina, sem os "—" da UI. As participações do Total
 * ficam em branco (são sempre 100% por construção, como nos irmãos). O chamador
 * garante o mesmo gate do card (um ano específico, ambos com despesa). Mesma
 * convenção pt-BR dos demais (";" e decimal com vírgula). Pura.
 */
export function expenseMixComparisonToCsv(
  comparison: ExpenseMixComparison,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(EXPENSE_MIX_COMPARISON_CSV_HEADERS)];
  for (const c of comparison.changes) {
    out.push([
      c.category,
      centsToCsvAmount(c.previousAmount),
      centsToCsvAmount(c.currentAmount),
      centsToCsvAmount(c.amountDelta),
      csvShare(c.previousShare),
      csvShare(c.currentShare),
      expenseChangeSituation(c.amountDelta),
    ]);
  }
  for (const c of comparison.newCategories) {
    out.push([
      c.category,
      centsToCsvAmount(0),
      centsToCsvAmount(c.amount),
      centsToCsvAmount(c.amount),
      csvShare(0),
      csvShare(c.share),
      "Nova",
    ]);
  }
  for (const c of comparison.droppedCategories) {
    out.push([
      c.category,
      centsToCsvAmount(c.amount),
      centsToCsvAmount(0),
      centsToCsvAmount(-c.amount),
      csvShare(c.share),
      csvShare(0),
      "Sumiu",
    ]);
  }
  out.push([
    "Total",
    centsToCsvAmount(comparison.previousTotal),
    centsToCsvAmount(comparison.currentTotal),
    centsToCsvAmount(comparison.totalDelta),
    "",
    "",
    "",
  ]);
  return toCsv(out, delimiter);
}

/**
 * Variação relativa com sinal, legível por máquina, para o CSV de variação por
 * categoria: "+25%", "-30%", "0%" — ou "novo" quando o mês anterior é 0 (sem base
 * para porcentagem, espelhando o "novo" da página). Diferente de `csvShare` (que
 * é sempre uma participação positiva 0–100%): aqui a variação pode ser negativa, e
 * o sinal é a informação. Pura.
 */
function csvDeltaPct(d: MetricDelta): string {
  if (d.delta === 0) return "0%"; // sem variação (inclui base 0 e atual 0)
  if (d.pct == null) return "novo"; // surgiu do nada (mês anterior era 0)
  const p = Math.round(d.pct * 100);
  return p > 0 ? `+${p}%` : `${p}%`;
}

export const CATEGORY_VARIATION_CSV_HEADERS = [
  "Tipo",
  "Categoria",
  "Mês anterior (R$)",
  "Este mês (R$)",
  "Variação (R$)",
  "Variação (%)",
] as const;

/**
 * Serializa a variação por categoria entre dois meses (`compareCategoryReports`)
 * em CSV, pronto para download — espelha a página `/financas/variacao`. Emite as
 * duas seções da tela num único arquivo, cada linha marcada por `Tipo`
 * (Despesa/Receita): primeiro as despesas, depois as receitas, preservando a
 * ordem da comparação (maior movimento absoluto primeiro). Cada seção termina
 * numa linha "Total" com os somatórios do mês e a variação do total — de modo que
 * o arquivo sempre traz pelo menos as duas linhas de Total, mesmo sem categorias.
 * Colunas: valor do mês anterior, valor deste mês, variação absoluta (com sinal) e
 * variação relativa (`csvDeltaPct`: "+25%"/"-30%"/"0%"/"novo"). Mesma convenção
 * pt-BR de `transactionsToCsv` (delimitador ";", decimal com vírgula). Pura.
 */
export function categoryVariationToCsv(
  cmp: CategoryReportComparison,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CATEGORY_VARIATION_CSV_HEADERS)];

  const section = (
    tipo: string,
    rows: CategoryDelta[],
    previousTotal: number,
    total: number,
    totalDelta: MetricDelta,
  ): void => {
    for (const r of rows) {
      out.push([
        tipo,
        r.category,
        centsToCsvAmount(r.previousAmount),
        centsToCsvAmount(r.amount),
        centsToCsvAmount(r.delta.delta),
        csvDeltaPct(r.delta),
      ]);
    }
    out.push([
      tipo,
      "Total",
      centsToCsvAmount(previousTotal),
      centsToCsvAmount(total),
      centsToCsvAmount(totalDelta.delta),
      csvDeltaPct(totalDelta),
    ]);
  };

  section("Despesa", cmp.expense, cmp.previousTotalExpense, cmp.totalExpense, cmp.expenseDelta);
  section("Receita", cmp.income, cmp.previousTotalIncome, cmp.totalIncome, cmp.incomeDelta);

  return toCsv(out, delimiter);
}

// ── Cadência de shows (volume mês a mês ao longo do tempo) ────────────────────

export const GIG_CADENCE_CSV_HEADERS = ["Mês", "Shows"] as const;

/**
 * Serializa a cadência de shows (`gigCadence`) em CSV, pronto para download.
 * Espelha a tabela "Shows mês a mês" de `/shows/cadencia`: uma linha por mês
 * ATIVO (com ao menos um show realizado), em ordem cronológica crescente, com a
 * contagem de shows, seguida de uma linha "Total". Como na tela, meses parados
 * dentro da janela NÃO viram linha (o eixo é atividade; `idleMonths` resume o
 * vazio) — distinto de `gigSeasonalityToCsv`/`weekdayPerformanceToCsv`, que
 * preenchem todos os baldes. A coluna "Mês" usa a chave ISO "YYYY-MM" (ordenável
 * por máquina), e não o rótulo amigável "Jan 2026" da UI. Mesma convenção pt-BR
 * dos irmãos (delimitador ";"). Pura.
 */
export function gigCadenceToCsv(
  cadence: GigCadence,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(GIG_CADENCE_CSV_HEADERS)];
  for (const m of cadence.months) {
    out.push([m.month, String(m.count)]);
  }
  out.push(["Total", String(cadence.totalShows)]);
  return toCsv(out, delimiter);
}

// ── Evolução do cachê (cachê médio realizado mês a mês ao longo do tempo) ──────

export const FEE_TREND_CSV_HEADERS = [
  "Mês",
  "Cachê médio (R$)",
  "Cachê mínimo (R$)",
  "Cachê máximo (R$)",
  "Shows",
] as const;

/**
 * Serializa a evolução do cachê (`feeTrend`) em CSV, pronto para download.
 * Espelha a tabela "Cachê médio mês a mês" de `/shows/evolucao-cache`: uma linha
 * por mês ATIVO (com ao menos um show realizado e cachê registrado), em ordem
 * cronológica crescente, com cachê médio, mínimo e máximo do mês e a contagem de
 * shows; encerra numa linha "Total" cujos valores são os agregados gerais da tela
 * (cachê médio geral, menor cachê, maior cachê e total de shows considerados) — os
 * mesmos números dos cards de destaque. Como em `gigCadenceToCsv`, a coluna "Mês"
 * usa a chave ISO "YYYY-MM" (ordenável por máquina), e não o rótulo "Jan 2026" da
 * UI, e só meses ativos viram linha (a janela é aberta e pode abranger anos).
 * A "Faixa" da tela vira duas colunas (mínimo/máximo) para abrir limpo na
 * planilha. Mesma convenção pt-BR dos irmãos (delimitador ";"). Pura.
 */
export function feeTrendToCsv(trend: FeeTrend, delimiter = DEFAULT_DELIMITER): string {
  const out: string[][] = [Array.from(FEE_TREND_CSV_HEADERS)];
  for (const m of trend.months) {
    out.push([
      m.month,
      centsToCsvAmount(m.avgFee),
      centsToCsvAmount(m.minFee),
      centsToCsvAmount(m.maxFee),
      String(m.count),
    ]);
  }
  out.push([
    "Total",
    centsToCsvAmount(trend.avgFee),
    centsToCsvAmount(trend.lowestFee),
    centsToCsvAmount(trend.highestFee),
    String(trend.totalShows),
  ]);
  return toCsv(out, delimiter);
}

// ── Fidelização / retenção de contratantes (quem volta a te contratar?) ──────

export const CLIENT_RETENTION_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "Shows",
  "Cachê total (R$)",
  "Último show",
  "Recorrente",
] as const;

/**
 * Serializa a fidelização da carteira (`clientRetention`) em CSV, pronto para
 * download. Diferente da tela `/contatos/retencao` (cuja tabela lista só os
 * contratantes recorrentes), o CSV emite **todas** as linhas — `retention.rows`,
 * todos os contratantes com ≥1 show não cancelado, na mesma ordem da página
 * (shows desc, cachê desc, nome pt-BR) —, marcando cada uma com a coluna
 * "Recorrente" (Sim/Não). Assim a planilha abre tanto os fiéis quanto os de um
 * show só (candidatos a follow-up, que a tela só conta no card "Contratantes
 * únicos"). Colunas: contratante, papel, nº de shows não cancelados, cachê total
 * (por contato), data do último show (vazia quando não há) e o selo de recorrência.
 * Encerra numa linha "Total" com a soma de shows e cachê de toda a carteira; a
 * coluna "Recorrente" do Total traz "recorrentes/total" (ex.: "3/8"). Mesma
 * convenção pt-BR dos irmãos (delimitador ";", decimal com vírgula). Pura.
 */
export function clientRetentionToCsv<C extends ContactRankLike & { role: string }>(
  retention: ClientRetention<C>,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CLIENT_RETENTION_CSV_HEADERS)];
  for (const row of retention.rows) {
    out.push([
      row.contact.name,
      contactRoleLabel(row.contact.role),
      String(row.activeShows),
      centsToCsvAmount(row.totalFee),
      row.lastShowDate ? csvDate(row.lastShowDate) : "",
      row.recurring ? "Sim" : "Não",
    ]);
  }
  out.push([
    "Total",
    "",
    String(retention.totalShows),
    centsToCsvAmount(retention.totalFee),
    "",
    `${retention.recurringClients}/${retention.totalClients}`,
  ]);
  return toCsv(out, delimiter);
}

// ── Concentração de contratantes (risco de dependência da carteira) ───────────

export const CLIENT_CONCENTRATION_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "Shows",
  "Cachê (R$)",
  "Participação (%)",
] as const;

/**
 * Serializa a concentração da carteira (`clientConcentration`) em CSV, pronto
 * para download. Espelha a tabela "Composição por contratante" de
 * `/contatos/concentracao`: uma linha por contratante com faturamento
 * (`concentration.rows`, já ordenado por cachê desc, nome pt-BR), com nº de
 * shows não cancelados, cachê somado (por contato) e a participação no cachê
 * total da carteira ("37%", via `csvShare`, como na página). A coluna "Papel"
 * entra para a planilha abrir auto-suficiente (a tela a mostra como selo).
 * Encerra numa linha "Total" com a soma de shows e o cachê total da carteira;
 * a participação do Total fica em branco (100% por construção, como
 * `clientRetentionToCsv`/`incomeMixToCsv`). Mesma convenção pt-BR dos irmãos
 * (delimitador ";", decimal com vírgula). Pura.
 *
 * Quando `previous` (a concentração do ano anterior) e `previousYear` são
 * informados (recorte por ano com comparativo, D201), a planilha ganha uma última
 * coluna "vs. {previousYear} (p.p.)" — o detalhe por contratante do card agregado:
 * variação assinada da participação em pontos percentuais para quem faturou nos
 * dois anos (positivo = ficou mais dependente dele), "novo" para quem só apareceu
 * no ano atual e em branco na linha Total. Reaproveita `indexClientShareChanges`
 * (zero lógica pura nova). Sem `previous`/`previousYear`, a saída é byte a byte
 * idêntica à histórica (5 colunas), preservando os chamadores/testes.
 */
export function clientConcentrationToCsv<C extends ContactRankLike & { role: string }>(
  concentration: ClientConcentration<C>,
  delimiter = DEFAULT_DELIMITER,
  previous?: ClientConcentration<C> | null,
  previousYear?: number | null,
): string {
  const withTrend = previous != null && previousYear != null;
  const lookup = withTrend ? indexClientShareChanges(concentration, previous) : null;

  const header = Array.from(CLIENT_CONCENTRATION_CSV_HEADERS) as string[];
  if (withTrend) header.push(`vs. ${previousYear} (p.p.)`);
  const out: string[][] = [header];

  let totalShows = 0;
  for (const row of concentration.rows) {
    totalShows += row.activeShows;
    const cols = [
      row.contact.name,
      contactRoleLabel(row.contact.role),
      String(row.activeShows),
      centsToCsvAmount(row.totalFee),
      csvShare(row.share),
    ];
    if (lookup) {
      const status = lookup(row.contact.id);
      cols.push(
        status.kind === "new"
          ? "novo"
          : status.kind === "changed"
            ? csvSignedPoints(status.change.shareDelta)
            : "",
      );
    }
    out.push(cols);
  }

  const totalCols = [
    "Total",
    "",
    String(totalShows),
    centsToCsvAmount(concentration.totalFee),
    "",
  ];
  if (withTrend) totalCols.push("");
  out.push(totalCols);

  return toCsv(out, delimiter);
}

// ── Cancelamentos por contratante (confiabilidade de quem contrata) ───────────

export const CANCELLATION_BY_CONTACT_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "Cancelados",
  "Shows",
  "Taxa (%)",
  "Cachê perdido (R$)",
  "Amostra",
] as const;

/**
 * Serializa a taxa de cancelamento por contratante (`cancellationByContact`) em
 * CSV, pronto para download. Espelha a tabela de `/contatos/cancelamentos`: uma
 * linha por contratante com ≥1 cancelamento (`report.rows`, já ordenado —
 * confiáveis primeiro, depois taxa desc, cancelados desc, cachê perdido desc,
 * nome pt-BR), com nº de cancelados, total de shows vinculados, a taxa (via
 * `csvShare`, "40%") e o cachê perdido somado. A coluna "Papel" entra para a
 * planilha abrir auto-suficiente (a tela a mostra como selo); a coluna "Amostra"
 * traduz o selo "amostra pequena" da UI ("Confiável"/"Amostra pequena", pelo
 * campo `reliable`).
 *
 * Encerra numa linha "Total" com os agregados da carteira (iguais aos cards do
 * topo da página): cancelados e cachê perdido somados batem com as linhas, mas
 * "Shows" é o total de **todos** os shows vinculados (inclusive os de
 * contratantes sem nenhum cancelamento, que não viram linha) — por isso a Taxa
 * do Total é a `overallRate` da carteira e a coluna "Amostra" traz "N cancelaram"
 * (nº de contratantes listados). Mesma convenção pt-BR dos irmãos. Pura.
 */
export function cancellationByContactToCsv<C extends ContactRankLike & { role: string }>(
  report: ContactCancellations<C>,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CANCELLATION_BY_CONTACT_CSV_HEADERS)];
  for (const row of report.rows) {
    out.push([
      row.contact.name,
      contactRoleLabel(row.contact.role),
      String(row.cancelledShows),
      String(row.totalShows),
      csvShare(row.cancellationRate),
      centsToCsvAmount(row.lostFee),
      row.reliable ? "Confiável" : "Amostra pequena",
    ]);
  }
  out.push([
    "Total",
    "",
    String(report.totalCancelled),
    String(report.totalShows),
    csvShare(report.overallRate),
    centsToCsvAmount(report.totalLostFee),
    `${report.contactCount} cancelaram`,
  ]);
  return toCsv(out, delimiter);
}

// ── Contatos para reativar (lista de follow-up dos dormentes) ─────────────────

export const REENGAGE_CSV_HEADERS = [
  "Contato",
  "Papel",
  "Último show",
  "Dias sem contato",
  "Shows",
  "Cachê histórico (R$)",
] as const;

/**
 * Serializa a lista de contatos dormentes (`findContactsToReengage`) em CSV,
 * pronto para download — a fila de follow-up que a tela `/contatos/reativar`
 * mostra, agora abrível na planilha para uma campanha de reativação. Emite uma
 * linha por contato dormente em `list.rows` (mesma ordem da página: mais
 * esquecidos primeiro, desempate por cachê histórico, depois nome pt-BR),
 * encerrada numa linha "Total" com a soma de shows passados e do cachê
 * histórico de toda a fila. Colunas: contato, papel, data do último show, dias
 * sem contato (o `daysSinceLastShow` cru, legível por máquina — não o "há 2
 * meses" da UI), nº de shows passados não cancelados e cachê histórico (por
 * contato). Mesma convenção pt-BR dos irmãos (delimitador ";", decimal com
 * vírgula). Pura.
 */
export function reengageToCsv<C extends ContactRankLike & { role: string }>(
  list: ReengageList<C>,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(REENGAGE_CSV_HEADERS)];
  let totalPastShows = 0;
  let totalFee = 0;
  for (const row of list.rows) {
    totalPastShows += row.pastShows;
    totalFee += row.totalFee;
    out.push([
      row.contact.name,
      contactRoleLabel(row.contact.role),
      csvDate(row.lastShowDate),
      String(row.daysSinceLastShow),
      String(row.pastShows),
      centsToCsvAmount(row.totalFee),
    ]);
  }
  out.push(["Total", "", "", "", String(totalPastShows), centsToCsvAmount(totalFee)]);
  return toCsv(out, delimiter);
}

// ── Praças para revisitar (cidades dormentes com histórico e nada agendado) ───

export const CITIES_REENGAGE_CSV_HEADERS = [
  "Cidade",
  "Último show",
  "Dias sem tocar",
  "Shows",
  "Cachê histórico (R$)",
] as const;

/**
 * Serializa a lista de cidades dormentes (`findCitiesToReengage`) em CSV, pronto
 * para download — espelha a tabela de `/shows/cidades/revisitar`. Irmão de
 * `reengageToCsv` no eixo geográfico (cidade em vez de contato/papel): emite uma
 * linha por praça em `list.rows` (mesma ordem da página: mais esquecidas
 * primeiro, desempate pelo cachê histórico, depois nome pt-BR), encerrada numa
 * linha "Total" com a soma de shows passados e do cachê histórico de toda a
 * fila. Colunas: cidade, data do último show, dias sem tocar (o
 * `daysSinceLastShow` cru, legível por máquina — não o "há 2 meses" da UI), nº
 * de shows passados não cancelados e cachê histórico (por cidade). Mesma
 * convenção pt-BR dos irmãos (delimitador ";", decimal com vírgula). Pura.
 */
export function citiesToReengageToCsv(
  list: CityReengageList,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CITIES_REENGAGE_CSV_HEADERS)];
  let totalPastShows = 0;
  let totalFee = 0;
  for (const row of list.rows) {
    totalPastShows += row.pastShows;
    totalFee += row.totalFee;
    out.push([
      row.name,
      csvDate(row.lastShowDate),
      String(row.daysSinceLastShow),
      String(row.pastShows),
      centsToCsvAmount(row.totalFee),
    ]);
  }
  out.push(["Total", "", "", String(totalPastShows), centsToCsvAmount(totalFee)]);
  return toCsv(out, delimiter);
}

export const VENUES_REENGAGE_CSV_HEADERS = [
  "Local",
  "Último show",
  "Dias sem tocar",
  "Shows",
  "Cachê histórico (R$)",
] as const;

/**
 * Serializa a lista de casas/venues dormentes (`findVenuesToReengage`) em CSV,
 * pronto para download — espelha a tabela de `/shows/locais/revisitar`. Irmão de
 * `citiesToReengageToCsv` um nível abaixo na hierarquia geográfica (casa em vez
 * de cidade): emite uma linha por casa em `list.rows` (mesma ordem da página:
 * mais esquecidas primeiro, desempate pelo cachê histórico, depois nome pt-BR),
 * encerrada numa linha "Total" com a soma de shows passados e do cachê histórico
 * de toda a fila. Colunas: local, data do último show, dias sem tocar (o
 * `daysSinceLastShow` cru, legível por máquina), nº de shows passados não
 * cancelados e cachê histórico (por casa). Mesma convenção pt-BR dos irmãos
 * (delimitador ";", decimal com vírgula). Pura.
 */
export function venuesToReengageToCsv(
  list: VenueReengageList,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(VENUES_REENGAGE_CSV_HEADERS)];
  let totalPastShows = 0;
  let totalFee = 0;
  for (const row of list.rows) {
    totalPastShows += row.pastShows;
    totalFee += row.totalFee;
    out.push([
      row.name,
      csvDate(row.lastShowDate),
      String(row.daysSinceLastShow),
      String(row.pastShows),
      centsToCsvAmount(row.totalFee),
    ]);
  }
  out.push(["Total", "", "", String(totalPastShows), centsToCsvAmount(totalFee)]);
  return toCsv(out, delimiter);
}

// ── Crescimento ano a ano (a trajetória de longo prazo da carreira) ───────────

export const YEARLY_HISTORY_CSV_HEADERS = [
  "Ano",
  "Receitas (R$)",
  "Despesas (R$)",
  "Resultado (R$)",
  "Variação do resultado (%)",
] as const;

/**
 * Serializa o crescimento ano a ano (`yearlyHistory`) em CSV, pronto para
 * download — espelha a tabela "Ano a ano" de `/financas/crescimento`. Uma linha
 * por ano COM movimento (receita ou despesa > 0), em ordem cronológica crescente,
 * com receitas, despesas e resultado (regime de competência) do ano, encerrada
 * numa linha "Total" com os somatórios da série (os mesmos números do rodapé da
 * tabela). Colunas: ano, receitas, despesas, resultado e a variação relativa do
 * resultado frente ao ano ativo anterior (`netDelta`, via `csvDeltaPct`:
 * "+25%"/"-30%"/"0%"/"novo"). O primeiro ano não tem base de comparação → a célula
 * de variação fica vazia; a linha "Total" também (a trajetória de longo prazo
 * `trend` é uma comparação distinta — último vs. primeiro ano —, não ano a ano).
 *
 * Diferente da página (que oculta a variação quando o ano anterior teve resultado
 * 0, para não exibir "novo"), o CSV emite "novo" nesses casos, mantendo a mesma
 * convenção legível por máquina de `categoryVariationToCsv`. Mesma convenção pt-BR
 * dos irmãos (delimitador ";", decimal com vírgula). Pura.
 */
export function yearlyHistoryToCsv(
  history: YearlyHistory,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(YEARLY_HISTORY_CSV_HEADERS)];
  for (const y of history.years) {
    out.push([
      String(y.year),
      centsToCsvAmount(y.income),
      centsToCsvAmount(y.expense),
      centsToCsvAmount(y.net),
      y.netDelta ? csvDeltaPct(y.netDelta) : "",
    ]);
  }
  out.push([
    "Total",
    centsToCsvAmount(history.totalIncome),
    centsToCsvAmount(history.totalExpense),
    centsToCsvAmount(history.net),
    "",
  ]);
  return toCsv(out, delimiter);
}

// ── Fluxo de caixa mês a mês (a textura por trás do burn rate) ────────────────

export const CASH_FLOW_CSV_HEADERS = [
  "Mês",
  "Recebido (R$)",
  "Pago (R$)",
  "Líquido (R$)",
] as const;

/**
 * Serializa o fluxo de caixa realizado mês a mês (`cashFlowByMonth`) em CSV,
 * pronto para download — espelha a tira "Cenário alternativo · ritmo de gasto
 * real" de `/financas/folego-de-caixa`. Uma linha por mês da janela de burn rate,
 * em ordem cronológica crescente, com o recebido, o pago e o líquido (recebido −
 * pago) do mês, encerrada numa linha "Total" com os somatórios da janela (o
 * `received`/`paid`/`net` agregados, cujo `net ÷ janela` reproduz o `avgMonthlyNet`
 * de `cashBurnRunway`).
 *
 * Diferente de `gigCadenceToCsv`/`feeTrendToCsv` (que só emitem meses ativos), o
 * CSV emite **todos** os meses da janela, inclusive os zerados: numa série de
 * caixa um mês de líquido 0 é informação (preserva a textura da tira, que mostra a
 * janela inteira). A coluna "Mês" usa a chave ISO "YYYY-MM" (ordenável por
 * máquina), e não o rótulo curto "jan" da UI. Mesma convenção pt-BR dos irmãos
 * (delimitador ";", decimal com vírgula). Pura.
 */
export function cashFlowToCsv(
  months: CashFlowMonth[],
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CASH_FLOW_CSV_HEADERS)];
  let totalReceived = 0;
  let totalPaid = 0;
  for (const m of months) {
    out.push([
      m.monthKey,
      centsToCsvAmount(m.received),
      centsToCsvAmount(m.paid),
      centsToCsvAmount(m.net),
    ]);
    totalReceived += m.received;
    totalPaid += m.paid;
  }
  out.push([
    "Total",
    centsToCsvAmount(totalReceived),
    centsToCsvAmount(totalPaid),
    centsToCsvAmount(totalReceived - totalPaid),
  ]);
  return toCsv(out, delimiter);
}

// ── Projeção de caixa (saldo projetado mês a mês) ─────────────────────────────

export const CASHFLOW_PROJECTION_CSV_HEADERS = [
  "Mês",
  "A receber (R$)",
  "A pagar (R$)",
  "Variação (R$)",
  "Saldo ao fim (R$)",
] as const;

/**
 * Serializa a projeção de caixa (`projectCashflow`) em CSV, pronto para download —
 * espelha a tabela "Mês a mês" de `/financas/fluxo-de-caixa`. Uma linha por mês do
 * horizonte (do mês atual em diante, ordem cronológica crescente), com o a receber,
 * o a pagar, a variação (a receber − a pagar) e o **saldo de caixa projetado ao fim
 * do mês** (acumulado a partir do caixa realizado atual).
 *
 * Diferente de `cashFlowToCsv` (caixa realizado, sem saldo acumulado), aqui a coluna
 * "Saldo ao fim" carrega o saldo corrente do mês — por isso a linha "Total" traz a
 * soma do a receber/a pagar/variação do horizonte e, na última coluna, o **saldo
 * projetado final** (= caixa atual + soma das variações = "Saldo ao fim" do último
 * mês), não uma soma de saldos (que não teria sentido). Como em `cashFlowToCsv`,
 * emite **todos** os meses do horizonte, inclusive os sem pendência (variação 0):
 * num runway de caixa um mês parado ainda move a linha do tempo do saldo. A coluna
 * "Mês" usa a chave ISO "YYYY-MM" (ordenável), não o rótulo curto da UI. Mesma
 * convenção pt-BR dos irmãos (";" e decimal com vírgula). Pura.
 */
export function cashflowProjectionToCsv(
  projection: CashflowProjection,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(CASHFLOW_PROJECTION_CSV_HEADERS)];
  let totalIncome = 0;
  let totalExpense = 0;
  for (const m of projection.months) {
    out.push([
      m.month,
      centsToCsvAmount(m.income),
      centsToCsvAmount(m.expense),
      centsToCsvAmount(m.net),
      centsToCsvAmount(m.endBalance),
    ]);
    totalIncome += m.income;
    totalExpense += m.expense;
  }
  // Saldo final projetado: "Saldo ao fim" do último mês, ou o caixa atual se o
  // horizonte estiver vazio (nunca acontece: horizonte mínimo é 1).
  const endBalance =
    projection.months.length > 0
      ? projection.months[projection.months.length - 1].endBalance
      : projection.startBalance;
  out.push([
    "Total",
    centsToCsvAmount(totalIncome),
    centsToCsvAmount(totalExpense),
    centsToCsvAmount(totalIncome - totalExpense),
    centsToCsvAmount(endBalance),
  ]);
  return toCsv(out, delimiter);
}

// ── Receita agendada (pipeline de cachês futuros mês a mês) ───────────────────

export const BOOKED_REVENUE_CSV_HEADERS = [
  "Mês",
  "Shows",
  "Confirmado (R$)",
  "A confirmar (R$)",
  "Total do mês (R$)",
] as const;

/**
 * Serializa a receita agendada (`forecastBookedRevenue`) em CSV, pronto para
 * download — espelha a tabela "Receita agendada" de `/shows/receita-agendada`.
 * Uma linha por mês COM shows futuros (`forecast.months`, em ordem cronológica
 * crescente), com a contagem de shows, o valor já confirmado (CONFIRMED/PLAYED),
 * o ainda a confirmar (PROPOSED/sem status) e o total do mês (confirmado + a
 * confirmar), encerrada numa linha "Total" com os agregados da tela
 * (`count`/`confirmedTotal`/`tentativeTotal`/`total` — os mesmos números dos
 * cards de destaque).
 *
 * Como em `gigCadenceToCsv`/`feeTrendToCsv`, a coluna "Mês" usa a chave ISO
 * "YYYY-MM" (ordenável por máquina), e não o rótulo amigável "Jan 2026" da UI, e
 * só meses com shows viram linha (a janela é aberta, do mês corrente em diante).
 * A barra confirmado/total da página (informação visual, não tabular) não tem
 * coluna; as colunas Confirmado/A confirmar já decompõem o total. Mesma convenção
 * pt-BR dos irmãos (delimitador ";", decimal com vírgula). Pura.
 */
export function bookedRevenueToCsv(
  forecast: BookedRevenueForecast,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(BOOKED_REVENUE_CSV_HEADERS)];
  for (const m of forecast.months) {
    out.push([
      m.month,
      String(m.count),
      centsToCsvAmount(m.confirmed),
      centsToCsvAmount(m.tentative),
      centsToCsvAmount(m.total),
    ]);
  }
  out.push([
    "Total",
    String(forecast.count),
    centsToCsvAmount(forecast.confirmedTotal),
    centsToCsvAmount(forecast.tentativeTotal),
    centsToCsvAmount(forecast.total),
  ]);
  return toCsv(out, delimiter);
}

// ── Funil de propostas (onde estão os shows hoje) ───────────────────────────

export const PIPELINE_CSV_HEADERS = [
  "Etapa",
  "Shows",
  "Participação",
  "Cachê (R$)",
] as const;

/**
 * Serializa o funil de propostas (`showPipeline`) em CSV, pronto para download —
 * espelha a tabela "Shows por etapa" de `/shows/funil`. Uma linha por etapa, na
 * mesma ordem da página (`pipeline.stages`, isto é, `PIPELINE_STAGE_ORDER`:
 * proposto → confirmado → realizado → cancelado), com a contagem de shows, a
 * participação no total (o mesmo `pct` da barra da página) e o cachê somado da
 * etapa, encerrada numa linha "Total" com o total de shows e a soma de todos os
 * cachês.
 *
 * O funil é um RETRATO do estado atual (não um histórico de conversão), então
 * todas as quatro etapas viram linha — inclusive cancelados, presentes na tela.
 * A participação do "Total" fica em branco (é 100% por construção, como em
 * `incomeMixToCsv`). A taxa de concretização (`conversionRate`) é um escalar de
 * destaque, não tabular, e não vira coluna — as colunas Shows/Participação já
 * decompõem cada etapa. Mesma convenção pt-BR dos irmãos (delimitador ";",
 * decimal com vírgula). Pura.
 */
export function pipelineToCsv(
  pipeline: ShowPipeline,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(PIPELINE_CSV_HEADERS)];
  let feeTotal = 0;
  for (const stage of pipeline.stages) {
    feeTotal += stage.fee;
    const share = pipeline.total > 0 ? stage.count / pipeline.total : 0;
    out.push([
      SHOW_STATUS_LABELS[stage.status as ShowStatus],
      String(stage.count),
      csvShare(share),
      centsToCsvAmount(stage.fee),
    ]);
  }
  out.push(["Total", String(pipeline.total), "", centsToCsvAmount(feeTotal)]);
  return toCsv(out, delimiter);
}

export const STAGE_DURATIONS_CSV_HEADERS = [
  "Etapa",
  "Transições",
  "Mediana (dias)",
  "Média (dias)",
  "Mín (dias)",
  "Máx (dias)",
] as const;

/**
 * Serializa o tempo de permanência por etapa do funil (`funnelStageDurations`)
 * em CSV, pronto para download — espelha a tabela "Detalhe" de
 * `/shows/funil/tempo-em-etapa`. Uma linha por etapa com amostra, na mesma ordem
 * da página (`durations.stages`, isto é, a ordem canônica do funil), com o nº de
 * transições cronometradas que saíram da etapa e mediana/média/mín/máx de dias,
 * encerrada numa linha "Total" com o total de transições (`totalSamples`).
 *
 * Diferente da tela (que escreve "N dias"), o CSV emite o inteiro de dias cru
 * (legível por máquina/ordenável), mesma convenção de `bookingLeadTimeToCsv`. As
 * colunas mediana/média/mín/máx do "Total" ficam em branco: não há agregado
 * honesto entre etapas (a mediana do conjunto não se recompõe das medianas por
 * etapa), como a participação em branco de `pipelineToCsv`. Sem amostra
 * (`totalSamples === 0`) sai só cabeçalho + Total zerado. Mesma convenção pt-BR
 * dos irmãos (delimitador ";"). Pura.
 */
export function stageDurationsToCsv(
  durations: FunnelStageDurations,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(STAGE_DURATIONS_CSV_HEADERS)];
  for (const stage of durations.stages) {
    out.push([
      showStatusLabel(stage.status),
      String(stage.count),
      String(stage.medianDays),
      String(stage.averageDays),
      String(stage.shortestDays),
      String(stage.longestDays),
    ]);
  }
  out.push(["Total", String(durations.totalSamples), "", "", "", ""]);
  return toCsv(out, delimiter);
}

// ── Funil por contratante (pipeline aberto por quem paga) ────────────────────

export const PIPELINE_BY_CONTACT_CSV_HEADERS = [
  "Contratante",
  "Papel",
  "Em aberto (R$)",
  "Shows em aberto",
  "Em negociação (R$)",
  "Propostos",
  "Confirmado (R$)",
  "Confirmados",
  "Concretização (%)",
  "Realizados",
  "Decididos",
] as const;

/**
 * Serializa o funil por contratante (`pipelineByContact`) em CSV, pronto para
 * download — espelha a tabela de `/contatos/funil`. Uma linha por contratante
 * com pipeline aberto (`report.rows`, já ordenado: maior cachê em aberto
 * primeiro), com o cachê em aberto (PROPOSED + CONFIRMED) e sua contagem, os
 * cortes em negociação (PROPOSED) e confirmado (CONFIRMED) com contagens, e a
 * taxa de concretização histórica com os shows realizados/decididos que a
 * originam. A coluna "Papel" entra para a planilha abrir auto-suficiente (a tela
 * a mostra como selo). A "Concretização (%)" fica em branco quando o contratante
 * ainda não teve nenhum show decidido (o "—" da UI).
 *
 * Encerra numa linha "Total" com os agregados da carteira: cachê em aberto,
 * shows em aberto, em negociação e confirmado somados, e a concretização geral
 * (`overallConversionRate`, sobre TODOS os contatos com shows — não só os
 * listados). As contagens por etapa (Propostos/Confirmados/Realizados/Decididos)
 * ficam em branco no Total porque o helper só expõe esses totais em valor, não
 * em contagem, na carteira — e somar as linhas subestimaria (contatos sem
 * pipeline aberto não viram linha mas entram na `overallConversionRate`), a
 * mesma distinção linhas×carteira de `cancellationByContactToCsv`. Mesma
 * convenção pt-BR dos irmãos (delimitador ";", decimal com vírgula). Pura.
 */
export function pipelineByContactToCsv<C extends ContactRankLike & { role: string }>(
  report: ContactPipeline<C>,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(PIPELINE_BY_CONTACT_CSV_HEADERS)];
  for (const row of report.rows) {
    out.push([
      row.contact.name,
      contactRoleLabel(row.contact.role),
      centsToCsvAmount(row.openValue),
      String(row.openCount),
      centsToCsvAmount(row.proposedValue),
      String(row.proposedCount),
      centsToCsvAmount(row.confirmedValue),
      String(row.confirmedCount),
      row.conversionRate == null ? "" : csvShare(row.conversionRate),
      String(row.playedCount),
      String(row.decidedCount),
    ]);
  }
  out.push([
    "Total",
    "",
    centsToCsvAmount(report.totalOpenValue),
    String(report.totalOpenCount),
    centsToCsvAmount(report.totalProposedValue),
    "",
    centsToCsvAmount(report.totalConfirmedValue),
    "",
    report.overallConversionRate == null
      ? ""
      : csvShare(report.overallConversionRate),
    "",
    "",
  ]);
  return toCsv(out, delimiter);
}

// ── Agenda de contas a pagar/receber (o que vence quando) ───────────────────

export const DUE_AGENDA_CSV_HEADERS = [
  "Vencimento",
  "Descrição",
  "Categoria",
  "Janela",
  "Tipo",
  "Dias até vencer",
  "Show",
  "A receber (R$)",
  "A pagar (R$)",
] as const;

/**
 * Forma mínima de uma transação pendente para a exportação da agenda. Estende
 * `TxLike` (de `@/lib/finance`) com a descrição (sempre presente na tela) e o
 * show vinculado, mantendo o serializador desacoplado do Prisma. É a transação
 * que `buildDueAgenda` distribui nas janelas de vencimento.
 */
export interface DueAgendaCsvTx extends TxLike {
  description?: string | null;
  show?: { title: string } | null;
}

/**
 * Serializa a agenda de contas a pagar e a receber (`buildDueAgenda`) em CSV,
 * pronto para download. Espelha a página `/financas/agenda`: uma linha por
 * pendência, achatando as quatro janelas na ordem canônica (vencidas → hoje →
 * próximos 7 dias → mais tarde) e, dentro de cada janela, por vencimento
 * crescente (a ordem que `buildDueAgenda` já produz). A coluna "Dias até vencer"
 * traz o `daysUntil` cru (negativo = vencida há N dias; 0 = hoje), legível por
 * máquina, e não o texto relativo ("venceu há 2 dias") da UI. O valor é
 * decomposto em duas colunas (A receber / A pagar) — cada linha preenche só uma,
 * conforme o tipo — de modo que cada coluna some direto na planilha (os totais
 * batem com os cards "A receber"/"A pagar" da tela). Encerra numa linha "Total"
 * com `totalIncome`/`totalExpense`. Mesma convenção pt-BR dos irmãos (delimitador
 * ";", decimal com vírgula, datas em UTC via `csvDate`). Pura.
 */
export function dueAgendaToCsv(
  agenda: DueAgenda<DueAgendaCsvTx>,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(DUE_AGENDA_CSV_HEADERS)];
  for (const bucket of agenda.buckets) {
    for (const { tx, daysUntil } of bucket.items) {
      const isIncome = tx.type === "INCOME";
      out.push([
        csvDate(tx.date),
        tx.description ?? "",
        tx.category,
        DUE_BUCKET_LABELS[bucket.key],
        isIncome ? "A receber" : "A pagar",
        String(daysUntil),
        tx.show?.title ?? "",
        isIncome ? centsToCsvAmount(tx.amount) : "0,00",
        isIncome ? "0,00" : centsToCsvAmount(tx.amount),
      ]);
    }
  }
  out.push([
    "Total",
    "",
    "",
    "",
    "",
    "",
    "",
    centsToCsvAmount(agenda.totalIncome),
    centsToCsvAmount(agenda.totalExpense),
  ]);
  return toCsv(out, delimiter);
}

// ── Ritmo do ano (acumulado YTD vs. mesmo período do ano anterior) ────────────

export const YEAR_PACE_CSV_HEADERS = [
  "Métrica",
  "Ano corrente (R$)",
  "Mesmo período do ano anterior (R$)",
  "Variação (%)",
] as const;

/** Variação relativa (`pct` de um MetricDelta) -> "+25%" / "-30%" / "0%" / "" (sem base). */
function csvSignedPct(pct: number | null): string {
  if (pct === null) return "";
  const rounded = Math.round(pct * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * Serializa o ritmo do ano (`yearToDatePace`) em CSV, pronto para download —
 * espelha a tabela "{ano} × {ano-1} (mesmo período)" de `/financas/ritmo-do-ano`.
 * Uma linha por métrica (Receitas → Despesas → Resultado, a ordem da página), com
 * o acumulado do ano corrente (1º jan → corte), o acumulado do ano anterior até o
 * **mesmo** mês/dia e a variação relativa entre os dois.
 *
 * É comparação igual-com-igual (mesma fração do ano dos dois lados), não uma
 * projeção do fechamento (isso é `projectYearEnd`/`cashflowProjectionToCsv`) nem
 * anos fechados inteiros (`annualSummaryToCsv`/`crescimento`). As colunas de ano
 * ficam genéricas ("Ano corrente"/"do ano anterior") porque os anos concretos vão
 * no nome do arquivo (`ritmo-do-ano-{ano}.csv`) — como o horizonte vai no nome em
 * `cashflowProjectionToCsv`. A variação herda o `pct` do MetricDelta: "" quando não
 * há base de comparação (sem receita/despesa no período do ano anterior), espelhando
 * o "—" da UI. Sem linha "Total" (as três métricas não somam entre si: Resultado já
 * é Receitas − Despesas). Mesma convenção pt-BR dos irmãos (";" e decimal com
 * vírgula). Pura.
 */
export function yearPaceToCsv(pace: YearToDatePace, delimiter = DEFAULT_DELIMITER): string {
  const out: string[][] = [Array.from(YEAR_PACE_CSV_HEADERS)];
  const rows: Array<[string, MetricDelta]> = [
    ["Receitas", pace.incomeVsLastYear],
    ["Despesas", pace.expenseVsLastYear],
    ["Resultado", pace.netVsLastYear],
  ];
  for (const [label, delta] of rows) {
    out.push([
      label,
      centsToCsvAmount(delta.current),
      centsToCsvAmount(delta.previous),
      csvSignedPct(delta.pct),
    ]);
  }
  return toCsv(out, delimiter);
}

// ── Ponto de equilíbrio (shows/mês para cobrir o custo fixo) ──────────────────

export const BREAK_EVEN_CSV_HEADERS = ["Métrica", "Valor"] as const;

/** Ritmo de shows/mês -> uma casa decimal com vírgula pt-BR ("2,3"). */
function csvRate(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/**
 * Serializa o ponto de equilíbrio (`computeBreakEven`) em CSV, pronto para
 * download — uma fotografia dos números por trás de `/financas/ponto-de-equilibrio`.
 * Diferente dos exports por linha (uma linha = um contratante/mês/show), aqui o
 * relatório é um punhado de métricas heterogêneas (dinheiro, contagem, ritmo,
 * veredito), então a forma honesta é chave→valor: coluna "Métrica" + coluna
 * "Valor", uma linha por número, na mesma ordem que a página lê (a meta primeiro,
 * depois os três blocos da conta, depois o veredito). Serve para colar num plano
 * de negócio ou acompanhar como a meta de shows/mês se move ao longo do tempo.
 *
 * Convenções pt-BR dos irmãos: dinheiro via `centsToCsvAmount` (vírgula decimal),
 * o ritmo com uma casa (`csvRate`, também vírgula), contagem inteira crua. Quando
 * a meta não é estimável (`showsNeeded == null`: sem shows realizados ou show médio
 * sem sobra), a linha "Shows/mês para o equilíbrio" e o veredito saem em branco —
 * espelhando o "não dá para estimar" da UI. Sem linha "Total" (as métricas não
 * somam entre si). Pura. O chamador só emite quando há custo fixo a cobrir
 * (`monthlyFixedCost > 0`), o mesmo gate do botão e do estado-vazio da página.
 */
export function breakEvenToCsv(
  analysis: BreakEvenAnalysis,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(BREAK_EVEN_CSV_HEADERS)];
  out.push(["Custo fixo mensal (R$)", centsToCsvAmount(analysis.monthlyFixedCost)]);
  out.push(["Resultado médio por show (R$)", centsToCsvAmount(analysis.avgNetPerShow)]);
  out.push(["Shows realizados considerados", String(analysis.showsConsidered)]);
  out.push(["Ritmo atual (shows/mês)", csvRate(analysis.avgShowsPerMonth)]);
  out.push([
    "Shows/mês para o equilíbrio",
    analysis.showsNeeded == null ? "" : String(analysis.showsNeeded),
  ]);
  out.push([
    "Cobre o custo fixo?",
    analysis.covered == null ? "" : analysis.covered ? "Sim" : "Não",
  ]);
  return toCsv(out, delimiter);
}

// ── Ritmo do mês (projeção do mês corrente vs. mês típico e vs. ano anterior) ──

export const MONTH_PACE_CSV_HEADERS = [
  "Base de comparação",
  "Métrica",
  "Projeção do mês (R$)",
  "Comparação (R$)",
  "Variação (%)",
] as const;

/**
 * Serializa o ritmo do mês (`currentMonthPace` + `monthYoYPace`) em CSV, pronto
 * para download — espelha as duas tabelas de `/financas/ritmo-do-mes`:
 * "Projeção do mês × mês típico" e "Mesmo mês no ano passado".
 *
 * Achata os dois eixos numa única tabela com a coluna "Base de comparação"
 * separando o "Mês típico" (a média móvel dos meses fechados com movimento) do
 * "Mesmo mês do ano anterior" (âncora sazonal, mês cheio já fechado). Dentro de
 * cada eixo, uma linha por métrica (Receitas → Despesas → Resultado, a ordem da
 * página). A coluna "Projeção do mês" é o `current` do MetricDelta — a mesma
 * projeção pro-rata do fechamento do mês corrente, idêntica nos dois eixos (como
 * na UI); a "Comparação" é o `previous` (a baseline do eixo); e a "Variação"
 * herda o `pct` (assinada via `csvSignedPct`, "" quando não há base — espelhando
 * o "—" da UI / o veredito `insufficient`).
 *
 * Sem linha "Total" (as métricas não somam entre si: Resultado já é Receitas −
 * Despesas, como em `yearPaceToCsv`). O eixo do ano anterior é **sempre** emitido,
 * inclusive quando não há movimento no mês de referência (Comparação 0,00,
 * Variação em branco) — mantém o arquivo auto-suficiente e legível por máquina,
 * embora a página oculte essa tabela nesse caso. A janela do "mês típico" e o
 * recorte do mês corrente já vêm resolvidos no `pace`/`yoy`; o nome do arquivo
 * carrega a janela. Mesma convenção pt-BR dos irmãos (";" e decimal com vírgula).
 * Pura.
 */
export function monthPaceToCsv(
  pace: MonthPace,
  yoy: MonthYoYPace,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(MONTH_PACE_CSV_HEADERS)];
  const sections: Array<[string, Array<[string, MetricDelta]>]> = [
    [
      "Mês típico",
      [
        ["Receitas", pace.incomeVsBaseline],
        ["Despesas", pace.expenseVsBaseline],
        ["Resultado", pace.netVsBaseline],
      ],
    ],
    [
      "Mesmo mês do ano anterior",
      [
        ["Receitas", yoy.incomeVsLastYear],
        ["Despesas", yoy.expenseVsLastYear],
        ["Resultado", yoy.netVsLastYear],
      ],
    ],
  ];
  for (const [base, rows] of sections) {
    for (const [label, delta] of rows) {
      out.push([
        base,
        label,
        centsToCsvAmount(delta.current),
        centsToCsvAmount(delta.previous),
        csvSignedPct(delta.pct),
      ]);
    }
  }
  return toCsv(out, delimiter);
}

// ── Meta de faturamento por mês (a meta anual quebrada em 12 alvos) ────────────

export const MONTHLY_GOAL_CSV_HEADERS = [
  "Mês",
  "Alvo (R$)",
  "Recebido (R$)",
  "Falta (R$)",
  "Atingido (%)",
  "Situação",
] as const;

/** Rótulo pt-BR do status mensal — espelha o `GOAL_STATUS` de `/financas/metas`. */
const MONTH_GOAL_STATUS_LABELS: Record<MonthGoalStatus, string> = {
  hit: "Batido",
  missed: "Abaixo",
  "in-progress": "Em andamento",
  upcoming: "A seguir",
};

/**
 * Serializa a quebra mensal da meta de faturamento (`monthlyGoalProgress`) em
 * CSV, pronto para download — espelha o card "Meta por mês" de `/financas/metas`,
 * a meta anual dividida em 12 alvos iguais cruzados com o recebido (caixa) de cada
 * mês. Uma linha por mês (jan→dez), com o alvo do mês, o recebido, quanto falta
 * (`remaining`), o percentual atingido (via `csvShare`, como na página) e a
 * situação rotulada (Batido/Abaixo/Em andamento/A seguir).
 *
 * Encerra numa linha "Total" cujo alvo é a meta anual e cujo recebido é a soma
 * dos 12 meses (a participação do Total fica em branco — 100% por construção,
 * como nos irmãos `clientConcentrationToCsv`/`incomeMixToCsv`); a coluna Situação
 * do Total resume os meses batidos ("N/12 batidos"). O ano concreto vai no nome do
 * arquivo (`metas-mensal-{ano}.csv`), por isso não vira coluna — como em
 * `yearPaceToCsv`. Mesma convenção pt-BR dos irmãos (";" e decimal com vírgula).
 * Pura.
 */
export function monthlyGoalProgressToCsv(
  monthly: MonthlyGoalProgress,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(MONTHLY_GOAL_CSV_HEADERS)];
  for (const m of monthly.months) {
    out.push([
      m.label,
      centsToCsvAmount(m.target),
      centsToCsvAmount(m.realized),
      centsToCsvAmount(m.remaining),
      csvShare(m.ratio),
      MONTH_GOAL_STATUS_LABELS[m.status],
    ]);
  }
  out.push([
    "Total",
    centsToCsvAmount(monthly.goal),
    centsToCsvAmount(monthly.realized),
    centsToCsvAmount(Math.max(0, monthly.goal - monthly.realized)),
    "",
    `${monthly.hitCount}/12 batidos`,
  ]);
  return toCsv(out, delimiter);
}

export const QUARTERLY_GOAL_CSV_HEADERS = [
  "Trimestre",
  "Alvo (R$)",
  "Recebido (R$)",
  "Falta (R$)",
  "Atingido (%)",
  "Situação",
] as const;

/**
 * Serializa a quebra trimestral da meta de faturamento (`quarterlyGoalProgress`)
 * em CSV — espelho mais grosso de `monthlyGoalProgressToCsv` (a meta anual em 4
 * alvos iguais em vez de 12), reflete o card "Meta por trimestre" de
 * `/financas/metas`. Uma linha por trimestre (1º→4º tri), com o alvo do trimestre,
 * o recebido (caixa), quanto falta (`remaining`), o percentual atingido (via
 * `csvShare`) e a situação rotulada (Batido/Abaixo/Em andamento/A seguir), reusando
 * o mesmo `MONTH_GOAL_STATUS_LABELS` (o status trimestral é o mesmo union do mensal).
 *
 * Encerra numa linha "Total" cujo alvo é a meta anual e cujo recebido é a soma dos
 * 4 trimestres (a participação do Total fica em branco — 100% por construção, como
 * no irmão mensal); a coluna Situação do Total resume os trimestres batidos
 * ("N/4 batidos"). O ano concreto vai no nome do arquivo
 * (`metas-trimestral-{ano}.csv`), por isso não vira coluna. Mesma convenção pt-BR
 * dos irmãos (";" e decimal com vírgula). Pura.
 */
export function quarterlyGoalProgressToCsv(
  quarterly: QuarterlyGoalProgress,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(QUARTERLY_GOAL_CSV_HEADERS)];
  for (const q of quarterly.quarters) {
    out.push([
      q.label,
      centsToCsvAmount(q.target),
      centsToCsvAmount(q.realized),
      centsToCsvAmount(q.remaining),
      csvShare(q.ratio),
      MONTH_GOAL_STATUS_LABELS[q.status],
    ]);
  }
  out.push([
    "Total",
    centsToCsvAmount(quarterly.goal),
    centsToCsvAmount(quarterly.realized),
    centsToCsvAmount(Math.max(0, quarterly.goal - quarterly.realized)),
    "",
    `${quarterly.hitCount}/4 batidos`,
  ]);
  return toCsv(out, delimiter);
}

// ── Fins de semana livres (oportunidades de booking sexta→domingo) ────────────

export const OPEN_WEEKENDS_CSV_HEADERS = [
  "De",
  "Até",
  "Situação",
  "Shows",
  "Cachê marcado (R$)",
] as const;

/**
 * Serializa o mapa de fins de semana livres (`findOpenWeekends`) em CSV, pronto
 * para download — espelha a lista de `/shows/fins-de-semana-livres`. Emite uma
 * linha por fim de semana da janela (`report.weekends`, do mais próximo ao mais
 * distante, do jeito que a tela mostra), com a sexta e o domingo que o delimitam
 * (datas "DD/MM/AAAA" em UTC, via `csvDate`, em vez do rótulo "13–15 de mar" da
 * UI — abrem ordenáveis e auto-suficientes na planilha), a situação
 * (Livre/Ocupado), o número de shows não cancelados naquele fim de semana e o
 * cachê somado deles. Diferente das séries de eixo aberto (`gigCadenceToCsv`),
 * a janela INTEIRA vira linha, inclusive os fins de semana livres (cujo "Shows"
 * é 0 e o cachê fica zerado) — é justamente o vazio que a tela quer destacar.
 * Encerra numa linha "Total": a coluna Situação resume os livres ("N/M livres"),
 * "Shows" soma os shows da janela e o cachê soma os cachês marcados. Mesma
 * convenção pt-BR dos irmãos (delimitador ";", decimal com vírgula). Pura.
 */
export function openWeekendsToCsv(
  report: OpenWeekendsReport,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(OPEN_WEEKENDS_CSV_HEADERS)];
  let totalShows = 0;
  let totalFee = 0;
  for (const w of report.weekends) {
    const weekendFee = w.shows.reduce((sum, s) => sum + (s.fee ?? 0), 0);
    totalShows += w.shows.length;
    totalFee += weekendFee;
    out.push([
      csvDate(w.days[0]),
      csvDate(w.days[2]),
      w.open ? "Livre" : "Ocupado",
      String(w.shows.length),
      centsToCsvAmount(weekendFee),
    ]);
  }
  out.push([
    "Total",
    "",
    `${report.openCount}/${report.total} livres`,
    String(totalShows),
    centsToCsvAmount(totalFee),
  ]);
  return toCsv(out, delimiter);
}

// ── Conflitos de agenda (dias com 2+ shows não cancelados) ────────────────────

export const SCHEDULE_CONFLICTS_CSV_HEADERS = [
  "Dia",
  "Situação",
  "Show",
  "Horário",
  "Local",
  "Cidade",
  "Status",
  "Cachê (R$)",
] as const;

/**
 * Serializa os conflitos de agenda (`findScheduleConflicts`) em CSV, pronto para
 * download — espelha a página `/shows/conflitos`. Diferente dos irmãos que emitem
 * uma linha por dia/categoria, aqui o detalhe que importa é cada show envolvido,
 * então a tabela é achatada: **uma linha por show** dos dias em conflito, na
 * ordem da tela (dias em ordem cronológica crescente; dentro de cada dia, os
 * shows como `findScheduleConflicts` já os entrega — por horário, depois título).
 *
 * O "Dia" repete em cada show do mesmo dia (planilha auto-suficiente, ordenável e
 * filtrável); a "Situação" reproduz o veredito da página ("A resolver" para os
 * dias de hoje em diante, "Passado" para os já vividos). "Horário" sai em UTC
 * (como a UI, via `csvTime`); "Status" usa os mesmos rótulos pt-BR da tela
 * (`SHOW_STATUS_LABELS`); cancelados nunca aparecem (a lógica pura já os exclui).
 *
 * Encerra numa linha "Total": a coluna Situação resume os dias acionáveis
 * ("N/M a resolver", como o "N/M livres" de `openWeekendsToCsv`) e a coluna Cachê
 * soma os cachês de todos os shows envolvidos; o nº de shows é a própria contagem
 * de linhas de detalhe (`report.showCount`). Mesma convenção pt-BR dos irmãos
 * (delimitador ";", decimal com vírgula). Pura.
 */
export function scheduleConflictsToCsv(
  report: ScheduleConflicts,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(SCHEDULE_CONFLICTS_CSV_HEADERS)];
  let totalFee = 0;
  for (const d of report.days) {
    const situacao = d.upcoming ? "A resolver" : "Passado";
    for (const s of d.shows) {
      const fee = s.fee ?? 0;
      totalFee += fee;
      const status = s.status as ShowStatus;
      out.push([
        csvDate(d.day),
        situacao,
        s.title,
        csvTime(s.date),
        s.venue ?? "",
        s.city ?? "",
        SHOW_STATUS_LABELS[status] ?? s.status,
        centsToCsvAmount(fee),
      ]);
    }
  }
  out.push([
    "Total",
    `${report.upcomingDayCount}/${report.dayCount} a resolver`,
    "",
    "",
    "",
    "",
    "",
    centsToCsvAmount(totalFee),
  ]);
  return toCsv(out, delimiter);
}

// ── Projeção de fechamento do ano (composição receita/despesa do cenário) ─────

export const YEAR_END_PROJECTION_CSV_HEADERS = [
  "Grupo",
  "Componente",
  "Valor (R$)",
  "Participação (%)",
] as const;

/**
 * Serializa a projeção de fechamento do ano (`yearEndScenarioView`) em CSV,
 * pronto para download — espelha os dois cards de composição de
 * `/financas/projecao-ano` (Receitas projetadas e Despesas projetadas) mais o
 * resultado projetado, o número de destaque da página.
 *
 * Uma linha por componente, agrupada por "Receitas" / "Despesas" / "Resultado".
 * A coluna "Participação" reproduz o % que cada componente ocupa no total do seu
 * grupo (receita ou despesa), como as barras da página; as linhas "Total
 * projetado" e a do resultado saem com participação **em branco** (são 100% / o
 * próprio total por construção, mesma convenção dos outros "Total"). A linha de
 * custo fixo estimado só aparece quando há custo a somar (`> 0`), espelhando o
 * card — fora do "pior caso" ela é 0 e fica de fora.
 *
 * O cenário (otimista/conservador/pior caso) e o ano vão no **nome do arquivo**
 * (`projecao-ano-{ano}-{cenario}.csv`), como o ano em `metas-mensal-{ano}.csv` e
 * o horizonte em `fluxo-de-caixa-projetado-{n}m.csv` — os cabeçalhos ficam
 * genéricos. Mesma convenção pt-BR dos irmãos (";" e decimal com vírgula). Pura.
 */
export function yearEndProjectionToCsv(
  view: YearEndScenarioView,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(YEAR_END_PROJECTION_CSV_HEADERS)];

  /** Participação do componente no total do grupo (0 quando o total é 0). */
  const share = (value: number, total: number) =>
    total > 0 ? csvShare(value / total) : csvShare(0);

  // Receitas projetadas (participação sobre a receita projetada do cenário).
  out.push([
    "Receitas",
    "Já recebido",
    centsToCsvAmount(view.realizedIncome),
    share(view.realizedIncome, view.projectedIncome),
  ]);
  out.push([
    "Receitas",
    "A receber (lançado)",
    centsToCsvAmount(view.pendingIncome),
    share(view.pendingIncome, view.projectedIncome),
  ]);
  out.push([
    "Receitas",
    "Cachês agendados",
    centsToCsvAmount(view.scheduledIncome),
    share(view.scheduledIncome, view.projectedIncome),
  ]);
  out.push([
    "Receitas",
    "Total projetado",
    centsToCsvAmount(view.projectedIncome),
    "",
  ]);

  // Despesas projetadas (participação sobre a despesa projetada do cenário).
  out.push([
    "Despesas",
    "Já pago",
    centsToCsvAmount(view.realizedExpense),
    share(view.realizedExpense, view.projectedExpense),
  ]);
  out.push([
    "Despesas",
    "A pagar (lançado)",
    centsToCsvAmount(view.pendingExpense),
    share(view.pendingExpense, view.projectedExpense),
  ]);
  // Custo fixo estimado só entra quando há valor a somar (pior caso) — espelha o card.
  if (view.estimatedRemainingFixedCost > 0) {
    out.push([
      "Despesas",
      "Custo fixo estimado",
      centsToCsvAmount(view.estimatedRemainingFixedCost),
      share(view.estimatedRemainingFixedCost, view.projectedExpense),
    ]);
  }
  out.push([
    "Despesas",
    "Total projetado",
    centsToCsvAmount(view.projectedExpense),
    "",
  ]);

  // Resultado projetado do cenário (receita projetada − despesa projetada).
  out.push([
    "Resultado",
    "Resultado projetado",
    centsToCsvAmount(view.projectedResult),
    "",
  ]);

  return toCsv(out, delimiter);
}

// ── Custos fixos recorrentes (o piso a faturar todo mês) ─────────────────────

export const RECURRING_EXPENSES_CSV_HEADERS = [
  "Categoria",
  "Conta típica/mês (R$)",
  "Meses ativos",
  "Janela (meses)",
  "Última",
  "Total (R$)",
  "Situação",
] as const;

/**
 * Serializa os custos fixos recorrentes (`recurringExpenses`) em CSV, pronto
 * para download. Uma linha por categoria recorrente, espelhando a tabela
 * "Despesas recorrentes" de `/financas/custos-fixos`: conta típica/mês
 * (`avgPerActiveMonth`), nº de meses ativos, janela entre 1ª e última ocorrência,
 * mês da última ocorrência (chave ISO "YYYY-MM", ordenável — não o "jun/26" da
 * UI), total histórico e a situação (Ativa/Encerrada, espelhando o selo da tela).
 * A ordem das linhas é preservada (a página ordena por conta típica desc). Mesma
 * convenção pt-BR de `transactionsToCsv`.
 *
 * Encerrada numa linha "Total" cuja coluna "Conta típica/mês" traz o
 * **custo fixo mensal estimado** (`estimatedMonthlyFixedCost` — a soma da conta
 * típica só das categorias AINDA ATIVAS, o número de destaque da página, não a
 * soma cega da coluna que incluiria as encerradas), "Total" somando o histórico
 * de todas as categorias e "Situação" = "N/M ativas" (espelha o "recorrentes/total"
 * de `clientRetentionToCsv`); as colunas de meses/janela/última ficam em branco
 * no Total (somá-las não teria sentido). Pura.
 */
export function recurringExpensesToCsv(
  report: RecurringExpensesReport,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(RECURRING_EXPENSES_CSV_HEADERS)];

  let activeCount = 0;
  let totalSum = 0;
  for (const c of report.categories) {
    if (c.active) activeCount += 1;
    totalSum += c.total;
    out.push([
      c.category,
      centsToCsvAmount(c.avgPerActiveMonth),
      String(c.monthsActive),
      String(c.monthsSpan),
      c.lastMonth,
      centsToCsvAmount(c.total),
      c.active ? "Ativa" : "Encerrada",
    ]);
  }

  out.push([
    "Total",
    centsToCsvAmount(report.estimatedMonthlyFixedCost),
    "",
    "",
    "",
    centsToCsvAmount(totalSum),
    `${activeCount}/${report.categories.length} ativas`,
  ]);

  return toCsv(out, delimiter);
}

// ── Relatório mensal (resumo do mês vs. mês anterior e vs. média recente) ──────

export const MONTHLY_REPORT_CSV_HEADERS = [
  "Base de comparação",
  "Métrica",
  "Valor do mês (R$)",
  "Comparação (R$)",
  "Variação (%)",
] as const;

/**
 * Entrada do `monthlyReportToCsv`: o que a página `/financas/relatorio` já computa
 * para o mês de referência — o resumo do mês e os dois eixos de comparação que ela
 * exibe (vs. o mês imediatamente anterior e vs. a média móvel dos meses recentes
 * com movimento). Mantém o serializador puro e desacoplado de banco/UI: a rota
 * injeta os agregados já prontos (mesma divisão de `monthPaceToCsv`).
 */
export interface MonthlyReportCsvView {
  /** Resumo financeiro do mês de referência. */
  summary: FinanceSummary;
  /** Comparativo das métricas vs. o mês imediatamente anterior. */
  vsPreviousMonth: FinanceComparison;
  /** Comparativo das métricas vs. a média dos meses recentes com movimento. */
  vsAverage: FinanceComparison;
  /** Há movimento no mês anterior? (a página só mostra esse eixo então). */
  hasPreviousMonth: boolean;
  /** Há ≥2 meses na janela da média? (com 1, a média = o próprio mês anterior). */
  hasAverage: boolean;
  /** Nº de meses com movimento usados na média (rótulo do eixo). */
  averageMonths: number;
}

/**
 * Serializa o relatório mensal (`/financas/relatorio`) em CSV, pronto para
 * download — espelha os quatro indicadores do topo da página (Receitas, Despesas,
 * Saldo do mês, Caixa realizado) e seus dois eixos de comparação.
 *
 * Achata tudo numa única tabela com a coluna "Base de comparação": a seção
 * "Mês atual" traz os valores do mês (sem comparação) e, quando há movimento, as
 * pendências do mês (a caixa âmbar "A receber/A pagar no mês"); em seguida vêm os
 * eixos "Mês anterior" e "Média dos últimos N meses", cada um com uma linha por
 * métrica (Comparação = a baseline do eixo, Variação = a variação relativa). Cada
 * eixo só é emitido **quando a página o exibiria** (`hasPreviousMonth` /
 * `hasAverage`) — diferente de `monthPaceToCsv`, que sempre emite o eixo sazonal;
 * aqui um eixo ausente seria comparação contra um mês vazio (sem base), então o
 * omitimos. A seção "Mês atual" sai sempre, mantendo o arquivo auto-suficiente
 * mesmo no primeiro mês de um usuário novo.
 *
 * A variação reusa `csvDeltaPct` ("+25%"/"-30%"/"0%"/"novo" quando a base é 0 —
 * espelhando o "novo" da UI). Distinto da variação **por categoria** entre dois
 * meses (`categoryVariationToCsv`/`/financas/variacao`): aqui o eixo são as quatro
 * métricas do resumo, não as categorias. Mesma convenção pt-BR dos irmãos (";" e
 * decimal com vírgula). Pura.
 */
export function monthlyReportToCsv(
  view: MonthlyReportCsvView,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(MONTHLY_REPORT_CSV_HEADERS)];

  const metrics: Array<[string, keyof FinanceComparison]> = [
    ["Receitas", "totalIncome"],
    ["Despesas", "totalExpense"],
    ["Saldo do mês", "balance"],
    ["Caixa realizado", "cashBalance"],
  ];

  // 1) Mês atual: os valores do mês, sem base de comparação.
  for (const [label, key] of metrics) {
    out.push(["Mês atual", label, centsToCsvAmount(view.summary[key]), "", ""]);
  }
  // Pendências do mês (a caixa âmbar da página), só quando há algo a mostrar.
  if (view.summary.pendingIncome > 0) {
    out.push(["Mês atual", "A receber no mês", centsToCsvAmount(view.summary.pendingIncome), "", ""]);
  }
  if (view.summary.pendingExpense > 0) {
    out.push(["Mês atual", "A pagar no mês", centsToCsvAmount(view.summary.pendingExpense), "", ""]);
  }

  // 2) Eixos de comparação — cada um só quando a página o exibiria.
  const axes: Array<[string, FinanceComparison]> = [];
  if (view.hasPreviousMonth) axes.push(["Mês anterior", view.vsPreviousMonth]);
  if (view.hasAverage) {
    axes.push([`Média dos últimos ${view.averageMonths} meses`, view.vsAverage]);
  }
  for (const [base, cmp] of axes) {
    for (const [label, key] of metrics) {
      const d = cmp[key];
      out.push([
        base,
        label,
        centsToCsvAmount(d.current),
        centsToCsvAmount(d.previous),
        csvDeltaPct(d),
      ]);
    }
  }

  return toCsv(out, delimiter);
}

// ── Antecedência de agendamento (booking lead time) ─────────────────────────

export const BOOKING_LEAD_TIME_CSV_HEADERS = [
  "Faixa",
  "Antecedência (dias, de)",
  "Antecedência (dias, até)",
  "Shows",
  "Participação (%)",
  "Cachê da faixa (R$)",
] as const;

/**
 * Serializa a antecedência de agendamento (`bookingLeadTime`) em CSV. Espelha a
 * tabela de `/shows/antecedencia`: uma linha por faixa canônica (sempre as 4, da
 * mais curta à mais longa, inclusive faixas zeradas, para o formato da tabela não
 * pular degraus) com os limites da faixa em dias, nº de shows, participação na
 * amostra e cachê somado, seguida de uma linha "Total". As colunas de limite
 * expõem `minDays`/`maxDays` (a faixa "sem teto" deixa a coluna "até" em branco).
 * A participação do Total fica em branco (é 100% por construção). Faixas vazias
 * registram 0/0%/0,00 (o "—" é da UI). Irmão de `feeDistributionToCsv`/
 * `weekdayPerformanceToCsv` (mesmo eixo faixa → linhas + Total). Pura.
 */
export function bookingLeadTimeToCsv(
  lead: BookingLeadTime,
  delimiter = DEFAULT_DELIMITER,
): string {
  const out: string[][] = [Array.from(BOOKING_LEAD_TIME_CSV_HEADERS)];
  for (const b of lead.buckets) {
    out.push([
      b.label,
      String(b.minDays),
      b.maxDays == null ? "" : String(b.maxDays),
      String(b.count),
      csvShare(b.share),
      centsToCsvAmount(b.totalFee),
    ]);
  }
  out.push([
    "Total",
    "",
    "",
    String(lead.sample),
    "",
    centsToCsvAmount(lead.buckets.reduce((a, b) => a + b.totalFee, 0)),
  ]);
  return toCsv(out, delimiter);
}
