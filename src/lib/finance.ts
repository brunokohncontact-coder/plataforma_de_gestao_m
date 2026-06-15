// Lógica de negócio financeira (pura, sem dependência de Prisma/DB) — fácil de testar.
// Cobre: rentabilidade por show (F4), agregações mensais e por categoria (F3),
// e separação recebido/pendente (Necessidade #6).

import type { TransactionType, TransactionStatus } from "./enums";

/** Arredonda para centavos, evitando ruído de ponto flutuante. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Forma mínima de transação usada pelos cálculos (desacoplada do Prisma). */
export interface TxLike {
  type: TransactionType;
  amount: number;
  date: Date;
  category?: string | null;
  status?: TransactionStatus | string | null;
  showId?: string | null;
}

/** Forma mínima de show usada pelos cálculos. */
export interface ShowLike {
  id: string;
  fee: number;
}

export interface ShowPnL {
  showId: string;
  /** Cachê acordado (planejado). */
  agreedFee: number;
  /** Soma das receitas efetivamente lançadas e vinculadas ao show. */
  realizedIncome: number;
  /** Soma das despesas vinculadas ao show. */
  expenses: number;
  /**
   * Resultado headline conforme mvp-scope: cachê − despesas vinculadas.
   * Usa o cachê acordado como referência de receita.
   */
  result: number;
  /** Resultado com base no caixa realmente lançado: receitas − despesas. */
  netRealized: number;
  /** Margem sobre o cachê acordado (result / agreedFee). 0 se cachê = 0. */
  margin: number;
}

/**
 * Calcula a rentabilidade (P&L) de um show a partir das transações vinculadas.
 * Considera apenas transações cujo `showId` corresponde ao show.
 */
export function calcShowPnL(show: ShowLike, transactions: TxLike[]): ShowPnL {
  const linked = transactions.filter((t) => t.showId === show.id);

  const realizedIncome = roundMoney(
    sumAmounts(linked.filter((t) => t.type === "income")),
  );
  const expenses = roundMoney(
    sumAmounts(linked.filter((t) => t.type === "expense")),
  );

  const agreedFee = roundMoney(show.fee ?? 0);
  const result = roundMoney(agreedFee - expenses);
  const netRealized = roundMoney(realizedIncome - expenses);
  const margin = agreedFee > 0 ? roundMoney(result / agreedFee) : 0;

  return {
    showId: show.id,
    agreedFee,
    realizedIncome,
    expenses,
    result,
    netRealized,
    margin,
  };
}

function sumAmounts(txs: TxLike[]): number {
  return txs.reduce((acc, t) => acc + (t.amount || 0), 0);
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  /** Receitas ainda não recebidas (status !== "received"). */
  pendingIncome: number;
  /** Receitas já recebidas. */
  receivedIncome: number;
  /** Despesas ainda não pagas (status !== "paid"). */
  pendingExpense: number;
  count: number;
}

/** Resumo financeiro geral de um conjunto de transações. */
export function summarize(transactions: TxLike[]): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let pendingIncome = 0;
  let receivedIncome = 0;
  let pendingExpense = 0;

  for (const t of transactions) {
    if (t.type === "income") {
      totalIncome += t.amount;
      if (t.status === "received") receivedIncome += t.amount;
      else pendingIncome += t.amount;
    } else {
      totalExpense += t.amount;
      if (t.status !== "paid") pendingExpense += t.amount;
    }
  }

  return {
    totalIncome: roundMoney(totalIncome),
    totalExpense: roundMoney(totalExpense),
    net: roundMoney(totalIncome - totalExpense),
    pendingIncome: roundMoney(pendingIncome),
    receivedIncome: roundMoney(receivedIncome),
    pendingExpense: roundMoney(pendingExpense),
    count: transactions.length,
  };
}

export interface MonthlyBucket {
  /** Chave "YYYY-MM". */
  month: string;
  income: number;
  expense: number;
  net: number;
}

/** Agrega transações por mês (YYYY-MM), ordenado cronologicamente. */
export function aggregateByMonth(transactions: TxLike[]): MonthlyBucket[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const month = monthKey(t.date);
    const bucket = map.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expense += t.amount;
    map.set(month, bucket);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      income: roundMoney(b.income),
      expense: roundMoney(b.expense),
      net: roundMoney(b.income - b.expense),
    }));
}

export interface CategoryBucket {
  category: string;
  total: number;
  count: number;
}

/**
 * Agrega transações por categoria para um dado tipo (income/expense),
 * ordenado por total decrescente.
 */
export function aggregateByCategory(
  transactions: TxLike[],
  type: TransactionType,
): CategoryBucket[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    const category = t.category?.trim() || "Sem categoria";
    const bucket = map.get(category) ?? { total: 0, count: 0 };
    bucket.total += t.amount;
    bucket.count += 1;
    map.set(category, bucket);
  }

  return [...map.entries()]
    .map(([category, b]) => ({
      category,
      total: roundMoney(b.total),
      count: b.count,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Constrói a chave "YYYY-MM" de uma data (em horário local). */
export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
