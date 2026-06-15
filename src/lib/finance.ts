/**
 * Lógica de negócio financeira do Palco — o diferencial do produto.
 *
 * Trabalha sobre tipos "puros" (não acoplados ao Prisma) para ser facilmente testável.
 * Todos os valores em **centavos** (inteiros).
 */

export type TxType = "INCOME" | "EXPENSE";

export interface TxLike {
  type: TxType;
  amountCents: number;
  category: string;
  date: Date;
  settled: boolean;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  feeCents: number;
}

/**
 * Resultado (P&L) de um único show.
 *
 * - `feeCents`: cachê acordado no cadastro do show.
 * - `incomeCents`: receitas reais vinculadas (ex.: cachê pago, venda de merch no show).
 * - `expenseCents`: despesas reais vinculadas (transporte, equipe, etc.).
 * - `grossRevenueCents`: receita reconhecida do show. Usamos a maior entre o cachê
 *   acordado e as receitas lançadas, para que o resultado seja útil mesmo antes de
 *   lançar a receita real (quando só há o cachê) e depois (quando há transações).
 * - `netResultCents`: receita reconhecida − despesas vinculadas.
 */
export interface ShowPnL {
  showId: string;
  feeCents: number;
  incomeCents: number;
  expenseCents: number;
  grossRevenueCents: number;
  netResultCents: number;
}

export function computeShowPnL(show: ShowLike, transactions: TxLike[]): ShowPnL {
  const linked = transactions.filter((t) => t.showId === show.id);

  const incomeCents = sum(linked.filter((t) => t.type === "INCOME").map((t) => t.amountCents));
  const expenseCents = sum(linked.filter((t) => t.type === "EXPENSE").map((t) => t.amountCents));

  const grossRevenueCents = Math.max(show.feeCents, incomeCents);
  const netResultCents = grossRevenueCents - expenseCents;

  return {
    showId: show.id,
    feeCents: show.feeCents,
    incomeCents,
    expenseCents,
    grossRevenueCents,
    netResultCents,
  };
}

/** Resumo financeiro agregado de um conjunto de transações. */
export interface FinanceSummary {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  /** Receita ainda não recebida (settled = false). */
  pendingIncomeCents: number;
  /** Despesa ainda não paga (settled = false). */
  pendingExpenseCents: number;
}

export function summarize(transactions: TxLike[]): FinanceSummary {
  const incomes = transactions.filter((t) => t.type === "INCOME");
  const expenses = transactions.filter((t) => t.type === "EXPENSE");

  const incomeCents = sum(incomes.map((t) => t.amountCents));
  const expenseCents = sum(expenses.map((t) => t.amountCents));
  const pendingIncomeCents = sum(incomes.filter((t) => !t.settled).map((t) => t.amountCents));
  const pendingExpenseCents = sum(expenses.filter((t) => !t.settled).map((t) => t.amountCents));

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    pendingIncomeCents,
    pendingExpenseCents,
  };
}

export interface CategoryTotal {
  category: string;
  type: TxType;
  totalCents: number;
  count: number;
}

/** Agrega totais por categoria (e tipo), ordenado do maior para o menor. */
export function totalsByCategory(transactions: TxLike[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const t of transactions) {
    const key = `${t.type}::${t.category}`;
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

export interface MonthlyTotal {
  /** Chave do mês no formato "YYYY-MM". */
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

/** Agrega receitas/despesas por mês (YYYY-MM), em ordem cronológica crescente. */
export function totalsByMonth(transactions: TxLike[]): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  for (const t of transactions) {
    const month = monthKey(t.date);
    let entry = map.get(month);
    if (!entry) {
      entry = { month, incomeCents: 0, expenseCents: 0, balanceCents: 0 };
      map.set(month, entry);
    }
    if (t.type === "INCOME") entry.incomeCents += t.amountCents;
    else entry.expenseCents += t.amountCents;
    entry.balanceCents = entry.incomeCents - entry.expenseCents;
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Calcula o P&L de cada show e devolve a lista ordenada por resultado (maior primeiro). */
export function pnlByShow(shows: ShowLike[], transactions: TxLike[]): ShowPnL[] {
  return shows
    .map((s) => computeShowPnL(s, transactions))
    .sort((a, b) => b.netResultCents - a.netResultCents);
}

// ---- helpers ----

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Chave "YYYY-MM" em UTC (estável entre fusos). */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
