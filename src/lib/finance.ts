/**
 * Lógica de negócio financeira do Palco — funções PURAS (sem I/O), testáveis.
 * Toda monetização em centavos (inteiros).
 */

export type TransactionType = "income" | "expense";

export interface TransactionLike {
  /** "income" | "expense" — string para aceitar dados vindos do banco (SQLite). */
  type: string;
  amountCents: number;
  category: string;
  date: Date | string;
  received: boolean;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  feeCents: number;
  status: string;
}

/** Resultado de rentabilidade (P&L) de um show. */
export interface ShowProfitability {
  showId: string;
  /** Cachê acordado do show. */
  feeCents: number;
  /** Soma das receitas vinculadas (além do cachê, ex.: venda de merch no show). */
  linkedIncomeCents: number;
  /** Soma das despesas vinculadas ao show. */
  linkedExpenseCents: number;
  /** Receita bruta considerada: cachê + receitas vinculadas. */
  grossCents: number;
  /** Resultado: bruto − despesas vinculadas. */
  netCents: number;
}

/**
 * Calcula a rentabilidade de um show: (cachê + receitas vinculadas) − despesas vinculadas.
 * O cachê do show é a receita-base; transações de receita vinculadas somam-se a ele,
 * e despesas vinculadas são subtraídas.
 */
export function calcShowProfitability(
  show: ShowLike,
  transactions: TransactionLike[],
): ShowProfitability {
  const linked = transactions.filter((t) => t.showId === show.id);

  const linkedIncomeCents = linked
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amountCents, 0);

  const linkedExpenseCents = linked
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amountCents, 0);

  const grossCents = show.feeCents + linkedIncomeCents;
  const netCents = grossCents - linkedExpenseCents;

  return {
    showId: show.id,
    feeCents: show.feeCents,
    linkedIncomeCents,
    linkedExpenseCents,
    grossCents,
    netCents,
  };
}

export interface FinancialSummary {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  /** Receitas ainda não recebidas (contas a receber). */
  pendingIncomeCents: number;
  /** Receitas efetivamente recebidas. */
  receivedIncomeCents: number;
}

/** Resumo financeiro de um conjunto de transações. */
export function summarize(transactions: TransactionLike[]): FinancialSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let pendingIncomeCents = 0;
  let receivedIncomeCents = 0;

  for (const t of transactions) {
    if (t.type === "income") {
      incomeCents += t.amountCents;
      if (t.received) receivedIncomeCents += t.amountCents;
      else pendingIncomeCents += t.amountCents;
    } else {
      expenseCents += t.amountCents;
    }
  }

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    pendingIncomeCents,
    receivedIncomeCents,
  };
}

/** Chave "YYYY-MM" a partir de uma data. */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface MonthlyBucket extends FinancialSummary {
  month: string; // YYYY-MM
}

/** Agrega transações por mês (ordenado cronologicamente). */
export function aggregateByMonth(transactions: TransactionLike[]): MonthlyBucket[] {
  const map = new Map<string, TransactionLike[]>();
  for (const t of transactions) {
    const key = monthKey(t.date);
    const arr = map.get(key);
    if (arr) arr.push(t);
    else map.set(key, [t]);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, txs]) => ({ month, ...summarize(txs) }));
}

export interface CategoryBucket {
  category: string;
  type: string;
  totalCents: number;
  count: number;
}

/** Agrega por categoria (separando receita/despesa). Ordenado por total desc. */
export function aggregateByCategory(transactions: TransactionLike[]): CategoryBucket[] {
  const map = new Map<string, CategoryBucket>();
  for (const t of transactions) {
    const key = `${t.type}:${t.category}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalCents += t.amountCents;
      existing.count += 1;
    } else {
      map.set(key, {
        category: t.category,
        type: t.type,
        totalCents: t.amountCents,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}
