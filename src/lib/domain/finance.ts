// Lógica de negócio financeira — F3 (finanças) e F4 (rentabilidade por show).
// Funções PURAS sobre objetos simples, desacopladas do Prisma (fáceis de testar).
//
// Convenção de double-count (ver DECISIONS.md D4): o campo `fee` do show É o cachê.
// Não se deve também lançar uma transação de receita "Cachê" para o mesmo show —
// vincule ao show apenas receitas ADICIONAIS (merch, etc.) e as despesas do show.

import type { TransactionType } from "./enums";
import { roundMoney, sumMoney } from "./money";

export interface TxLike {
  // `string` (não a união) para aceitar diretamente as linhas do Prisma, cujo campo
  // `type` é String (SQLite não tem enum). As comparações abaixo usam os literais.
  type: string;
  amount: number;
  category: string;
  date: Date;
  received: boolean;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  fee: number;
  feePaid: boolean;
}

// ---------------------------------------------------------------------------
// F4 — Rentabilidade (P&L) por show
// ---------------------------------------------------------------------------

export interface ShowPnL {
  /** Receita do show = cachê (fee) + receitas adicionais vinculadas. */
  grossRevenue: number;
  fee: number;
  extraIncome: number;
  /** Soma das despesas vinculadas ao show. */
  totalExpenses: number;
  /** Resultado líquido = grossRevenue − totalExpenses. */
  netResult: number;
  /** Margem (netResult / grossRevenue), em fração (0–1). null se receita = 0. */
  margin: number | null;
}

/**
 * Calcula o P&L de um show a partir do seu cachê e das transações vinculadas.
 * `transactions` deve conter apenas transações já vinculadas a este show.
 */
export function computeShowPnL(show: ShowLike, transactions: TxLike[]): ShowPnL {
  const fee = roundMoney(show.fee);
  const extraIncome = sumMoney(
    transactions.filter((t) => t.type === "INCOME").map((t) => t.amount),
  );
  const totalExpenses = sumMoney(
    transactions.filter((t) => t.type === "EXPENSE").map((t) => t.amount),
  );
  const grossRevenue = roundMoney(fee + extraIncome);
  const netResult = roundMoney(grossRevenue - totalExpenses);
  const margin = grossRevenue !== 0 ? netResult / grossRevenue : null;

  return { grossRevenue, fee, extraIncome, totalExpenses, netResult, margin };
}

// ---------------------------------------------------------------------------
// F3 — Agregações financeiras
// ---------------------------------------------------------------------------

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number; // income − expense
  /** Receita já recebida (received = true). */
  receivedIncome: number;
  /** Receita ainda pendente (contas a receber — Necessidade #6). */
  pendingIncome: number;
}

/** Resumo geral de um conjunto de transações. */
export function summarizeTransactions(transactions: TxLike[]): FinanceSummary {
  const incomes = transactions.filter((t) => t.type === "INCOME");
  const expenses = transactions.filter((t) => t.type === "EXPENSE");

  const totalIncome = sumMoney(incomes.map((t) => t.amount));
  const totalExpense = sumMoney(expenses.map((t) => t.amount));
  const receivedIncome = sumMoney(
    incomes.filter((t) => t.received).map((t) => t.amount),
  );
  const pendingIncome = roundMoney(totalIncome - receivedIncome);

  return {
    totalIncome,
    totalExpense,
    balance: roundMoney(totalIncome - totalExpense),
    receivedIncome,
    pendingIncome,
  };
}

export interface MonthlyBucket {
  /** Chave "YYYY-MM" (UTC). */
  month: string;
  income: number;
  expense: number;
  net: number;
}

/** Agrega transações por mês (YYYY-MM), ordenado cronologicamente. */
export function groupByMonth(transactions: TxLike[]): MonthlyBucket[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const month = monthKey(t.date);
    const bucket = map.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") bucket.income += t.amount;
    else bucket.expense += t.amount;
    map.set(month, bucket);
  }

  return [...map.entries()]
    .map(([month, b]) => ({
      month,
      income: roundMoney(b.income),
      expense: roundMoney(b.expense),
      net: roundMoney(b.income - b.expense),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategoryBucket {
  category: string;
  total: number;
}

/**
 * Agrega por categoria, para um tipo específico (INCOME ou EXPENSE),
 * ordenado do maior total para o menor.
 */
export function groupByCategory(
  transactions: TxLike[],
  type: TransactionType,
): CategoryBucket[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total: roundMoney(total) }))
    .sort((a, b) => b.total - a.total);
}

/** Chave de mês "YYYY-MM" em UTC. */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
