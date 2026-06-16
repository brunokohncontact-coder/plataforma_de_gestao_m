// Lógica financeira central do Palco — o diferencial do produto (F3/F4).
// Funções puras, testáveis sem banco nem framework. Todos os valores em centavos.

import type { ShowLike, TransactionLike } from "./domain";

export interface ShowProfitability {
  /** Cachê acordado do show (centavos). */
  feeCents: number;
  /** Receitas extras vinculadas ao show, além do cachê (centavos). */
  extraIncomeCents: number;
  /** Total de despesas vinculadas ao show (centavos). */
  expensesCents: number;
  /** Resultado = cachê + receitas extras − despesas (centavos). Pode ser negativo. */
  netCents: number;
  /** Margem sobre a receita bruta (0..1). 0 quando não há receita. */
  margin: number;
}

/**
 * Calcula a rentabilidade (P&L) de um único show:
 *   resultado = cachê + receitas extras vinculadas − despesas vinculadas.
 *
 * Observação de modelagem: o cachê (`feeCents`) é o valor acordado do show e já
 * representa a receita principal. Transações de receita vinculadas ao show são
 * tratadas como receita ADICIONAL (ex.: venda de merch no show), para não
 * contar o cachê em dobro caso o usuário também registre uma transação de
 * recebimento do cachê. Recebimentos do próprio cachê devem usar a categoria
 * apropriada, mas não somam de novo aqui — ver `extraIncomeCents`.
 */
export function calcShowProfitability(
  show: Pick<ShowLike, "feeCents">,
  linkedTransactions: TransactionLike[],
): ShowProfitability {
  let extraIncomeCents = 0;
  let expensesCents = 0;

  for (const t of linkedTransactions) {
    if (t.type === "income") {
      extraIncomeCents += t.amountCents;
    } else if (t.type === "expense") {
      expensesCents += t.amountCents;
    }
  }

  const grossCents = show.feeCents + extraIncomeCents;
  const netCents = grossCents - expensesCents;
  const margin = grossCents > 0 ? netCents / grossCents : 0;

  return {
    feeCents: show.feeCents,
    extraIncomeCents,
    expensesCents,
    netCents,
    margin,
  };
}

export interface FinancialSummary {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  /** Receita já recebida (status "received"). */
  receivedCents: number;
  /** Receita ainda pendente de recebimento (status "pending") — contas a receber. */
  pendingCents: number;
}

/** Resumo financeiro agregado de um conjunto de transações. */
export function summarize(transactions: TransactionLike[]): FinancialSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  let receivedCents = 0;
  let pendingCents = 0;

  for (const t of transactions) {
    if (t.type === "income") {
      incomeCents += t.amountCents;
      if (t.status === "pending") {
        pendingCents += t.amountCents;
      } else {
        receivedCents += t.amountCents;
      }
    } else if (t.type === "expense") {
      expenseCents += t.amountCents;
    }
  }

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    receivedCents,
    pendingCents,
  };
}

export interface MonthlyBucket extends FinancialSummary {
  /** Chave do mês no formato "YYYY-MM" (UTC). */
  month: string;
}

/** Agrega transações por mês (YYYY-MM, UTC), ordenado cronologicamente. */
export function summarizeByMonth(
  transactions: TransactionLike[],
): MonthlyBucket[] {
  const groups = new Map<string, TransactionLike[]>();

  for (const t of transactions) {
    const key = monthKey(t.date);
    const list = groups.get(key);
    if (list) {
      list.push(t);
    } else {
      groups.set(key, [t]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, txns]) => ({ month, ...summarize(txns) }));
}

export interface CategoryBucket {
  category: string;
  type: string;
  totalCents: number;
  count: number;
}

/** Agrega transações por categoria (e tipo), ordenado por maior total. */
export function summarizeByCategory(
  transactions: TransactionLike[],
): CategoryBucket[] {
  const groups = new Map<string, CategoryBucket>();

  for (const t of transactions) {
    const key = `${t.type}::${t.category}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.totalCents += t.amountCents;
      bucket.count += 1;
    } else {
      groups.set(key, {
        category: t.category,
        type: t.type,
        totalCents: t.amountCents,
        count: 1,
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.totalCents - a.totalCents);
}

/** Deriva a chave "YYYY-MM" de uma data, em UTC para estabilidade entre fusos. */
export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
