// Lógica de negócio financeira — funções puras e testáveis.
//
// Convenções de domínio:
// - O `fee` (cachê) do show é a receita-âncora e NÃO é representado como uma Transaction,
//   para evitar dupla contagem. Transações vinculadas a um show são extras: outras receitas
//   (ex.: venda de merch) ou despesas (transporte, hospedagem, equipe, equipamento).
// - Rentabilidade do show = fee + receitas vinculadas − despesas vinculadas.
// - "Realizado/caixa" considera apenas valores liquidados (SETTLED / feeStatus SETTLED);
//   "previsto" considera tudo (pendente + liquidado).

import type { Show, Transaction, TransactionType } from "./domain";

/** Arredonda para 2 casas decimais evitando erros de ponto flutuante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sumAmount(transactions: Transaction[], type: TransactionType): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((acc, t) => acc + t.amount, 0);
}

export interface ShowProfitability {
  showId: string;
  fee: number;
  linkedIncome: number;
  linkedExpense: number;
  /** Resultado previsto: fee + receitas − despesas (independente de liquidação). */
  net: number;
  /** Margem (net / receita bruta). 0 quando não há receita. */
  margin: number;
  /** Resultado já liquidado em caixa (apenas itens SETTLED). */
  realizedNet: number;
}

/**
 * Rentabilidade (P&L) de um único show.
 * `transactions` deve conter apenas (ou pode conter) transações; só as vinculadas
 * ao show entram no cálculo.
 */
export function showProfitability(
  show: Pick<Show, "id" | "fee" | "feeStatus">,
  transactions: Transaction[],
): ShowProfitability {
  const linked = transactions.filter((t) => t.showId === show.id);

  const linkedIncome = sumAmount(linked, "INCOME");
  const linkedExpense = sumAmount(linked, "EXPENSE");

  const grossIncome = show.fee + linkedIncome;
  const net = grossIncome - linkedExpense;

  const realizedIncome =
    (show.feeStatus === "SETTLED" ? show.fee : 0) +
    sumAmount(
      linked.filter((t) => t.status === "SETTLED"),
      "INCOME",
    );
  const realizedExpense = sumAmount(
    linked.filter((t) => t.status === "SETTLED"),
    "EXPENSE",
  );

  return {
    showId: show.id,
    fee: round2(show.fee),
    linkedIncome: round2(linkedIncome),
    linkedExpense: round2(linkedExpense),
    net: round2(net),
    margin: grossIncome > 0 ? round2(net / grossIncome) : 0,
    realizedNet: round2(realizedIncome - realizedExpense),
  };
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface FinancialSummary {
  /** Receita prevista: todas as receitas + cachês. */
  totalIncome: number;
  /** Despesa prevista: todas as despesas. */
  totalExpense: number;
  /** Saldo previsto (receita − despesa). */
  balance: number;
  /** Receita já recebida (SETTLED). */
  receivedIncome: number;
  /** Despesa já paga (SETTLED). */
  paidExpense: number;
  /** Saldo de caixa realizado. */
  realizedBalance: number;
  /** Receita a receber (PENDING) — contas a receber. */
  pendingIncome: number;
  /** Despesa a pagar (PENDING). */
  pendingExpense: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

/**
 * Resumo financeiro agregado.
 * Inclui os cachês dos shows como receita (categoria "Cachê"), respeitando o feeStatus.
 * Shows cancelados são ignorados.
 */
export function financialSummary(
  transactions: Transaction[],
  shows: Pick<Show, "id" | "fee" | "feeStatus" | "status">[] = [],
): FinancialSummary {
  const activeShows = shows.filter((s) => s.status !== "CANCELLED" && s.fee > 0);

  const feeIncome = activeShows.reduce((acc, s) => acc + s.fee, 0);
  const feeReceived = activeShows
    .filter((s) => s.feeStatus === "SETTLED")
    .reduce((acc, s) => acc + s.fee, 0);

  const txIncome = sumAmount(transactions, "INCOME");
  const txExpense = sumAmount(transactions, "EXPENSE");

  const txReceived = sumAmount(
    transactions.filter((t) => t.status === "SETTLED"),
    "INCOME",
  );
  const txPaid = sumAmount(
    transactions.filter((t) => t.status === "SETTLED"),
    "EXPENSE",
  );

  const totalIncome = feeIncome + txIncome;
  const totalExpense = txExpense;
  const receivedIncome = feeReceived + txReceived;
  const paidExpense = txPaid;

  return {
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    balance: round2(totalIncome - totalExpense),
    receivedIncome: round2(receivedIncome),
    paidExpense: round2(paidExpense),
    realizedBalance: round2(receivedIncome - paidExpense),
    pendingIncome: round2(totalIncome - receivedIncome),
    pendingExpense: round2(totalExpense - paidExpense),
    incomeByCategory: aggregateByCategory(transactions, "INCOME", feeIncome),
    expenseByCategory: aggregateByCategory(transactions, "EXPENSE"),
  };
}

function aggregateByCategory(
  transactions: Transaction[],
  type: TransactionType,
  feeIncome = 0,
): CategoryTotal[] {
  const map = new Map<string, number>();

  if (type === "INCOME" && feeIncome > 0) {
    map.set("Cachê", feeIncome);
  }

  for (const t of transactions) {
    if (t.type !== type) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }

  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthlyTotal {
  /** Chave do mês no formato YYYY-MM. */
  month: string;
  income: number;
  expense: number;
  balance: number;
}

/**
 * Quebra mensal de receitas e despesas (inclui cachês de shows não cancelados).
 * Ordenada cronologicamente. Usa o fuso UTC para chaves estáveis em testes.
 */
export function monthlyBreakdown(
  transactions: Transaction[],
  shows: Pick<Show, "fee" | "feeStatus" | "status" | "date">[] = [],
): MonthlyTotal[] {
  const map = new Map<string, { income: number; expense: number }>();

  const bucket = (date: Date) => {
    const key = monthKey(date);
    let entry = map.get(key);
    if (!entry) {
      entry = { income: 0, expense: 0 };
      map.set(key, entry);
    }
    return entry;
  };

  for (const s of shows) {
    if (s.status === "CANCELLED" || s.fee <= 0) continue;
    bucket(s.date).income += s.fee;
  }

  for (const t of transactions) {
    const entry = bucket(t.date);
    if (t.type === "INCOME") entry.income += t.amount;
    else entry.expense += t.amount;
  }

  return Array.from(map.entries())
    .map(([month, v]) => ({
      month,
      income: round2(v.income),
      expense: round2(v.expense),
      balance: round2(v.income - v.expense),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Chave YYYY-MM em UTC. */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
