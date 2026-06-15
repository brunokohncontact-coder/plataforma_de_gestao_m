// Lógica de negócio financeira — funções PURAS, sem dependência de Prisma/DB,
// para serem facilmente testáveis. A camada de dados converte registros do banco
// nestes tipos leves antes de chamar estas funções.
//
// Regras de negócio cobertas (ver docs/mvp-scope.md):
//  - F3: agregações de receitas/despesas por mês e por categoria; saldo.
//  - F4: rentabilidade (P&L) por show = cachê (realizado/confirmado) + receitas
//        vinculadas − despesas vinculadas.
//  - status de recebimento: distinguir valores efetivados (SETTLED) de pendentes.

export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentStatus = "PENDING" | "SETTLED";
export type ShowStatus = "PROPOSED" | "CONFIRMED" | "COMPLETED" | "CANCELED";

export interface TxLike {
  type: TransactionType;
  amountCents: number;
  category: string;
  date: Date;
  status: PaymentStatus;
  showId?: string | null;
}

export interface ShowLike {
  id: string;
  feeCents: number;
  status: ShowStatus;
}

// ---------------------------------------------------------------------------
// Agregações financeiras gerais (F3)
// ---------------------------------------------------------------------------

export interface FinanceTotals {
  /** Soma de receitas (centavos), considerando todas as transações. */
  incomeCents: number;
  /** Soma de despesas (centavos). */
  expenseCents: number;
  /** incomeCents − expenseCents (pode ser negativo). */
  balanceCents: number;
  /** Receitas ainda pendentes de recebimento (contas a receber). */
  pendingIncomeCents: number;
  /** Despesas ainda pendentes de pagamento (contas a pagar). */
  pendingExpenseCents: number;
  /** Receitas já recebidas (caixa de fato). */
  settledIncomeCents: number;
  /** Despesas já pagas. */
  settledExpenseCents: number;
}

export function computeTotals(transactions: TxLike[]): FinanceTotals {
  const totals: FinanceTotals = {
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0,
    pendingIncomeCents: 0,
    pendingExpenseCents: 0,
    settledIncomeCents: 0,
    settledExpenseCents: 0,
  };

  for (const tx of transactions) {
    const amount = Math.abs(tx.amountCents);
    if (tx.type === "INCOME") {
      totals.incomeCents += amount;
      if (tx.status === "SETTLED") totals.settledIncomeCents += amount;
      else totals.pendingIncomeCents += amount;
    } else {
      totals.expenseCents += amount;
      if (tx.status === "SETTLED") totals.settledExpenseCents += amount;
      else totals.pendingExpenseCents += amount;
    }
  }

  totals.balanceCents = totals.incomeCents - totals.expenseCents;
  return totals;
}

export interface CategorySummary {
  category: string;
  type: TransactionType;
  totalCents: number;
  count: number;
}

/** Agrupa transações por (categoria, tipo), somando valores. Ordenado por total desc. */
export function summarizeByCategory(transactions: TxLike[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const tx of transactions) {
    const key = `${tx.type}::${tx.category}`;
    const existing = map.get(key);
    const amount = Math.abs(tx.amountCents);
    if (existing) {
      existing.totalCents += amount;
      existing.count += 1;
    } else {
      map.set(key, {
        category: tx.category,
        type: tx.type,
        totalCents: amount,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}

export interface MonthlySummary {
  /** Chave "YYYY-MM" (UTC). */
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

/** Chave de mês "YYYY-MM" em UTC para uma data. */
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Agrupa transações por mês (UTC), somando receitas/despesas. Ordenado por mês asc. */
export function summarizeByMonth(transactions: TxLike[]): MonthlySummary[] {
  const map = new Map<string, MonthlySummary>();
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    let entry = map.get(key);
    if (!entry) {
      entry = { month: key, incomeCents: 0, expenseCents: 0, balanceCents: 0 };
      map.set(key, entry);
    }
    const amount = Math.abs(tx.amountCents);
    if (tx.type === "INCOME") entry.incomeCents += amount;
    else entry.expenseCents += amount;
    entry.balanceCents = entry.incomeCents - entry.expenseCents;
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

// ---------------------------------------------------------------------------
// Rentabilidade por show (F4) — principal diferencial do produto
// ---------------------------------------------------------------------------

export interface ShowPnL {
  showId: string;
  /** Cachê do show (centavos). Só conta como receita se o show não foi cancelado. */
  feeCents: number;
  /** Outras receitas vinculadas ao show (além do cachê). */
  linkedIncomeCents: number;
  /** Despesas vinculadas ao show. */
  linkedExpenseCents: number;
  /** Receita total considerada = fee (se não cancelado) + receitas vinculadas. */
  totalIncomeCents: number;
  /** Resultado = totalIncome − despesas vinculadas. */
  profitCents: number;
}

/**
 * Calcula o P&L de um show: cachê + receitas vinculadas − despesas vinculadas.
 *
 * Regras:
 *  - Show CANCELED não conta o cachê (não houve faturamento), mas mantém as
 *    despesas vinculadas (que podem ter sido incorridas mesmo assim).
 *  - `transactions` deve conter apenas transações deste show (showId === show.id);
 *    a função filtra defensivamente por segurança.
 */
export function computeShowPnL(show: ShowLike, transactions: TxLike[]): ShowPnL {
  const linked = transactions.filter((t) => t.showId === show.id);

  let linkedIncomeCents = 0;
  let linkedExpenseCents = 0;
  for (const tx of linked) {
    const amount = Math.abs(tx.amountCents);
    if (tx.type === "INCOME") linkedIncomeCents += amount;
    else linkedExpenseCents += amount;
  }

  const feeCounts = show.status !== "CANCELED";
  const feeCents = feeCounts ? show.feeCents : 0;
  const totalIncomeCents = feeCents + linkedIncomeCents;
  const profitCents = totalIncomeCents - linkedExpenseCents;

  return {
    showId: show.id,
    feeCents,
    linkedIncomeCents,
    linkedExpenseCents,
    totalIncomeCents,
    profitCents,
  };
}

/** Soma o lucro de vários shows (ex.: para o dashboard "lucro por show/mês"). */
export function totalProfit(pnls: ShowPnL[]): number {
  return pnls.reduce((sum, p) => sum + p.profitCents, 0);
}
