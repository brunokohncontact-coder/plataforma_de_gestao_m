/**
 * Lógica de negócio financeira do Palco. Funções puras, sem dependência de
 * Prisma/DB — recebem dados simples e retornam cálculos. Testadas em
 * `finance.test.ts` ANTES da UI (ver mvp-scope.md, ordem de implementação).
 */

export type TransactionType = "INCOME" | "EXPENSE";

/** Forma mínima de transação que os cálculos precisam (subset do modelo Prisma). */
export interface TxLike {
  type: TransactionType;
  amountCents: number; // sempre positivo; o sinal vem de `type`
  category: string;
  date: Date | string;
  paid: boolean;
  showId?: string | null;
}

/** Forma mínima de show para o cálculo de P&L. */
export interface ShowLike {
  id: string;
  feeCents: number; // cachê acordado
  status: "PROPOSED" | "CONFIRMED" | "DONE" | "CANCELLED";
}

/** Resultado de rentabilidade (P&L) de um show — F4, o diferencial do produto. */
export interface ShowPnL {
  feeCents: number; // cachê acordado
  incomeReceivedCents: number; // receitas vinculadas já recebidas
  incomePendingCents: number; // receitas vinculadas pendentes
  expensesCents: number; // total de despesas vinculadas (pagas + a pagar)
  /** Rentabilidade projetada: cachê − despesas vinculadas. */
  projectedProfitCents: number;
  /** Rentabilidade realizada: receitas recebidas − despesas pagas. */
  realizedProfitCents: number;
}

function asTime(d: Date | string): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

/**
 * Calcula a rentabilidade de um show a partir do cachê e das transações
 * vinculadas a ele. Considera-se "projetado" o cachê menos despesas; e
 * "realizado" o que efetivamente entrou menos o que efetivamente saiu.
 */
export function computeShowPnL(show: ShowLike, transactions: TxLike[]): ShowPnL {
  const linked = transactions.filter((t) => t.showId === show.id);

  let incomeReceivedCents = 0;
  let incomePendingCents = 0;
  let expensesCents = 0;
  let expensesPaidCents = 0;

  for (const t of linked) {
    if (t.type === "INCOME") {
      if (t.paid) incomeReceivedCents += t.amountCents;
      else incomePendingCents += t.amountCents;
    } else {
      expensesCents += t.amountCents;
      if (t.paid) expensesPaidCents += t.amountCents;
    }
  }

  return {
    feeCents: show.feeCents,
    incomeReceivedCents,
    incomePendingCents,
    expensesCents,
    projectedProfitCents: show.feeCents - expensesCents,
    realizedProfitCents: incomeReceivedCents - expensesPaidCents,
  };
}

/** Resumo financeiro de um conjunto de transações. */
export interface FinanceSummary {
  incomeTotalCents: number;
  incomeReceivedCents: number;
  incomePendingCents: number; // contas a receber (Necessidade #6)
  expenseTotalCents: number;
  expensePaidCents: number;
  expensePendingCents: number; // contas a pagar
  /** Saldo considerando tudo (recebido/pendente). */
  netCents: number;
  /** Saldo de caixa realizado (só recebido − só pago). */
  realizedNetCents: number;
}

export function summarize(transactions: TxLike[]): FinanceSummary {
  let incomeTotalCents = 0;
  let incomeReceivedCents = 0;
  let expenseTotalCents = 0;
  let expensePaidCents = 0;

  for (const t of transactions) {
    if (t.type === "INCOME") {
      incomeTotalCents += t.amountCents;
      if (t.paid) incomeReceivedCents += t.amountCents;
    } else {
      expenseTotalCents += t.amountCents;
      if (t.paid) expensePaidCents += t.amountCents;
    }
  }

  return {
    incomeTotalCents,
    incomeReceivedCents,
    incomePendingCents: incomeTotalCents - incomeReceivedCents,
    expenseTotalCents,
    expensePaidCents,
    expensePendingCents: expenseTotalCents - expensePaidCents,
    netCents: incomeTotalCents - expenseTotalCents,
    realizedNetCents: incomeReceivedCents - expensePaidCents,
  };
}

export interface MonthlyBucket {
  /** Chave "AAAA-MM". */
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

/** Agrega transações por mês (AAAA-MM), ordenado cronologicamente. */
export function aggregateByMonth(transactions: TxLike[]): MonthlyBucket[] {
  const map = new Map<string, MonthlyBucket>();

  for (const t of transactions) {
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    let bucket = map.get(month);
    if (!bucket) {
      bucket = { month, incomeCents: 0, expenseCents: 0, netCents: 0 };
      map.set(month, bucket);
    }
    if (t.type === "INCOME") bucket.incomeCents += t.amountCents;
    else bucket.expenseCents += t.amountCents;
    bucket.netCents = bucket.incomeCents - bucket.expenseCents;
  }

  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export interface CategoryBucket {
  category: string;
  totalCents: number;
  count: number;
}

/** Agrega por categoria, filtrando por tipo. Ordenado por total desc. */
export function aggregateByCategory(
  transactions: TxLike[],
  type: TransactionType,
): CategoryBucket[] {
  const map = new Map<string, CategoryBucket>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    const key = t.category || "Sem categoria";
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { category: key, totalCents: 0, count: 0 };
      map.set(key, bucket);
    }
    bucket.totalCents += t.amountCents;
    bucket.count += 1;
  }

  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}
