// Serialização de CSV (pura, sem dependência de banco/UI). Testada em csv.test.ts.
//
// Convenção pt-BR: delimitador ";" (padrão do Excel em português) e decimal com
// vírgula, de modo que o arquivo abra corretamente no Excel/Sheets em pt-BR sem
// assistente de importação. A camada HTTP (route handler) prefixa um BOM UTF-8
// para preservar acentuação no Excel.

import {
  TRANSACTION_TYPE_LABELS,
  SHOW_STATUS_LABELS,
  type TransactionType,
  type ShowStatus,
} from "./domain";
import { dayKey, type AnnualSummary } from "./finance";
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
