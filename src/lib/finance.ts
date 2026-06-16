/**
 * Lógica financeira do MVP (pura, sem I/O — testável isoladamente).
 *
 * Cobre:
 *  - F3: agregações financeiras (totais, mensal, por categoria) e contas a receber.
 *  - F4: rentabilidade por show (cachê − despesas vinculadas = resultado).
 *
 * Convenção: TODOS os valores monetários estão em CENTAVOS (inteiros).
 */
import type {
  TransactionType,
  TransactionStatus,
} from "./domain";

// Formas mínimas necessárias (desacopladas do Prisma para facilitar testes).
export interface TransactionLike {
  type: TransactionType;
  amountCents: number;
  date: Date;
  status: TransactionStatus;
  category: string;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  feeCents: number;
}

// ---------------------------------------------------------------------------
// F4 — Rentabilidade por show
// ---------------------------------------------------------------------------

export interface ShowPnL {
  /** Cachê acordado (receita planejada). */
  feeCents: number;
  /** Soma das receitas (transações income) vinculadas ao show. */
  linkedIncomeCents: number;
  /** Soma das despesas (transações expense) vinculadas ao show. */
  linkedExpenseCents: number;
  /**
   * Resultado headline: cachê − despesas vinculadas.
   * É a definição de "rentabilidade por show" do mvp-scope.md (F4).
   */
  resultCents: number;
  /**
   * Resultado considerando o caixa realizado das transações:
   * receitas vinculadas − despesas vinculadas. Útil quando o cachê
   * já foi (ou não) lançado como transação.
   */
  realizedResultCents: number;
}

/**
 * Calcula o P&L de um show a partir do seu cachê e das transações vinculadas.
 * Apenas transações cujo `showId === show.id` são consideradas.
 */
export function showProfitAndLoss(
  show: ShowLike,
  transactions: readonly TransactionLike[],
): ShowPnL {
  let linkedIncomeCents = 0;
  let linkedExpenseCents = 0;

  for (const t of transactions) {
    if (t.showId !== show.id) continue;
    if (t.type === "income") linkedIncomeCents += t.amountCents;
    else linkedExpenseCents += t.amountCents;
  }

  return {
    feeCents: show.feeCents,
    linkedIncomeCents,
    linkedExpenseCents,
    resultCents: show.feeCents - linkedExpenseCents,
    realizedResultCents: linkedIncomeCents - linkedExpenseCents,
  };
}

// ---------------------------------------------------------------------------
// F3 — Resumo financeiro
// ---------------------------------------------------------------------------

export interface FinancialSummary {
  incomeCents: number;
  expenseCents: number;
  /** incomeCents − expenseCents */
  balanceCents: number;
  /** Receita já recebida (status = received). */
  receivedIncomeCents: number;
  /** Receita pendente / contas a receber (status = pending). */
  pendingIncomeCents: number;
}

export interface SummaryOptions {
  /**
   * Quando true, considera apenas transações com status "received"
   * (visão de caixa). Quando false (default), considera tudo (visão de competência).
   */
  onlyReceived?: boolean;
}

/** Totais de receita, despesa e saldo. */
export function financialSummary(
  transactions: readonly TransactionLike[],
  { onlyReceived = false }: SummaryOptions = {},
): FinancialSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let receivedIncomeCents = 0;
  let pendingIncomeCents = 0;

  for (const t of transactions) {
    if (t.type === "income") {
      if (t.status === "received") receivedIncomeCents += t.amountCents;
      else pendingIncomeCents += t.amountCents;

      if (!onlyReceived || t.status === "received") incomeCents += t.amountCents;
    } else {
      if (!onlyReceived || t.status === "received") expenseCents += t.amountCents;
    }
  }

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    receivedIncomeCents,
    pendingIncomeCents,
  };
}

// ---------------------------------------------------------------------------
// F3 — Resumo mensal
// ---------------------------------------------------------------------------

export interface MonthlyBucket {
  /** Chave do mês no formato "YYYY-MM". */
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

/** Retorna chave "YYYY-MM" para uma data (em UTC, para estabilidade nos testes). */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Agrega transações por mês, ordenado cronologicamente.
 * Considera a visão de competência (todas as transações).
 */
export function monthlySummary(
  transactions: readonly TransactionLike[],
): MonthlyBucket[] {
  const buckets = new Map<string, MonthlyBucket>();

  for (const t of transactions) {
    const key = monthKey(t.date);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { month: key, incomeCents: 0, expenseCents: 0, balanceCents: 0 };
      buckets.set(key, bucket);
    }
    if (t.type === "income") bucket.incomeCents += t.amountCents;
    else bucket.expenseCents += t.amountCents;
    bucket.balanceCents = bucket.incomeCents - bucket.expenseCents;
  }

  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// ---------------------------------------------------------------------------
// F3 — Quebra por categoria
// ---------------------------------------------------------------------------

export interface CategoryBucket {
  category: string;
  totalCents: number;
  /** Participação no total do tipo (0..1). */
  share: number;
}

/**
 * Soma por categoria para um dado tipo (income ou expense), ordenado do maior
 * para o menor, com a participação relativa de cada categoria.
 */
export function categoryBreakdown(
  transactions: readonly TransactionLike[],
  type: TransactionType,
): CategoryBucket[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const t of transactions) {
    if (t.type !== type) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amountCents);
    grandTotal += t.amountCents;
  }

  return [...totals.entries()]
    .map(([category, totalCents]) => ({
      category,
      totalCents,
      share: grandTotal > 0 ? totalCents / grandTotal : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

// ---------------------------------------------------------------------------
// F3 — Contas a receber (Necessidade #6)
// ---------------------------------------------------------------------------

export interface AccountsReceivable {
  totalPendingCents: number;
  /** Quantidade de receitas pendentes. */
  count: number;
}

/** Total e contagem de receitas pendentes de recebimento. */
export function accountsReceivable(
  transactions: readonly TransactionLike[],
): AccountsReceivable {
  let totalPendingCents = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.type === "income" && t.status === "pending") {
      totalPendingCents += t.amountCents;
      count += 1;
    }
  }
  return { totalPendingCents, count };
}
