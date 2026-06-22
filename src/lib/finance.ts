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

// ── Rentabilidade por local (agrega P&L por casa/venue) ─────────────────────

/** Forma mínima de show para agrupar por local. */
export interface VenueShowLike extends ShowLike {
  venue?: string | null;
  city?: string | null;
}

export interface VenueProfitRow {
  /** Chave normalizada de agrupamento (sem acento/caixa). "" = sem local. */
  key: string;
  /** Nome de exibição (grafia original mais frequente) ou "Sem local". */
  name: string;
  /** Nº de shows no grupo (após exclusões). */
  showCount: number;
  /** Cachê somado (centavos). */
  totalFee: number;
  /** Receitas extras somadas (centavos). */
  totalExtra: number;
  /** Despesas somadas (centavos). */
  totalExpenses: number;
  /** Resultado líquido somado = cachê + extras − despesas (centavos). */
  totalNet: number;
  /** Resultado líquido médio por show no grupo (centavos, arredondado). */
  avgNet: number;
  /** Margem agregada (net / receita bruta), 0 se receita bruta 0. */
  margin: number;
}

export interface VenuesProfitability {
  /** Linhas ordenadas por resultado (`totalNet`) decrescente. */
  rows: VenueProfitRow[];
  /** Nº de locais distintos considerados. */
  count: number;
  /** Resultado líquido somado de todos os locais. */
  totalNet: number;
  /** Local mais rentável (maior `totalNet`) ou null. */
  best: VenueProfitRow | null;
  /** Local menos rentável (menor `totalNet`) ou null. */
  worst: VenueProfitRow | null;
}

/**
 * Agrega a rentabilidade (P&L) dos shows por **local** — respondendo
 * "quais casas valem a pena tocar?". Distingue-se de `rankShowsByProfit`
 * (que olha cada gig isolado): aqui shows na mesma casa somam.
 *
 * - Agrupa por `venue` (normalizado: sem acento, minúsculo, trim); se vazio,
 *   cai para `city`; se ambos vazios, agrupa em "Sem local" (chave "").
 * - O nome exibido é a **grafia original mais frequente** do grupo (desempate
 *   pela primeira ocorrência), preservando acentos/caixa do usuário.
 * - Reaproveita `computeShowPnL` (fonte única do cálculo por show).
 * - Por padrão exclui shows `CANCELLED`; `opts.excludeStatuses` customiza.
 * - Ordena por `totalNet` desc; empate por nº de shows desc, depois nome (pt-BR)
 *   e chave — estável e determinístico.
 */
export function rankVenuesByProfit(
  shows: VenueShowLike[],
  txs: TxLike[],
  opts: { excludeStatuses?: string[] } = {},
): VenuesProfitability {
  return aggregateShowProfit(
    shows,
    txs,
    (show) => {
      const rawVenue = (show.venue ?? "").trim();
      const rawCity = (show.city ?? "").trim();
      // grafia original preferida: o local; caindo para a cidade
      return { rawLabel: rawVenue || rawCity, key: normalizeText(rawVenue) || normalizeText(rawCity) };
    },
    "Sem local",
    opts,
  );
}

// ── Rentabilidade por cidade (rollup geográfico, acima do local) ─────────────

/** Resultado por cidade tem a mesma forma de uma linha de local. */
export type CityProfitRow = VenueProfitRow;
/** Agregado por cidade tem a mesma forma do agregado por local. */
export type CitiesProfitability = VenuesProfitability;

/**
 * Agrega a rentabilidade (P&L) dos shows por **cidade** — respondendo
 * "quais cidades valem a turnê?". É um rollup acima de `rankVenuesByProfit`:
 * uma cidade reúne todas as casas/venues nela, somando os shows.
 *
 * - Agrupa só por `city` (normalizado: sem acento, minúsculo, trim); shows sem
 *   cidade caem no grupo "Sem cidade" (chave "").
 * - O nome exibido é a grafia original mais frequente da cidade (preserva
 *   acentos/caixa do usuário).
 * - Reaproveita `computeShowPnL` e o mesmo agregador de `rankVenuesByProfit`.
 * - Por padrão exclui shows `CANCELLED`; `opts.excludeStatuses` customiza.
 * - Ordena por `totalNet` desc; empate por nº de shows, nome (pt-BR) e chave.
 */
export function rankCitiesByProfit(
  shows: VenueShowLike[],
  txs: TxLike[],
  opts: { excludeStatuses?: string[] } = {},
): CitiesProfitability {
  return aggregateShowProfit(
    shows,
    txs,
    (show) => {
      const rawCity = (show.city ?? "").trim();
      return { rawLabel: rawCity, key: normalizeText(rawCity) };
    },
    "Sem cidade",
    opts,
  );
}

/**
 * Agregador genérico do P&L dos shows por um grupo arbitrário (local, cidade…).
 * `keyer` extrai a chave de agrupamento (normalizada) e a grafia original do
 * grupo; `emptyLabel` é o nome do grupo "vazio" (chave ""). Fonte única da
 * lógica compartilhada por `rankVenuesByProfit`/`rankCitiesByProfit`.
 */
function aggregateShowProfit(
  shows: VenueShowLike[],
  txs: TxLike[],
  keyer: (show: VenueShowLike) => { key: string; rawLabel: string },
  emptyLabel: string,
  opts: { excludeStatuses?: string[] } = {},
): VenuesProfitability {
  const excluded = new Set(opts.excludeStatuses ?? ["CANCELLED"]);

  interface Acc {
    key: string;
    showCount: number;
    totalFee: number;
    totalExtra: number;
    totalExpenses: number;
    totalNet: number;
    /** Contagem das grafias originais para escolher o nome de exibição. */
    labels: Map<string, { count: number; order: number }>;
    /** Ordem de primeira aparição do grupo (estabilidade). */
    order: number;
  }

  const groups = new Map<string, Acc>();
  let order = 0;

  for (const show of shows) {
    if (show.status != null && excluded.has(show.status)) continue;

    const { key, rawLabel } = keyer(show);

    let acc = groups.get(key);
    if (!acc) {
      acc = {
        key,
        showCount: 0,
        totalFee: 0,
        totalExtra: 0,
        totalExpenses: 0,
        totalNet: 0,
        labels: new Map(),
        order: order++,
      };
      groups.set(key, acc);
    }

    const pnl = computeShowPnL(show, txs);
    acc.showCount += 1;
    acc.totalFee += pnl.fee;
    acc.totalExtra += pnl.extraIncome;
    acc.totalExpenses += pnl.expenses;
    acc.totalNet += pnl.net;

    if (rawLabel) {
      const seen = acc.labels.get(rawLabel);
      if (seen) seen.count += 1;
      else acc.labels.set(rawLabel, { count: 1, order: acc.labels.size });
    }
  }

  const rows: VenueProfitRow[] = [...groups.values()].map((acc) => {
    const name = acc.key === "" ? emptyLabel : pickLabel(acc.labels, emptyLabel);
    const gross = acc.totalFee + acc.totalExtra;
    return {
      key: acc.key,
      name,
      showCount: acc.showCount,
      totalFee: acc.totalFee,
      totalExtra: acc.totalExtra,
      totalExpenses: acc.totalExpenses,
      totalNet: acc.totalNet,
      avgNet: acc.showCount > 0 ? Math.round(acc.totalNet / acc.showCount) : 0,
      margin: gross === 0 ? 0 : acc.totalNet / gross,
    };
  });

  rows.sort(
    (a, b) =>
      b.totalNet - a.totalNet ||
      b.showCount - a.showCount ||
      a.name.localeCompare(b.name, "pt-BR") ||
      a.key.localeCompare(b.key),
  );

  return {
    rows,
    count: rows.length,
    totalNet: sum(rows.map((r) => r.totalNet)),
    best: rows.length > 0 ? rows[0] : null,
    worst: rows.length > 0 ? rows[rows.length - 1] : null,
  };
}

/** Escolhe a grafia mais usada (desempate pela primeira aparição). */
function pickLabel(
  labels: Map<string, { count: number; order: number }>,
  emptyLabel: string,
): string {
  let best: { label: string; count: number; order: number } | null = null;
  for (const [label, { count, order }] of labels) {
    if (!best || count > best.count || (count === best.count && order < best.order)) {
      best = { label, count, order };
    }
  }
  return best?.label ?? emptyLabel;
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

// ── Comparativo mês a mês (estou melhor que o mês passado?) ──────────────────

/** Variação de uma métrica entre dois períodos (atual vs anterior). */
export interface MetricDelta {
  /** Valor do período atual (centavos). */
  current: number;
  /** Valor do período anterior (centavos). */
  previous: number;
  /** Diferença absoluta (current − previous), em centavos (pode ser negativa). */
  delta: number;
  /**
   * Variação relativa (delta / |previous|), ex.: 0.25 = +25%.
   * `null` quando o período anterior é 0 (não há base para porcentagem).
   */
  pct: number | null;
  /** Sentido da variação, puramente pelo sinal de `delta` (UI decide se é bom/ruim). */
  direction: "up" | "down" | "flat";
}

/**
 * Variação de uma única métrica entre dois valores (atual e anterior).
 *
 * - `delta` é a diferença absoluta; `pct` é a variação relativa à base anterior.
 * - Base anterior 0 → `pct = null` (porcentagem indefinida; a UI mostra "novo"/"—").
 * - `direction` reflete só o sinal do delta — comparar receitas (subir é bom) e
 *   despesas (subir é ruim) é responsabilidade de quem renderiza.
 */
export function computeDelta(current: number, previous: number): MetricDelta {
  const delta = current - previous;
  const pct = previous === 0 ? null : delta / Math.abs(previous);
  const direction: MetricDelta["direction"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { current, previous, delta, pct, direction };
}

/** Comparativo das principais métricas de um resumo financeiro entre dois meses. */
export interface FinanceComparison {
  totalIncome: MetricDelta;
  totalExpense: MetricDelta;
  balance: MetricDelta;
  cashBalance: MetricDelta;
}

/**
 * Compara dois resumos financeiros (tipicamente mês atual vs mês anterior),
 * respondendo "estou melhor que o mês passado?". Reaproveita `computeDelta`
 * para receitas, despesas, saldo de competência e caixa realizado.
 */
export function compareSummaries(
  current: FinanceSummary,
  previous: FinanceSummary,
): FinanceComparison {
  return {
    totalIncome: computeDelta(current.totalIncome, previous.totalIncome),
    totalExpense: computeDelta(current.totalExpense, previous.totalExpense),
    balance: computeDelta(current.balance, previous.balance),
    cashBalance: computeDelta(current.cashBalance, previous.cashBalance),
  };
}

/**
 * Média campo a campo de uma lista de resumos financeiros — o "mês típico"
 * recente. Serve de base para comparar o mês atual contra a **tendência** (a
 * média dos meses anteriores), e não só contra o mês imediatamente anterior, que
 * pode ter sido atípico (um show grande, um mês parado).
 *
 * Lista vazia → tudo zero. Os componentes (receitas, despesas, recebido, pago e
 * pendências) são arredondados ao centavo; os saldos (`balance`, `cashBalance`)
 * são **derivados** desses componentes já arredondados, preservando a invariante
 * `balance = receitas − despesas` (e `cashBalance = recebido − pago`). Pura.
 */
export function averageSummaries(summaries: FinanceSummary[]): FinanceSummary {
  const n = summaries.length;
  if (n === 0) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      receivedIncome: 0,
      paidExpense: 0,
      cashBalance: 0,
      pendingIncome: 0,
      pendingExpense: 0,
    };
  }

  const avg = (pick: (s: FinanceSummary) => number): number =>
    Math.round(sum(summaries.map(pick)) / n);

  const totalIncome = avg((s) => s.totalIncome);
  const totalExpense = avg((s) => s.totalExpense);
  const receivedIncome = avg((s) => s.receivedIncome);
  const paidExpense = avg((s) => s.paidExpense);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    receivedIncome,
    paidExpense,
    cashBalance: receivedIncome - paidExpense,
    pendingIncome: avg((s) => s.pendingIncome),
    pendingExpense: avg((s) => s.pendingExpense),
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

// ── Mix de receitas (diversificação das fontes de renda) ────────────────────
// Responde "de onde vem minha renda e quão dependente sou de uma única fonte?".
// Agrega as receitas (INCOME) por categoria (= fonte de renda: cachê, aulas,
// streaming, merch, etc.), com a participação de cada uma, a concentração nas
// maiores e um veredito de diversificação. Complementar ao relatório mensal
// (que olha um mês) e à rentabilidade (que olha o lucro por show): aqui o foco
// é a COMPOSIÇÃO da renda no recorte recebido.

export type DiversificationLevel = "concentrated" | "moderate" | "diversified";

export interface IncomeSourceSlice {
  /** Nome da fonte (categoria; em branco/ausente cai em "Sem categoria"). */
  category: string;
  /** Total da fonte no recorte (centavos). */
  amount: number;
  /** Participação no total de receitas (0..1). */
  share: number;
  /** Nº de transações de receita nessa fonte. */
  count: number;
}

export interface IncomeMix {
  /** Fontes de renda, ordem decrescente por valor (empate por nome, pt-BR). */
  sources: IncomeSourceSlice[];
  /** Soma de todas as receitas do recorte (centavos). */
  total: number;
  /** Nº de fontes (categorias de receita) distintas. */
  sourceCount: number;
  /** Maior fonte, ou null se não há receita. */
  top: IncomeSourceSlice | null;
  /** Participação da maior fonte (0..1). */
  topShare: number;
  /** Participação acumulada das 3 maiores fontes (0..1). */
  top3Share: number;
  /**
   * Índice de concentração de Herfindahl–Hirschman (HHI): soma dos quadrados
   * das participações (0..1). 1 = fonte única; quanto menor, mais distribuído.
   */
  hhi: number;
  /**
   * Número efetivo de fontes (1/HHI, índice de Simpson): "como se" a renda
   * viesse de N fontes de mesmo tamanho. 0 quando não há receita.
   */
  effectiveSources: number;
  /** Veredito de diversificação (derivado do HHI e do nº de fontes). */
  level: DiversificationLevel;
}

/**
 * Classifica a diversificação a partir do HHI e do nº de fontes. Thresholds
 * (hipótese de produto, ver D45): uma fonte só, ou HHI ≥ 0,45 (≈ uma fonte
 * dominante ou só duas relevantes) → concentrada; HHI ≥ 0,25 (≈ até 4 fontes
 * equivalentes) → moderada; abaixo disso → diversificada.
 */
function diversificationLevel(hhi: number, sourceCount: number): DiversificationLevel {
  if (sourceCount <= 1) return "concentrated";
  if (hhi >= 0.45) return "concentrated";
  if (hhi >= 0.25) return "moderate";
  return "diversified";
}

/**
 * Calcula o mix de receitas por fonte (categoria) sobre as transações INCOME do
 * recorte. Cada fonte recebe seu total, participação (`share`) e contagem; o
 * relatório traz a concentração nas maiores (topShare/top3Share), o HHI, o
 * número efetivo de fontes e o veredito de diversificação. Despesas são
 * ignoradas. Categorias em branco/ausentes caem em "Sem categoria". Pura.
 */
export function incomeMix(txs: TxLike[]): IncomeMix {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;

  for (const t of txs) {
    if (t.type !== "INCOME") continue;
    const category = t.category?.trim() || "Sem categoria";
    const entry = map.get(category) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    map.set(category, entry);
    total += t.amount;
  }

  const sources: IncomeSourceSlice[] = Array.from(map.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      share: total === 0 ? 0 : amount / total,
    }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, "pt-BR"));

  const hhi = sources.reduce((acc, s) => acc + s.share * s.share, 0);
  const top3Share = sources.slice(0, 3).reduce((acc, s) => acc + s.share, 0);
  const top = sources[0] ?? null;

  return {
    sources,
    total,
    sourceCount: sources.length,
    top,
    topShare: top?.share ?? 0,
    top3Share,
    hhi,
    effectiveSources: hhi === 0 ? 0 : 1 / hhi,
    level: diversificationLevel(hhi, sources.length),
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

// ── Sazonalidade (qual mês do ano costuma render mais?) ─────────────────────

export interface SeasonalMonth {
  /** Mês 1-12 (janeiro = 1). */
  monthIndex: number;
  /** Soma das receitas neste mês do calendário, em TODOS os anos. */
  totalIncome: number;
  /** Soma das despesas neste mês do calendário, em TODOS os anos. */
  totalExpense: number;
  /** totalIncome − totalExpense. */
  net: number;
  /** Nº de anos distintos em que este mês teve movimento (receita ou despesa). */
  years: number;
  /** Média por ano-ativo: total / years (0 se years === 0), arredondada ao centavo. */
  avgIncome: number;
  avgExpense: number;
  /** avgIncome − avgExpense (derivado, preserva a invariante). */
  avgNet: number;
}

export interface MonthlySeasonality {
  /** Exatamente 12 meses (janeiro→dezembro). */
  months: SeasonalMonth[];
  /** Nº de anos distintos com qualquer transação (amplitude do histórico). */
  yearsObserved: number;
  /** Mês do calendário com maior média de resultado entre os ativos; null se nenhum. */
  best: SeasonalMonth | null;
  /** Mês do calendário com menor média de resultado entre os ativos; null se nenhum. */
  worst: SeasonalMonth | null;
}

/**
 * Agrega as transações por MÊS DO CALENDÁRIO (janeiro→dezembro), somando todos os
 * anos do histórico, e calcula a média por ano-ativo de cada mês — o "mês típico".
 * Responde "qual época do ano costuma render mais?" (temporada de festas, verão
 * morto…), ajudando a planejar o ano: quando empurrar mais shows, quando guardar.
 *
 * Denominador = anos com movimento naquele mês (não a amplitude total do histórico):
 * um dezembro só conta como ano-ativo se teve receita ou despesa, então a média
 * mede "um dezembro típico em que houve trabalho", não diluído por dezembros vazios
 * de um histórico curto (mesmo critério da média móvel, ver D35). Pura; usa UTC.
 */
export function monthlySeasonality(txs: TxLike[]): MonthlySeasonality {
  const income = new Array(12).fill(0);
  const expense = new Array(12).fill(0);
  // Anos distintos com movimento por mês (0-based) e o conjunto global de anos.
  const activeYears: Array<Set<number>> = Array.from({ length: 12 }, () => new Set());
  const allYears = new Set<number>();

  for (const t of txs) {
    const key = monthKey(t.date); // "YYYY-MM"
    const year = Number(key.slice(0, 4));
    const idx = Number(key.slice(5, 7)) - 1; // 0-based
    if (idx < 0 || idx > 11) continue;
    allYears.add(year);
    if (t.type === "INCOME") income[idx] += t.amount;
    else expense[idx] += t.amount;
    if (t.amount > 0) activeYears[idx].add(year);
  }

  const months: SeasonalMonth[] = income.map((inc, i) => {
    const exp = expense[i];
    const years = activeYears[i].size;
    const avgIncome = years > 0 ? Math.round(inc / years) : 0;
    const avgExpense = years > 0 ? Math.round(exp / years) : 0;
    return {
      monthIndex: i + 1,
      totalIncome: inc,
      totalExpense: exp,
      net: inc - exp,
      years,
      avgIncome,
      avgExpense,
      avgNet: avgIncome - avgExpense,
    };
  });

  // Melhor/pior por média de resultado (mês típico) entre os meses com anos ativos.
  // Empate pelo mês mais cedo (ordem estável, percorremos jan→dez).
  const active = months.filter((m) => m.years > 0);
  let best: SeasonalMonth | null = null;
  let worst: SeasonalMonth | null = null;
  for (const m of active) {
    if (best === null || m.avgNet > best.avgNet) best = m;
    if (worst === null || m.avgNet < worst.avgNet) worst = m;
  }

  return { months, yearsObserved: allYears.size, best, worst };
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

/** Variação ano a ano de um mês (mesmo mês do ano anterior). */
export interface AnnualMonthComparison {
  /** Mês 1-12 (janeiro = 1). */
  monthIndex: number;
  income: MetricDelta;
  expense: MetricDelta;
  net: MetricDelta;
}

/**
 * Comparativo ano a ano (YoY): totais do ano e cada mês frente ao mesmo período
 * do ano anterior. Responde "estou melhor que no ano passado?".
 */
export interface AnnualComparison {
  /** Ano de referência (atual). */
  year: number;
  /** Ano comparado (anterior). */
  previousYear: number;
  totalIncome: MetricDelta;
  totalExpense: MetricDelta;
  /** Resultado do ano (receitas − despesas). */
  net: MetricDelta;
  /** 12 meses (janeiro→dezembro), cada um comparado ao mesmo mês do ano anterior. */
  months: AnnualMonthComparison[];
}

/**
 * Compara dois resumos anuais (tipicamente o ano atual vs o ano anterior),
 * reaproveitando `computeDelta` para totais e para cada mês (casado por
 * `monthIndex`). Pura; assume que ambos os resumos têm os 12 meses (como
 * produzido por `annualSummary`).
 */
export function compareAnnualSummaries(
  current: AnnualSummary,
  previous: AnnualSummary,
): AnnualComparison {
  const prevByIndex = new Map(previous.months.map((m) => [m.monthIndex, m]));
  const months: AnnualMonthComparison[] = current.months.map((m) => {
    const p = prevByIndex.get(m.monthIndex);
    return {
      monthIndex: m.monthIndex,
      income: computeDelta(m.income, p?.income ?? 0),
      expense: computeDelta(m.expense, p?.expense ?? 0),
      net: computeDelta(m.net, p?.net ?? 0),
    };
  });

  return {
    year: current.year,
    previousYear: previous.year,
    totalIncome: computeDelta(current.totalIncome, previous.totalIncome),
    totalExpense: computeDelta(current.totalExpense, previous.totalExpense),
    net: computeDelta(current.net, previous.net),
    months,
  };
}

/**
 * Quebra por categoria de um ano: filtra as transações cujo mês (UTC) cai no
 * `year` e delega ao `categoryReport` (uma só fonte de verdade da agregação por
 * categoria, já usada no relatório mensal). Responde "para onde foi o dinheiro
 * no ano?" no fechamento anual. Pura.
 */
export function annualCategoryReport(txs: TxLike[], year: number): CategoryReport {
  const prefix = `${year}-`;
  const inYear = txs.filter((t) => monthKey(t.date).startsWith(prefix));
  return categoryReport(inYear);
}

/** Anos presentes nas transações, em ordem decrescente. */
export function availableYears(txs: TxLike[]): number[] {
  const set = new Set<number>();
  for (const t of txs) set.add(Number(monthKey(t.date).slice(0, 4)));
  return Array.from(set).sort((a, b) => b - a);
}

// ── Crescimento ano a ano (minha carreira está crescendo?) ───────────────────
//
// O Resumo anual (`annualSummary`) mostra UM ano por vez, e a Sazonalidade
// (`monthlySeasonality`) achata todos os anos num único calendário de 12 meses.
// Falta a visão longitudinal: a série dos anos lado a lado, para responder "estou
// faturando mais do que ano passado?" ao longo de toda a história. Esta função
// consolida os totais por ano e calcula o crescimento de cada ano frente ao ANO
// ATIVO ANTERIOR (o predecessor na série, não necessariamente o ano-calendário
// −1) — assim o rótulo "vs. {ano}" é sempre verdadeiro mesmo com lacunas. Pura.

export interface YearlyTotal {
  /** Ano de referência. */
  year: number;
  income: number;
  expense: number;
  /** income − expense (regime de competência). */
  net: number;
  /**
   * Ano ativo imediatamente anterior na série (predecessor com movimento), ou
   * `null` para o primeiro ano. É a base da comparação `*Delta`.
   */
  previousYear: number | null;
  /** Variação das receitas frente ao ano ativo anterior; `null` no primeiro. */
  incomeDelta: MetricDelta | null;
  /** Variação das despesas frente ao ano ativo anterior; `null` no primeiro. */
  expenseDelta: MetricDelta | null;
  /** Variação do resultado frente ao ano ativo anterior; `null` no primeiro. */
  netDelta: MetricDelta | null;
}

export interface YearlyHistory {
  /** Anos com movimento (receita ou despesa > 0), em ordem cronológica crescente. */
  years: YearlyTotal[];
  /** Soma das receitas de todos os anos. */
  totalIncome: number;
  /** Soma das despesas de todos os anos. */
  totalExpense: number;
  /** totalIncome − totalExpense. */
  net: number;
  /** Média do resultado por ano ativo (net / years.length), arredondada ao centavo; 0 se vazio. */
  avgNetPerYear: number;
  /** Ano de maior resultado líquido (empate → o mais recente); null se vazio. */
  bestYear: YearlyTotal | null;
  /** Ano de menor resultado líquido (empate → o mais antigo); null se vazio. */
  worstYear: YearlyTotal | null;
  /**
   * Variação do resultado do último ano vs. o primeiro ano da série — a
   * trajetória de longo prazo. `null` com menos de 2 anos ativos. Reaproveita
   * `computeDelta`.
   */
  trend: MetricDelta | null;
}

/**
 * Série de totais por ano (receita/despesa/resultado) com o crescimento ano a
 * ano. Responde "minha carreira está crescendo?".
 *
 * - Considera só os anos COM movimento (receita ou despesa > 0); anos vazios não
 *   entram na série nem servem de base de comparação.
 * - O `*Delta` de cada ano compara com o ano ativo IMEDIATAMENTE ANTERIOR
 *   (predecessor na série, exposto em `previousYear`), reaproveitando
 *   `computeDelta`. O primeiro ano não tem base → deltas `null`.
 * - `trend` compara o resultado do último ano com o do primeiro. Pura.
 */
export function yearlyHistory(txs: TxLike[]): YearlyHistory {
  const incomeByYear = new Map<number, number>();
  const expenseByYear = new Map<number, number>();

  for (const t of txs) {
    const year = Number(monthKey(t.date).slice(0, 4));
    if (t.type === "INCOME") {
      incomeByYear.set(year, (incomeByYear.get(year) ?? 0) + t.amount);
    } else {
      expenseByYear.set(year, (expenseByYear.get(year) ?? 0) + t.amount);
    }
  }

  const activeYears = [
    ...new Set([...incomeByYear.keys(), ...expenseByYear.keys()]),
  ].sort((a, b) => a - b);

  const years: YearlyTotal[] = [];
  let prev: YearlyTotal | null = null;
  for (const year of activeYears) {
    const income = incomeByYear.get(year) ?? 0;
    const expense = expenseByYear.get(year) ?? 0;
    const row: YearlyTotal = {
      year,
      income,
      expense,
      net: income - expense,
      previousYear: prev ? prev.year : null,
      incomeDelta: prev ? computeDelta(income, prev.income) : null,
      expenseDelta: prev ? computeDelta(expense, prev.expense) : null,
      netDelta: prev ? computeDelta(income - expense, prev.net) : null,
    };
    years.push(row);
    prev = row;
  }

  const totalIncome = years.reduce((acc, y) => acc + y.income, 0);
  const totalExpense = years.reduce((acc, y) => acc + y.expense, 0);
  const net = totalIncome - totalExpense;

  let bestYear: YearlyTotal | null = null;
  let worstYear: YearlyTotal | null = null;
  for (const y of years) {
    // `years` em ordem crescente: no empate do melhor, `>=` mantém o mais
    // recente; no pior, `<` mantém o mais antigo.
    if (bestYear == null || y.net >= bestYear.net) bestYear = y;
    if (worstYear == null || y.net < worstYear.net) worstYear = y;
  }

  const trend =
    years.length >= 2
      ? computeDelta(years[years.length - 1].net, years[0].net)
      : null;

  return {
    years,
    totalIncome,
    totalExpense,
    net,
    avgNetPerYear: years.length > 0 ? Math.round(net / years.length) : 0,
    bestYear,
    worstYear,
    trend,
  };
}

// ── Projeção de fechamento do ano (vou fechar no azul?) ─────────────────────
//
// Junta três peças que hoje vivem isoladas — o caixa já realizado, as pendências
// já lançadas e os cachês de shows futuros que ainda NÃO viraram receita nas
// finanças — numa projeção do resultado do ano inteiro. Responde "se nada mudar,
// como fecho o ano?".
//
// Por honestidade, a projeção é assimétrica de propósito: ela projeta a RECEITA
// futura (a agenda é um compromisso firme de dinheiro a entrar), mas NÃO inventa
// despesas futuras — as despesas projetadas são só as já realizadas + as
// pendências já lançadas. Custos recorrentes futuros ainda não lançados ficam de
// fora (veja o relatório de Custos fixos para estimá-los). Ver D60. Pura.

/** Forma mínima de show para a projeção de fechamento do ano. */
export interface YearEndShowLike {
  id: string;
  fee: number; // cachê acordado, centavos
  status?: string;
  date: Date | string;
}

export interface YearEndForecast {
  /** Ano de referência. */
  year: number;
  /** True se `year` é o ano corrente de `now` (a projeção de futuro só vale aí). */
  isCurrentYear: boolean;

  // ── Receitas ──
  /** Receita já recebida no ano (INCOME, received=true) — o que entrou no caixa. */
  realizedIncome: number;
  /** Receita lançada e ainda pendente no ano (INCOME, received=false). */
  pendingIncome: number;
  /**
   * Cachês de shows futuros do ano ainda NÃO lançados nas finanças (o que a
   * agenda promete além do que já está nas finanças). Abatido por show da
   * receita já lançada para o show, para não contar duas vezes.
   */
  scheduledIncome: number;
  /** Parte de `scheduledIncome` de shows confirmados/realizados (CONFIRMED/PLAYED). */
  scheduledConfirmed: number;
  /** Parte de `scheduledIncome` de shows ainda tentativos (PROPOSED/sem status). */
  scheduledTentative: number;
  /** realizedIncome + pendingIncome + scheduledIncome. */
  projectedIncome: number;

  // ── Despesas (não projeta custos futuros não lançados) ──
  /** Despesa já paga no ano (EXPENSE, received=true). */
  realizedExpense: number;
  /** Despesa lançada e ainda pendente no ano (EXPENSE, received=false). */
  pendingExpense: number;
  /** realizedExpense + pendingExpense. */
  projectedExpense: number;

  // ── Resultados ──
  /** Caixa já realizado no ano (realizedIncome − realizedExpense). */
  realizedResult: number;
  /** projectedIncome − projectedExpense — o fechamento projetado do ano. */
  projectedResult: number;

  /** Nº de shows futuros do ano que entraram com cachê ainda não lançado. */
  scheduledShowCount: number;
  /** Parte de `scheduledShowCount` de shows confirmados/realizados (CONFIRMED/PLAYED). */
  scheduledConfirmedCount: number;
  /** Parte de `scheduledShowCount` de shows ainda tentativos (PROPOSED/sem status). */
  scheduledTentativeCount: number;
}

/**
 * Projeta o fechamento financeiro de um ano somando o realizado, o pendente já
 * lançado e os cachês de shows futuros ainda não lançados nas finanças.
 *
 * - Transações/shows do ano = aqueles cujo mês (UTC) cai em `year`, mesma
 *   convenção de `annualSummary`.
 * - "Show futuro" = dia do show `>= hoje` (UTC), não CANCELLED e com cachê > 0.
 * - Para não contar duas vezes, o cachê agendado de cada show é abatido da
 *   receita (INCOME) já vinculada a ele em QUALQUER período (recebida ou
 *   pendente): só o saldo `max(0, fee − lançado)` entra como `scheduledIncome`.
 * - Despesas NÃO são projetadas para o futuro (só realizado + pendente lançado).
 * - Para um ano passado não há shows futuros, então a projeção degrada para o
 *   resultado de competência já lançado do ano. `now` injetável para testes.
 */
export function projectYearEnd(
  txs: TxLike[],
  shows: YearEndShowLike[],
  year: number,
  opts: { now?: Date | string } = {},
): YearEndForecast {
  const now = opts.now ?? new Date();
  const todayMs = utcMidnight(now);
  const isCurrentYear = Number(monthKey(now).slice(0, 4)) === year;
  const prefix = `${year}-`;

  let realizedIncome = 0;
  let pendingIncome = 0;
  let realizedExpense = 0;
  let pendingExpense = 0;

  // Receita (INCOME) já lançada por show em qualquer período — recebida ou
  // pendente — para abater do cachê agendado e evitar contagem dupla.
  const bookedIncomeByShow = new Map<string, number>();

  for (const t of txs) {
    if (t.type === "INCOME" && t.showId != null) {
      bookedIncomeByShow.set(
        t.showId,
        (bookedIncomeByShow.get(t.showId) ?? 0) + t.amount,
      );
    }
    if (!monthKey(t.date).startsWith(prefix)) continue;
    if (t.type === "INCOME") {
      if (t.received) realizedIncome += t.amount;
      else pendingIncome += t.amount;
    } else {
      if (t.received) realizedExpense += t.amount;
      else pendingExpense += t.amount;
    }
  }

  let scheduledIncome = 0;
  let scheduledConfirmed = 0;
  let scheduledTentative = 0;
  let scheduledShowCount = 0;
  let scheduledConfirmedCount = 0;
  let scheduledTentativeCount = 0;
  for (const s of shows) {
    if (s.status === "CANCELLED") continue;
    if (s.fee <= 0) continue;
    if (!monthKey(s.date).startsWith(prefix)) continue; // do ano
    if (utcMidnight(s.date) < todayMs) continue; // futuro (>= hoje)
    const booked = bookedIncomeByShow.get(s.id) ?? 0;
    const remaining = Math.max(0, s.fee - booked);
    if (remaining <= 0) continue;
    scheduledIncome += remaining;
    if (isConfirmedBooking(s.status)) {
      scheduledConfirmed += remaining;
      scheduledConfirmedCount += 1;
    } else {
      scheduledTentative += remaining;
      scheduledTentativeCount += 1;
    }
    scheduledShowCount += 1;
  }

  const projectedIncome = realizedIncome + pendingIncome + scheduledIncome;
  const projectedExpense = realizedExpense + pendingExpense;

  return {
    year,
    isCurrentYear,
    realizedIncome,
    pendingIncome,
    scheduledIncome,
    scheduledConfirmed,
    scheduledTentative,
    projectedIncome,
    realizedExpense,
    pendingExpense,
    projectedExpense,
    realizedResult: realizedIncome - realizedExpense,
    projectedResult: projectedIncome - projectedExpense,
    scheduledShowCount,
    scheduledConfirmedCount,
    scheduledTentativeCount,
  };
}

// ── Cenário otimista × conservador sobre a projeção do ano ───────────────────
//
// `projectYearEnd` soma TODOS os cachês de shows futuros (confirmados E ainda a
// confirmar) como receita agendada — uma leitura otimista da agenda. Quem
// planeja com cautela quer também o piso: "e se só os shows JÁ confirmados se
// pagarem?". Como o forecast já separa `scheduledConfirmed`/`scheduledTentative`
// (e agora suas contagens), o cenário conservador é puramente derivável: basta
// remover a parte tentativa da receita agendada e reprojetar. Pura.

export type YearEndScenarioMode = "optimistic" | "conservative";

/**
 * Reprojeta um `YearEndForecast` sob um cenário.
 *
 * - "optimistic" (default da `projectYearEnd`): devolve o forecast inalterado —
 *   conta confirmados + tentativos como receita agendada.
 * - "conservative": remove os cachês de shows ainda a confirmar
 *   (`scheduledTentative`) da receita agendada/projetada e reprojeta o resultado
 *   e as contagens. As despesas não mudam (já não projetam futuro — ver D60).
 *
 * Sem tentativos a remover, devolve o forecast original (cenários coincidem).
 * Pura: opera só sobre o forecast já calculado.
 */
export function applyYearEndScenario(
  forecast: YearEndForecast,
  mode: YearEndScenarioMode,
): YearEndForecast {
  if (mode !== "conservative" || forecast.scheduledTentative <= 0) {
    return forecast;
  }
  const scheduledIncome = forecast.scheduledIncome - forecast.scheduledTentative;
  const projectedIncome =
    forecast.realizedIncome + forecast.pendingIncome + scheduledIncome;
  return {
    ...forecast,
    scheduledIncome,
    scheduledTentative: 0,
    scheduledShowCount: forecast.scheduledConfirmedCount,
    scheduledTentativeCount: 0,
    projectedIncome,
    projectedResult: projectedIncome - forecast.projectedExpense,
  };
}

// ── Cenário "com custos fixos" sobre a projeção do ano ──────────────────────
//
// `projectYearEnd` deliberadamente NÃO inventa despesas futuras (D60): só conta o
// realizado + o pendente já lançado. Isso deixa o resultado projetado otimista,
// porque os custos fixos que ainda vão se repetir até dezembro não aparecem. Este
// cenário opcional preenche essa lacuna: pega o custo fixo mensal típico
// (`estimatedMonthlyFixedCost` de `recurringExpenses`, D39) e o aplica aos meses
// FUTUROS do ano que ainda não têm nenhuma despesa lançada — sem dupla contagem
// com o que já está pendente. Resultado: uma leitura mais realista/conservadora
// do fechamento. Layer separado, opt-in, para preservar o default da D60.

export interface FixedCostScenario {
  /** Ano de referência (espelha o forecast). */
  year: number;
  /** True se o cenário é aplicável (ano corrente; só aí há meses futuros). */
  applicable: boolean;
  /** Custo fixo mensal típico usado (centavos) — entrada `estimatedMonthlyFixedCost`. */
  monthlyFixedCost: number;
  /** Nº de meses futuros do ano (após o mês atual) sem despesa já lançada. */
  monthsEstimated: number;
  /** monthlyFixedCost × monthsEstimated — despesa fixa futura ainda não lançada. */
  estimatedRemainingFixedCost: number;
  /** projectedExpense do forecast + estimatedRemainingFixedCost. */
  projectedExpenseWithFixed: number;
  /** projectedIncome do forecast − projectedExpenseWithFixed. */
  projectedResultWithFixed: number;
}

/**
 * Estima o fechamento do ano somando aos custos já projetados (`forecast`) o custo
 * fixo recorrente que ainda deve se repetir até dezembro.
 *
 * - Só vale para o ano corrente (`forecast.isCurrentYear`); para anos passados ou
 *   futuros não há "meses futuros do ano" e o cenário degrada para o forecast cru.
 * - Considera apenas os meses ESTRITAMENTE posteriores ao mês de `now` (o mês
 *   corrente já está parcialmente realizado, então é deixado de fora para não
 *   superestimar nem contar duas vezes).
 * - Um mês futuro que JÁ tenha qualquer despesa lançada (pendente) é considerado
 *   coberto e não recebe o custo fixo, evitando dupla contagem com o pendente.
 * - `monthlyFixedCost` ≤ 0 zera a estimativa.
 *
 * Pura; `now` injetável para testes. Usa UTC via `monthKey`.
 */
export function projectYearEndWithFixedCosts(
  forecast: YearEndForecast,
  txs: TxLike[],
  monthlyFixedCost: number,
  opts: { now?: Date | string } = {},
): FixedCostScenario {
  const year = forecast.year;
  const now = opts.now ?? new Date();
  const fixed = Math.max(0, Math.round(monthlyFixedCost));
  const applicable = forecast.isCurrentYear && fixed > 0;

  let monthsEstimated = 0;
  if (applicable) {
    const currentMonth = Number(monthKey(now).slice(5, 7)); // 1..12
    // Meses do ano que já têm alguma despesa lançada (recebida ou pendente).
    const expenseMonths = new Set<string>();
    const prefix = `${year}-`;
    for (const t of txs) {
      if (t.type !== "EXPENSE" || t.amount <= 0) continue;
      const mk = monthKey(t.date);
      if (mk.startsWith(prefix)) expenseMonths.add(mk);
    }
    for (let m = currentMonth + 1; m <= 12; m++) {
      const mk = `${year}-${String(m).padStart(2, "0")}`;
      if (!expenseMonths.has(mk)) monthsEstimated += 1;
    }
  }

  const estimatedRemainingFixedCost = fixed * monthsEstimated;
  const projectedExpenseWithFixed =
    forecast.projectedExpense + estimatedRemainingFixedCost;

  return {
    year,
    applicable,
    monthlyFixedCost: fixed,
    monthsEstimated,
    estimatedRemainingFixedCost,
    projectedExpenseWithFixed,
    projectedResultWithFixed: forecast.projectedIncome - projectedExpenseWithFixed,
  };
}

// ── Cenário pessimista: conservador + custos fixos (pior caso) ───────────────
//
// As duas camadas conservadoras da projeção do ano são ORTOGONAIS: o cenário
// conservador (D66) ataca a RECEITA (descarta os cachês de shows ainda a
// confirmar) e o cenário com custos fixos (D62) ataca a DESPESA (soma o custo
// fixo recorrente que ainda deve se repetir até dezembro). Cada uma sozinha dá
// um piso parcial. Cruzá-las dá o "pior caso" honesto numa só leitura — "e se só
// os shows JÁ confirmados se pagarem E eu continuar pagando meus custos fixos?".
// Pura: compõe as duas camadas já testadas (sem revarrer transações/shows).

export interface PessimisticYearEndScenario {
  /** Ano de referência (espelha o forecast). */
  year: number;
  /**
   * True quando o pior caso difere da projeção crua: há cachê tentativo a
   * descartar (receita) OU custo fixo futuro a somar (despesa). Senão coincide
   * com o forecast otimista e a UI pode omiti-lo.
   */
  applicable: boolean;
  /** Receita projetada só com shows confirmados (descarta os a confirmar — D66). */
  projectedIncome: number;
  /** Despesa projetada incluindo o custo fixo recorrente futuro estimado (D62). */
  projectedExpense: number;
  /** projectedIncome − projectedExpense — o piso/pior caso do fechamento do ano. */
  projectedResult: number;
  /** Cachê de shows a confirmar removido da receita (vs. otimista). */
  droppedTentative: number;
  /** Nº de shows a confirmar deixados de fora. */
  droppedTentativeCount: number;
  /** Custo fixo futuro estimado somado às despesas. */
  estimatedRemainingFixedCost: number;
  /** Cenário de custos fixos por trás (custo/mês, meses estimados — D62). */
  fixedCost: FixedCostScenario;
}

/**
 * Cruza os dois cenários conservadores da projeção do ano num único "pior caso":
 * receita só de shows confirmados (D66) e despesa somando o custo fixo recorrente
 * futuro (D62). Recebe sempre o forecast CRU/otimista (`projectYearEnd`), aplica
 * o piso de receita e, sobre ele, o teto de despesa.
 *
 * - Independe do seletor otimista×conservador da página: é o piso absoluto.
 * - `applicable` é true quando ao menos um dos eixos morde (tentativo a descartar
 *   ou custo fixo futuro a somar); sem nenhum dos dois, o pior caso = o forecast
 *   cru e não há o que mostrar.
 * - As despesas seguem o critério da D62 (só meses futuros sem despesa lançada).
 *
 * Pura; `now` injetável para testes (repassado ao componente de custos fixos).
 */
export function projectYearEndPessimistic(
  forecast: YearEndForecast,
  txs: TxLike[],
  monthlyFixedCost: number,
  opts: { now?: Date | string } = {},
): PessimisticYearEndScenario {
  const conservative = applyYearEndScenario(forecast, "conservative");
  const fixedCost = projectYearEndWithFixedCosts(
    conservative,
    txs,
    monthlyFixedCost,
    opts,
  );
  const droppedTentative = forecast.scheduledTentative;
  const droppedTentativeCount = forecast.scheduledTentativeCount;
  return {
    year: forecast.year,
    applicable:
      droppedTentative > 0 || fixedCost.estimatedRemainingFixedCost > 0,
    projectedIncome: conservative.projectedIncome,
    projectedExpense: fixedCost.projectedExpenseWithFixed,
    projectedResult: fixedCost.projectedResultWithFixed,
    droppedTentative,
    droppedTentativeCount,
    estimatedRemainingFixedCost: fixedCost.estimatedRemainingFixedCost,
    fixedCost,
  };
}

// ── Cenário do seletor de três botões da projeção do ano ─────────────────────
//
// A página de projeção do ano oferece dois pisos conservadores em cima da
// projeção crua: "só confirmados" (D66, ataca a receita) e o "pior caso" (D68,
// soma também o custo fixo recorrente futuro). Até aqui eles eram cards extras
// (previews) ao lado do número otimista. Esta camada unifica os três num único
// SELETOR: o usuário escolhe qual piso é o número principal. `yearEndScenarioView`
// normaliza os três cenários num formato comum para a renderização (totais +
// composição de receita/despesa), reaproveitando `applyYearEndScenario` (D66) e
// `projectYearEndPessimistic` (D68) — sem reprojetar do zero. Ver D73.

/** Escolha do seletor de cenário da projeção do ano (três botões na página). */
export type YearEndScenarioChoice = "optimistic" | "conservative" | "pessimistic";

/**
 * Fechamento projetado do ano sob um dos três cenários do seletor, normalizado
 * para a renderização. Espelha os campos de composição do `YearEndForecast` mais
 * o custo fixo futuro estimado (só > 0 no "pior caso") e o que foi descartado da
 * receita frente ao otimista (cachês de shows a confirmar).
 */
export interface YearEndScenarioView {
  /** Ano de referência (espelha o forecast). */
  year: number;
  /** Cenário aplicado. */
  mode: YearEndScenarioChoice;

  // ── Receitas (após o cenário) ──
  /** Receita já recebida no ano. */
  realizedIncome: number;
  /** Receita lançada e ainda pendente no ano. */
  pendingIncome: number;
  /** Cachês de shows futuros ainda não lançados que entram na receita do cenário. */
  scheduledIncome: number;
  /** Parte de `scheduledIncome` de shows confirmados/realizados. */
  scheduledConfirmed: number;
  /** Parte de `scheduledIncome` de shows a confirmar (0 fora do otimista). */
  scheduledTentative: number;
  /** Nº de shows futuros que entram com cachê agendado no cenário. */
  scheduledShowCount: number;

  // ── Despesas (após o cenário) ──
  /** Despesa já paga no ano. */
  realizedExpense: number;
  /** Despesa lançada e ainda pendente no ano. */
  pendingExpense: number;
  /** Custo fixo recorrente futuro somado às despesas (> 0 só no "pior caso" — D62). */
  estimatedRemainingFixedCost: number;

  // ── Totais ──
  /** Receita projetada do cenário. */
  projectedIncome: number;
  /** Despesa projetada do cenário (inclui o custo fixo futuro no "pior caso"). */
  projectedExpense: number;
  /** projectedIncome − projectedExpense — o número do cenário. */
  projectedResult: number;
  /** Caixa já realizado no ano (não muda com o cenário). */
  realizedResult: number;

  // ── O que mudou frente ao otimista ──
  /** Cachê de shows a confirmar descartado da receita (0 no otimista). */
  droppedTentative: number;
  /** Nº de shows a confirmar deixados de fora (0 no otimista). */
  droppedTentativeCount: number;
}

/**
 * Normaliza o fechamento projetado do ano sob o cenário escolhido pelo seletor.
 *
 * - "optimistic": forecast cru — conta confirmados + a confirmar, sem custo fixo.
 * - "conservative": descarta os cachês de shows a confirmar da receita (D66).
 * - "pessimistic": conservador na receita E soma o custo fixo recorrente futuro
 *   às despesas (D68) — o piso honesto.
 *
 * Recebe sempre o forecast CRU/otimista (`projectYearEnd`). Reúne as camadas já
 * testadas `applyYearEndScenario` e `projectYearEndPessimistic` num único objeto.
 * Pura; `now` injetável (repassado ao componente de custos fixos do pessimista).
 */
export function yearEndScenarioView(
  forecast: YearEndForecast,
  txs: TxLike[],
  monthlyFixedCost: number,
  mode: YearEndScenarioChoice,
  opts: { now?: Date | string } = {},
): YearEndScenarioView {
  if (mode === "pessimistic") {
    // Piso de receita (só confirmados) para a composição + pior caso para os totais.
    const conservative = applyYearEndScenario(forecast, "conservative");
    const pess = projectYearEndPessimistic(forecast, txs, monthlyFixedCost, opts);
    return {
      year: forecast.year,
      mode,
      realizedIncome: conservative.realizedIncome,
      pendingIncome: conservative.pendingIncome,
      scheduledIncome: conservative.scheduledIncome,
      scheduledConfirmed: conservative.scheduledConfirmed,
      scheduledTentative: conservative.scheduledTentative,
      scheduledShowCount: conservative.scheduledShowCount,
      realizedExpense: conservative.realizedExpense,
      pendingExpense: conservative.pendingExpense,
      estimatedRemainingFixedCost: pess.estimatedRemainingFixedCost,
      projectedIncome: pess.projectedIncome,
      projectedExpense: pess.projectedExpense,
      projectedResult: pess.projectedResult,
      realizedResult: conservative.realizedResult,
      droppedTentative: pess.droppedTentative,
      droppedTentativeCount: pess.droppedTentativeCount,
    };
  }
  const f = applyYearEndScenario(forecast, mode);
  return {
    year: f.year,
    mode,
    realizedIncome: f.realizedIncome,
    pendingIncome: f.pendingIncome,
    scheduledIncome: f.scheduledIncome,
    scheduledConfirmed: f.scheduledConfirmed,
    scheduledTentative: f.scheduledTentative,
    scheduledShowCount: f.scheduledShowCount,
    realizedExpense: f.realizedExpense,
    pendingExpense: f.pendingExpense,
    estimatedRemainingFixedCost: 0,
    projectedIncome: f.projectedIncome,
    projectedExpense: f.projectedExpense,
    projectedResult: f.projectedResult,
    realizedResult: f.realizedResult,
    droppedTentative: mode === "conservative" ? forecast.scheduledTentative : 0,
    droppedTentativeCount:
      mode === "conservative" ? forecast.scheduledTentativeCount : 0,
  };
}

// ── Projeção do ano vs. ano anterior ────────────────────────────────────────
//
// A projeção crua (`projectYearEnd`) responde "como fecho ESTE ano?", mas sozinha
// não diz se isso é bom ou ruim. A leitura de planejamento que falta é a
// comparação: "estou no caminho de fechar melhor que o ano passado?". Para um ano
// já encerrado, `projectYearEnd` degrada para o resultado de competência lançado
// (sem shows futuros), que é o fechamento real daquele ano — a base natural de
// comparação. Layer puro sobre dois forecasts, reaproveitando `computeDelta`.

export interface YearEndComparison {
  /** Ano da projeção corrente (`current.year`). */
  year: number;
  /** Ano-base de comparação (`previous.year`). */
  previousYear: number;
  /** Resultado projetado do ano vs. fechamento do ano anterior (subir é bom). */
  result: MetricDelta;
  /** Receita projetada do ano vs. receita do ano anterior (subir é bom). */
  income: MetricDelta;
  /** Despesa projetada do ano vs. despesa do ano anterior (subir é ruim). */
  expense: MetricDelta;
  /**
   * True quando o ano anterior teve algum movimento (receita ou despesa); senão a
   * comparação não tem base e a UI deve omiti-la.
   */
  hasPreviousData: boolean;
}

/**
 * Compara a projeção de fechamento do ano corrente com o fechamento do ano
 * anterior, respondendo "estou indo melhor que ano passado?".
 *
 * - Compara os números PROJETADOS (`projectedResult/Income/Expense`): para o ano
 *   corrente é a projeção; para um ano passado, `projectYearEnd` já degrada esses
 *   campos para o resultado de competência lançado — o fechamento real do ano.
 * - `direction` de cada `MetricDelta` reflete só o sinal; a UI decide o que é bom
 *   (receita/resultado subir) vs. ruim (despesa subir).
 * - `hasPreviousData = false` quando o ano anterior não teve receita nem despesa.
 *
 * Pura: opera só sobre os dois resultados já calculados. Aceita qualquer objeto
 * com os campos projetados (`YearEndForecast` ou `YearEndScenarioView`), para a
 * comparação respeitar o cenário escolhido no seletor.
 */
export type YearEndResultLike = Pick<
  YearEndForecast,
  "year" | "projectedResult" | "projectedIncome" | "projectedExpense"
>;

export function compareYearEndToPrevious(
  current: YearEndResultLike,
  previous: YearEndResultLike,
): YearEndComparison {
  return {
    year: current.year,
    previousYear: previous.year,
    result: computeDelta(current.projectedResult, previous.projectedResult),
    income: computeDelta(current.projectedIncome, previous.projectedIncome),
    expense: computeDelta(current.projectedExpense, previous.projectedExpense),
    hasPreviousData:
      previous.projectedIncome !== 0 || previous.projectedExpense !== 0,
  };
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

// ── Agenda de contas a pagar/receber (F3 — "o que vence quando") ────────────

/** Janela de vencimento de uma pendência (relativa a hoje, comparada por dia UTC). */
export type DueBucketKey = "overdue" | "today" | "week" | "later";

/** Ordem canônica das janelas (do mais urgente ao menos). */
export const DUE_BUCKET_ORDER: DueBucketKey[] = ["overdue", "today", "week", "later"];

export interface DueAgendaItem<T extends TxLike = TxLike> {
  tx: T;
  bucket: DueBucketKey;
  /** Dias até o vencimento (UTC): negativo = vencida há N dias; 0 = hoje. */
  daysUntil: number;
}

export interface DueBucket<T extends TxLike = TxLike> {
  key: DueBucketKey;
  /** Itens da janela, ordenados por vencimento crescente. */
  items: DueAgendaItem<T>[];
  /** Total a receber (INCOME) na janela (centavos). */
  income: number;
  /** Total a pagar (EXPENSE) na janela (centavos). */
  expense: number;
  /** income − expense. */
  net: number;
  /** Nº de itens na janela. */
  count: number;
}

export interface DueAgenda<T extends TxLike = TxLike> {
  /** Sempre 4 janelas, na ordem overdue → today → week → later. */
  buckets: DueBucket<T>[];
  /** Total a receber pendente (todas as janelas). */
  totalIncome: number;
  /** Total a pagar pendente (todas as janelas). */
  totalExpense: number;
  /** Nº total de pendências. */
  count: number;
}

/**
 * Monta a agenda de contas a pagar e a receber: distribui as pendências
 * (received === false) em janelas de vencimento — vencidas, hoje, próximos
 * `weekHorizon` dias (padrão 7) e mais tarde — comparando por dia (UTC).
 *
 * Complementa `projectCashflow` (visão mensal agregada): aqui cada conta é
 * listada individualmente e ordenada pelo vencimento, para a ação do dia a dia
 * ("o que preciso cobrar/pagar agora?"). Transações já realizadas são ignoradas.
 * Pura; `now` e `weekHorizon` são injetáveis para teste.
 */
export function buildDueAgenda<T extends TxLike>(
  txs: T[],
  options: { now?: Date | string; weekHorizon?: number } = {},
): DueAgenda<T> {
  const now = options.now ?? new Date();
  const weekHorizon = Math.max(1, Math.floor(options.weekHorizon ?? 7));
  const todayMs = utcMidnight(now);

  const byBucket = new Map<DueBucketKey, DueAgendaItem<T>[]>();
  for (const key of DUE_BUCKET_ORDER) byBucket.set(key, []);

  for (const t of txs) {
    if (t.received) continue; // só pendências (a receber / a pagar)
    const daysUntil = Math.round((utcMidnight(t.date) - todayMs) / DAY_MS);
    let bucket: DueBucketKey;
    if (daysUntil < 0) bucket = "overdue";
    else if (daysUntil === 0) bucket = "today";
    else if (daysUntil <= weekHorizon) bucket = "week";
    else bucket = "later";
    byBucket.get(bucket)!.push({ tx: t, bucket, daysUntil });
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let count = 0;

  const buckets: DueBucket<T>[] = DUE_BUCKET_ORDER.map((key) => {
    const items = byBucket
      .get(key)!
      .sort((a, b) => a.daysUntil - b.daysUntil || txTime(a.tx) - txTime(b.tx));
    let income = 0;
    let expense = 0;
    for (const { tx } of items) {
      if (tx.type === "INCOME") income += tx.amount;
      else expense += tx.amount;
    }
    totalIncome += income;
    totalExpense += expense;
    count += items.length;
    return { key, items, income, expense, net: income - expense, count: items.length };
  });

  return { buckets, totalIncome, totalExpense, count };
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

// ── Pipeline de receita agendada (cachês de shows futuros) ──────────────────
//
// Responde "quanto já tenho agendado para receber nos próximos meses?" — a partir
// dos cachês (`fee`) dos shows ainda por acontecer (data >= hoje), agrupados por
// mês de vencimento. Distinto de `projectCashflow` (que parte das pendências de
// caixa): aqui a fonte é a AGENDA de shows, não os lançamentos financeiros. Cada
// mês separa o que já está CONFIRMADO do que ainda é PROPOSTO (tentativo), para o
// músico distinguir receita garantida de pipeline incerto. Pura.

/** Forma mínima de show para a projeção de receita agendada. */
export interface BookedRevenueShowLike {
  fee: number; // cachê acordado, centavos
  status?: string;
  date: Date | string;
}

export interface BookedRevenueMonth {
  /** Chave do mês "YYYY-MM" (UTC). */
  month: string;
  /** Soma dos cachês dos shows do mês (centavos). */
  total: number;
  /** Nº de shows agendados no mês. */
  count: number;
  /** Cachês de shows já confirmados/realizados (CONFIRMED/PLAYED). */
  confirmed: number;
  /** Cachês de shows ainda tentativos (PROPOSED ou status ausente). */
  tentative: number;
}

export interface BookedRevenueForecast {
  /** Meses com shows futuros, em ordem cronológica crescente (só meses com shows). */
  months: BookedRevenueMonth[];
  /** Soma de todos os cachês futuros (centavos). */
  total: number;
  /** Nº total de shows futuros considerados. */
  count: number;
  /** Total já confirmado (CONFIRMED/PLAYED). */
  confirmedTotal: number;
  /** Total ainda tentativo (PROPOSED/sem status). */
  tentativeTotal: number;
  /** Mês do próximo show ("YYYY-MM") ou null se não houver shows futuros. */
  nextMonth: string | null;
}

/** True se o show conta como receita já confirmada (não apenas proposta). */
function isConfirmedBooking(status?: string): boolean {
  return status === "CONFIRMED" || status === "PLAYED";
}

/**
 * Projeta a receita agendada a partir dos cachês de shows ainda por acontecer.
 *
 * - "Futuro" = dia do show `>= hoje` (comparação por dia em UTC, mesma convenção
 *   de `dayKey`; um show de hoje ainda conta).
 * - Shows `CANCELLED` são ignorados (não geram receita).
 * - Agrupa por mês do show ("YYYY-MM"); só meses com shows aparecem, em ordem
 *   crescente. `total = confirmed + tentative` em cada mês (invariante).
 * - `now` injetável para testes determinísticos.
 */
export function forecastBookedRevenue(
  shows: BookedRevenueShowLike[],
  opts: { now?: Date } = {},
): BookedRevenueForecast {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const future = shows.filter(
    (s) => s.status !== "CANCELLED" && utcMidnight(s.date) >= todayMs,
  );

  const byMonth = new Map<string, BookedRevenueMonth>();
  for (const s of future) {
    const key = monthKey(s.date);
    const bucket =
      byMonth.get(key) ??
      { month: key, total: 0, count: 0, confirmed: 0, tentative: 0 };
    bucket.total += s.fee;
    bucket.count += 1;
    if (isConfirmedBooking(s.status)) bucket.confirmed += s.fee;
    else bucket.tentative += s.fee;
    byMonth.set(key, bucket);
  }

  const months = Array.from(byMonth.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  const total = sum(months.map((m) => m.total));
  const confirmedTotal = sum(months.map((m) => m.confirmed));
  const tentativeTotal = sum(months.map((m) => m.tentative));

  return {
    months,
    total,
    count: future.length,
    confirmedTotal,
    tentativeTotal,
    nextMonth: months.length > 0 ? months[0].month : null,
  };
}

// ── Cachês a receber (reconciliação agenda × finanças) ──────────────────────
//
// Responde "de quais shows que já toquei eu ainda não recebi o cachê?". É a ponte
// entre a AGENDA (o cachê acordado de cada show) e as FINANÇAS (as receitas de fato
// lançadas e recebidas). Pega o gap que nenhum outro relatório cobre: o gig que já
// aconteceu mas cujo dinheiro nunca entrou no caixa — seja porque a receita não foi
// lançada, seja porque foi lançada mas continua pendente. Pura.

/** Forma mínima de show para a reconciliação de cachês a receber. */
export interface ReceivableShowLike extends ShowLike {
  date: Date | string;
}

export interface ShowReceivableRow<S extends ReceivableShowLike = ReceivableShowLike> {
  show: S;
  /** Cachê acordado do show (centavos). */
  fee: number;
  /** Receita vinculada já recebida (INCOME, received=true) — o que entrou no caixa. */
  collected: number;
  /** Receita vinculada lançada mas ainda pendente (INCOME, received=false). */
  registeredPending: number;
  /** Quanto ainda falta receber: max(0, fee − collected). */
  outstanding: number;
  /** True se nenhuma receita foi sequer lançada para o show (nem recebida nem pendente). */
  unregistered: boolean;
}

export interface ShowReceivables<S extends ReceivableShowLike = ReceivableShowLike> {
  /** Shows com saldo a receber (outstanding > 0), do mais antigo ao mais recente. */
  rows: ShowReceivableRow<S>[];
  /** Nº de shows com saldo a receber. */
  count: number;
  /** Soma do que ainda falta receber (centavos). */
  totalOutstanding: number;
  /** Soma dos cachês dos shows pendentes (centavos). */
  totalFee: number;
  /** Soma do que já foi recebido nesses shows (centavos). */
  totalCollected: number;
}

/**
 * True se o show já aconteceu e deveria ter gerado receita: explicitamente
 * Realizado (PLAYED) ou Confirmado (CONFIRMED) com data já passada (o usuário
 * pode ter esquecido de marcar como realizado). Propostos e Cancelados não contam.
 */
function isHappenedGig(show: ReceivableShowLike, todayMs: number): boolean {
  if (show.status === "PLAYED") return true;
  if (show.status === "CONFIRMED") return utcMidnight(show.date) < todayMs;
  return false;
}

/**
 * Reconcilia os cachês dos shows já realizados contra a receita efetivamente
 * recebida, listando os que ainda têm dinheiro a entrar (`outstanding > 0`).
 *
 * - Considera "realizado" o show PLAYED ou CONFIRMED com data passada (ver
 *   `isHappenedGig`); PROPOSED e CANCELLED ficam de fora.
 * - `collected` = soma das receitas (INCOME) vinculadas ao show já recebidas
 *   (received=true). `outstanding` = max(0, fee − collected): o que falta entrar.
 * - Shows sem cachê (`fee <= 0`) são ignorados (nada a cobrar).
 * - Ordena do gig mais antigo ao mais recente (o atraso mais longo primeiro);
 *   empate desfeito pelo `id` para estabilidade. `now` injetável para teste.
 */
export function reconcileShowFees<S extends ReceivableShowLike>(
  shows: S[],
  txs: TxLike[],
  opts: { now?: Date | string } = {},
): ShowReceivables<S> {
  const todayMs = utcMidnight(opts.now ?? new Date());

  // Receita vinculada por show, separando recebida de pendente, numa só passada.
  const collectedByShow = new Map<string, number>();
  const pendingByShow = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "INCOME" || t.showId == null) continue;
    const target = t.received ? collectedByShow : pendingByShow;
    target.set(t.showId, (target.get(t.showId) ?? 0) + t.amount);
  }

  const rows: ShowReceivableRow<S>[] = [];
  for (const show of shows) {
    if (show.fee <= 0) continue;
    if (!isHappenedGig(show, todayMs)) continue;

    const collected = collectedByShow.get(show.id) ?? 0;
    const registeredPending = pendingByShow.get(show.id) ?? 0;
    const outstanding = Math.max(0, show.fee - collected);
    if (outstanding <= 0) continue;

    rows.push({
      show,
      fee: show.fee,
      collected,
      registeredPending,
      outstanding,
      unregistered: collected === 0 && registeredPending === 0,
    });
  }

  rows.sort(
    (a, b) =>
      utcMidnight(a.show.date) - utcMidnight(b.show.date) ||
      a.show.id.localeCompare(b.show.id),
  );

  return {
    rows,
    count: rows.length,
    totalOutstanding: sum(rows.map((r) => r.outstanding)),
    totalFee: sum(rows.map((r) => r.fee)),
    totalCollected: sum(rows.map((r) => r.collected)),
  };
}

// ── Aging dos recebíveis (priorizar a cobrança pela idade do atraso) ────────

export type ReceivableAgeBucketKey = "d30" | "d60" | "d90" | "older";

/** Ordem de exibição dos baldes de aging, do mais recente ao mais antigo. */
export const RECEIVABLE_AGE_BUCKET_ORDER: ReceivableAgeBucketKey[] = [
  "d30",
  "d60",
  "d90",
  "older",
];

export const RECEIVABLE_AGE_BUCKET_LABELS: Record<ReceivableAgeBucketKey, string> = {
  d30: "Até 30 dias",
  d60: "31 a 60 dias",
  d90: "61 a 90 dias",
  older: "Mais de 90 dias",
};

export interface AgedReceivableRow<S extends ReceivableShowLike = ReceivableShowLike> {
  row: ShowReceivableRow<S>;
  /** Dias decorridos desde a data do show (>= 0). */
  daysOutstanding: number;
  bucket: ReceivableAgeBucketKey;
}

export interface ReceivableAgeBucket<S extends ReceivableShowLike = ReceivableShowLike> {
  key: ReceivableAgeBucketKey;
  label: string;
  /** Recebíveis do balde, do atraso mais longo ao mais curto. */
  rows: AgedReceivableRow<S>[];
  count: number;
  totalOutstanding: number;
  /** Participação no total a receber (0..1). 0 se o total for 0. */
  share: number;
}

export interface ReceivableAging<S extends ReceivableShowLike = ReceivableShowLike> {
  /** Todos os baldes, sempre na ordem de `RECEIVABLE_AGE_BUCKET_ORDER`. */
  buckets: ReceivableAgeBucket<S>[];
  totalOutstanding: number;
  count: number;
  /** Maior atraso em dias entre os recebíveis (0 se vazio). */
  maxDaysOutstanding: number;
  /** Atraso médio em dias, ponderado pelo valor em aberto (0 se vazio). */
  weightedAvgDays: number;
}

/** Classifica um atraso (em dias) num dos baldes de aging. */
export function receivableAgeBucket(days: number): ReceivableAgeBucketKey {
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  if (days <= 90) return "d90";
  return "older";
}

/**
 * Agrupa os cachês a receber (saída de `reconcileShowFees`) por idade do atraso,
 * medindo os dias decorridos desde a data do show. Responde "qual dinheiro está
 * encalhando há mais tempo?" — base para priorizar a cobrança.
 *
 * - Atraso = dias (UTC, por dia) entre a data do show e `now`, nunca negativo.
 * - Baldes: até 30 / 31–60 / 61–90 / mais de 90 dias (ver `receivableAgeBucket`).
 *   Todos os baldes vêm presentes, mesmo vazios, na ordem fixa de exibição.
 * - Dentro de cada balde, ordena do atraso mais longo ao mais curto (id desempata).
 * - `weightedAvgDays` pondera o atraso pelo valor em aberto (centavos), destacando
 *   onde está o dinheiro velho; `maxDaysOutstanding` é o pior caso. `now` injetável.
 */
export function bucketReceivablesByAge<S extends ReceivableShowLike>(
  receivables: ShowReceivables<S>,
  opts: { now?: Date | string } = {},
): ReceivableAging<S> {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const aged: AgedReceivableRow<S>[] = receivables.rows.map((row) => {
    const days = Math.max(
      0,
      Math.round((todayMs - utcMidnight(row.show.date)) / DAY_MS),
    );
    return { row, daysOutstanding: days, bucket: receivableAgeBucket(days) };
  });

  const total = sum(aged.map((a) => a.row.outstanding));

  const buckets: ReceivableAgeBucket<S>[] = RECEIVABLE_AGE_BUCKET_ORDER.map((key) => {
    const rows = aged
      .filter((a) => a.bucket === key)
      .sort(
        (a, b) =>
          b.daysOutstanding - a.daysOutstanding ||
          a.row.show.id.localeCompare(b.row.show.id),
      );
    const bucketTotal = sum(rows.map((a) => a.row.outstanding));
    return {
      key,
      label: RECEIVABLE_AGE_BUCKET_LABELS[key],
      rows,
      count: rows.length,
      totalOutstanding: bucketTotal,
      share: total === 0 ? 0 : bucketTotal / total,
    };
  });

  const weightedDays = sum(aged.map((a) => a.daysOutstanding * a.row.outstanding));

  return {
    buckets,
    totalOutstanding: total,
    count: aged.length,
    maxDaysOutstanding: aged.reduce((m, a) => Math.max(m, a.daysOutstanding), 0),
    weightedAvgDays: total === 0 ? 0 : Math.round(weightedDays / total),
  };
}

// ── Prazo de recebimento (quão rápido o cachê entra depois do show) ─────────
//
// Métrica "realizada", complementar ao aging (que mede o que AINDA falta
// receber): aqui medimos, sobre o dinheiro QUE JÁ ENTROU, quantos dias depois do
// show ele caiu no caixa. Responde "depois que toco, em quanto tempo recebo?" —
// base para planejar fluxo de caixa e negociar prazos com contratantes.

export type PaymentSpeedBucketKey = "onTime" | "d7" | "d30" | "d60" | "slow";

/** Ordem de exibição dos baldes de prazo, do mais rápido ao mais lento. */
export const PAYMENT_SPEED_BUCKET_ORDER: PaymentSpeedBucketKey[] = [
  "onTime",
  "d7",
  "d30",
  "d60",
  "slow",
];

export const PAYMENT_SPEED_BUCKET_LABELS: Record<PaymentSpeedBucketKey, string> = {
  onTime: "No dia ou adiantado",
  d7: "Até 7 dias",
  d30: "8 a 30 dias",
  d60: "31 a 60 dias",
  slow: "Mais de 60 dias",
};

/** Classifica um prazo de recebimento (em dias) num dos baldes de velocidade. */
export function paymentSpeedBucket(days: number): PaymentSpeedBucketKey {
  if (days <= 0) return "onTime";
  if (days <= 7) return "d7";
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  return "slow";
}

export interface PaymentLagShowRow<S extends ReceivableShowLike = ReceivableShowLike> {
  show: S;
  /** Total recebido vinculado ao show (INCOME, received=true), em centavos. */
  received: number;
  /** Nº de recebimentos (transações) que compõem o total. */
  paymentCount: number;
  /**
   * Prazo médio do show, ponderado pelo valor de cada recebimento: dias entre a
   * data do show e a data do pagamento. Pode ser negativo (pago adiantado).
   */
  avgDays: number;
  /** Prazo do recebimento mais tardio do show (pior caso do show). */
  lastDays: number;
  /** Balde de velocidade do show, derivado de `avgDays`. */
  bucket: PaymentSpeedBucketKey;
}

export interface PaymentLagBucket<S extends ReceivableShowLike = ReceivableShowLike> {
  key: PaymentSpeedBucketKey;
  label: string;
  /** Shows do balde, do mais lento ao mais rápido (id desempata). */
  rows: PaymentLagShowRow<S>[];
  count: number;
  /** Soma do recebido nesses shows (centavos). */
  received: number;
  /** Participação no total recebido (0..1). 0 se o total for 0. */
  share: number;
}

export interface PaymentLag<S extends ReceivableShowLike = ReceivableShowLike> {
  /** Todos os shows com recebimento, do prazo médio mais lento ao mais rápido. */
  rows: PaymentLagShowRow<S>[];
  /** Baldes de velocidade, sempre na ordem de `PAYMENT_SPEED_BUCKET_ORDER`. */
  buckets: PaymentLagBucket<S>[];
  /** Nº de shows com algum recebimento vinculado. */
  showCount: number;
  /** Nº de recebimentos (transações) considerados. */
  paymentCount: number;
  /** Soma de tudo que entrou (centavos). */
  totalReceived: number;
  /**
   * Prazo médio de recebimento ponderado pelo valor (o "DSO" do músico): em
   * média, cada real entrou tantos dias depois do show. 0 se não houve recebimento.
   */
  avgDays: number;
  /**
   * Prazo MEDIANO de recebimento ponderado pelo valor: o dia em que metade do
   * faturamento já tinha entrado. Robusto a outlier — um único recebimento muito
   * atrasado infla `avgDays`, mas não a mediana. 0 se não houve recebimento.
   */
  medianDays: number;
  /** Show de recebimento mais rápido (menor `avgDays`), ou null se vazio. */
  fastest: PaymentLagShowRow<S> | null;
  /** Show de recebimento mais lento (maior `avgDays`), ou null se vazio. */
  slowest: PaymentLagShowRow<S> | null;
}

interface PaymentDatum {
  /** Dias entre a data do show e a do pagamento (pode ser negativo). */
  days: number;
  /** Valor do pagamento (centavos). */
  amount: number;
}

/**
 * Mede o prazo de recebimento realizado: sobre os cachês que JÁ entraram, quantos
 * dias depois do show o dinheiro caiu no caixa. Complementa o aging (que olha o
 * que ainda falta) com o histórico do que já foi pago.
 *
 * - Considera receitas INCOME, `received=true`, vinculadas a um show
 *   (`showId`), com valor positivo; shows CANCELLED ficam de fora.
 * - Prazo de um recebimento = dias (UTC, por dia) entre a data do show e a data
 *   do pagamento. Negativo = pago adiantado (antes do show); 0 = no dia.
 * - Agrega por show: `avgDays` pondera os recebimentos do show pelo valor;
 *   `lastDays` é o pagamento mais tardio. O balde do show vem de `avgDays`.
 * - `avgDays` global pondera TODOS os recebimentos pelo valor (o DSO do caixa).
 * - `rows` e os baldes vão do mais lento ao mais rápido (id desempata); pura.
 */
export function paymentLag<S extends ReceivableShowLike>(
  shows: S[],
  txs: TxLike[],
): PaymentLag<S> {
  const showById = new Map<string, S>();
  for (const show of shows) {
    if (show.status === "CANCELLED") continue;
    showById.set(show.id, show);
  }

  // Acumula os recebimentos por show numa só passada.
  const byShow = new Map<string, { received: number; data: PaymentDatum[] }>();
  for (const t of txs) {
    if (t.type !== "INCOME" || !t.received || t.showId == null || t.amount <= 0) continue;
    const show = showById.get(t.showId);
    if (!show) continue;
    const days = Math.round((utcMidnight(t.date) - utcMidnight(show.date)) / DAY_MS);
    const entry = byShow.get(show.id) ?? { received: 0, data: [] };
    entry.received += t.amount;
    entry.data.push({ days, amount: t.amount });
    byShow.set(show.id, entry);
  }

  const rows: PaymentLagShowRow<S>[] = [];
  for (const [showId, { received, data }] of byShow) {
    const show = showById.get(showId)!;
    const weightedDays = sum(data.map((d) => d.days * d.amount));
    rows.push({
      show,
      received,
      paymentCount: data.length,
      avgDays: received === 0 ? 0 : Math.round(weightedDays / received),
      lastDays: data.reduce((m, d) => Math.max(m, d.days), data[0].days),
      bucket: paymentSpeedBucket(received === 0 ? 0 : weightedDays / received),
    });
  }

  // Do mais lento ao mais rápido (prazo médio desc; id desempata).
  rows.sort((a, b) => b.avgDays - a.avgDays || a.show.id.localeCompare(b.show.id));

  const totalReceived = sum(rows.map((r) => r.received));
  const paymentCount = sum(rows.map((r) => r.paymentCount));
  const weightedGlobal = sum(rows.map((r) => r.avgDays * r.received));

  const buckets: PaymentLagBucket<S>[] = PAYMENT_SPEED_BUCKET_ORDER.map((key) => {
    const bucketRows = rows.filter((r) => r.bucket === key);
    const received = sum(bucketRows.map((r) => r.received));
    return {
      key,
      label: PAYMENT_SPEED_BUCKET_LABELS[key],
      rows: bucketRows,
      count: bucketRows.length,
      received,
      share: totalReceived === 0 ? 0 : received / totalReceived,
    };
  });

  return {
    rows,
    buckets,
    showCount: rows.length,
    paymentCount,
    totalReceived,
    avgDays: totalReceived === 0 ? 0 : Math.round(weightedGlobal / totalReceived),
    // Mediana ponderada pelo valor sobre o prazo de cada show (mesmos insumos do
    // DSO médio: avgDays do show, peso = recebido) — resiste a um show muito atrasado.
    medianDays: weightedMedian(rows.map((r) => ({ value: r.avgDays, weight: r.received }))),
    // rows está ordenado do mais lento (avgDays maior) ao mais rápido.
    slowest: rows[0] ?? null,
    fastest: rows.length ? rows[rows.length - 1] : null,
  };
}

/**
 * Resumo do prazo de recebimento para o Painel: condensa um `PaymentLag` no que
 * cabe num card de dashboard. Decide se vale a pena mostrar (precisa de uma
 * amostra mínima de shows pagos), expõe o DSO médio e o mediano, o balde de
 * velocidade (que dá o tom do card) e sinaliza quando a média está
 * sensivelmente acima da mediana — caso em que um show muito atrasado infla o
 * número e a mediana é a leitura típica mais honesta.
 */
export interface PaymentLagHeadline {
  /** Há histórico suficiente para mostrar o DSO no Painel? */
  show: boolean;
  /** DSO médio ponderado pelo valor (dias). */
  avgDays: number;
  /** DSO mediano ponderado pelo valor (dias) — leitura típica, robusta a outlier. */
  medianDays: number;
  /** Balde de velocidade derivado do DSO médio (tom do card). */
  bucket: PaymentSpeedBucketKey;
  /** Nº de shows com algum recebimento (tamanho da amostra). */
  showCount: number;
  /**
   * A média está sensivelmente acima da mediana? Sinaliza que um show muito
   * atrasado puxa o DSO médio para cima — nesse caso a mediana é a leitura mais
   * honesta do prazo típico.
   */
  skewed: boolean;
}

/** Amostra mínima de shows pagos para um DSO de Painel fazer sentido. */
export const PAYMENT_LAG_HEADLINE_MIN_SHOWS = 2;
/** Dias que a média precisa exceder a mediana para soar "puxada por outlier". */
export const PAYMENT_LAG_SKEW_THRESHOLD_DAYS = 7;

/** Deriva o resumo de Painel a partir do `paymentLag` (pura, sem I/O). */
export function paymentLagHeadline<S extends ReceivableShowLike>(
  lag: PaymentLag<S>,
): PaymentLagHeadline {
  return {
    show:
      lag.showCount >= PAYMENT_LAG_HEADLINE_MIN_SHOWS && lag.totalReceived > 0,
    avgDays: lag.avgDays,
    medianDays: lag.medianDays,
    bucket: paymentSpeedBucket(lag.avgDays),
    showCount: lag.showCount,
    skewed: lag.avgDays - lag.medianDays >= PAYMENT_LAG_SKEW_THRESHOLD_DAYS,
  };
}

// ── Prazo de recebimento por contratante (quem paga rápido x devagar) ───────
//
// Quebra o prazo de recebimento realizado (paymentLag) por quem paga: agrupa os
// shows pelo contato responsável pelo pagamento (o "contratante", escolhido fora
// daqui — ver billing.pickPayerContact) e mede, por contratante, em quanto tempo o
// dinheiro entrou. Responde "quem me paga rápido e quem me deixa esperando?" — base
// para negociar prazos e priorizar quem vale a pena.

export interface ContactPaymentLagRow<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Contratante do grupo; `null` agrega os shows sem contato vinculado. */
  contact: C | null;
  /** Total recebido atribuído a esse contratante (centavos). */
  received: number;
  /** Nº de recebimentos (transações) somados. */
  paymentCount: number;
  /** Nº de shows pagos atribuídos a esse contratante. */
  showCount: number;
  /** Prazo médio (dias) ponderado pelo valor recebido nos shows do contratante. */
  avgDays: number;
  /** Pior prazo (dias) entre os shows do contratante. */
  lastDays: number;
  /** Balde de velocidade do contratante, derivado de `avgDays`. */
  bucket: PaymentSpeedBucketKey;
  /** Participação no total recebido (0..1). 0 se o total for 0. */
  share: number;
  /** Shows do contratante, do mais lento ao mais rápido (reusa PaymentLag). */
  shows: PaymentLagShowRow<S>[];
}

export interface PaymentLagByContact<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Grupos por contratante, do prazo médio mais lento ao mais rápido; o grupo
   * `null` (sem contratante) vai sempre por último. */
  rows: ContactPaymentLagRow<C, S>[];
  /** Nº de contratantes identificados (exclui o grupo `null`). */
  contactCount: number;
  /** Nº de recebimentos considerados. */
  paymentCount: number;
  /** Soma de tudo que entrou (centavos). */
  totalReceived: number;
  /** Prazo médio global ponderado pelo valor (o DSO do caixa). */
  avgDays: number;
  /** Contratante mais lento (maior `avgDays`), ignorando o grupo `null`. */
  slowest: ContactPaymentLagRow<C, S> | null;
  /** Contratante mais rápido (menor `avgDays`), ignorando o grupo `null`. */
  fastest: ContactPaymentLagRow<C, S> | null;
}

/**
 * Agrupa o prazo de recebimento realizado por contratante. Reaproveita `paymentLag`
 * (a mesma regra de quem entra e o cálculo por show) e só redistribui os shows pelo
 * pagador, agregando o prazo ponderado pelo valor.
 *
 * - `getPayer(show)` escolhe o contratante de cada show (ex.: billing.pickPayerContact);
 *   `null` cai no grupo "sem contratante". A identidade do contato vem de `id`.
 * - Grupos ordenados do prazo médio mais lento ao mais rápido; o grupo `null` vai
 *   sempre por último (não é um contratante de verdade). Os shows de cada grupo
 *   herdam a ordenação (lento→rápido) de `paymentLag`. Pura.
 */
export function paymentLagByContact<
  C extends { id: string },
  S extends ReceivableShowLike,
>(
  shows: S[],
  txs: TxLike[],
  getPayer: (show: S) => C | null,
): PaymentLagByContact<C, S> {
  const lag = paymentLag(shows, txs);

  interface Group {
    contact: C | null;
    received: number;
    paymentCount: number;
    weightedDays: number;
    lastDays: number;
    shows: PaymentLagShowRow<S>[];
  }
  const NO_CONTACT = " "; // chave reservada para o grupo sem contratante
  const groups = new Map<string, Group>();

  for (const row of lag.rows) {
    const contact = getPayer(row.show);
    const key = contact ? contact.id : NO_CONTACT;
    const g =
      groups.get(key) ??
      ({ contact, received: 0, paymentCount: 0, weightedDays: 0, lastDays: row.lastDays, shows: [] } as Group);
    g.received += row.received;
    g.paymentCount += row.paymentCount;
    g.weightedDays += row.avgDays * row.received;
    g.lastDays = Math.max(g.lastDays, row.lastDays);
    g.shows.push(row);
    groups.set(key, g);
  }

  const totalReceived = lag.totalReceived;
  const rows: ContactPaymentLagRow<C, S>[] = [];
  for (const g of groups.values()) {
    const avgExact = g.received === 0 ? 0 : g.weightedDays / g.received;
    rows.push({
      contact: g.contact,
      received: g.received,
      paymentCount: g.paymentCount,
      showCount: g.shows.length,
      avgDays: Math.round(avgExact),
      lastDays: g.lastDays,
      bucket: paymentSpeedBucket(avgExact),
      share: totalReceived === 0 ? 0 : g.received / totalReceived,
      shows: g.shows,
    });
  }

  // Mais lento → mais rápido; o grupo sem contratante (contact null) por último.
  rows.sort((a, b) => {
    if (!a.contact !== !b.contact) return a.contact ? -1 : 1;
    return (
      b.avgDays - a.avgDays ||
      (a.contact?.id ?? "").localeCompare(b.contact?.id ?? "")
    );
  });

  const identified = rows.filter((r) => r.contact);
  return {
    rows,
    contactCount: identified.length,
    paymentCount: lag.paymentCount,
    totalReceived,
    avgDays: lag.avgDays,
    slowest: identified[0] ?? null,
    fastest: identified.length ? identified[identified.length - 1] : null,
  };
}

/**
 * Decide quanto lançar ao quitar um cachê, dado o valor pedido pelo usuário e o
 * saldo em aberto (recalculado no servidor — a fonte de verdade). Regras:
 * - Saldo <= 0 → 0 (nada a quitar).
 * - Sem valor pedido (null/undefined), inválido (NaN) ou <= 0 → quita o saldo
 *   inteiro (comportamento padrão do botão "Quitar").
 * - Valor pedido válido → nunca passa do saldo (clamp em `outstanding`), evitando
 *   sobre-lançamento mesmo que o cliente envie um número maior.
 * Retorna sempre um inteiro de centavos em [0, outstanding].
 */
export function resolveSettlementAmount(
  outstanding: number,
  requested?: number | null,
): number {
  if (outstanding <= 0) return 0;
  if (requested == null || !Number.isFinite(requested) || requested <= 0) {
    return outstanding;
  }
  return Math.min(Math.round(requested), outstanding);
}

/**
 * Decide a DATA de recebimento ao quitar um cachê. `raw` é uma string de dia
 * "YYYY-MM-DD" (vinda de um `<input type="date">`); `now` é o momento da ação.
 *
 * Essa data determina em que mês o caixa entra (alimenta `monthKey`, a projeção de
 * caixa, o relatório mensal e o resumo anual), então registrar a data real importa:
 * o músico pode lançar hoje um cachê que de fato recebeu semana passada.
 *
 * Regras: vazio/ inválido → `now` (comportamento histórico, antes da D29); data
 * válida no passado/hoje → meia-noite UTC daquele dia (consistente com `dayKey`/
 * `monthKey`, que keyam por UTC); data no futuro → `now` (não se recebe dinheiro no
 * futuro — manter a projeção de caixa sã). Nunca confia no cliente: o clamp é aqui.
 */
export function resolveReceivedDate(
  raw: string | null | undefined,
  now: Date = new Date(),
): Date {
  if (!isValidDateKey(raw)) return now;
  const [y, m, d] = raw.trim().split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return parsed.getTime() > nowDay ? now : parsed;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function sum(nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0);
}

/**
 * Mediana de uma lista de números (centavos). Vazia → 0; nº par de elementos →
 * média dos dois centrais, arredondada ao centavo. Não muta a entrada.
 */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Mediana ponderada: o menor valor cujo peso acumulado (sobre os itens ordenados
 * por valor) alcança metade do peso total. Se o acumulado bater exatamente na
 * metade num item, devolve a média desse valor com o próximo (convenção da mediana
 * "do meio"). Itens com peso <= 0 são ignorados. Sem itens com peso → 0. Não muta a
 * entrada; resultado arredondado ao inteiro. É robusta a outlier — um único item de
 * valor extremo não desloca a mediana como faria com a média.
 */
function weightedMedian(items: { value: number; weight: number }[]): number {
  const sorted = items
    .filter((it) => it.weight > 0)
    .sort((a, b) => a.value - b.value);
  if (sorted.length === 0) return 0;
  const total = sum(sorted.map((it) => it.weight));
  const half = total / 2;
  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].weight;
    if (cumulative === half && i + 1 < sorted.length) {
      return Math.round((sorted[i].value + sorted[i + 1].value) / 2);
    }
    if (cumulative >= half) return Math.round(sorted[i].value);
  }
  return Math.round(sorted[sorted.length - 1].value);
}

const DAY_MS = 86_400_000;

/** Timestamp (ms) da meia-noite UTC do dia da data — para comparar por dia. */
function utcMidnight(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Timestamp (ms) exato da transação — para ordenação determinística no mesmo dia. */
function txTime(t: TxLike): number {
  const d = typeof t.date === "string" ? new Date(t.date) : t.date;
  return d.getTime();
}

// ── Custos fixos recorrentes (despesas que se repetem mês a mês) ─────────────

export interface RecurringExpenseCategory {
  /** Categoria normalizada (trim); vazia → "Sem categoria". */
  category: string;
  /** Soma de todas as despesas dessa categoria no histórico (centavos). */
  total: number;
  /** Nº de meses distintos (YYYY-MM) com ao menos uma despesa nessa categoria. */
  monthsActive: number;
  /** Janela: nº de meses entre a 1ª e a última ocorrência (inclusive). */
  monthsSpan: number;
  /** total / monthsActive arredondado ao centavo — a conta típica quando ela cai. */
  avgPerActiveMonth: number;
  /** monthsActive / monthsSpan (0..1): 1 = aparece todo mês dentro da janela. */
  regularity: number;
  /** Chave "YYYY-MM" da última ocorrência. */
  lastMonth: string;
  /** Ainda em curso: última ocorrência dentro da janela recente (ver `activeWithinMonths`). */
  active: boolean;
}

export interface RecurringExpensesReport {
  /** Categorias recorrentes (`monthsActive >= minMonths`), ordenadas por `avgPerActiveMonth` desc. */
  categories: RecurringExpenseCategory[];
  /** Soma de `avgPerActiveMonth` das categorias recorrentes AINDA ATIVAS — o custo fixo mensal estimado. */
  estimatedMonthlyFixedCost: number;
  /** Nº de meses distintos com qualquer despesa (amplitude do histórico de despesas). */
  monthsObserved: number;
}

export interface RecurringExpensesOptions {
  /** Mínimo de meses distintos para considerar a categoria recorrente. Default 3. */
  minMonths?: number;
  /** "Ainda ativa" se a última ocorrência for nos últimos N meses. Default 2. */
  activeWithinMonths?: number;
  /** Momento de referência para decidir o que ainda está ativo. Default `new Date()`. */
  now?: Date | string;
}

/** Distância em meses de `aKey` ("YYYY-MM") para `bKey`: (by-ay)*12 + (bm-am). */
function monthsBetween(aKey: string, bKey: string): number {
  const ay = Number(aKey.slice(0, 4));
  const am = Number(aKey.slice(5, 7));
  const by = Number(bKey.slice(0, 4));
  const bm = Number(bKey.slice(5, 7));
  return (by - ay) * 12 + (bm - am);
}

/**
 * Identifica os CUSTOS FIXOS recorrentes a partir das despesas: agrupa por categoria
 * e marca como recorrente toda categoria que aparece em ao menos `minMonths` meses
 * distintos. Responde "qual é meu custo fixo mensal?" — o piso que o músico precisa
 * faturar todo mês só para manter as luzes acesas (aluguel de sala de ensaio, streaming,
 * plano de telefone, mensalidade de software, transporte fixo…).
 *
 * Para cada categoria recorrente calcula a conta típica (`avgPerActiveMonth` = total /
 * meses-ativos) e a `regularity` (em quantos meses da janela ela de fato apareceu). O
 * **custo fixo mensal estimado** (`estimatedMonthlyFixedCost`) soma a conta típica apenas
 * das categorias AINDA ATIVAS (última ocorrência nos últimos `activeWithinMonths` meses),
 * para que um custo que você já cortou não infle a estimativa (ver D39).
 *
 * Pura; ignora receitas e despesas de valor zero; usa UTC via `monthKey`.
 */
export function recurringExpenses(
  txs: TxLike[],
  options: RecurringExpensesOptions = {},
): RecurringExpensesReport {
  const minMonths = options.minMonths ?? 3;
  const activeWithinMonths = options.activeWithinMonths ?? 2;
  const nowKey = monthKey(options.now ?? new Date());

  // Por categoria: total, meses distintos, 1ª e última chave de mês.
  interface Acc {
    total: number;
    months: Set<string>;
    firstMonth: string;
    lastMonth: string;
  }
  const byCategory = new Map<string, Acc>();
  const allMonths = new Set<string>();

  for (const t of txs) {
    if (t.type !== "EXPENSE" || t.amount <= 0) continue;
    const category = (t.category ?? "").trim() || "Sem categoria";
    const mk = monthKey(t.date);
    allMonths.add(mk);
    const acc = byCategory.get(category);
    if (!acc) {
      byCategory.set(category, {
        total: t.amount,
        months: new Set([mk]),
        firstMonth: mk,
        lastMonth: mk,
      });
    } else {
      acc.total += t.amount;
      acc.months.add(mk);
      if (mk < acc.firstMonth) acc.firstMonth = mk;
      if (mk > acc.lastMonth) acc.lastMonth = mk;
    }
  }

  const categories: RecurringExpenseCategory[] = [];
  for (const [category, acc] of byCategory) {
    const monthsActive = acc.months.size;
    if (monthsActive < minMonths) continue;
    const monthsSpan = monthsBetween(acc.firstMonth, acc.lastMonth) + 1;
    const avgPerActiveMonth = Math.round(acc.total / monthsActive);
    // Negativo (futuro) ou dentro da janela → ainda ativa.
    const active = monthsBetween(acc.lastMonth, nowKey) <= activeWithinMonths;
    categories.push({
      category,
      total: acc.total,
      monthsActive,
      monthsSpan,
      avgPerActiveMonth,
      regularity: monthsSpan > 0 ? monthsActive / monthsSpan : 0,
      lastMonth: acc.lastMonth,
      active,
    });
  }

  // Maior conta típica primeiro; desempate por total e por nome (ordem estável).
  categories.sort(
    (a, b) =>
      b.avgPerActiveMonth - a.avgPerActiveMonth ||
      b.total - a.total ||
      a.category.localeCompare(b.category),
  );

  const estimatedMonthlyFixedCost = categories
    .filter((c) => c.active)
    .reduce((sum, c) => sum + c.avgPerActiveMonth, 0);

  return {
    categories,
    estimatedMonthlyFixedCost,
    monthsObserved: allMonths.size,
  };
}

// ── Ponto de equilíbrio em shows (quantos gigs/mês cobrem o custo fixo) ──────
//
// Responde a pergunta de planejamento mais direta do músico: "quantos shows por
// mês eu preciso fazer só para pagar minhas contas fixas?". Cruza dois números que
// a plataforma já calcula: o CUSTO FIXO mensal (recurringExpenses, D39) e quanto
// um show TÍPICO deixa no bolso (a média do P&L dos shows já realizados). Pura.

/** Forma mínima de show para o ponto de equilíbrio (precisa da data p/ "realizado"). */
export interface BreakEvenShowLike extends ShowLike {
  date: Date | string;
}

export interface BreakEvenAnalysis {
  /** Custo fixo mensal estimado (centavos) — de `recurringExpenses`. */
  monthlyFixedCost: number;
  /** Resultado líquido médio por show realizado (centavos, arredondado). 0 se nenhum. */
  avgNetPerShow: number;
  /** Nº de shows realizados (PLAYED, ou CONFIRMED com data passada) considerados na média. */
  showsConsidered: number;
  /** Média de shows realizados por mês no histórico (0 se sem histórico). */
  avgShowsPerMonth: number;
  /**
   * Shows/mês necessários para cobrir o custo fixo: `ceil(monthlyFixedCost / avgNetPerShow)`.
   * - `null` quando não há custo fixo a cobrir (`monthlyFixedCost <= 0`): nada a bater.
   * - `null` quando `avgNetPerShow <= 0`: o show médio não sobra nada (a UI orienta a
   *   rever cachê/custos, pois nenhum número de shows fecha a conta).
   */
  showsNeeded: number | null;
  /** `avgShowsPerMonth >= showsNeeded` (já cobrindo); `null` quando `showsNeeded` é `null`. */
  covered: boolean | null;
}

/**
 * Estima o ponto de equilíbrio em shows: quantos gigs por mês são necessários para
 * cobrir o custo fixo mensal, dado quanto um show típico deixa de resultado líquido.
 *
 * - "Show realizado" = o mesmo critério de `reconcileShowFees` (`isHappenedGig`):
 *   PLAYED, ou CONFIRMED com data já passada. Propostos e cancelados ficam de fora
 *   (não representam o que de fato acontece num mês típico).
 * - `avgNetPerShow` = média do `computeShowPnL().net` dos shows realizados (cachê +
 *   receitas extras − despesas vinculadas), arredondada ao centavo.
 * - `avgShowsPerMonth` = nº de shows realizados ÷ amplitude (meses entre o 1º e o
 *   último show realizado, inclusive) — o ritmo atual de shows, para comparar com a meta.
 * - `monthlyFixedCost` vem de `recurringExpenses` (categorias recorrentes ainda ativas).
 *
 * Heurística de planejamento (não contabilidade exata): o custo fixo pode conter
 * despesas que também aparecem vinculadas a shows; aqui tratamos custo fixo e custo
 * por show como blocos separados. Pura; `now` e as opções de recorrência injetáveis.
 */
export function computeBreakEven(
  shows: BreakEvenShowLike[],
  txs: TxLike[],
  options: { now?: Date | string; recurring?: RecurringExpensesOptions } = {},
): BreakEvenAnalysis {
  const now = options.now ?? new Date();
  const todayMs = utcMidnight(now);

  const monthlyFixedCost = recurringExpenses(txs, {
    now,
    ...options.recurring,
  }).estimatedMonthlyFixedCost;

  const realized = shows.filter((s) => isHappenedGig(s, todayMs));
  const showsConsidered = realized.length;

  const totalNet = sum(realized.map((s) => computeShowPnL(s, txs).net));
  const avgNetPerShow = showsConsidered > 0 ? Math.round(totalNet / showsConsidered) : 0;

  let avgShowsPerMonth = 0;
  if (showsConsidered > 0) {
    const keys = realized.map((s) => monthKey(s.date));
    const first = keys.reduce((a, b) => (b < a ? b : a));
    const last = keys.reduce((a, b) => (b > a ? b : a));
    const span = monthsBetween(first, last) + 1; // inclusivo
    avgShowsPerMonth = showsConsidered / span;
  }

  const showsNeeded =
    monthlyFixedCost > 0 && avgNetPerShow > 0
      ? Math.ceil(monthlyFixedCost / avgNetPerShow)
      : null;

  const covered = showsNeeded == null ? null : avgShowsPerMonth >= showsNeeded;

  return {
    monthlyFixedCost,
    avgNetPerShow,
    showsConsidered,
    avgShowsPerMonth,
    showsNeeded,
    covered,
  };
}

// ── Reserva para impostos (guardar parte do que entra) ──────────────────────

/**
 * Alíquota padrão para a reserva de impostos (6%).
 *
 * HIPÓTESE a validar: aproxima a faixa inicial do Simples Nacional (Anexo III) e dá
 * uma ordem de grandeza segura para o autônomo guardar sobre o faturamento. O regime
 * real (MEI/Simples/carnê-leão) varia muito por perfil — a página permite ajustar a
 * alíquota e isto deve ser confirmado com um contador antes de virar premissa fixa.
 */
export const DEFAULT_TAX_RATE = 0.06;

export interface TaxReserveMonth {
  /** Chave "YYYY-MM". */
  month: string;
  /** Mês 1-12 (janeiro = 1). */
  monthIndex: number;
  /** Receita efetivamente recebida no mês (caixa de entrada), em centavos. */
  receivedIncome: number;
  /** Reserva sugerida = round(receivedIncome × rate), em centavos. */
  reserve: number;
}

export interface TaxReserveReport {
  /** Ano de referência. */
  year: number;
  /** Alíquota efetiva aplicada (0..1), após saneamento. */
  rate: number;
  /** Exatamente 12 meses (janeiro→dezembro), zeros inclusive. */
  months: TaxReserveMonth[];
  /** Soma da receita recebida no ano (centavos). */
  totalReceivedIncome: number;
  /** Soma da reserva sugerida no ano (centavos). */
  totalReserve: number;
}

/**
 * Sugere quanto guardar para impostos a partir do que de fato entrou no caixa.
 *
 * Base = receitas **recebidas** (`type === "INCOME"` e `received === true`) cujo mês
 * (UTC) cai no `year` — imposto incide sobre faturamento realizado, não sobre o que
 * ainda está a receber nem sobre o regime de competência. A reserva de cada mês é
 * arredondada ao centavo antes de somar (o total é a soma das reservas mensais, não
 * a reserva do total — diferença de no máximo alguns centavos, coerente com a UI).
 *
 * `rate` é saneada para o intervalo [0, 1]; ausente → `DEFAULT_TAX_RATE`. Pura.
 */
export function taxReserve(
  txs: TxLike[],
  options: { year: number; rate?: number },
): TaxReserveReport {
  const { year } = options;
  const rawRate = options.rate ?? DEFAULT_TAX_RATE;
  const rate = Number.isFinite(rawRate) ? Math.min(1, Math.max(0, rawRate)) : DEFAULT_TAX_RATE;

  const prefix = `${year}-`;
  const received = new Array(12).fill(0);

  for (const t of txs) {
    if (t.type !== "INCOME" || !t.received) continue;
    const key = monthKey(t.date);
    if (!key.startsWith(prefix)) continue;
    const idx = Number(key.slice(5, 7)) - 1;
    if (idx < 0 || idx > 11) continue;
    received[idx] += t.amount;
  }

  const months: TaxReserveMonth[] = received.map((inc, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    monthIndex: i + 1,
    receivedIncome: inc,
    reserve: Math.round(inc * rate),
  }));

  return {
    year,
    rate,
    months,
    totalReceivedIncome: sum(received),
    totalReserve: sum(months.map((m) => m.reserve)),
  };
}

// ── Funil de propostas / pipeline de shows ──────────────────────────────────
// Responde "quantas propostas viram show de verdade?" e "quanto de cachê está
// em negociação/confirmado (ainda não realizado)?". É um retrato (snapshot) do
// estado atual de cada show — não um fluxo histórico (um show pode mudar de
// status com o tempo); a taxa de concretização olha só os shows já decididos.

/** Ordem canônica das etapas do funil (do mais incerto ao terminal). */
export const PIPELINE_STAGE_ORDER = [
  "PROPOSED",
  "CONFIRMED",
  "PLAYED",
  "CANCELLED",
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGE_ORDER)[number];

export interface PipelineStage {
  status: PipelineStageKey;
  count: number;
  /** Soma dos cachês acordados dos shows nesta etapa (centavos). */
  fee: number;
}

export interface ShowPipeline {
  /** Etapas na ordem canônica (sempre as quatro, mesmo com count 0). */
  stages: PipelineStage[];
  /** Total de shows considerados. */
  total: number;
  /** Cachê em aberto: PROPOSED + CONFIRMED (dinheiro ainda não realizado). */
  openValue: number;
  /** Shows em aberto: PROPOSED + CONFIRMED. */
  openCount: number;
  /** Shows propostos (em negociação). */
  proposedCount: number;
  /** Cachê dos propostos (em negociação). */
  proposedValue: number;
  /** Shows confirmados (fechados, ainda não tocados). */
  confirmedCount: number;
  /** Cachê dos confirmados. */
  confirmedValue: number;
  /** Shows realizados. */
  playedCount: number;
  /** Shows cancelados. */
  cancelledCount: number;
  /** Shows já decididos (PLAYED + CANCELLED). */
  decidedCount: number;
  /**
   * Taxa de concretização: PLAYED / (PLAYED + CANCELLED). De tudo que já teve
   * desfecho, a fração que de fato aconteceu. `null` quando nada foi decidido.
   */
  conversionRate: number | null;
}

/**
 * Agrega os shows pelo status num funil, somando contagem e cachê por etapa,
 * o valor em aberto (proposto + confirmado) e a taxa de concretização dos
 * shows já decididos. Status desconhecido é ignorado (não entra em `total`).
 */
export function showPipeline(shows: ShowLike[]): ShowPipeline {
  const byStatus: Record<PipelineStageKey, { count: number; fee: number }> = {
    PROPOSED: { count: 0, fee: 0 },
    CONFIRMED: { count: 0, fee: 0 },
    PLAYED: { count: 0, fee: 0 },
    CANCELLED: { count: 0, fee: 0 },
  };

  for (const s of shows) {
    const status = s.status as PipelineStageKey | undefined;
    if (!status || !(status in byStatus)) continue;
    byStatus[status].count += 1;
    byStatus[status].fee += s.fee;
  }

  const stages: PipelineStage[] = PIPELINE_STAGE_ORDER.map((status) => ({
    status,
    count: byStatus[status].count,
    fee: byStatus[status].fee,
  }));

  const proposedCount = byStatus.PROPOSED.count;
  const proposedValue = byStatus.PROPOSED.fee;
  const confirmedCount = byStatus.CONFIRMED.count;
  const confirmedValue = byStatus.CONFIRMED.fee;
  const playedCount = byStatus.PLAYED.count;
  const cancelledCount = byStatus.CANCELLED.count;

  const decidedCount = playedCount + cancelledCount;
  const conversionRate = decidedCount === 0 ? null : playedCount / decidedCount;

  return {
    stages,
    total: stages.reduce((acc, st) => acc + st.count, 0),
    openValue: proposedValue + confirmedValue,
    openCount: proposedCount + confirmedCount,
    proposedCount,
    proposedValue,
    confirmedCount,
    confirmedValue,
    playedCount,
    cancelledCount,
    decidedCount,
    conversionRate,
  };
}

// ── Evolução do cachê (estou cobrando mais com o tempo?) ────────────────────
//
// Responde "meu cachê está subindo?": olha só os shows JÁ REALIZADOS (mesmo
// critério de `reconcileShowFees` — PLAYED, ou CONFIRMED com data passada) com
// cachê registrado (> 0) e agrega o cachê médio por mês, em ordem cronológica.
// É a evolução do PREÇO cobrado, não do lucro (P&L) — por isso usa só o `fee`
// do show (sem despesas vinculadas). Pura.

export interface FeeTrendMonth {
  /** Chave "YYYY-MM" do mês. */
  month: string;
  /** Nº de shows realizados com cachê no mês. */
  count: number;
  /** Soma dos cachês do mês (centavos). */
  totalFee: number;
  /** Cachê médio do mês = round(totalFee / count) (centavos). */
  avgFee: number;
  /** Menor cachê individual do mês (centavos). */
  minFee: number;
  /** Maior cachê individual do mês (centavos). */
  maxFee: number;
}

export interface FeeTrend {
  /** Meses com shows realizados, em ordem cronológica crescente. */
  months: FeeTrendMonth[];
  /** Nº total de shows realizados considerados (com cachê > 0). */
  totalShows: number;
  /** Soma de todos os cachês considerados (centavos). */
  totalFee: number;
  /** Cachê médio geral por show realizado = round(totalFee / totalShows). */
  avgFee: number;
  /** Maior cachê individual entre todos os shows considerados (0 se nenhum). */
  highestFee: number;
  /** Menor cachê individual entre todos os shows considerados (0 se nenhum). */
  lowestFee: number;
  /** Mês com maior média de cachê (empate → o mais recente); null se nenhum. */
  bestMonth: FeeTrendMonth | null;
  /** Mês com menor média de cachê (empate → o mais antigo); null se nenhum. */
  worstMonth: FeeTrendMonth | null;
  /**
   * Variação da média de cachê do mês mais recente vs. o primeiro mês com
   * shows — o "estou cobrando mais?". `null` com menos de 2 meses ativos (sem
   * dois pontos não há tendência). Reaproveita `computeDelta`.
   */
  trend: MetricDelta | null;
}

/**
 * Evolução do cachê médio dos shows realizados ao longo do tempo.
 *
 * - "Realizado" = `isHappenedGig` (PLAYED, ou CONFIRMED com data já passada);
 *   propostos, cancelados e shows futuros ficam de fora.
 * - Só shows com cachê registrado (`fee > 0`) entram: gigs sem cachê (0)
 *   distorceriam a média de "quanto cobro" (mesma postura de `reconcileShowFees`,
 *   que ignora `fee <= 0`).
 * - Agrupa por mês ("YYYY-MM") em ordem cronológica; `trend` compara o mês mais
 *   recente com o primeiro. Pura; `now` injetável para teste.
 */
export function feeTrend(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): FeeTrend {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const feesByMonth = new Map<string, number[]>();
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const key = monthKey(s.date);
    const list = feesByMonth.get(key);
    if (list) list.push(s.fee);
    else feesByMonth.set(key, [s.fee]);
  }

  const months: FeeTrendMonth[] = [...feesByMonth.keys()].sort().map((month) => {
    const fees = feesByMonth.get(month)!;
    const totalFee = sum(fees);
    return {
      month,
      count: fees.length,
      totalFee,
      avgFee: Math.round(totalFee / fees.length),
      minFee: Math.min(...fees),
      maxFee: Math.max(...fees),
    };
  });

  const totalShows = months.reduce((acc, m) => acc + m.count, 0);
  const totalFee = sum(months.map((m) => m.totalFee));
  const avgFee = totalShows > 0 ? Math.round(totalFee / totalShows) : 0;

  let bestMonth: FeeTrendMonth | null = null;
  let worstMonth: FeeTrendMonth | null = null;
  for (const m of months) {
    // `months` está em ordem crescente: no empate do melhor, `>=` mantém o mais
    // recente; no pior, `<` mantém o mais antigo.
    if (bestMonth == null || m.avgFee >= bestMonth.avgFee) bestMonth = m;
    if (worstMonth == null || m.avgFee < worstMonth.avgFee) worstMonth = m;
  }

  const trend =
    months.length >= 2
      ? computeDelta(months[months.length - 1].avgFee, months[0].avgFee)
      : null;

  return {
    months,
    totalShows,
    totalFee,
    avgFee,
    highestFee: totalShows > 0 ? Math.max(...months.map((m) => m.maxFee)) : 0,
    lowestFee: totalShows > 0 ? Math.min(...months.map((m) => m.minFee)) : 0,
    bestMonth,
    worstMonth,
    trend,
  };
}

// ── Distribuição de cachês por faixa de preço (em que faixa eu mais toco?) ───

export type FeeBandKey =
  | "lt500"
  | "500to1k"
  | "1kto2k"
  | "2kto3_5k"
  | "3_5kto5k"
  | "gte5k";

export interface FeeBandDef {
  key: FeeBandKey;
  /** Rótulo pt-BR da faixa, ex.: "R$ 1.000 – 2.000". */
  label: string;
  /** Limite inferior em centavos (inclusivo). */
  min: number;
  /** Limite superior em centavos (exclusivo); null = sem teto. */
  max: number | null;
}

/**
 * Faixas de cachê (centavos), do mais barato ao mais caro. Os limites são uma
 * referência do mercado indie pt-BR — hipótese de produto, não verdade absoluta
 * (ver DECISIONS.md D53). `min` inclusivo, `max` exclusivo: um cachê exatamente
 * no limite cai na faixa de cima (ex.: R$ 1.000 → "R$ 1.000 – 2.000").
 */
export const FEE_BANDS: readonly FeeBandDef[] = [
  { key: "lt500", label: "Até R$ 500", min: 0, max: 50_000 },
  { key: "500to1k", label: "R$ 500 – 1.000", min: 50_000, max: 100_000 },
  { key: "1kto2k", label: "R$ 1.000 – 2.000", min: 100_000, max: 200_000 },
  { key: "2kto3_5k", label: "R$ 2.000 – 3.500", min: 200_000, max: 350_000 },
  { key: "3_5kto5k", label: "R$ 3.500 – 5.000", min: 350_000, max: 500_000 },
  { key: "gte5k", label: "Acima de R$ 5.000", min: 500_000, max: null },
];

/** A faixa (`FeeBandKey`) em que um cachê (centavos) se encaixa. */
export function feeBandKeyFor(fee: number): FeeBandKey {
  for (const b of FEE_BANDS) {
    if (fee >= b.min && (b.max == null || fee < b.max)) return b.key;
  }
  // fee < 0 (não deve ocorrer; só cachês > 0 entram na distribuição).
  return FEE_BANDS[0].key;
}

export interface FeeBandStat extends FeeBandDef {
  /** Nº de shows realizados nessa faixa. */
  count: number;
  /** Soma dos cachês dessa faixa (centavos). */
  totalFee: number;
  /** Participação no nº de shows = count / totalShows (0..1). */
  countShare: number;
  /** Participação no faturamento = totalFee / faturamento total (0..1). */
  feeShare: number;
}

export interface FeeDistribution {
  /** Sempre as 6 faixas, na ordem de FEE_BANDS, inclusive as vazias. */
  bands: FeeBandStat[];
  /** Nº de shows realizados considerados (com cachê > 0). */
  totalShows: number;
  /** Soma de todos os cachês considerados (centavos). */
  totalFee: number;
  /** Cachê médio = round(totalFee / totalShows); 0 se nenhum. */
  avgFee: number;
  /**
   * Cachê mediano (centavos): metade dos shows cobra acima, metade abaixo.
   * Mais robusto que a média a um show fora da curva. 0 se nenhum.
   */
  medianFee: number;
  /** Faixa com mais shows (a "faixa típica"); null se nenhum. */
  modalBand: FeeBandStat | null;
  /** Faixa que concentra mais faturamento; null se nenhum. */
  topValueBand: FeeBandStat | null;
}

/**
 * Distribui os cachês dos shows já realizados pelas faixas de preço de
 * `FEE_BANDS`, respondendo "em que faixa de cachê eu mais toco e onde está o
 * meu faturamento?". Complementa `feeTrend` (que mede a evolução no tempo) com
 * o formato da distribuição num retrato único.
 *
 * - "Realizado" = `isHappenedGig` (PLAYED, ou CONFIRMED com data passada);
 *   propostos, cancelados e futuros ficam de fora (mesma postura de `feeTrend`).
 * - Só shows com cachê registrado (`fee > 0`) entram — gigs sem cachê não têm
 *   preço a classificar.
 * - `bands` traz sempre as 6 faixas (mesmo as zeradas) para o gráfico não pular.
 *   Pura; `now` injetável para teste.
 */
export function feeDistribution(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): FeeDistribution {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const feesByBand = new Map<FeeBandKey, number[]>();
  for (const b of FEE_BANDS) feesByBand.set(b.key, []);

  const allFees: number[] = [];
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    feesByBand.get(feeBandKeyFor(s.fee))!.push(s.fee);
    allFees.push(s.fee);
  }

  const totalShows = allFees.length;
  const totalFee = sum(allFees);

  const bands: FeeBandStat[] = FEE_BANDS.map((b) => {
    const fees = feesByBand.get(b.key)!;
    const bandTotal = sum(fees);
    return {
      ...b,
      count: fees.length,
      totalFee: bandTotal,
      countShare: totalShows > 0 ? fees.length / totalShows : 0,
      feeShare: totalFee > 0 ? bandTotal / totalFee : 0,
    };
  });

  // Candidatas: só faixas com shows. `bands` está em ordem crescente de preço;
  // no empate, `>=` no critério principal faz a faixa mais ALTA prevalecer.
  const active = bands.filter((b) => b.count > 0);
  const pick = (
    rank: (b: FeeBandStat) => number,
    tiebreak: (b: FeeBandStat) => number,
  ): FeeBandStat | null => {
    let best: FeeBandStat | null = null;
    for (const b of active) {
      if (
        best == null ||
        rank(b) > rank(best) ||
        (rank(b) === rank(best) && tiebreak(b) >= tiebreak(best))
      ) {
        best = b;
      }
    }
    return best;
  };

  return {
    bands,
    totalShows,
    totalFee,
    avgFee: totalShows > 0 ? Math.round(totalFee / totalShows) : 0,
    medianFee: median(allFees),
    modalBand: pick((b) => b.count, (b) => b.totalFee),
    topValueBand: pick((b) => b.totalFee, (b) => b.count),
  };
}

// ── Cadência de shows (estou tocando mais ou menos ao longo do tempo?) ───────
//
// Responde "minha agenda está mais cheia?": conta os shows JÁ REALIZADOS (mesmo
// critério de `feeTrend`/`reconcileShowFees` — PLAYED, ou CONFIRMED com data
// passada) por mês, em ordem cronológica. É a dimensão de VOLUME (quantos shows),
// complementar à `feeTrend` (preço) e à `feeDistribution` (formato dos cachês).
// Por isso conta TODOS os gigs realizados, inclusive os de cachê 0 (um show de
// graça para construir público continua sendo atividade), ao contrário de
// `feeTrend`, que ignora `fee <= 0`. Pura.

export interface GigCadenceMonth {
  /** Chave "YYYY-MM" do mês. */
  month: string;
  /** Nº de shows realizados no mês. */
  count: number;
}

export interface GigCadence {
  /** Meses com shows realizados, em ordem cronológica crescente. */
  months: GigCadenceMonth[];
  /** Nº total de shows realizados considerados. */
  totalShows: number;
  /** Nº de meses com ao menos um show (= months.length). */
  activeMonths: number;
  /**
   * Nº de meses do calendário do primeiro ao último mês com show, inclusive
   * (a "janela" da carreira observada). 0 se nenhum show.
   */
  spanMonths: number;
  /**
   * Meses sem nenhum show dentro da janela (`spanMonths − activeMonths`): o
   * tempo parado entre o primeiro e o último gig. 0 se a janela é contígua.
   */
  idleMonths: number;
  /**
   * Média de shows por mês ATIVO (totalShows / activeMonths), arredondada a 1
   * casa decimal. "Quando toco num mês, toco quantas vezes?". 0 se nenhum.
   */
  avgPerActiveMonth: number;
  /**
   * Média de shows por mês de calendário na janela (totalShows / spanMonths),
   * arredondada a 1 casa decimal — dilui os meses parados. 0 se nenhum.
   */
  avgPerMonth: number;
  /** Mês com mais shows (empate → o mais recente); null se nenhum. */
  busiestMonth: GigCadenceMonth | null;
  /** Mês ATIVO com menos shows (empate → o mais antigo); null se nenhum. */
  quietestMonth: GigCadenceMonth | null;
  /**
   * Variação da contagem do mês mais recente vs. o primeiro mês com shows — o
   * "estou tocando mais?". `null` com menos de 2 meses ativos. Reaproveita
   * `computeDelta`.
   */
  trend: MetricDelta | null;
}

/** Round a 1 casa decimal (evita ruído de ponto flutuante nos testes). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Nº de meses de calendário de "YYYY-MM" a "YYYY-MM", inclusive nas duas pontas. */
function monthSpan(firstKey: string, lastKey: string): number {
  const [fy, fm] = firstKey.split("-").map(Number);
  const [ly, lm] = lastKey.split("-").map(Number);
  return (ly - fy) * 12 + (lm - fm) + 1;
}

/**
 * Cadência (volume) dos shows realizados ao longo do tempo.
 *
 * - "Realizado" = `isHappenedGig` (PLAYED, ou CONFIRMED com data já passada);
 *   propostos, cancelados e shows futuros ficam de fora.
 * - Conta TODOS os gigs realizados, inclusive cachê 0 — o eixo aqui é atividade,
 *   não preço (distinto de `feeTrend`, que exige `fee > 0`).
 * - Agrupa por mês ("YYYY-MM") em ordem cronológica; `trend` compara a contagem
 *   do mês mais recente com a do primeiro. `spanMonths`/`idleMonths` medem o
 *   tempo parado entre o primeiro e o último gig. Pura; `now` injetável.
 */
export function gigCadence(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): GigCadence {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const countByMonth = new Map<string, number>();
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    const key = monthKey(s.date);
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }

  const months: GigCadenceMonth[] = [...countByMonth.keys()]
    .sort()
    .map((month) => ({ month, count: countByMonth.get(month)! }));

  const totalShows = months.reduce((acc, m) => acc + m.count, 0);
  const activeMonths = months.length;
  const spanMonths =
    activeMonths > 0 ? monthSpan(months[0].month, months[months.length - 1].month) : 0;
  const idleMonths = Math.max(0, spanMonths - activeMonths);

  let busiestMonth: GigCadenceMonth | null = null;
  let quietestMonth: GigCadenceMonth | null = null;
  for (const m of months) {
    // `months` em ordem crescente: no empate do mais cheio, `>=` mantém o mais
    // recente; no mais vazio, `<` mantém o mais antigo.
    if (busiestMonth == null || m.count >= busiestMonth.count) busiestMonth = m;
    if (quietestMonth == null || m.count < quietestMonth.count) quietestMonth = m;
  }

  const trend =
    activeMonths >= 2
      ? computeDelta(months[months.length - 1].count, months[0].count)
      : null;

  return {
    months,
    totalShows,
    activeMonths,
    spanMonths,
    idleMonths,
    avgPerActiveMonth: activeMonths > 0 ? round1(totalShows / activeMonths) : 0,
    avgPerMonth: spanMonths > 0 ? round1(totalShows / spanMonths) : 0,
    busiestMonth,
    quietestMonth,
    trend,
  };
}

// ── Desempenho por dia da semana (quais dias valem mais a pena?) ─────────────

/** Rótulos longos dos dias da semana, índice 0 = domingo .. 6 = sábado. */
export const WEEKDAY_LABELS: readonly string[] = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

/** Rótulos curtos dos dias da semana, índice 0 = domingo .. 6 = sábado. */
export const WEEKDAY_SHORT: readonly string[] = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export interface WeekdayStat {
  /** Dia da semana: 0 = domingo .. 6 = sábado (UTC). */
  weekday: number;
  /** Rótulo longo ("Domingo", "Segunda"…). */
  label: string;
  /** Nº de shows realizados nesse dia da semana. */
  count: number;
  /** Soma dos cachês nesse dia (centavos). */
  totalFee: number;
  /** Cachê médio nesse dia = round(totalFee / count); 0 se não houver shows. */
  avgFee: number;
  /** Participação no nº de shows = count / totalShows (0..1). */
  countShare: number;
  /** Participação no faturamento = totalFee / faturamento total (0..1). */
  feeShare: number;
}

export interface WeekdayPerformance {
  /** Sempre 7 entradas, de domingo (0) a sábado (6), inclusive dias sem shows. */
  days: WeekdayStat[];
  /** Nº total de shows realizados considerados (com cachê > 0). */
  totalShows: number;
  /** Soma de todos os cachês considerados (centavos). */
  totalFee: number;
  /** Cachê médio geral por show = round(totalFee / totalShows); 0 se nenhum. */
  avgFee: number;
  /** Dia com maior cachê médio (empate → maior nº de shows, depois dia mais cedo); null se nenhum. */
  bestByAvg: WeekdayStat | null;
  /** Dia com maior faturamento total (empate → maior nº de shows, depois dia mais cedo); null se nenhum. */
  bestByVolume: WeekdayStat | null;
  /** Dia com mais shows (empate → maior faturamento, depois dia mais cedo); null se nenhum. */
  busiest: WeekdayStat | null;
}

/**
 * Agrega os shows já realizados por dia da semana, respondendo
 * "quais dias valem mais a pena?" — onde o cachê médio é maior e onde
 * o faturamento se concentra.
 *
 * - "Realizado" = `isHappenedGig` (PLAYED, ou CONFIRMED com data já passada):
 *   propostos, cancelados e futuros ficam de fora (mesma postura de `feeTrend`).
 * - Só shows com cachê registrado (`fee > 0`) entram — gigs sem cachê
 *   distorceriam a média.
 * - O dia da semana é extraído em UTC (`getUTCDay`) para estabilidade nos testes.
 * - `days` traz sempre os 7 dias (domingo→sábado), mesmo os zerados, para o
 *   gráfico não "pular" dias. Pura; `now` injetável para teste.
 */
export function weekdayPerformance(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): WeekdayPerformance {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const feesByDay: number[][] = [[], [], [], [], [], [], []];
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const d = typeof s.date === "string" ? new Date(s.date) : s.date;
    feesByDay[d.getUTCDay()].push(s.fee);
  }

  const totalShows = feesByDay.reduce((acc, fees) => acc + fees.length, 0);
  const totalFee = feesByDay.reduce((acc, fees) => acc + sum(fees), 0);

  const days: WeekdayStat[] = feesByDay.map((fees, weekday) => {
    const dayTotal = sum(fees);
    return {
      weekday,
      label: WEEKDAY_LABELS[weekday],
      count: fees.length,
      totalFee: dayTotal,
      avgFee: fees.length > 0 ? Math.round(dayTotal / fees.length) : 0,
      countShare: totalShows > 0 ? fees.length / totalShows : 0,
      feeShare: totalFee > 0 ? dayTotal / totalFee : 0,
    };
  });

  // Candidatos a "melhor": apenas dias que de fato tiveram shows.
  const active = days.filter((d) => d.count > 0);

  // Empates resolvidos de forma determinística por `pick(rank, tiebreak)`.
  const pick = (
    rank: (d: WeekdayStat) => number,
    tiebreak: (d: WeekdayStat) => number,
  ): WeekdayStat | null => {
    let best: WeekdayStat | null = null;
    for (const d of active) {
      if (
        best == null ||
        rank(d) > rank(best) ||
        (rank(d) === rank(best) && tiebreak(d) > tiebreak(best))
      ) {
        best = d;
      }
    }
    return best;
  };

  return {
    days,
    totalShows,
    totalFee,
    avgFee: totalShows > 0 ? Math.round(totalFee / totalShows) : 0,
    bestByAvg: pick((d) => d.avgFee, (d) => d.count),
    bestByVolume: pick((d) => d.totalFee, (d) => d.count),
    busiest: pick((d) => d.count, (d) => d.totalFee),
  };
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
