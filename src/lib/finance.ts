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
  /** Descrição livre; usada apenas na busca textual (`q`). Opcional para callers que não a têm. */
  description?: string | null;
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

// ── Ranking de rentabilidade por show (F4) ──────────────────────────────────

export interface ShowProfitRow<S extends ShowLike = ShowLike> {
  show: S;
  pnl: ShowPnL;
}

export interface ShowsProfitability<S extends ShowLike = ShowLike> {
  /** Linhas ordenadas por resultado (`net`) decrescente. */
  rows: ShowProfitRow<S>[];
  /** Nº de shows considerados (após exclusões). */
  count: number;
  /** Receita bruta somada (cachê + receitas extras). */
  totalIncome: number;
  /** Despesas somadas. */
  totalExpenses: number;
  /** Resultado líquido somado. */
  totalNet: number;
  /** Show mais rentável (maior `net`) ou null se não houver shows. */
  best: ShowProfitRow<S> | null;
  /** Show menos rentável (menor `net`) ou null se não houver shows. */
  worst: ShowProfitRow<S> | null;
}

/**
 * Classifica os shows por rentabilidade (P&L), do mais ao menos lucrativo —
 * respondendo "quais shows realmente deram dinheiro" (principal decisão de F4).
 *
 * - Reaproveita `computeShowPnL` (uma única fonte de verdade do cálculo por show).
 * - Por padrão exclui shows com status `CANCELLED` (não representam rentabilidade
 *   real); `opts.excludeStatuses` permite customizar a lista de exclusão.
 * - Ordena por `net` decrescente; empate desfeito pelo `id` (ordem estável).
 */
export function rankShowsByProfit<S extends ShowLike>(
  shows: S[],
  txs: TxLike[],
  opts: { excludeStatuses?: string[] } = {},
): ShowsProfitability<S> {
  const excluded = new Set(opts.excludeStatuses ?? ["CANCELLED"]);

  const rows: ShowProfitRow<S>[] = shows
    .filter((s) => !(s.status != null && excluded.has(s.status)))
    .map((show) => ({ show, pnl: computeShowPnL(show, txs) }))
    .sort((a, b) => b.pnl.net - a.pnl.net || a.show.id.localeCompare(b.show.id));

  const totalIncome = sum(rows.map((r) => r.pnl.fee + r.pnl.extraIncome));
  const totalExpenses = sum(rows.map((r) => r.pnl.expenses));
  const totalNet = sum(rows.map((r) => r.pnl.net));

  return {
    rows,
    count: rows.length,
    totalIncome,
    totalExpenses,
    totalNet,
    best: rows.length > 0 ? rows[0] : null,
    worst: rows.length > 0 ? rows[rows.length - 1] : null,
  };
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

export interface CategorySlice {
  /** Nome da categoria (categorias em branco caem em "Sem categoria"). */
  category: string;
  /** Total da categoria (centavos). */
  amount: number;
  /** Participação no total do tipo (0..1); 0 quando o total do tipo é 0. */
  share: number;
}

export interface CategoryReport {
  /** Categorias de receita, ordem decrescente por valor. */
  income: CategorySlice[];
  /** Categorias de despesa, ordem decrescente por valor. */
  expense: CategorySlice[];
  /** Soma das receitas. */
  totalIncome: number;
  /** Soma das despesas. */
  totalExpense: number;
}

/**
 * Agrupa as transações por categoria separando receitas de despesas, com a
 * participação (`share`, 0..1) de cada categoria no total do seu tipo. As
 * categorias vêm ordenadas por valor decrescente (empate desempatado pelo nome,
 * pt-BR). Categorias em branco/ausentes caem em "Sem categoria". Pura.
 *
 * Pensada para o relatório mensal (fechamento): "para onde foi o dinheiro?".
 */
export function categoryReport(txs: TxLike[]): CategoryReport {
  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of txs) {
    const category = t.category?.trim() || "Sem categoria";
    if (t.type === "INCOME") {
      income.set(category, (income.get(category) ?? 0) + t.amount);
      totalIncome += t.amount;
    } else {
      expense.set(category, (expense.get(category) ?? 0) + t.amount);
      totalExpense += t.amount;
    }
  }

  const toSlices = (map: Map<string, number>, total: number): CategorySlice[] =>
    Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        share: total === 0 ? 0 : amount / total,
      }))
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, "pt-BR"));

  return {
    income: toSlices(income, totalIncome),
    expense: toSlices(expense, totalExpense),
    totalIncome,
    totalExpense,
  };
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

// ── Resumo anual (F3 — visão do ano para prestação de contas) ───────────────

export interface AnnualMonth {
  /** Chave "YYYY-MM". */
  month: string;
  /** Mês 1-12 (janeiro = 1). */
  monthIndex: number;
  income: number;
  expense: number;
  /** income − expense (regime de competência). */
  net: number;
}

export interface AnnualSummary {
  /** Ano de referência. */
  year: number;
  /** Exatamente 12 meses (janeiro→dezembro), zeros inclusive. */
  months: AnnualMonth[];
  /** Soma das receitas do ano. */
  totalIncome: number;
  /** Soma das despesas do ano. */
  totalExpense: number;
  /** totalIncome − totalExpense. */
  net: number;
  /** Mês com maior resultado entre os que tiveram movimento; null se nenhum teve. */
  best: AnnualMonth | null;
  /** Mês com menor resultado entre os que tiveram movimento; null se nenhum teve. */
  worst: AnnualMonth | null;
}

/**
 * Consolida as transações de um ano em 12 meses (janeiro→dezembro), com totais do
 * ano e o melhor/pior mês (por resultado líquido) entre os que tiveram movimento.
 * Responde "como foi o ano?" — útil para fechamento/prestação de contas. Pura;
 * considera apenas as transações cujo mês (UTC) cai no `year` informado.
 */
export function annualSummary(txs: TxLike[], year: number): AnnualSummary {
  const prefix = `${year}-`;
  const income = new Array(12).fill(0);
  const expense = new Array(12).fill(0);

  for (const t of txs) {
    const key = monthKey(t.date);
    if (!key.startsWith(prefix)) continue;
    const idx = Number(key.slice(5, 7)) - 1; // 0-based
    if (idx < 0 || idx > 11) continue;
    if (t.type === "INCOME") income[idx] += t.amount;
    else expense[idx] += t.amount;
  }

  const months: AnnualMonth[] = income.map((inc, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    monthIndex: i + 1,
    income: inc,
    expense: expense[i],
    net: inc - expense[i],
  }));

  const totalIncome = sum(income);
  const totalExpense = sum(expense);

  // Melhor/pior entre meses com movimento (receita ou despesa > 0). Empate pelo
  // mês mais cedo (ordem estável, já que percorremos jan→dez).
  const active = months.filter((m) => m.income > 0 || m.expense > 0);
  let best: AnnualMonth | null = null;
  let worst: AnnualMonth | null = null;
  for (const m of active) {
    if (best === null || m.net > best.net) best = m;
    if (worst === null || m.net < worst.net) worst = m;
  }

  return {
    year,
    months,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    best,
    worst,
  };
}

/** Anos presentes nas transações, em ordem decrescente. */
export function availableYears(txs: TxLike[]): number[] {
  const set = new Set<number>();
  for (const t of txs) set.add(Number(monthKey(t.date).slice(0, 4)));
  return Array.from(set).sort((a, b) => b - a);
}

// ── Vencimento de pendências (F3 — gestão de fluxo de caixa) ────────────────

/** Situação de uma pendência em relação à data de referência (comparada por dia, UTC). */
export type DueStatus = "overdue" | "today" | "upcoming";

/**
 * Classifica a data de uma transação relativa a `now`, comparando por dia (UTC).
 * - "overdue": a data já passou (anterior a hoje).
 * - "today": vence hoje.
 * - "upcoming": vence no futuro.
 * Não considera o campo `received` — quem chama decide se a transação está pendente.
 */
export function pendingDueStatus(date: Date | string, now: Date | string = new Date()): DueStatus {
  const d = dayKey(date);
  const today = dayKey(now);
  if (d < today) return "overdue";
  if (d === today) return "today";
  return "upcoming";
}

/**
 * True se a transação é uma pendência vencida: não realizada (`received === false`)
 * e com data anterior a hoje (UTC). "Hoje" ainda não conta como vencido.
 */
export function isOverdue(t: TxLike, now: Date | string = new Date()): boolean {
  return !t.received && pendingDueStatus(t.date, now) === "overdue";
}

export interface OverdueSummary {
  /** Total a receber vencido (centavos). */
  income: number;
  /** Total a pagar vencido (centavos). */
  expense: number;
  /** Quantidade de receitas vencidas. */
  incomeCount: number;
  /** Quantidade de despesas vencidas. */
  expenseCount: number;
}

/**
 * Soma as pendências (received = false) cuja data já passou (anterior a hoje, UTC),
 * separando a receber de a pagar. Pura; "hoje" não conta como vencido.
 */
export function summarizeOverdue(
  txs: TxLike[],
  now: Date | string = new Date(),
): OverdueSummary {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const t of txs) {
    if (!isOverdue(t, now)) continue;
    if (t.type === "INCOME") {
      income += t.amount;
      incomeCount += 1;
    } else {
      expense += t.amount;
      expenseCount += 1;
    }
  }

  return { income, expense, incomeCount, expenseCount };
}

// ── Projeção de caixa (F3 — decisão "vou ter dinheiro nos próximos meses?") ──

export interface CashflowMonth {
  /** Chave "YYYY-MM". */
  month: string;
  /** A receber pendente (received=false, INCOME) com vencimento neste mês. */
  income: number;
  /** A pagar pendente (received=false, EXPENSE) com vencimento neste mês. */
  expense: number;
  /** income − expense (variação esperada de caixa no mês). */
  net: number;
  /** Saldo de caixa projetado ao fim do mês (acumulado a partir do caixa atual). */
  endBalance: number;
}

export interface CashflowProjection {
  /** Caixa realizado atual (received/paid), ponto de partida da projeção. */
  startBalance: number;
  /** Meses do horizonte, do mês atual em diante, com saldo projetado acumulado. */
  months: CashflowMonth[];
}

/**
 * Projeta o caixa dos próximos meses a partir do caixa realizado atual.
 *
 * Parte do `cashBalance` (o que já entrou/saiu de fato) e, mês a mês, soma as
 * pendências (received=false) pelo seu mês de vencimento, acumulando o saldo. As
 * pendências **vencidas ou de meses anteriores** ao atual são dobradas no mês
 * atual (ainda esperam-se receber/pagar); pendências além do horizonte são
 * ignoradas. Pura; mês de referência e horizonte são injetáveis para teste.
 */
export function projectCashflow(
  txs: TxLike[],
  options: { now?: Date | string; months?: number } = {},
): CashflowProjection {
  const now = options.now ?? new Date();
  const horizon = Math.max(1, Math.floor(options.months ?? 6));

  const startBalance = summarizeFinances(txs).cashBalance;
  const currentMonth = monthKey(now);
  const monthsSeq = sequentialMonths(currentMonth, horizon);
  const lastMonth = monthsSeq[monthsSeq.length - 1];

  const incomeByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();
  for (const t of txs) {
    if (t.received) continue; // realizado já está no startBalance
    let m = monthKey(t.date);
    if (m < currentMonth) m = currentMonth; // vencidas/antigas caem no mês atual
    if (m > lastMonth) continue; // além do horizonte projetado
    if (t.type === "INCOME") incomeByMonth.set(m, (incomeByMonth.get(m) ?? 0) + t.amount);
    else expenseByMonth.set(m, (expenseByMonth.get(m) ?? 0) + t.amount);
  }

  let running = startBalance;
  const months: CashflowMonth[] = monthsSeq.map((month) => {
    const income = incomeByMonth.get(month) ?? 0;
    const expense = expenseByMonth.get(month) ?? 0;
    const net = income - expense;
    running += net;
    return { month, income, expense, net, endBalance: running };
  });

  return { startBalance, months };
}

// ── Filtros (F3 — exploração das finanças) ──────────────────────────────────

export interface TransactionFilter {
  /** Mês "YYYY-MM"; quando ausente, não filtra por mês. */
  month?: string | null;
  /** Tipo (INCOME/EXPENSE); quando ausente, ambos. */
  type?: TransactionType | null;
  /** Vincular a um show específico; quando ausente, todos. */
  showId?: string | null;
  /** Status de caixa (true = recebido/pago, false = pendente); quando ausente, todos. */
  received?: boolean | null;
  /** Categoria exata; quando ausente, todas. */
  category?: string | null;
  /** Início do período "YYYY-MM-DD" (inclusive); quando ausente, sem limite inferior. */
  from?: string | null;
  /** Fim do período "YYYY-MM-DD" (inclusive); quando ausente, sem limite superior. */
  to?: string | null;
  /**
   * Busca textual (descrição + categoria), sem distinção de maiúsculas/minúsculas
   * nem de acentos. Quando ausente/em branco, não filtra por texto.
   */
  q?: string | null;
}

/**
 * Normaliza texto para busca: minúsculas, sem acentos (decompõe e remove
 * diacríticos) e com espaços das bordas removidos. Pura.
 */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Valida uma chave de mês "YYYY-MM" (mês entre 01 e 12). */
export function isValidMonthKey(key: string | undefined | null): key is string {
  if (!key) return false;
  const m = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

/** Valida uma chave de dia "YYYY-MM-DD" (mês 01–12, dia 01–31). */
export function isValidDateKey(key: string | undefined | null): key is string {
  if (!key) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** True se ao menos um critério do filtro está ativo. */
export function hasActiveFilter(filter: TransactionFilter): boolean {
  return Boolean(
    filter.month ||
      filter.type ||
      filter.showId ||
      filter.received != null ||
      filter.category ||
      filter.from ||
      filter.to ||
      normalizeText(filter.q),
  );
}

/**
 * Filtra transações pelos critérios informados. Critérios ausentes (null/undefined)
 * são ignorados; um mês inválido também é ignorado (não filtra por mês). Datas de
 * período inválidas também são ignoradas. O intervalo `from`/`to` é inclusivo nas
 * duas pontas; um intervalo invertido (`from` > `to`) não casa com nada. Pura.
 */
export function filterTransactions<T extends TxLike>(
  txs: T[],
  filter: TransactionFilter,
): T[] {
  const month = isValidMonthKey(filter.month) ? filter.month : null;
  const from = isValidDateKey(filter.from) ? filter.from : null;
  const to = isValidDateKey(filter.to) ? filter.to : null;
  const q = normalizeText(filter.q);
  return txs.filter((t) => {
    if (filter.type && t.type !== filter.type) return false;
    if (month && monthKey(t.date) !== month) return false;
    if (filter.showId && (t.showId ?? null) !== filter.showId) return false;
    if (filter.received != null && t.received !== filter.received) return false;
    if (filter.category && t.category !== filter.category) return false;
    if (from || to) {
      const day = dayKey(t.date);
      if (from && day < from) return false;
      if (to && day > to) return false;
    }
    if (q) {
      const haystack = `${normalizeText(t.description)} ${normalizeText(t.category)}`;
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Meses presentes nas transações ("YYYY-MM"), em ordem cronológica decrescente. */
export function availableMonths(txs: TxLike[]): string[] {
  const set = new Set<string>();
  for (const t of txs) set.add(monthKey(t.date));
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

/** Categorias presentes nas transações, únicas e em ordem alfabética (pt-BR). */
export function availableCategories(txs: TxLike[]): string[] {
  const set = new Set<string>();
  for (const t of txs) {
    const c = t.category?.trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ── helpers ─────────────────────────────────────────────────────────────────

function sum(nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0);
}

/** Sequência de `count` meses "YYYY-MM" a partir de `startKey` (inclusive), em UTC. */
function sequentialMonths(startKey: string, count: number): string[] {
  const [y, m] = startKey.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Extrai a chave "YYYY-MM" de uma data, em UTC para estabilidade nos testes. */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Extrai a chave "YYYY-MM-DD" de uma data, em UTC para estabilidade nos testes. */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
