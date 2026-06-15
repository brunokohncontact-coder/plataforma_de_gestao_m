// Lógica de negócio financeira — PURA (sem Prisma/DB), para ser facilmente testável.
// Cobre: P&L por show (F4), agregações mensais e por categoria (F3),
// e contas a receber/pendentes (F3/Necessidade #6).
//
// Convenção de valores: `amount` é sempre positivo; o sinal econômico vem de `type`.
// Trabalhamos com números em unidade de moeda (R$) e arredondamos para 2 casas
// nas saídas para evitar ruído de ponto flutuante.

import type { TransactionType, TransactionStatus } from "./domain";

/** Representação mínima de uma transação para cálculos (independente do Prisma). */
export interface TxInput {
  type: TransactionType;
  amount: number;
  date: Date;
  category: string;
  status: TransactionStatus;
  showId?: string | null;
}

/** Representação mínima de um show para cálculo de rentabilidade. */
export interface ShowInput {
  id: string;
  feeAgreed: number;
}

/** Arredonda para 2 casas decimais de forma estável. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Soma assinada de transações: receitas (+), despesas (−). */
export function signedTotal(txs: TxInput[]): number {
  return round2(
    txs.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -t.amount), 0),
  );
}

export interface ShowPnL {
  showId: string;
  /** Cachê acordado do show. */
  fee: number;
  /** Receitas extras vinculadas ao show (além do cachê), se houver. */
  linkedIncome: number;
  /** Despesas vinculadas ao show. */
  expenses: number;
  /** Resultado: fee + receitas vinculadas − despesas vinculadas. */
  net: number;
}

/**
 * Rentabilidade por show (F4): cachê + receitas vinculadas − despesas vinculadas.
 * Considera apenas transações cujo `showId` bate com o show.
 *
 * Observação de modelagem: o cachê (`feeAgreed`) é o valor combinado; receitas
 * lançadas como transação vinculada ao show são tratadas como receita ADICIONAL
 * (ex.: venda de merch no show, bônus de bilheteria). Para evitar dupla contagem,
 * o cachã em si não deve ser também lançado como transação income do show.
 */
export function showProfitAndLoss(show: ShowInput, txs: TxInput[]): ShowPnL {
  const linked = txs.filter((t) => t.showId === show.id);
  const linkedIncome = round2(
    linked.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
  );
  const expenses = round2(
    linked.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
  );
  const fee = round2(show.feeAgreed);
  return {
    showId: show.id,
    fee,
    linkedIncome,
    expenses,
    net: round2(fee + linkedIncome - expenses),
  };
}

/** Chave de mês "YYYY-MM" a partir de uma data (timezone local). */
export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export interface MonthlySummary {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  net: number;
}

/**
 * Agregação financeira por mês (F3). Ordenada cronologicamente.
 * Considera todas as transações informadas (filtre antes se quiser só "recebidas").
 */
export function monthlyFinancialSummary(txs: TxInput[]): MonthlySummary[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    const key = monthKey(t.date);
    const cur = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += t.amount;
    else cur.expense += t.amount;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([month, v]) => ({
      month,
      income: round2(v.income),
      expense: round2(v.expense),
      net: round2(v.income - v.expense),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategoryTotal {
  category: string;
  type: TransactionType;
  total: number;
}

/** Totais por categoria (F3), separados por tipo, ordenados do maior para o menor. */
export function categoryBreakdown(txs: TxInput[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const t of txs) {
    const key = `${t.type}::${t.category}`;
    const cur = map.get(key) ?? { category: t.category, type: t.type, total: 0 };
    cur.total += t.amount;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((c) => ({ ...c, total: round2(c.total) }))
    .sort((a, b) => b.total - a.total);
}

export interface ReceivablesSummary {
  /** Receitas já recebidas. */
  received: number;
  /** Receitas ainda pendentes (contas a receber). */
  pendingIncome: number;
  /** Despesas ainda pendentes (contas a pagar). */
  pendingExpense: number;
}

/**
 * Contas a receber/pagar (F3 / Necessidade #6): separa o que está "received"
 * do que está "pending", por tipo.
 */
export function receivablesSummary(txs: TxInput[]): ReceivablesSummary {
  let received = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;
  for (const t of txs) {
    if (t.type === "income") {
      if (t.status === "received") received += t.amount;
      else pendingIncome += t.amount;
    } else if (t.status === "pending") {
      pendingExpense += t.amount;
    }
  }
  return {
    received: round2(received),
    pendingIncome: round2(pendingIncome),
    pendingExpense: round2(pendingExpense),
  };
}

export interface OverallTotals {
  income: number;
  expense: number;
  net: number;
}

/** Totais gerais do período informado. */
export function overallTotals(txs: TxInput[]): OverallTotals {
  const income = round2(
    txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
  );
  const expense = round2(
    txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
  );
  return { income, expense, net: round2(income - expense) };
}
