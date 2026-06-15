// Lógica de negócio financeira — funções puras, testáveis sem banco.
// Esta é a parte mais crítica do produto (F3 e F4 do mvp-scope.md).

import type { TransactionType } from "./enums";

export interface TransactionLike {
  type: TransactionType | string;
  amountCents: number;
  category: string;
  date: Date | string;
  settled: boolean;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  feeCents: number;
  status?: string;
}

// ---------------------------------------------------------------------------
// F4 — Rentabilidade por show
// ---------------------------------------------------------------------------
export interface ShowProfitability {
  /** Cachê acordado do show, em centavos. */
  feeCents: number;
  /** Soma das receitas extras vinculadas ao show (além do cachê). */
  extraIncomeCents: number;
  /** Soma das despesas vinculadas ao show. */
  expensesCents: number;
  /** Receita total considerada = cachê + receitas extras vinculadas. */
  grossCents: number;
  /** Resultado = receita total − despesas vinculadas. */
  netCents: number;
  /** Margem (netCents / grossCents), entre -∞ e 1. `null` se receita = 0. */
  margin: number | null;
}

/**
 * Calcula a rentabilidade de um show: cachê + receitas extras vinculadas −
 * despesas vinculadas. O cachê do show é a receita-base; transações do tipo
 * INCOME vinculadas somam como receita extra (ex.: venda de merch no show).
 */
export function computeShowProfitability(
  show: ShowLike,
  linkedTransactions: TransactionLike[],
): ShowProfitability {
  let extraIncomeCents = 0;
  let expensesCents = 0;

  for (const t of linkedTransactions) {
    if (t.type === "INCOME") {
      extraIncomeCents += t.amountCents;
    } else if (t.type === "EXPENSE") {
      expensesCents += t.amountCents;
    }
  }

  const grossCents = show.feeCents + extraIncomeCents;
  const netCents = grossCents - expensesCents;
  const margin = grossCents === 0 ? null : netCents / grossCents;

  return {
    feeCents: show.feeCents,
    extraIncomeCents,
    expensesCents,
    grossCents,
    netCents,
    margin,
  };
}

// ---------------------------------------------------------------------------
// F3 — Agregações financeiras
// ---------------------------------------------------------------------------
export interface FinanceSummary {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  /** Receitas ainda não recebidas (settled = false). Contas a receber. */
  pendingIncomeCents: number;
  /** Despesas ainda não pagas (settled = false). Contas a pagar. */
  pendingExpenseCents: number;
}

/** Soma receitas, despesas, saldo e pendências de uma lista de transações. */
export function summarize(transactions: TransactionLike[]): FinanceSummary {
  const s: FinanceSummary = {
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0,
    pendingIncomeCents: 0,
    pendingExpenseCents: 0,
  };

  for (const t of transactions) {
    if (t.type === "INCOME") {
      s.incomeCents += t.amountCents;
      if (!t.settled) s.pendingIncomeCents += t.amountCents;
    } else if (t.type === "EXPENSE") {
      s.expenseCents += t.amountCents;
      if (!t.settled) s.pendingExpenseCents += t.amountCents;
    }
  }

  s.balanceCents = s.incomeCents - s.expenseCents;
  return s;
}

export interface CategoryTotal {
  category: string;
  type: TransactionType;
  totalCents: number;
}

/** Agrupa transações por categoria (separando receita/despesa), ordenado desc. */
export function totalsByCategory(
  transactions: TransactionLike[],
): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();

  for (const t of transactions) {
    const type = t.type as TransactionType;
    const key = `${type}::${t.category}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalCents += t.amountCents;
    } else {
      map.set(key, { category: t.category, type, totalCents: t.amountCents });
    }
  }

  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}

export interface MonthlyTotal {
  /** Mês no formato "YYYY-MM". */
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Agrega receitas/despesas por mês (UTC), ordenado cronologicamente. */
export function totalsByMonth(transactions: TransactionLike[]): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();

  for (const t of transactions) {
    const month = monthKey(t.date);
    let entry = map.get(month);
    if (!entry) {
      entry = { month, incomeCents: 0, expenseCents: 0, balanceCents: 0 };
      map.set(month, entry);
    }
    if (t.type === "INCOME") entry.incomeCents += t.amountCents;
    else if (t.type === "EXPENSE") entry.expenseCents += t.amountCents;
    entry.balanceCents = entry.incomeCents - entry.expenseCents;
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Lucro por show agregado: para cada show, calcula o resultado líquido
 * considerando cachê + transações vinculadas. Ordena por resultado desc.
 */
export interface ShowProfit extends ShowProfitability {
  showId: string;
}

export function profitByShow(
  shows: ShowLike[],
  transactions: TransactionLike[],
): ShowProfit[] {
  const byShow = new Map<string, TransactionLike[]>();
  for (const t of transactions) {
    if (!t.showId) continue;
    const list = byShow.get(t.showId);
    if (list) list.push(t);
    else byShow.set(t.showId, [t]);
  }

  return shows
    .map((show) => ({
      showId: show.id,
      ...computeShowProfitability(show, byShow.get(show.id) ?? []),
    }))
    .sort((a, b) => b.netCents - a.netCents);
}
