// Lógica de negócio financeira — funções puras, sem dependência de Prisma/IO.
// Testada em finance.test.ts. Esta é a camada de maior valor do produto (rentabilidade por show).

import type { TxType, TxStatus } from "./domain";

/** Transação mínima necessária para os cálculos (subset dos campos do modelo Prisma). */
export interface FinanceTransaction {
  type: TxType;
  amount: number; // sempre >= 0; o sinal é dado por `type`
  date: Date | string;
  status: TxStatus;
  category: string;
  showId?: string | null;
}

/** Show mínimo necessário para o cálculo de rentabilidade. */
export interface FinanceShow {
  id: string;
  fee: number; // cachê acordado
}

/** Arredonda para 2 casas decimais, evitando artefatos de ponto flutuante (ex.: 0.1+0.2). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Chave de mês no formato "YYYY-MM" (em horário local). */
export function monthKey(value: Date | string): string {
  const d = toDate(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface ShowProfit {
  showId: string;
  /** Receita considerada = cachê acordado (fee). */
  revenue: number;
  /** Soma das despesas vinculadas ao show. */
  expenses: number;
  /** revenue - expenses. */
  result: number;
  /** Margem (result / revenue). 0 quando revenue é 0. */
  margin: number;
}

/**
 * Rentabilidade (P&L) de um show: cachê − despesas vinculadas.
 * Decisão (DECISIONS.md D4): a receita do show é o `fee` (cachê acordado); apenas
 * transações de DESPESA vinculadas (showId) são subtraídas — receitas vinculadas não
 * são somadas para não duplicar o cachê. Transações de outro show são ignoradas.
 */
export function showProfit(show: FinanceShow, transactions: FinanceTransaction[]): ShowProfit {
  const expenses = transactions
    .filter((t) => t.showId === show.id && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const revenue = show.fee;
  const result = revenue - expenses;
  return {
    showId: show.id,
    revenue: round2(revenue),
    expenses: round2(expenses),
    result: round2(result),
    margin: revenue === 0 ? 0 : round2(result / revenue),
  };
}

export interface FinancialSummary {
  income: number; // total de receitas (independente de status)
  expense: number; // total de despesas
  net: number; // income - expense
  received: number; // receitas com status "received"
  pendingReceivable: number; // receitas com status "pending" (contas a receber)
}

/** Resumo financeiro geral de um conjunto de transações. */
export function summarize(transactions: FinanceTransaction[]): FinancialSummary {
  let income = 0;
  let expense = 0;
  let received = 0;
  let pendingReceivable = 0;

  for (const t of transactions) {
    if (t.type === "income") {
      income += t.amount;
      if (t.status === "received") received += t.amount;
      else pendingReceivable += t.amount;
    } else {
      expense += t.amount;
    }
  }

  return {
    income: round2(income),
    expense: round2(expense),
    net: round2(income - expense),
    received: round2(received),
    pendingReceivable: round2(pendingReceivable),
  };
}

export interface MonthlyBucket {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  net: number;
}

/** Agrega transações por mês, ordenado cronologicamente. */
export function monthlyTotals(transactions: FinanceTransaction[]): MonthlyBucket[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const key = monthKey(t.date);
    const bucket = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expense += t.amount;
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([month, b]) => ({
      month,
      income: round2(b.income),
      expense: round2(b.expense),
      net: round2(b.income - b.expense),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategoryBucket {
  category: string;
  total: number;
}

/**
 * Agrega o total por categoria para um tipo (income/expense), ordenado do maior para o menor.
 */
export function totalsByCategory(
  transactions: FinanceTransaction[],
  type: TxType,
): CategoryBucket[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}
