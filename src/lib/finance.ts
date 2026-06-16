/**
 * Lógica de negócio financeira — o núcleo do produto (F3 e F4).
 *
 * Funções puras, desacopladas do Prisma/Next, para serem testáveis de forma
 * isolada. Operam sobre objetos "*-Like" mínimos, compatíveis com os modelos
 * do Prisma mas sem depender deles.
 *
 * Convenção de double-counting (decisão D4 em DECISIONS.md): o cachê de um show
 * é representado pelo campo `fee` do show, NÃO por uma transação de receita.
 * Transações de receita vinculadas a um show representam receita ADICIONAL
 * (ex.: venda de merch, couvert), somada por cima do cachê.
 */

import { roundCents, sumCents } from "./money";

export type TransactionType = "INCOME" | "EXPENSE";

export interface TransactionLike {
  // String para compatibilidade com o banco (SQLite guarda o enum como texto).
  // As funções comparam apenas com os literais "INCOME"/"EXPENSE".
  type: TransactionType | string;
  amount: number;
  settled?: boolean;
  category?: string | null;
  date?: Date | string;
  showId?: string | null;
}

export interface ShowLike {
  id?: string;
  fee?: number;
  status?: "PROPOSED" | "CONFIRMED" | "DONE" | "CANCELED";
}

/** Soma os `amount` das transações de um dado tipo. */
export function sumByType(
  transactions: TransactionLike[],
  type: TransactionType
): number {
  return sumCents(
    transactions.filter((t) => t.type === type).map((t) => t.amount)
  );
}

export interface ShowProfitability {
  /** Cachê acordado do show. */
  fee: number;
  /** Receita adicional vinda de transações INCOME vinculadas (merch etc.). */
  extraIncome: number;
  /** Receita total considerada (cachê + adicional). */
  revenue: number;
  /** Despesas vinculadas ao show. */
  expenses: number;
  /** Resultado: receita − despesas. Pode ser negativo. */
  result: number;
  /** Margem (result / revenue). 0 quando não há receita. */
  margin: number;
  /** Quantidade de despesas vinculadas. */
  expenseCount: number;
}

/**
 * F4 — Rentabilidade de um show: `cachê + receitas extras vinculadas − despesas
 * vinculadas`. `linkedTransactions` deve conter apenas transações já filtradas
 * para este show.
 */
export function showProfitability(
  show: ShowLike,
  linkedTransactions: TransactionLike[]
): ShowProfitability {
  const fee = roundCents(show.fee ?? 0);
  const extraIncome = sumByType(linkedTransactions, "INCOME");
  const expenses = sumByType(linkedTransactions, "EXPENSE");
  const revenue = roundCents(fee + extraIncome);
  const result = roundCents(revenue - expenses);
  const margin = revenue > 0 ? roundCents(result / revenue) : 0;
  const expenseCount = linkedTransactions.filter(
    (t) => t.type === "EXPENSE"
  ).length;

  return { fee, extraIncome, revenue, expenses, result, margin, expenseCount };
}

export interface FinanceSummary {
  income: number;
  expenses: number;
  /** Saldo líquido: receitas − despesas. */
  net: number;
  /** Receitas ainda não recebidas (contas a receber — Necessidade #6). */
  receivable: number;
  /** Despesas ainda não pagas (contas a pagar). */
  payable: number;
}

export interface FinanceSummaryOptions {
  /** Se true, considera apenas transações `settled` para income/expenses/net. */
  settledOnly?: boolean;
}

/**
 * F3 — Resumo financeiro de um conjunto de transações.
 * `receivable`/`payable` sempre derivam das transações NÃO liquidadas,
 * independentemente de `settledOnly`.
 */
export function financeSummary(
  transactions: TransactionLike[],
  options: FinanceSummaryOptions = {}
): FinanceSummary {
  const { settledOnly = false } = options;
  const considered = settledOnly
    ? transactions.filter((t) => t.settled !== false)
    : transactions;

  const income = sumByType(considered, "INCOME");
  const expenses = sumByType(considered, "EXPENSE");
  const net = roundCents(income - expenses);

  const receivable = sumByType(
    transactions.filter((t) => t.settled === false),
    "INCOME"
  );
  const payable = sumByType(
    transactions.filter((t) => t.settled === false),
    "EXPENSE"
  );

  return { income, expenses, net, receivable, payable };
}

/** Converte uma data (Date|string) para a chave de mês "YYYY-MM". */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  income: number;
  expenses: number;
  net: number;
}

/**
 * Agrega transações por mês (UTC). Resultado ordenado cronologicamente.
 * Transações sem `date` são ignoradas.
 */
export function monthlyTotals(transactions: TransactionLike[]): MonthlyTotal[] {
  const byMonth = new Map<string, { income: number; expenses: number }>();

  for (const t of transactions) {
    if (!t.date) continue;
    const key = monthKey(t.date);
    const bucket = byMonth.get(key) ?? { income: 0, expenses: 0 };
    if (t.type === "INCOME") bucket.income += t.amount;
    else bucket.expenses += t.amount;
    byMonth.set(key, bucket);
  }

  return [...byMonth.entries()]
    .map(([month, { income, expenses }]) => ({
      month,
      income: roundCents(income),
      expenses: roundCents(expenses),
      net: roundCents(income - expenses),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategoryTotal {
  category: string;
  type: TransactionType;
  total: number;
  count: number;
}

/**
 * Agrega transações por categoria (separando receita de despesa).
 * Ordenado por maior total primeiro.
 */
export function totalsByCategory(
  transactions: TransactionLike[]
): CategoryTotal[] {
  const map = new Map<string, { type: TransactionType; total: number; count: number }>();

  for (const t of transactions) {
    const category = t.category?.trim() || "Sem categoria";
    const key = `${t.type}:${category}`;
    const bucket = map.get(key) ?? {
      type: t.type as TransactionType,
      total: 0,
      count: 0,
    };
    bucket.total += t.amount;
    bucket.count += 1;
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([key, { type, total, count }]) => ({
      category: key.slice(key.indexOf(":") + 1),
      type,
      total: roundCents(total),
      count,
    }))
    .sort((a, b) => b.total - a.total);
}
