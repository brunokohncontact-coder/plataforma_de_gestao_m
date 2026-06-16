// Lógica de negócio financeira (pura, sem dependência de banco/UI).
// Testada em finance.test.ts. Todos os valores em CENTAVOS (inteiros).

export type TransactionType = "INCOME" | "EXPENSE";

/** Forma mínima de transação exigida pelos cálculos (desacoplada do Prisma). */
export interface TxLike {
  type: TransactionType;
  amount: number; // centavos, sempre >= 0
  category: string;
  date: Date | string;
  received: boolean;
  showId?: string | null;
}

/** Forma mínima de show exigida pelos cálculos. */
export interface ShowLike {
  id: string;
  fee: number; // cachê acordado em centavos
  status?: string;
}

// ── Rentabilidade por show (F4 — principal diferencial) ─────────────────────

export interface ShowPnL {
  /** Cachê acordado (centavos). */
  fee: number;
  /** Soma das receitas extras vinculadas ao show (além do cachê). */
  extraIncome: number;
  /** Soma das despesas vinculadas ao show. */
  expenses: number;
  /** Resultado = cachê + receitas extras − despesas. */
  net: number;
  /** Margem sobre a receita bruta (0..1). 0 se receita bruta for 0. */
  margin: number;
}

/**
 * Calcula o P&L de um show a partir do seu cachê e das transações vinculadas.
 *
 * Regras:
 * - O cachê do show (`show.fee`) é a receita base.
 * - Transações INCOME vinculadas somam como receita extra (ex.: venda de merch no show).
 * - Transações EXPENSE vinculadas subtraem (transporte, equipamento, cachê de músicos…).
 * - `received` NÃO afeta o P&L (que é competência/acordado); afeta o caixa (ver cashFlow).
 */
export function computeShowPnL(show: ShowLike, txs: TxLike[]): ShowPnL {
  const linked = txs.filter((t) => t.showId === show.id);

  const extraIncome = sum(linked.filter((t) => t.type === "INCOME").map((t) => t.amount));
  const expenses = sum(linked.filter((t) => t.type === "EXPENSE").map((t) => t.amount));

  const grossIncome = show.fee + extraIncome;
  const net = grossIncome - expenses;
  const margin = grossIncome === 0 ? 0 : net / grossIncome;

  return { fee: show.fee, extraIncome, expenses, net, margin };
}

// ── Agregações financeiras (F3 — dashboard) ─────────────────────────────────

export interface FinanceSummary {
  totalIncome: number; // receitas (todas)
  totalExpense: number; // despesas (todas)
  balance: number; // receitas − despesas (regime de competência)
  // Caixa: apenas o que foi efetivamente recebido/pago (received = true)
  receivedIncome: number;
  paidExpense: number;
  cashBalance: number;
  // Contas a receber/pagar pendentes (received = false)
  pendingIncome: number;
  pendingExpense: number;
}

/** Resumo financeiro consolidado de uma lista de transações. */
export function summarizeFinances(txs: TxLike[]): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let receivedIncome = 0;
  let paidExpense = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;

  for (const t of txs) {
    if (t.type === "INCOME") {
      totalIncome += t.amount;
      if (t.received) receivedIncome += t.amount;
      else pendingIncome += t.amount;
    } else {
      totalExpense += t.amount;
      if (t.received) paidExpense += t.amount;
      else pendingExpense += t.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    receivedIncome,
    paidExpense,
    cashBalance: receivedIncome - paidExpense,
    pendingIncome,
    pendingExpense,
  };
}

export interface CategoryTotal {
  category: string;
  income: number;
  expense: number;
  net: number;
}

/** Totais por categoria, ordenados por maior movimentação absoluta. */
export function totalsByCategory(txs: TxLike[]): CategoryTotal[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of txs) {
    const entry = map.get(t.category) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") entry.income += t.amount;
    else entry.expense += t.amount;
    map.set(t.category, entry);
  }

  return Array.from(map.entries())
    .map(([category, { income, expense }]) => ({
      category,
      income,
      expense,
      net: income - expense,
    }))
    .sort((a, b) => b.income + b.expense - (a.income + a.expense));
}

export interface MonthlyTotal {
  /** Chave "YYYY-MM". */
  month: string;
  income: number;
  expense: number;
  net: number;
}

/** Totais agregados por mês (YYYY-MM), em ordem cronológica crescente. */
export function totalsByMonth(txs: TxLike[]): MonthlyTotal[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of txs) {
    const month = monthKey(t.date);
    const entry = map.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") entry.income += t.amount;
    else entry.expense += t.amount;
    map.set(month, entry);
  }

  return Array.from(map.entries())
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      net: income - expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// ── helpers ─────────────────────────────────────────────────────────────────

function sum(nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0);
}

/** Extrai a chave "YYYY-MM" de uma data, em UTC para estabilidade nos testes. */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
