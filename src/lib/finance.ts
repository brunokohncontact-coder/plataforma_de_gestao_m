// Lógica de negócio financeira (pura, sem dependência de Prisma/IO).
// Núcleo do diferencial do produto: rentabilidade por show (F4) e agregações (F3).

import type { TransactionType } from "./domain";

/** Entrada mínima de transação para cálculos. Valores em centavos, amount sempre >= 0. */
export interface TxInput {
  type: TransactionType;
  amountCents: number;
  category: string;
  date: Date;
  paid: boolean;
  showId?: string | null;
}

/** Resultado de P&L de um show. */
export interface ShowPnL {
  feeCents: number; // cachê acordado do show
  incomeCents: number; // receitas vinculadas (inclui ou não o cachê — ver nota)
  expenseCents: number; // despesas vinculadas
  resultCents: number; // resultado líquido
}

/**
 * Calcula a rentabilidade de um show.
 *
 * Modelo: o `feeCents` (cachê acordado) é a receita-base do show. Transações de
 * receita vinculadas ao show (ex.: venda de merch no show) SOMAM à receita; despesas
 * vinculadas SUBTRAEM. Isso evita dupla contagem: o cachê não precisa ser lançado
 * também como transação para aparecer no resultado do show.
 *
 * resultado = (cachê + receitas vinculadas) − despesas vinculadas
 */
export function computeShowPnL(feeCents: number, transactions: TxInput[]): ShowPnL {
  let incomeCents = 0;
  let expenseCents = 0;

  for (const tx of transactions) {
    if (tx.type === "income") incomeCents += tx.amountCents;
    else expenseCents += tx.amountCents;
  }

  const totalIncome = feeCents + incomeCents;
  return {
    feeCents,
    incomeCents: totalIncome,
    expenseCents,
    resultCents: totalIncome - expenseCents,
  };
}

export interface FinanceSummary {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  // "A receber": receitas ainda não pagas. "A pagar": despesas ainda não pagas.
  receivableCents: number;
  payableCents: number;
}

/** Agrega um conjunto de transações em totais financeiros. */
export function summarize(transactions: TxInput[]): FinanceSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let receivableCents = 0;
  let payableCents = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      incomeCents += tx.amountCents;
      if (!tx.paid) receivableCents += tx.amountCents;
    } else {
      expenseCents += tx.amountCents;
      if (!tx.paid) payableCents += tx.amountCents;
    }
  }

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    receivableCents,
    payableCents,
  };
}

export interface CategoryTotal {
  category: string;
  type: TransactionType;
  totalCents: number;
}

/** Soma por (tipo, categoria), ordenado do maior para o menor total. */
export function totalsByCategory(transactions: TxInput[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const tx of transactions) {
    const key = `${tx.type}:${tx.category}`;
    const existing = map.get(key);
    if (existing) existing.totalCents += tx.amountCents;
    else map.set(key, { category: tx.category, type: tx.type, totalCents: tx.amountCents });
  }
  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}

export interface MonthlyTotal {
  // Chave "YYYY-MM" (UTC) para ordenação estável.
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Agrega receitas/despesas por mês (UTC), ordenado cronologicamente. */
export function totalsByMonth(transactions: TxInput[]): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    let row = map.get(key);
    if (!row) {
      row = { month: key, incomeCents: 0, expenseCents: 0, netCents: 0 };
      map.set(key, row);
    }
    if (tx.type === "income") row.incomeCents += tx.amountCents;
    else row.expenseCents += tx.amountCents;
    row.netCents = row.incomeCents - row.expenseCents;
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}
