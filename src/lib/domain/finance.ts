// Lógica de negócio financeira — funções PURAS (sem Prisma/IO), 100% testáveis.
// Núcleo do diferencial do produto: rentabilidade por show e agregações financeiras.
//
// Modelo de valores (ver DECISIONS.md D4):
//   - `amount` é sempre positivo; o sinal econômico vem de `type` (receita/despesa).
//   - `feeAgreed` (no Show) é o cachê CONTRATADO — referência de receita planejada.
//   - Transações do tipo "receita" vinculadas ao show são a receita REALIZADA
//     (bilheteria, cachê recebido, merch). Para evitar dupla contagem, o P&L expõe
//     ambos separadamente: resultado planejado (cachê − despesas) e
//     resultado realizado (receitas lançadas − despesas).

import type { TransactionType, TransactionCategory } from "./constants";

export interface TransactionLike {
  type: TransactionType | string;
  amount: number;
  category?: TransactionCategory | string;
  date: Date | string;
  received: boolean;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  feeAgreed: number;
  status?: string;
}

/** Soma valores com segurança numérica (ignora NaN/negativos espúrios via Math.max? não —
 *  confiamos na validação de entrada; aqui apenas somamos). */
function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Arredonda para 2 casas decimais evitando erros de ponto flutuante (ex.: 0.1+0.2). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ShowPnL {
  showId: string;
  feeAgreed: number;
  /** Receita efetivamente lançada como transação (received=true) vinculada ao show. */
  revenueReceived: number;
  /** Receita lançada mas ainda pendente (received=false). */
  revenuePending: number;
  /** Total de despesas vinculadas já pagas (received=true). */
  expensesPaid: number;
  /** Despesas vinculadas ainda pendentes (received=false). */
  expensesPending: number;
  /** Soma de todas as despesas vinculadas (pagas + pendentes). */
  expensesTotal: number;
  /** Resultado planejado: cachê contratado − despesas totais. (headline do MVP) */
  plannedResult: number;
  /** Resultado realizado: receitas lançadas (recebidas + pendentes) − despesas totais. */
  actualResult: number;
}

/**
 * Calcula a rentabilidade (P&L) de um show a partir do cachê e das transações vinculadas.
 * Recebe apenas as transações já filtradas para este show (ou filtra por showId se houver mistura).
 */
export function computeShowPnL(
  show: ShowLike,
  transactions: TransactionLike[],
): ShowPnL {
  const linked = transactions.filter((t) => t.showId === show.id);

  const revenues = linked.filter((t) => t.type === "receita");
  const expenses = linked.filter((t) => t.type === "despesa");

  const revenueReceived = sum(
    revenues.filter((t) => t.received).map((t) => t.amount),
  );
  const revenuePending = sum(
    revenues.filter((t) => !t.received).map((t) => t.amount),
  );
  const expensesPaid = sum(
    expenses.filter((t) => t.received).map((t) => t.amount),
  );
  const expensesPending = sum(
    expenses.filter((t) => !t.received).map((t) => t.amount),
  );
  const expensesTotal = expensesPaid + expensesPending;
  const revenueTotal = revenueReceived + revenuePending;

  return {
    showId: show.id,
    feeAgreed: round2(show.feeAgreed),
    revenueReceived: round2(revenueReceived),
    revenuePending: round2(revenuePending),
    expensesPaid: round2(expensesPaid),
    expensesPending: round2(expensesPending),
    expensesTotal: round2(expensesTotal),
    plannedResult: round2(show.feeAgreed - expensesTotal),
    actualResult: round2(revenueTotal - expensesTotal),
  };
}

export interface FinancialSummary {
  totalRevenue: number; // receitas recebidas
  totalExpenses: number; // despesas pagas
  netResult: number; // recebidas − pagas
  pendingRevenue: number; // a receber
  pendingExpenses: number; // a pagar
  balanceProjected: number; // (recebidas + a receber) − (pagas + a pagar)
}

/** Resumo financeiro global (ou de um período já filtrado). */
export function computeFinancialSummary(
  transactions: TransactionLike[],
): FinancialSummary {
  const revenues = transactions.filter((t) => t.type === "receita");
  const expenses = transactions.filter((t) => t.type === "despesa");

  const totalRevenue = sum(
    revenues.filter((t) => t.received).map((t) => t.amount),
  );
  const pendingRevenue = sum(
    revenues.filter((t) => !t.received).map((t) => t.amount),
  );
  const totalExpenses = sum(
    expenses.filter((t) => t.received).map((t) => t.amount),
  );
  const pendingExpenses = sum(
    expenses.filter((t) => !t.received).map((t) => t.amount),
  );

  return {
    totalRevenue: round2(totalRevenue),
    totalExpenses: round2(totalExpenses),
    netResult: round2(totalRevenue - totalExpenses),
    pendingRevenue: round2(pendingRevenue),
    pendingExpenses: round2(pendingExpenses),
    balanceProjected: round2(
      totalRevenue + pendingRevenue - (totalExpenses + pendingExpenses),
    ),
  };
}

export interface CategoryBreakdownItem {
  category: string;
  type: TransactionType | string;
  total: number;
}

/** Agrega valores por categoria (e tipo). Considera apenas received=true por padrão. */
export function computeCategoryBreakdown(
  transactions: TransactionLike[],
  options: { includePending?: boolean } = {},
): CategoryBreakdownItem[] {
  const { includePending = false } = options;
  const filtered = includePending
    ? transactions
    : transactions.filter((t) => t.received);

  const map = new Map<string, CategoryBreakdownItem>();
  for (const t of filtered) {
    const category = t.category ?? "outro";
    const key = `${t.type}:${category}`;
    const existing = map.get(key);
    if (existing) {
      existing.total = round2(existing.total + t.amount);
    } else {
      map.set(key, { category, type: t.type, total: round2(t.amount) });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export interface MonthlyPoint {
  /** Chave ISO do mês: "YYYY-MM". */
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

function toMonthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Série temporal mensal de receitas/despesas (received=true por padrão).
 * Retorna ordenada por mês crescente.
 */
export function computeMonthlyTimeline(
  transactions: TransactionLike[],
  options: { includePending?: boolean } = {},
): MonthlyPoint[] {
  const { includePending = false } = options;
  const filtered = includePending
    ? transactions
    : transactions.filter((t) => t.received);

  const map = new Map<string, MonthlyPoint>();
  for (const t of filtered) {
    const month = toMonthKey(t.date);
    const point =
      map.get(month) ?? { month, revenue: 0, expenses: 0, net: 0 };
    if (t.type === "receita") point.revenue = round2(point.revenue + t.amount);
    else if (t.type === "despesa")
      point.expenses = round2(point.expenses + t.amount);
    point.net = round2(point.revenue - point.expenses);
    map.set(month, point);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/** Formata um número como moeda em pt-BR (BRL). Útil na UI; testável aqui. */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
