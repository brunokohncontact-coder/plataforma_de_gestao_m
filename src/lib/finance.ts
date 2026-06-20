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
    // rows está ordenado do mais lento (avgDays maior) ao mais rápido.
    slowest: rows[0] ?? null,
    fastest: rows.length ? rows[rows.length - 1] : null,
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
