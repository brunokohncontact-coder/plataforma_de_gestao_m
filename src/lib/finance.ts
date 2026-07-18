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
  /**
   * Margem líquida AGREGADA do período (0..1): `totalNet / totalIncome`,
   * ponderada pela receita bruta (não é a média das margens por show — um show
   * grande pesa mais que um pequeno, que é a leitura honesta de "quanto de cada
   * real bruto sobrou"). 0 quando não há receita bruta, espelhando a convenção
   * de `computeShowPnL`. Pode ser negativa se as despesas superarem a receita.
   */
  totalMargin: number;
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
  const totalMargin = totalIncome === 0 ? 0 : totalNet / totalIncome;

  return {
    rows,
    count: rows.length,
    totalIncome,
    totalExpenses,
    totalNet,
    totalMargin,
    best: rows.length > 0 ? rows[0] : null,
    worst: rows.length > 0 ? rows[rows.length - 1] : null,
  };
}

/** Limiar relativo (10%) do veredito de rentabilidade por show ano a ano. */
export const SHOW_PROFIT_TREND_EPSILON = 0.1;
/** Piso absoluto (R$ 50) do mesmo veredito — evita oscilar em resultados pequenos. */
export const SHOW_PROFIT_TREND_FLOOR = 5000;

/** Resultado líquido MÉDIO por show (centavos, arredondado); 0 sem shows. */
function avgNetPerShow<S extends ShowLike>(report: ShowsProfitability<S>): number {
  return report.count > 0 ? Math.round(report.totalNet / report.count) : 0;
}

export interface ShowsProfitabilityComparison {
  /** Variação do resultado líquido MÉDIO por show (atual − anterior). Eixo do veredito. */
  avgNet: MetricDelta;
  /** Variação do resultado líquido SOMADO (atual − anterior). */
  totalNet: MetricDelta;
  /** Variação do nº de shows analisados (atual − anterior). */
  count: MetricDelta;
  /**
   * Veredito ancorado no resultado MÉDIO por show (robusto ao volume: mais shows
   * do mesmo nível não inflam o sinal, ao contrário do total somado). Exige as
   * duas condições — variação relativa ≥ `SHOW_PROFIT_TREND_EPSILON` **e** absoluta
   * ≥ `SHOW_PROFIT_TREND_FLOOR` — para não oscilar num resultado pequeno (onde 10%
   * é troco) nem num grande (onde R$ 50 é ruído). Aqui **subir** é a melhora.
   * - "up": o show típico rendeu mais que no ano anterior (progressão);
   * - "down": rendeu menos (atenção);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "up" | "down" | "stable";
}

/**
 * Compara a rentabilidade por show entre dois períodos (atual × anterior),
 * espelhando o comparativo ano a ano de `compareFeeDistribution`/
 * `compareBookingLeadTime` (D209/D187) no eixo do RESULTADO por gig. Pura, sem
 * I/O: recebe duas `rankShowsByProfit` já computadas (cada uma sobre os shows do
 * seu período) e devolve a variação do resultado médio/somado + a contagem, com
 * um veredito de tendência. Ancora o veredito no resultado **médio por show**
 * (não no total: um ano com o dobro de shows de mesmo nível somaria mais sem que
 * cada show ficasse mais rentável — a pergunta aqui é "o show típico paga mais?").
 * O chamador decide quando exibir (tipicamente só com um ano específico e ambos
 * os períodos tendo shows — caso contrário a média por show seria enganosa).
 */
export function compareShowsProfitability<S extends ShowLike>(
  current: ShowsProfitability<S>,
  previous: ShowsProfitability<S>,
): ShowsProfitabilityComparison {
  const avgNet = computeDelta(avgNetPerShow(current), avgNetPerShow(previous));
  const absOver = Math.abs(avgNet.delta) >= SHOW_PROFIT_TREND_FLOOR;
  const relOver =
    avgNet.previous !== 0
      ? Math.abs(avgNet.delta) / Math.abs(avgNet.previous) >= SHOW_PROFIT_TREND_EPSILON
      : avgNet.delta !== 0; // sem base anterior, qualquer variação já conta
  const material = absOver && relOver;
  return {
    avgNet,
    totalNet: computeDelta(current.totalNet, previous.totalNet),
    count: computeDelta(current.count, previous.count),
    trend: !material ? "stable" : avgNet.delta > 0 ? "up" : "down",
  };
}

// ── Distribuição de resultado por show (saúde da carteira de gigs) ───────────
//
// O ranking (`rankShowsByProfit`) responde "quais shows deram dinheiro"; esta
// leitura responde à pergunta de PORTFÓLIO: de todos os shows, quantos rodam no
// vermelho, quantos com margem magra e quantos com margem saudável — e quanto de
// R$ está em cada balde. É o histograma de saúde por gig, espelho de
// `feeDistribution` (que distribui pelo CACHÊ bruto), mas no eixo do RESULTADO
// LÍQUIDO (margem sobre a receita bruta). Ver DECISIONS.md D365.

/** Chave de cada faixa de resultado por show (do pior ao melhor). */
export type ShowResultBandKey = "loss" | "even" | "thin" | "healthy" | "high";

export interface ShowResultBandDef {
  key: ShowResultBandKey;
  /** Rótulo pt-BR curto (igual ao da tabela da tela). */
  label: string;
  /** Uma frase explicando o critério da faixa. */
  hint: string;
}

/**
 * Teto de margem líquida (15%) da faixa "magra": um show acima do zero mas com
 * ≤15% de margem rendeu quase nada depois dos custos. **Hipótese** — o piso do
 * que é "margem confortável" varia por circuito/custo fixo; validar com músicos
 * antes de virar premissa. Ver DECISIONS.md D365.
 */
export const THIN_MARGIN_MAX = 0.15;
/**
 * Teto de margem líquida (40%) da faixa "saudável"; acima disso é "margem alta".
 * **Hipótese** pelo mesmo motivo de `THIN_MARGIN_MAX`. Ver DECISIONS.md D365.
 */
export const HEALTHY_MARGIN_MAX = 0.4;

/** As faixas de resultado, do pior (prejuízo) ao melhor (margem alta). */
export const SHOW_RESULT_BANDS: readonly ShowResultBandDef[] = [
  { key: "loss", label: "Prejuízo", hint: "Resultado negativo — o show custou mais do que rendeu." },
  { key: "even", label: "Empatou", hint: "Resultado zerado — o cachê só cobriu as despesas." },
  {
    key: "thin",
    label: "Margem magra",
    hint: "Até 15% de margem líquida — sobrou pouco depois dos custos.",
  },
  {
    key: "healthy",
    label: "Margem saudável",
    hint: "De 15% a 40% de margem líquida.",
  },
  {
    key: "high",
    label: "Margem alta",
    hint: "Acima de 40% de margem líquida.",
  },
];

/**
 * Classifica um P&L de show na sua faixa de resultado. Só o sinal do `net` e a
 * `margin` importam; `net > 0` implica `grossIncome > 0` (então a margem é
 * sempre definida quando entra nas faixas "thin"/"healthy"/"high").
 */
export function showResultBandKeyFor(pnl: { net: number; margin: number }): ShowResultBandKey {
  if (pnl.net < 0) return "loss";
  if (pnl.net === 0) return "even";
  if (pnl.margin <= THIN_MARGIN_MAX) return "thin";
  if (pnl.margin <= HEALTHY_MARGIN_MAX) return "healthy";
  return "high";
}

export interface ShowResultBandStat extends ShowResultBandDef {
  /** Nº de shows nesta faixa. */
  count: number;
  /** Participação no total de shows (0..1); 0 sem shows. */
  share: number;
  /** Resultado líquido somado da faixa (centavos; ≤0 na faixa "loss"). */
  totalNet: number;
}

export interface ShowResultDistribution {
  /** Sempre as 5 faixas de `SHOW_RESULT_BANDS`, do pior ao melhor (inclui zeradas). */
  bands: ShowResultBandStat[];
  /** Total de shows analisados. */
  count: number;
  /** Resultado líquido somado de todos os shows (centavos). */
  totalNet: number;
  /** Nº de shows no vermelho (faixa "loss"). */
  lossCount: number;
  /** Fração no vermelho (0..1); 0 sem shows. */
  lossShare: number;
  /** Prejuízo somado dos shows no vermelho (centavos, ≤0). */
  lossNet: number;
}

/**
 * Destila a distribuição de resultado por show a partir de uma
 * `rankShowsByProfit` já computada (mesma fonte de verdade do P&L e da exclusão
 * de CANCELLED; o chamador filtra por período antes, como na página). Pura, sem
 * I/O. Devolve sempre as 5 faixas na ordem canônica (mesmo vazias, para o
 * histograma não pular degraus) + o recorte "no vermelho" já destacado (a
 * decisão acionável: quantos shows e quanto R$ estão dando prejuízo).
 */
export function showResultDistribution<S extends ShowLike>(
  report: ShowsProfitability<S>,
): ShowResultDistribution {
  const count = report.count;

  const bands: ShowResultBandStat[] = SHOW_RESULT_BANDS.map((def) => {
    const rows = report.rows.filter((r) => showResultBandKeyFor(r.pnl) === def.key);
    const bandCount = rows.length;
    return {
      ...def,
      count: bandCount,
      share: count === 0 ? 0 : bandCount / count,
      totalNet: sum(rows.map((r) => r.pnl.net)),
    };
  });

  const loss = bands.find((b) => b.key === "loss")!;

  return {
    bands,
    count,
    totalNet: report.totalNet,
    lossCount: loss.count,
    lossShare: loss.share,
    lossNet: loss.totalNet,
  };
}

// ── Comparativo ano a ano da distribuição de resultado (a carteira melhorou?) ─
//
// `showResultDistribution` (D365) fotografa a saúde da carteira de um período —
// quantos shows no vermelho, com margem magra ou saudável. A pergunta seguinte é
// de TENDÊNCIA: essa saúde melhorou ou piorou de um ano para o outro? O molde é o
// de `compareFeeDistribution` (D187) no eixo do CACHÊ, mas aqui o veredito ancora
// na fração de shows NO VERMELHO (`lossShare`), a métrica acionável da página (o
// callout "X de N shows deram prejuízo"): menos shows no prejuízo = carteira mais
// saudável. Ver DECISIONS.md D366.

/**
 * Variação mínima (em pontos 0..1) da fração no vermelho para o comparativo virar
 * veredito de tendência: 5 pontos percentuais. Abaixo disso a mudança é ruído de
 * amostra (um show a mais/menos no vermelho numa agenda pequena move a fração sem
 * significar tendência). Espelha a disciplina de limiar de `compareFeeDistribution`.
 * **Hipótese** pelo mesmo motivo dos limiares de faixa (`THIN_MARGIN_MAX`); validar
 * com músicos. Ver DECISIONS.md D366.
 */
export const LOSS_SHARE_TREND_EPSILON = 0.05;

/** Deslocamento de uma faixa de resultado entre dois períodos (nº de shows + participação). */
export interface ShowResultBandCountChange {
  key: ShowResultBandKey;
  /** Rótulo pt-BR da faixa (igual ao da tabela/histograma). */
  label: string;
  /** Nº de shows na faixa no período atual. */
  currentCount: number;
  /** Nº de shows na faixa no período anterior. */
  previousCount: number;
  /** Participação da faixa no total de shows do período atual (0..1). */
  currentShare: number;
  /** Participação no período anterior (0..1). */
  previousShare: number;
  /** Variação da participação (atual − anterior, em pontos 0..1). */
  shareDelta: number;
}

export interface ShowResultDistributionComparison {
  /** Distribuição do período atual (tipicamente o ano selecionado). */
  current: ShowResultDistribution;
  /** Distribuição do período de comparação (tipicamente o ano anterior). */
  previous: ShowResultDistribution;
  /**
   * Variação da fração no vermelho (atual − anterior, em pontos 0..1). **Negativo
   * = melhora** (uma fatia menor da carteira deu prejuízo); positivo = piora.
   */
  lossShareDelta: number;
  /** Variação do nº de shows no vermelho (atual − anterior). */
  lossCountDelta: number;
  /** Variação do prejuízo somado dos shows no vermelho (centavos; sinal livre). */
  lossNetDelta: number;
  /** Variação do resultado líquido somado de toda a carteira (centavos). */
  totalNetDelta: number;
  /**
   * Direção da saúde da carteira entre os dois períodos, ancorada na fração NO
   * VERMELHO (a decisão acionável), contra `LOSS_SHARE_TREND_EPSILON`:
   * - "improved": a fatia no vermelho CAIU além do limiar (menos shows no prejuízo);
   * - "worsened": SUBIU além do limiar (mais shows no prejuízo — atenção);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
  /**
   * Deslocamento faixa a faixa (sempre as 5 de `SHOW_RESULT_BANDS`, do prejuízo à
   * margem alta, inclusive as zeradas) — o detalhe por degrau que o CSV consome,
   * mostrando para ONDE a carteira migrou, complementando o resumo (fração no
   * vermelho / resultado somado).
   */
  bandChanges: ShowResultBandCountChange[];
}

/**
 * Compara a **distribuição de resultado por show** entre dois períodos (atual ×
 * anterior), espelhando `compareFeeDistribution` (D187) no eixo do RESULTADO
 * LÍQUIDO. Pura, sem I/O: recebe duas `showResultDistribution` já computadas (cada
 * uma sobre os shows do seu período) e devolve a variação da fração no vermelho /
 * do resultado somado + um veredito de tendência da saúde da carteira. Ancora o
 * veredito na fração NO VERMELHO (a mesma métrica que a página destaca no callout),
 * não numa média que um outlier distorce. O chamador decide quando exibir
 * (tipicamente só com um ano específico e ambos os períodos tendo shows — caso
 * contrário a fração de amostra vazia seria 0 e a comparação enganosa).
 */
export function compareShowResultDistribution(
  current: ShowResultDistribution,
  previous: ShowResultDistribution,
): ShowResultDistributionComparison {
  const lossShareDelta = current.lossShare - previous.lossShare;
  const material = Math.abs(lossShareDelta) >= LOSS_SHARE_TREND_EPSILON;

  // Deslocamento faixa a faixa: ambas as distribuições sempre trazem as 5 faixas
  // canônicas, então casa por chave (robusto à ordem) preservando a ordem de
  // `current.bands` (= ordem de SHOW_RESULT_BANDS). Faixa ausente conta como 0.
  const previousByKey = new Map(previous.bands.map((b) => [b.key, b]));
  const bandChanges: ShowResultBandCountChange[] = current.bands.map((cb) => {
    const pb = previousByKey.get(cb.key);
    const previousCount = pb ? pb.count : 0;
    const previousShare = pb ? pb.share : 0;
    return {
      key: cb.key,
      label: cb.label,
      currentCount: cb.count,
      previousCount,
      currentShare: cb.share,
      previousShare,
      shareDelta: cb.share - previousShare,
    };
  });

  return {
    current,
    previous,
    lossShareDelta,
    lossCountDelta: current.lossCount - previous.lossCount,
    lossNetDelta: current.lossNet - previous.lossNet,
    totalNetDelta: current.totalNet - previous.totalNet,
    // Aqui **descer** a fração no vermelho é a melhora.
    trend: !material ? "stable" : lossShareDelta < 0 ? "improved" : "worsened",
    bandChanges,
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
  /**
   * Cachê **mediano** por show no grupo (centavos): metade dos shows do local
   * cobra acima, metade abaixo. É o nível de preço **típico** do palco, robusto
   * a um único show fora da curva (um festival pontual que infla a média).
   * Complementa o cachê somado (`totalFee`) e a média implícita; a leitura só é
   * confiável com amostra suficiente — a UI a omite com poucos shows (ver D123/D124).
   */
  medianFee: number;
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

// ── Comparativo ano a ano por cidade (para onde a agenda migrou) ─────────────

/**
 * Variação de uma cidade entre dois períodos (tipicamente um ano × o anterior).
 * Espelha `WeekdayPerformanceDayChange`/`FeeBandShareChange` num eixo de praça:
 * carrega o nº de shows e o resultado (net) em cada período e os respectivos
 * deltas (atual − anterior; podem ser negativos). Uma cidade nova só neste ano
 * tem `previousCount`/`previousNet` = 0 (delta = valor atual); uma que sumiu tem
 * `currentCount`/`currentNet` = 0 (delta negativo).
 */
export interface CityProfitChange {
  /** Chave normalizada da cidade (sem acento, minúscula); "" = "Sem cidade". */
  key: string;
  /** Nome de exibição da cidade (grafia do período que a contém). */
  name: string;
  /** Nº de shows na cidade no período atual. */
  currentCount: number;
  /** Nº de shows na cidade no período anterior. */
  previousCount: number;
  /** Variação do nº de shows (atual − anterior); pode ser negativa. */
  countDelta: number;
  /** Resultado (net) da cidade no período atual (centavos). */
  currentNet: number;
  /** Resultado (net) da cidade no período anterior (centavos). */
  previousNet: number;
  /** Variação do resultado (atual − anterior, centavos); pode ser negativa. */
  netDelta: number;
}

/**
 * Compara a **atuação por cidade** entre dois períodos, casando as praças por
 * chave normalizada, respondendo "para onde a agenda migrou — em que cidades
 * passei a tocar mais/menos do que no ano passado?". Espelho de
 * `compareFeeDistribution().bandChanges` (D292) e dos movers de
 * `compareWeekdayPerformance` (D46), mas sobre um conjunto **aberto** de cidades
 * (ao contrário dos 7 dias / 6 faixas fixos): percorre primeiro as cidades do
 * período atual — preservando a ordem do relatório atual (resultado desc) — e
 * depois anexa as que existiam no anterior e sumiram (delta negativo). Puro, sem
 * I/O: recebe dois `rankCitiesByProfit` já computados (cada um sobre os shows do
 * seu período). O chamador decide quando exibir (tipicamente só com um ano
 * específico e o ano anterior tendo shows).
 */
export function compareCitiesByProfit(
  current: CitiesProfitability,
  previous: CitiesProfitability,
): CityProfitChange[] {
  const prevByKey = new Map(previous.rows.map((r) => [r.key, r]));
  const changes: CityProfitChange[] = [];
  const seen = new Set<string>();

  // Cidades do período atual, na ordem do relatório atual (resultado desc).
  for (const cur of current.rows) {
    seen.add(cur.key);
    const prev = prevByKey.get(cur.key);
    changes.push({
      key: cur.key,
      name: cur.name,
      currentCount: cur.showCount,
      previousCount: prev?.showCount ?? 0,
      countDelta: cur.showCount - (prev?.showCount ?? 0),
      currentNet: cur.totalNet,
      previousNet: prev?.totalNet ?? 0,
      netDelta: cur.totalNet - (prev?.totalNet ?? 0),
    });
  }

  // Cidades que existiam no período anterior e sumiram neste (delta negativo).
  for (const prev of previous.rows) {
    if (seen.has(prev.key)) continue;
    changes.push({
      key: prev.key,
      name: prev.name,
      currentCount: 0,
      previousCount: prev.showCount,
      countDelta: -prev.showCount,
      currentNet: 0,
      previousNet: prev.totalNet,
      netDelta: -prev.totalNet,
    });
  }

  return changes;
}

/**
 * Índice O(1) por chave de cidade sobre a saída de `compareCitiesByProfit`, para
 * casar cada linha da tabela/CSV com sua variação sem varredura. Espelha
 * `indexFeeBandShareChanges` (D292). Chaves repetidas não ocorrem (uma linha por
 * cidade em cada período); em caso de duplicata, a última prevalece.
 */
export function indexCityProfitChanges(
  changes: CityProfitChange[],
): Map<string, CityProfitChange> {
  const map = new Map<string, CityProfitChange>();
  for (const c of changes) map.set(c.key, c);
  return map;
}

/** Os dois maiores movimentos de agenda entre cidades (ganho/perda de shows). */
export interface CityProfitMovers {
  /**
   * Cidade que mais GANHOU shows (maior `countDelta > 0`; empate → maior
   * `netDelta`, depois a ordem do relatório atual — resultado desc); null se
   * nenhuma cidade subiu.
   */
  biggestGain: CityProfitChange | null;
  /**
   * Cidade que mais PERDEU shows (menor `countDelta < 0`; empate → menor
   * `netDelta`, depois a ordem do relatório atual); null se nenhuma caiu.
   */
  biggestDrop: CityProfitChange | null;
}

/**
 * Destila de `compareCitiesByProfit` os dois **movers** — a cidade que mais
 * cresceu e a que mais caiu em nº de shows — respondendo, num relance, "para
 * onde a agenda migrou de um ano para o outro?". Espelho fiel dos movers de
 * `compareWeekdayPerformance` (D46), mas sobre o conjunto **aberto** de cidades:
 * em vez de despejar a tabela inteira, aponta o maior ganho e a maior perda,
 * mantendo o card enxuto (a tabela detalha o resto). Puro, sem I/O: recebe a
 * lista já casada por `compareCitiesByProfit`.
 *
 * Ancora no **nº de shows** (`countDelta`, o eixo primário da página), com o
 * `netDelta` como desempate — uma cidade que trocou um show barato por um caro,
 * mesmo com contagem empatada, vence. A "Sem cidade" (`key === ""`) fica de fora
 * dos movers: é um balde de shows sem praça informada, não um destino para onde
 * a agenda "migrou" — poluiria a leitura (segue na tabela e na coluna por linha).
 * Como a lista já vem na ordem do relatório atual (resultado desc, sumidas ao
 * final), o desempate estrito faz a primeira da lista vencer empates — mesma
 * disciplina determinística dos movers irmãos.
 */
export function cityProfitMovers(changes: CityProfitChange[]): CityProfitMovers {
  let biggestGain: CityProfitChange | null = null;
  let biggestDrop: CityProfitChange | null = null;
  for (const c of changes) {
    if (c.key === "") continue; // "Sem cidade" não é destino de migração.
    if (c.countDelta > 0) {
      if (
        biggestGain == null ||
        c.countDelta > biggestGain.countDelta ||
        (c.countDelta === biggestGain.countDelta && c.netDelta > biggestGain.netDelta)
      ) {
        biggestGain = c;
      }
    }
    if (c.countDelta < 0) {
      if (
        biggestDrop == null ||
        c.countDelta < biggestDrop.countDelta ||
        (c.countDelta === biggestDrop.countDelta && c.netDelta < biggestDrop.netDelta)
      ) {
        biggestDrop = c;
      }
    }
  }
  return { biggestGain, biggestDrop };
}

/** Direção da variação de uma cidade no comparativo (para CSV/UI). */
export type CityProfitTrend = "up" | "down" | "flat";

/**
 * Classifica a variação de uma cidade entre dois períodos numa tendência
 * (subiu / caiu / estável), na MESMA disciplina dos movers (`cityProfitMovers`)
 * e do irmão `classifyGigSeasonalityMonthChange`: ancora no nº de shows
 * (`countDelta`), com o resultado (`netDelta`) como desempate quando a contagem
 * não muda — uma cidade que trocou um show barato por um caro conta como
 * "subiu". Pura. Serve à coluna "Tendência" do CSV do comparativo por cidade.
 */
export function classifyCityProfitChange(change: CityProfitChange): CityProfitTrend {
  if (change.countDelta > 0) return "up";
  if (change.countDelta < 0) return "down";
  if (change.netDelta > 0) return "up";
  if (change.netDelta < 0) return "down";
  return "flat";
}

// ── Comparativo ano a ano por local (mesmo motor, eixo de casa/palco) ─────────
//
// O comparativo de rentabilidade opera sobre `CitiesProfitability`, que é um
// alias de `VenuesProfitability` (`rankCitiesByProfit` é um rollup acima de
// `rankVenuesByProfit`, mesma forma de linha). Como o motor puro
// (`compareCitiesByProfit`/`indexCityProfitChanges`/`cityProfitMovers`) é, na
// prática, genérico sobre qualquer ranking de rentabilidade agregado, a tela de
// rentabilidade por local (`/shows/locais`) reaproveita exatamente a mesma
// lógica sob nomes de eixo-casa — espelhando como o repo já aliasa os tipos
// (`CityProfitRow = VenueProfitRow`). O prefixo "City" nas funções é histórico
// (a comparação nasceu na tela de cidades, D297/D298); os aliases abaixo evitam
// que a tela de locais importe helpers de nome "cidade". A "Sem local"
// (`key === ""`) já fica de fora dos movers pela mesma regra da "Sem cidade".

/** Variação de um local entre dois períodos (alias de `CityProfitChange`). */
export type VenueProfitChange = CityProfitChange;

/** Os dois maiores movers por local (alias de `CityProfitMovers`). */
export type VenueProfitMovers = CityProfitMovers;

/** Compara a rentabilidade por local entre dois períodos (mesmo motor de cidades). */
export const compareVenuesByProfit = compareCitiesByProfit;

/** Índice O(1) por chave de local sobre a saída de `compareVenuesByProfit`. */
export const indexVenueProfitChanges = indexCityProfitChanges;

/** Destila os dois movers por local (maior ganho / maior perda de shows). */
export const venueProfitMovers = cityProfitMovers;

/** Classifica a variação de um local numa tendência (alias de `classifyCityProfitChange`). */
export const classifyVenueProfitChange = classifyCityProfitChange;

// ── Concentração geográfica (risco de depender de poucas cidades) ────────────

export interface GeoShareSlice {
  /** Chave normalizada da cidade (nunca vazia — "sem cidade" é excluída). */
  key: string;
  /** Nome de exibição da cidade (grafia original do agrupamento). */
  name: string;
  /** Receita bruta da cidade = cachê + extras (centavos). */
  revenue: number;
  /** Participação na receita total das cidades identificadas (0..1). */
  share: number;
}

export interface GeoConcentration {
  /** Cidades por receita decrescente (empate por nome pt-BR, depois chave). */
  places: GeoShareSlice[];
  /** Receita somada das cidades identificadas (centavos). */
  total: number;
  /** Nº de cidades identificadas com receita > 0. */
  placeCount: number;
  /** Maior cidade por receita, ou null se não há receita. */
  top: GeoShareSlice | null;
  /** Participação da maior cidade (0..1). */
  topShare: number;
  /** Participação acumulada das 3 maiores cidades (0..1). */
  top3Share: number;
  /**
   * Índice de Herfindahl–Hirschman (HHI): soma dos quadrados das participações
   * (0..1). 1 = uma única cidade; quanto menor, mais espalhada a atuação.
   */
  hhi: number;
  /** Nº efetivo de cidades (1/HHI, índice de Simpson); 0 se não há receita. */
  effectivePlaces: number;
  /** Veredito de concentração (mesmos limiares de `incomeMix`, ver D45). */
  level: DiversificationLevel;
}

/**
 * Deriva a **concentração geográfica** a partir das linhas de `rankCitiesByProfit`:
 * mede o risco de a carreira depender de poucas cidades. Considera só cidades
 * **identificadas** (descarta o grupo "Sem cidade", chave "") com receita bruta
 * positiva (cachê + extras); usa a receita bruta — não o líquido, que pode ser
 * negativo. Reaproveita os mesmos limiares de diversificação de `incomeMix` /
 * `clientConcentration` (`diversificationLevel`). Pura, espelha `clientConcentration`
 * (D109) num eixo geográfico em vez de por contratante.
 */
export function geoConcentration(rows: VenueProfitRow[]): GeoConcentration {
  const placesRaw = rows
    .filter((r) => r.key !== "")
    .map((r) => ({ key: r.key, name: r.name, revenue: r.totalFee + r.totalExtra }))
    .filter((p) => p.revenue > 0);

  const total = placesRaw.reduce((acc, p) => acc + p.revenue, 0);

  const places: GeoShareSlice[] = placesRaw
    .map((p) => ({
      ...p,
      share: total === 0 ? 0 : p.revenue / total,
    }))
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        a.name.localeCompare(b.name, "pt-BR") ||
        a.key.localeCompare(b.key),
    );

  const hhi = places.reduce((acc, p) => acc + p.share * p.share, 0);
  const top3Share = places.slice(0, 3).reduce((acc, p) => acc + p.share, 0);

  return {
    places,
    total,
    placeCount: places.length,
    top: places[0] ?? null,
    topShare: places[0]?.share ?? 0,
    top3Share,
    hhi,
    effectivePlaces: hhi === 0 ? 0 : 1 / hhi,
    level: diversificationLevel(hhi, places.length),
  };
}

export interface GeoConcentrationHeadline {
  /**
   * Deve aparecer no Painel? Só quando a atuação está **concentrada**
   * (veredito `concentrated`) — uma única praça ou poucas dominando a receita.
   * Com `moderate`/`diversified` o aviso seria ruído, não alerta (mesma
   * disciplina de `clientConcentrationHeadline`/`cashBurnHeadline`: o nudge só
   * surge quando o veredito morde).
   */
  show: boolean;
  /**
   * Caso extremo: **uma única** cidade responde por toda a receita, ou a maior
   * praça sozinha carrega ≥ 2/3 dela. Permite ao Painel subir o tom (🔴 vs 🟠).
   */
  critical: boolean;
  /** Participação da maior cidade na receita bruta (0..1). */
  topShare: number;
  /** Maior cidade (chave/nome/receita/participação), ou null se não há receita. */
  top: GeoShareSlice | null;
  /** Nº de cidades identificadas com receita bruta positiva. */
  placeCount: number;
  /** Veredito completo de concentração (para quem quiser o detalhe). */
  level: DiversificationLevel;
}

/**
 * Resumo de Painel da **concentração geográfica**: deriva, de uma
 * `geoConcentration` já computada, se o nudge de risco de depender de poucas
 * praças deve aparecer e com que urgência. Pura, sem I/O — análogo geográfico
 * de `clientConcentrationHeadline` (D110): a regra de exibição vive aqui, o
 * dashboard só consome. Só dispara quando a atuação está de fato concentrada
 * (`concentrated`), para não nagar quem já abriu praças; o caso `critical`
 * (cidade única ou uma dominante ≥ 2/3) merece o tom mais forte.
 */
export function geoConcentrationHeadline(
  concentration: GeoConcentration,
): GeoConcentrationHeadline {
  const show =
    concentration.level === "concentrated" && concentration.placeCount > 0;
  const critical =
    show && (concentration.placeCount === 1 || concentration.topShare >= 2 / 3);
  return {
    show,
    critical,
    topShare: concentration.topShare,
    top: concentration.top,
    placeCount: concentration.placeCount,
    level: concentration.level,
  };
}

/**
 * Limiar (em pontos de participação, 0..1) abaixo do qual a variação da
 * concentração geográfica entre dois períodos é tratada como ruído ("stable").
 * 5 pontos de `topShare` — pequeno o bastante para captar uma mudança real de
 * dependência, grande o bastante para não oscilar a cada show isolado.
 */
export const GEO_TREND_EPSILON = 0.05;

export interface GeoConcentrationComparison {
  /** Concentração do período atual (tipicamente o ano selecionado). */
  current: GeoConcentration;
  /** Concentração do período de comparação (tipicamente o ano anterior). */
  previous: GeoConcentration;
  /**
   * Variação da participação da maior praça (atual − anterior, em pontos -1..1).
   * Positivo = a maior praça pesa **mais** agora (atuação mais concentrada).
   */
  topShareDelta: number;
  /**
   * Variação do nº de cidades efetivas (atual − anterior, índice de Simpson).
   * Positivo = atuação **mais espalhada** agora (mais diversificada).
   */
  effectivePlacesDelta: number;
  /**
   * Direção do **risco de concentração** entre os dois períodos, decidida pela
   * variação de `topShare` (a leitura-manchete) contra `GEO_TREND_EPSILON`:
   * - "improved": menos concentrado agora (a maior praça encolheu além do limiar);
   * - "worsened": mais concentrado agora (a maior praça cresceu além do limiar);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **concentração geográfica** entre dois períodos (atual × anterior),
 * espelhando o comparativo ano a ano de `computeDelta`/D33 num eixo de risco de
 * praça. Pura, sem I/O: recebe duas `geoConcentration` já computadas (cada uma
 * sobre as linhas de `rankCitiesByProfit` do seu período) e devolve as variações
 * de `topShare` e de cidades efetivas, além de um veredito de tendência. O
 * chamador decide quando exibir (tipicamente só com um ano específico
 * selecionado e o ano anterior tendo receita — caso contrário a leitura é
 * enganosa).
 */
export function compareGeoConcentration(
  current: GeoConcentration,
  previous: GeoConcentration,
): GeoConcentrationComparison {
  const topShareDelta = current.topShare - previous.topShare;
  const effectivePlacesDelta = current.effectivePlaces - previous.effectivePlaces;

  return {
    current,
    previous,
    topShareDelta,
    effectivePlacesDelta,
    trend: concentrationTrend(topShareDelta),
  };
}

/**
 * Veredito de tendência da concentração entre dois períodos a partir da variação
 * da participação da maior fatia (a leitura-manchete), contra `GEO_TREND_EPSILON`:
 * - "improved": menos concentrado agora (a maior fatia encolheu além do limiar);
 * - "worsened": mais concentrado agora (a maior fatia cresceu além do limiar);
 * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
 * Compartilhado por `compareGeoConcentration` (eixo de praça) e
 * `compareClientConcentration` (eixo de cliente) — a regra é a mesma, só o eixo
 * muda. Pura.
 */
function concentrationTrend(
  topShareDelta: number,
): GeoConcentrationComparison["trend"] {
  if (topShareDelta <= -GEO_TREND_EPSILON) return "improved";
  if (topShareDelta >= GEO_TREND_EPSILON) return "worsened";
  return "stable";
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
    /** Cachês individuais do grupo, para o cachê mediano (robusto a outlier). */
    fees: number[];
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
        fees: [],
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
    acc.fees.push(pnl.fee);

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
      medianFee: median(acc.fees),
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

// ── Praças para revisitar (reengajamento geográfico) ────────────────────────
// Análogo geográfico de `findContactsToReengage` (contacts.ts): responde "em
// quais cidades eu já toquei mas parei de voltar?". Parte das cidades com shows
// não cancelados no passado, sem nada agendado adiante e há tempo sem tocar —
// as praças "frias" para planejar um retorno / reprospecção. Distinta da
// concentração geográfica (risco de fatia) e da rentabilidade por cidade (P&L):
// aqui o eixo é a RECÊNCIA da agenda, não o dinheiro. Ver DECISIONS.md.

/** Forma mínima de show para o reengajamento por cidade (precisa da data). */
export interface CityReengageShowLike {
  status?: string;
  city?: string | null;
  date: Date | string;
  /** Cachê em centavos — soma o valor histórico da praça (desempate de ordenação). */
  fee: number;
}

export interface CityReengageRow {
  /** Chave normalizada da cidade (nunca vazia — "sem cidade" é ignorada). */
  key: string;
  /** Nome de exibição (grafia original mais frequente da cidade). */
  name: string;
  /** Show não cancelado mais recente (sempre no passado para uma linha incluída). */
  lastShowDate: Date;
  /** Dias inteiros (UTC) desde o último show até `now`. */
  daysSinceLastShow: number;
  /** Nº de shows não cancelados já realizados (passados) na cidade. */
  pastShows: number;
  /** Cachê somado dos shows não cancelados na cidade (centavos) — valor da praça. */
  totalFee: number;
}

export interface CityReengageList {
  rows: CityReengageRow[];
  count: number;
  /** Limite de dias sem tocar para a praça ser considerada fria. */
  staleDays: number;
}

export interface CityReengageOptions {
  now?: Date;
  /** Dias sem show para a praça ser considerada fria (padrão 90). */
  staleDays?: number;
}

/** Dias sem tocar (padrão) para considerar uma praça fria — ~1 temporada. */
export const CITY_REENGAGE_STALE_DAYS = 90;

// ── Janela `?dias=` das telas de reengajamento (praças/casas) ────────────────
// O limiar de dormência (`staleDays`) era fixo em 90 (uma hipótese sinalizada
// nos bloqueios): o que conta como "esfriou" varia com o perfil do músico —
// quem gira uma agenda intensa quer um alarme mais curto; quem toca esporádico,
// mais longo. Espelha `parseWeekendWindow`/`?semanas=` (shows.ts) no eixo dias.
// Compartilhado pelas duas telas de reengajamento (cidade e casa), que já têm o
// mesmo `staleDays` default e delegam ao mesmo núcleo `collectPlacesToReengage`.

/** Presets (em dias) oferecidos no seletor das telas de reengajamento. */
export const REENGAGE_WINDOW_PRESETS = [60, 90, 180, 365] as const;
/** Janela padrão — a mesma temporada dos helpers (`CITY_REENGAGE_STALE_DAYS`). */
export const REENGAGE_WINDOW_DEFAULT = CITY_REENGAGE_STALE_DAYS;
/** Limites duros da janela (1 dia … ~2 anos). */
export const REENGAGE_WINDOW_MIN = 1;
export const REENGAGE_WINDOW_MAX = 730;

/**
 * Lê o parâmetro `?dias=` e devolve um limiar de dormência válido — um inteiro
 * dentro de [REENGAGE_WINDOW_MIN, REENGAGE_WINDOW_MAX]. Valor ausente, vazio ou
 * não numérico cai no `fallback`; fora da faixa é grampeado nos limites. Pura
 * (espelho byte a byte de `parseWeekendWindow`, no eixo de dias).
 */
export function parseReengageWindow(
  raw: string | string[] | undefined,
  fallback: number = REENGAGE_WINDOW_DEFAULT,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < REENGAGE_WINDOW_MIN) return REENGAGE_WINDOW_MIN;
  if (i > REENGAGE_WINDOW_MAX) return REENGAGE_WINDOW_MAX;
  return i;
}

/** Forma mínima que o núcleo de reengajamento por lugar consome. */
interface PlaceReengageShowLike {
  status?: string;
  date: Date | string;
  fee: number;
}

/**
 * Núcleo compartilhado de "lugares dormentes que valem um retorno" — usado tanto
 * pela cidade (`findCitiesToReengage`) quanto pela casa/venue
 * (`findVenuesToReengage`); o único eixo que varia é qual campo do show identifica
 * o lugar (`getPlace`). Inclui um lugar quando:
 * - tem ao menos um show não cancelado no passado (`date < now`);
 * - não tem nenhum show não cancelado futuro (`date >= now`) — nada agendado;
 * - o último show não cancelado é há `>= staleDays` dias.
 *
 * Shows sem lugar (chave normalizada vazia) são ignorados. Agrupa pela chave
 * normalizada (sem acento/caixa/trim, mesma convenção de `rankVenuesByProfit`/
 * `rankCitiesByProfit`) e exibe a grafia original mais frequente. Ordena pelos
 * mais esquecidos primeiro (maior `daysSinceLastShow`), desempatando pelo maior
 * cachê acumulado, depois nome (pt-BR) e chave — estável e determinística. Shows
 * `CANCELLED` são ignorados em tudo. Pura; `now`/`staleDays` injetáveis.
 */
function collectPlacesToReengage<S extends PlaceReengageShowLike>(
  shows: S[],
  getPlace: (show: S) => string | null | undefined,
  now: Date,
  staleDays: number,
): CityReengageRow[] {
  const nowTime = now.getTime();
  const nowMidnight = utcMidnight(now);

  interface Acc {
    key: string;
    pastShows: number;
    totalFee: number;
    lastTime: number;
    hasUpcoming: boolean;
    labels: Map<string, { count: number; order: number }>;
  }

  const groups = new Map<string, Acc>();

  for (const show of shows) {
    if (show.status === "CANCELLED") continue;
    const rawPlace = (getPlace(show) ?? "").trim();
    const key = normalizeText(rawPlace);
    if (key === "") continue; // sem lugar → não há praça a revisitar

    let acc = groups.get(key);
    if (!acc) {
      acc = { key, pastShows: 0, totalFee: 0, lastTime: -Infinity, hasUpcoming: false, labels: new Map() };
      groups.set(key, acc);
    }

    acc.totalFee += show.fee;
    const seen = acc.labels.get(rawPlace);
    if (seen) seen.count += 1;
    else acc.labels.set(rawPlace, { count: 1, order: acc.labels.size });

    const d = typeof show.date === "string" ? new Date(show.date) : show.date;
    const t = d.getTime();
    if (t >= nowTime) {
      acc.hasUpcoming = true;
    } else {
      acc.pastShows += 1;
      if (t > acc.lastTime) acc.lastTime = t;
    }
  }

  const rows: CityReengageRow[] = [];
  for (const acc of groups.values()) {
    // Precisa de histórico passado e nada agendado adiante.
    if (acc.hasUpcoming || acc.pastShows === 0) continue;
    const lastShowDate = new Date(acc.lastTime);
    const daysSinceLastShow = Math.floor((nowMidnight - utcMidnight(lastShowDate)) / DAY_MS);
    if (daysSinceLastShow < staleDays) continue;
    rows.push({
      key: acc.key,
      name: pickLabel(acc.labels, acc.key),
      lastShowDate,
      daysSinceLastShow,
      pastShows: acc.pastShows,
      totalFee: acc.totalFee,
    });
  }

  rows.sort((a, b) => {
    if (b.daysSinceLastShow !== a.daysSinceLastShow) {
      return b.daysSinceLastShow - a.daysSinceLastShow;
    }
    if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee;
    const byName = a.name.localeCompare(b.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.key.localeCompare(b.key);
  });

  return rows;
}

/**
 * Lista as **cidades dormentes** que valem um retorno. Inclui uma cidade quando:
 * - tem ao menos um show não cancelado no passado (`date < now`);
 * - não tem nenhum show não cancelado futuro (`date >= now`) — nada agendado;
 * - o último show não cancelado é há `>= staleDays` dias (padrão 90).
 *
 * Shows sem cidade (chave normalizada vazia) são ignorados — não há praça a
 * revisitar. Agrupa por cidade normalizada (sem acento/caixa/trim, mesma
 * convenção de `rankCitiesByProfit`) e exibe a grafia original mais frequente.
 * Ordena pelas mais esquecidas primeiro (maior `daysSinceLastShow`), desempatando
 * pelo maior cachê acumulado (praças mais valiosas), depois nome (pt-BR) e chave —
 * estável e determinística. Shows `CANCELLED` são ignorados em tudo. Pura;
 * `now`/`staleDays` injetáveis para testes. Delega ao núcleo compartilhado
 * `collectPlacesToReengage` (eixo cidade).
 */
export function findCitiesToReengage(
  shows: CityReengageShowLike[],
  opts: CityReengageOptions = {},
): CityReengageList {
  const now = opts.now ?? new Date();
  const staleDays = Math.max(0, opts.staleDays ?? CITY_REENGAGE_STALE_DAYS);
  const rows = collectPlacesToReengage(shows, (s) => s.city, now, staleDays);
  return { rows, count: rows.length, staleDays };
}

// ── Nudge do Painel: praça esquecida que vale um retorno ─────────────────────
// Manchete acionável para o dashboard, no mesmo espírito de `gigSeasonalityHeadline`
// (D134) / `geoConcentrationHeadline` (D114): a `findCitiesToReengage` já entrega a
// LISTA ordenada de praças frias; aqui destilamos a UMA praça que merece o toque
// agora. Disciplina anti-ruído: exige um TRACK RECORD (≥ `minPastShows` shows já
// tocados na cidade) — uma cidade onde toquei UMA vez há 90 dias é um evento, não
// uma relação a reacender; sem o filtro, o nudge dispararia por qualquer bolo solto.

export interface CitiesToReengageHeadline {
  /** Se o nudge deve aparecer no Painel. */
  show: boolean;
  /** A praça mais esquecida COM histórico suficiente (a mais forte para revisitar). */
  city: CityReengageRow | null;
  /** Total de praças frias na lista (para o texto "e mais N"). */
  total: number;
  /** Limite de dias sem tocar herdado da lista (contexto). */
  staleDays: number;
}

/**
 * Mínimo de shows passados na cidade para o nudge do Painel dispará-la — filtra
 * praças de "passagem única" (um show avulso), deixando só relações com lastro.
 */
export const REENGAGE_HEADLINE_MIN_PAST_SHOWS = 2;

/**
 * Destila da lista de praças frias (`findCitiesToReengage`) a UMA praça a revisitar
 * no Painel: a mais esquecida (a lista já vem ordenada por `daysSinceLastShow`) que
 * tenha ao menos `minPastShows` shows passados — uma relação com lastro, não um show
 * avulso. Sem candidata qualificada → `show: false`. Pura; espelha a disciplina de
 * `gigSeasonalityHeadline`/`geoConcentrationHeadline` (a regra de exibição vive aqui,
 * o dashboard só lê `.show`). Ver DECISIONS.md.
 */
export function citiesToReengageHeadline(
  list: CityReengageList,
  minPastShows: number = REENGAGE_HEADLINE_MIN_PAST_SHOWS,
): CitiesToReengageHeadline {
  const threshold = Math.max(1, minPastShows);
  const city = list.rows.find((r) => r.pastShows >= threshold) ?? null;
  return {
    show: city !== null,
    city,
    total: list.count,
    staleDays: list.staleDays,
  };
}

// ── Casas/venues para revisitar (recência da agenda por local) ──────────────
// Espelho de `findCitiesToReengage` um nível abaixo na hierarquia geográfica: em
// vez de "que cidades esfriaram?", responde "que CASAS (venues) esfriaram?". Uma
// cidade quente pode esconder um bar antigo onde você não toca há uma temporada;
// aqui o eixo é a mesma RECÊNCIA da agenda, mas por palco. Compartilha o núcleo
// puro `collectPlacesToReengage` (só muda o campo: `venue` em vez de `city`).

/** Forma mínima de show para o reengajamento por casa/venue (precisa da data). */
export interface VenueReengageShowLike {
  status?: string;
  venue?: string | null;
  date: Date | string;
  /** Cachê em centavos — soma o valor histórico da casa (desempate de ordenação). */
  fee: number;
}

export interface VenueReengageRow {
  /** Chave normalizada da casa (nunca vazia — "sem local" é ignorado). */
  key: string;
  /** Nome de exibição (grafia original mais frequente da casa). */
  name: string;
  /** Show não cancelado mais recente (sempre no passado para uma linha incluída). */
  lastShowDate: Date;
  /** Dias inteiros (UTC) desde o último show até `now`. */
  daysSinceLastShow: number;
  /** Nº de shows não cancelados já realizados (passados) na casa. */
  pastShows: number;
  /** Cachê somado dos shows não cancelados na casa (centavos) — valor do palco. */
  totalFee: number;
}

export interface VenueReengageList {
  rows: VenueReengageRow[];
  count: number;
  /** Limite de dias sem tocar para a casa ser considerada fria. */
  staleDays: number;
}

export interface VenueReengageOptions {
  now?: Date;
  /** Dias sem show para a casa ser considerada fria (padrão 90). */
  staleDays?: number;
}

/** Dias sem tocar (padrão) para considerar uma casa fria — ~1 temporada. */
export const VENUE_REENGAGE_STALE_DAYS = 90;

/**
 * Lista as **casas/venues dormentes** que valem um retorno — mesma regra de
 * `findCitiesToReengage`, mas agrupando por `venue` (o palco) em vez de `city`.
 * Inclui uma casa quando tem show passado não cancelado, nada agendado adiante e
 * o último show é há `>= staleDays` dias. Shows sem local (chave normalizada
 * vazia) são ignorados. Ordenação/desempate idênticos ao eixo cidade. Pura;
 * `now`/`staleDays` injetáveis. Delega ao núcleo compartilhado
 * `collectPlacesToReengage` (eixo venue).
 */
export function findVenuesToReengage(
  shows: VenueReengageShowLike[],
  opts: VenueReengageOptions = {},
): VenueReengageList {
  const now = opts.now ?? new Date();
  const staleDays = Math.max(0, opts.staleDays ?? VENUE_REENGAGE_STALE_DAYS);
  const rows = collectPlacesToReengage(shows, (s) => s.venue, now, staleDays);
  return { rows, count: rows.length, staleDays };
}

// ── Rentabilidade por contratante (P&L agrupado por quem paga) ──────────────

/** Contratante (pagador) resolvido para um show — forma mínima do agrupamento. */
export interface ContactProfitContact {
  id: string;
  name: string;
  role: string;
}

export interface ContactProfitRow {
  /** Contratante do grupo; `null` = shows sem contato atribuído ("Sem contratante"). */
  contact: ContactProfitContact | null;
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
  /**
   * Cachê médio por show no grupo (centavos, arredondado) — o **nível de preço**
   * praticado com este contratante, distinto do líquido (`avgNet`): mede quanto
   * o contratante paga por show antes de extras e custos.
   */
  avgFee: number;
  /**
   * Cachê **mediano** por show no grupo (centavos): metade dos shows do
   * contratante cobra acima, metade abaixo. É o nível de preço **típico**,
   * robusto a um único show fora da curva (um festival pontual que infla a
   * média) — complementa `avgFee` (média, sensível ao outlier). A leitura só é
   * confiável com amostra suficiente; a UI a omite com poucos shows (ver D123).
   */
  medianFee: number;
  /** Margem agregada (net / receita bruta), 0 se receita bruta 0. */
  margin: number;
}

export interface ContactsProfitability {
  /** Linhas por resultado (`totalNet`) decrescente; o grupo "sem contratante" por último. */
  rows: ContactProfitRow[];
  /** Nº de contratantes distintos identificados (exclui o grupo "sem contratante"). */
  contactCount: number;
  /** Nº de shows considerados (após exclusões). */
  count: number;
  /** Resultado líquido somado de todos os grupos. */
  totalNet: number;
  /** Contratante mais rentável (maior `totalNet`, ignora "sem contratante") ou null. */
  best: ContactProfitRow | null;
  /** Contratante menos rentável (menor `totalNet`, ignora "sem contratante") ou null. */
  worst: ContactProfitRow | null;
}

/**
 * Mínimo de shows para o **cachê mediano** por contratante ser uma leitura
 * confiável. Com 1–2 shows a mediana é igual/quase igual à média e não agrega
 * (e pode enganar parecendo "típica"). A UI mostra o mediano só a partir daqui;
 * abaixo, exibe "—". Ver D123 (resolve a ressalva de "ruidoso com poucos shows").
 */
export const MIN_MEDIAN_FEE_SAMPLE = 3;

/**
 * Agrega a rentabilidade (P&L) dos shows por **contratante** (quem paga o cachê)
 * — respondendo "quais clientes realmente me dão dinheiro depois dos custos?".
 * Complementa a rentabilidade por local/cidade (geografia) com a dimensão de
 * relacionamento, e o ranking de contatos (volume bruto de cachê) com o líquido.
 *
 * - Cada show é atribuído a **um único** contratante via `getPayer` (tipicamente
 *   `pickPayerContact`: prioriza papel BOOKER/PROMOTER, ver billing.ts). Assim o
 *   resultado não é contado em duplicidade — `totalNet` reconcilia com a soma dos
 *   P&L dos shows (ao contrário do ranking, em que um show conta para cada contato).
 * - Shows sem contato atribuído caem no grupo "Sem contratante" (`contact: null`).
 * - Reaproveita `computeShowPnL` (fonte única do cálculo por show).
 * - Por padrão exclui shows `CANCELLED`; `opts.excludeStatuses` customiza.
 * - Ordena por `totalNet` desc; empate por nº de shows, nome (pt-BR) e id; o grupo
 *   sem contratante sempre por último. `best`/`worst` consideram só os identificados.
 */
export function rankContactsByProfit<S extends ShowLike>(
  shows: S[],
  txs: TxLike[],
  getPayer: (show: S) => ContactProfitContact | null,
  opts: { excludeStatuses?: string[] } = {},
): ContactsProfitability {
  const excluded = new Set(opts.excludeStatuses ?? ["CANCELLED"]);

  interface Acc {
    contact: ContactProfitContact | null;
    showCount: number;
    totalFee: number;
    totalExtra: number;
    totalExpenses: number;
    totalNet: number;
    /** Cachês individuais do grupo, para o cachê mediano (robusto a outlier). */
    fees: number[];
  }

  const NO_CONTACT = " "; // chave reservada para o grupo sem contratante
  const groups = new Map<string, Acc>();

  for (const show of shows) {
    if (show.status != null && excluded.has(show.status)) continue;

    const contact = getPayer(show);
    const key = contact ? contact.id : NO_CONTACT;

    let acc = groups.get(key);
    if (!acc) {
      acc = {
        contact,
        showCount: 0,
        totalFee: 0,
        totalExtra: 0,
        totalExpenses: 0,
        totalNet: 0,
        fees: [],
      };
      groups.set(key, acc);
    }

    const pnl = computeShowPnL(show, txs);
    acc.showCount += 1;
    acc.totalFee += pnl.fee;
    acc.totalExtra += pnl.extraIncome;
    acc.totalExpenses += pnl.expenses;
    acc.totalNet += pnl.net;
    acc.fees.push(pnl.fee);
  }

  const rows: ContactProfitRow[] = [...groups.values()].map((acc) => {
    const gross = acc.totalFee + acc.totalExtra;
    return {
      contact: acc.contact,
      showCount: acc.showCount,
      totalFee: acc.totalFee,
      totalExtra: acc.totalExtra,
      totalExpenses: acc.totalExpenses,
      totalNet: acc.totalNet,
      avgNet: acc.showCount > 0 ? Math.round(acc.totalNet / acc.showCount) : 0,
      avgFee: acc.showCount > 0 ? Math.round(acc.totalFee / acc.showCount) : 0,
      medianFee: median(acc.fees),
      margin: gross === 0 ? 0 : acc.totalNet / gross,
    };
  });

  // Resultado desc; "sem contratante" sempre por último; empate determinístico.
  rows.sort((a, b) => {
    if (!a.contact !== !b.contact) return a.contact ? -1 : 1;
    return (
      b.totalNet - a.totalNet ||
      b.showCount - a.showCount ||
      (a.contact?.name ?? "").localeCompare(b.contact?.name ?? "", "pt-BR") ||
      (a.contact?.id ?? "").localeCompare(b.contact?.id ?? "")
    );
  });

  const identified = rows.filter((r) => r.contact);

  return {
    rows,
    contactCount: identified.length,
    count: rows.reduce((n, r) => n + r.showCount, 0),
    totalNet: sum(rows.map((r) => r.totalNet)),
    best: identified[0] ?? null,
    worst: identified.length > 0 ? identified[identified.length - 1] : null,
  };
}

// ── Rentabilidade por papel do contratante (que tipo de comprador paga melhor) ─
// Complementa a rentabilidade por contratante individual (D105) com um rollup
// acima dele: agrupa os shows pelo **papel** de quem paga (Casa de show, Produtor/
// Promoter, Contratante…) em vez de por pessoa. Responde "que tipo de comprador
// vale mais a pena cultivar?" — útil para decidir onde investir prospecção
// (ex.: produtores pagam 40% mais por show que reservas diretas com a casa).
// Mesma mecânica de atribuição de `rankContactsByProfit` (um pagador por show via
// getPayer/pickPayerContact), só que a chave de grupo é o papel do pagador.

export interface RoleProfitRow {
  /** Papel do contratante (ex.: "VENUE"); `null` = shows sem contato atribuído. */
  role: string | null;
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
  /**
   * Cachê médio por show no grupo (centavos, arredondado) — o **nível de preço**
   * praticado por este tipo de comprador, distinto do líquido (`avgNet`).
   */
  avgFee: number;
  /**
   * Cachê **mediano** por show no grupo (centavos): metade dos shows do papel
   * cobra acima, metade abaixo. Robusto a um único show fora da curva. A leitura
   * só é confiável com amostra suficiente; a UI a omite com poucos shows (D123).
   */
  medianFee: number;
  /** Margem agregada (net / receita bruta), 0 se receita bruta 0. */
  margin: number;
}

export interface RolesProfitability {
  /** Linhas por resultado (`totalNet`) decrescente; o grupo "sem contratante" por último. */
  rows: RoleProfitRow[];
  /** Nº de papéis distintos identificados (exclui o grupo "sem contratante"). */
  roleCount: number;
  /** Nº de shows considerados (após exclusões). */
  count: number;
  /** Resultado líquido somado de todos os grupos. */
  totalNet: number;
  /** Papel mais rentável (maior `totalNet`, ignora "sem contratante") ou null. */
  best: RoleProfitRow | null;
  /** Papel menos rentável (menor `totalNet`, ignora "sem contratante") ou null. */
  worst: RoleProfitRow | null;
}

/**
 * Agrega a rentabilidade (P&L) dos shows pelo **papel** de quem paga — respondendo
 * "que tipo de comprador (casa, produtor, contratante…) me dá mais dinheiro?".
 * É um rollup acima de `rankContactsByProfit`: em vez de uma linha por pessoa,
 * uma linha por papel, somando todos os contratantes daquele papel.
 *
 * - Cada show é atribuído a **um único** pagador via `getPayer` (tipicamente
 *   `pickPayerContact`), exatamente como `rankContactsByProfit`, para o resultado
 *   não ser contado em duplicidade; o papel do grupo é o `role` desse pagador.
 * - Shows sem contato atribuído caem no grupo "Sem contratante" (`role: null`).
 * - Reaproveita `computeShowPnL` (fonte única do cálculo por show).
 * - Por padrão exclui shows `CANCELLED`; `opts.excludeStatuses` customiza.
 * - Ordena por `totalNet` desc; empate por nº de shows e papel; o grupo sem
 *   contratante sempre por último. `best`/`worst` consideram só os identificados.
 */
export function rankRolesByProfit<S extends ShowLike>(
  shows: S[],
  txs: TxLike[],
  getPayer: (show: S) => ContactProfitContact | null,
  opts: { excludeStatuses?: string[] } = {},
): RolesProfitability {
  const excluded = new Set(opts.excludeStatuses ?? ["CANCELLED"]);

  interface Acc {
    role: string | null;
    showCount: number;
    totalFee: number;
    totalExtra: number;
    totalExpenses: number;
    totalNet: number;
    /** Cachês individuais do grupo, para o cachê mediano (robusto a outlier). */
    fees: number[];
  }

  const NO_ROLE = " "; // chave reservada para o grupo sem contratante
  const groups = new Map<string, Acc>();

  for (const show of shows) {
    if (show.status != null && excluded.has(show.status)) continue;

    const contact = getPayer(show);
    const role = contact ? contact.role : null;
    const key = role ?? NO_ROLE;

    let acc = groups.get(key);
    if (!acc) {
      acc = {
        role,
        showCount: 0,
        totalFee: 0,
        totalExtra: 0,
        totalExpenses: 0,
        totalNet: 0,
        fees: [],
      };
      groups.set(key, acc);
    }

    const pnl = computeShowPnL(show, txs);
    acc.showCount += 1;
    acc.totalFee += pnl.fee;
    acc.totalExtra += pnl.extraIncome;
    acc.totalExpenses += pnl.expenses;
    acc.totalNet += pnl.net;
    acc.fees.push(pnl.fee);
  }

  const rows: RoleProfitRow[] = [...groups.values()].map((acc) => {
    const gross = acc.totalFee + acc.totalExtra;
    return {
      role: acc.role,
      showCount: acc.showCount,
      totalFee: acc.totalFee,
      totalExtra: acc.totalExtra,
      totalExpenses: acc.totalExpenses,
      totalNet: acc.totalNet,
      avgNet: acc.showCount > 0 ? Math.round(acc.totalNet / acc.showCount) : 0,
      avgFee: acc.showCount > 0 ? Math.round(acc.totalFee / acc.showCount) : 0,
      medianFee: median(acc.fees),
      margin: gross === 0 ? 0 : acc.totalNet / gross,
    };
  });

  // Resultado desc; "sem contratante" sempre por último; empate determinístico.
  rows.sort((a, b) => {
    if (!a.role !== !b.role) return a.role ? -1 : 1;
    return (
      b.totalNet - a.totalNet ||
      b.showCount - a.showCount ||
      (a.role ?? "").localeCompare(b.role ?? "")
    );
  });

  const identified = rows.filter((r) => r.role);

  return {
    rows,
    roleCount: identified.length,
    count: rows.reduce((n, r) => n + r.showCount, 0),
    totalNet: sum(rows.map((r) => r.totalNet)),
    best: identified[0] ?? null,
    worst: identified.length > 0 ? identified[identified.length - 1] : null,
  };
}

// ── Concentração por papel (risco de depender de um tipo de comprador) ───────
// Mede o quanto a receita bruta se concentra em poucos **papéis** de comprador
// (casa de show, produtor, contratante…) — o risco de a carreira depender de um
// único tipo de canal ("e se as casas de show, que pagam 80% do meu faturamento,
// secarem?"). Distinto da concentração de clientes (D109, por pessoa) e da
// geográfica (D113, por cidade): aqui o eixo é o **tipo** de comprador. Como há
// poucos papéis (e fixos), a concentração tende a ser naturalmente mais alta —
// o sinal acionável costuma ser o peso relativo entre eles, não o valor absoluto.
// Espelha `clientConcentration`/`geoConcentration`: receita bruta (cachê +
// extras), HHI, nº efetivo, mesmos limiares (`diversificationLevel`). Ignora o
// grupo "sem contratante" (`role: null`), que não é um canal acionável.

export interface RoleShareSlice {
  /** Papel do comprador (sempre identificado; "sem contratante" é excluído). */
  role: string;
  /** Receita bruta do papel = cachê + extras (centavos). */
  revenue: number;
  /** Participação na receita total dos papéis identificados (0..1). */
  share: number;
}

export interface RoleConcentration {
  /** Papéis por receita decrescente (empate determinístico pela chave do papel). */
  roles: RoleShareSlice[];
  /** Receita somada dos papéis identificados (centavos). */
  total: number;
  /** Nº de papéis identificados com receita > 0. */
  roleCount: number;
  /** Maior papel por receita, ou null se não há receita. */
  top: RoleShareSlice | null;
  /** Participação do maior papel (0..1). */
  topShare: number;
  /** Participação acumulada dos 3 maiores papéis (0..1). */
  top3Share: number;
  /**
   * Índice de Herfindahl–Hirschman (HHI): soma dos quadrados das participações
   * (0..1). 1 = um único papel; quanto menor, mais distribuído entre tipos.
   */
  hhi: number;
  /** Nº efetivo de papéis (1/HHI, índice de Simpson); 0 se não há receita. */
  effectiveRoles: number;
  /** Veredito de concentração (mesmos limiares de `incomeMix`, ver D45). */
  level: DiversificationLevel;
}

/**
 * Deriva a **concentração por papel** a partir das linhas de `rankRolesByProfit`:
 * mede o risco de a receita depender de um único tipo de comprador. Considera só
 * papéis **identificados** (descarta o grupo "sem contratante", `role: null`) com
 * receita bruta positiva (cachê + extras); usa a receita bruta — não o líquido,
 * que pode ser negativo e não forma participações válidas. Reaproveita os mesmos
 * limiares de diversificação de `incomeMix` / `clientConcentration`
 * (`diversificationLevel`). Pura, espelha `clientConcentration` (D109) num eixo
 * de papel em vez de por contratante.
 */
export function roleConcentration(rows: RoleProfitRow[]): RoleConcentration {
  const rolesRaw = rows
    .filter((r) => r.role !== null)
    .map((r) => ({ role: r.role as string, revenue: r.totalFee + r.totalExtra }))
    .filter((r) => r.revenue > 0);

  const total = rolesRaw.reduce((acc, r) => acc + r.revenue, 0);

  const roles: RoleShareSlice[] = rolesRaw
    .map((r) => ({
      role: r.role,
      revenue: r.revenue,
      share: total === 0 ? 0 : r.revenue / total,
    }))
    .sort((a, b) => b.revenue - a.revenue || a.role.localeCompare(b.role));

  const hhi = roles.reduce((acc, r) => acc + r.share * r.share, 0);
  const top3Share = roles.slice(0, 3).reduce((acc, r) => acc + r.share, 0);

  return {
    roles,
    total,
    roleCount: roles.length,
    top: roles[0] ?? null,
    topShare: roles[0]?.share ?? 0,
    top3Share,
    hhi,
    effectiveRoles: hhi === 0 ? 0 : 1 / hhi,
    level: diversificationLevel(hhi, roles.length),
  };
}

export interface RoleConcentrationComparison {
  /** Concentração por papel do período atual (tipicamente o ano selecionado). */
  current: RoleConcentration;
  /** Concentração por papel do período de comparação (tipicamente o ano anterior). */
  previous: RoleConcentration;
  /**
   * Variação da participação do maior papel (atual − anterior, em pontos
   * -1..1). Positivo = o maior tipo de comprador pesa **mais** agora (carteira
   * mais concentrada por canal).
   */
  topShareDelta: number;
  /**
   * Variação do nº de papéis efetivos (atual − anterior, índice de Simpson).
   * Positivo = receita **mais distribuída** entre canais agora (mais diversificada).
   */
  effectiveRolesDelta: number;
  /**
   * Direção do **risco de concentração por canal** entre os dois períodos,
   * decidida pela variação de `topShare` (a leitura-manchete) contra
   * `GEO_TREND_EPSILON`:
   * - "improved": menos concentrado agora (o maior papel encolheu além do limiar);
   * - "worsened": mais concentrado agora (o maior papel cresceu além do limiar);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **concentração por papel** entre dois períodos (atual × anterior),
 * espelhando `compareClientConcentration` (D139/cliente) e `compareGeoConcentration`
 * (D120/praça) num eixo de papel do comprador. Pura, sem I/O: recebe duas
 * `roleConcentration` já computadas (cada uma sobre as linhas de
 * `rankRolesByProfit` do seu período) e devolve as variações de `topShare` e de
 * papéis efetivos, além de um veredito de tendência (mesmo limiar
 * `GEO_TREND_EPSILON` e mesma regra de `concentrationTrend`). O chamador decide
 * quando exibir (tipicamente só com um ano específico selecionado e o ano
 * anterior tendo papel identificado — caso contrário a leitura é enganosa).
 */
export function compareRoleConcentration(
  current: RoleConcentration,
  previous: RoleConcentration,
): RoleConcentrationComparison {
  const topShareDelta = current.topShare - previous.topShare;
  const effectiveRolesDelta = current.effectiveRoles - previous.effectiveRoles;

  return {
    current,
    previous,
    topShareDelta,
    effectiveRolesDelta,
    trend: concentrationTrend(topShareDelta),
  };
}

// ── Comparativo de margem por PAPEL do contratante (D375) ────────────────────
// O rollup por papel de `compareContactMargins` (D372, por PESSOA): dos TIPOS de
// comprador que voltaram de um ano para o outro (casa de show, produtor,
// contratante…), quais estão apertando a margem líquida — a decisão acionável
// "que tipo de canal está achatando o cachê / puxando mais despesas". Enquanto o
// comparativo por contratante nomeia a CASA específica, este agrega por papel:
// útil quando o aperto não é de uma casa isolada mas de um canal inteiro (todas
// as casas de show pagando pior, todos os produtores exigindo mais custo). Pura,
// sem I/O: recebe duas `rankRolesByProfit` já computadas (um ano e o anterior).

/**
 * Limiar de materialidade (pontos de margem, 0..1) para um PAPEL contar como
 * "apertando" a margem de um ano para o outro. Mesmo valor de
 * `CONTACT_MARGIN_DROP_EPSILON` (D372, 0,05 = 5 p.p.) e dos demais epsilons de
 * tendência (`GEO_TREND_EPSILON`); replicado como literal (não referência) porque
 * aquela constante é declarada mais adiante no módulo (evita o temporal dead zone).
 * **Hipótese** de produto (ver Bloqueios), parametrizável para teste/ajuste.
 */
export const ROLE_MARGIN_DROP_EPSILON = 0.05;

/** Variação da margem (e do resultado) de um papel de comprador entre dois períodos. */
export interface RoleMarginChange {
  /** Papel do comprador — presente nos DOIS períodos, logo nunca "sem contratante". */
  role: string;
  /** Margem agregada no período atual (net / receita bruta, 0..1). */
  currentMargin: number;
  /** Margem agregada no período de comparação (0..1). */
  previousMargin: number;
  /**
   * Variação da margem (atual − anterior, em pontos -1..1). Negativo = o canal
   * ficou **menos** rentável agora (aperto de margem, a leitura acionável).
   */
  marginDelta: number;
  /** Resultado líquido somado no período atual (centavos). */
  currentNet: number;
  /** Resultado líquido somado no período de comparação (centavos). */
  previousNet: number;
  /** Variação do resultado líquido (atual − anterior, centavos, assinado). */
  netDelta: number;
  /** Nº de shows do papel no período atual. */
  currentShowCount: number;
  /** Nº de shows do papel no período de comparação. */
  previousShowCount: number;
}

export interface RoleMarginComparison {
  /**
   * Papéis presentes nos DOIS períodos, por `marginDelta` CRESCENTE — os maiores
   * apertos (delta mais negativo) primeiro, que é a leitura acionável. Empate por
   * resultado atual desc e chave do papel (determinístico).
   */
  changes: RoleMarginChange[];
  /** Nº de papéis comparados (presentes nos dois períodos). */
  comparedCount: number;
  /** Maior aperto de margem (`marginDelta` mais negativo, além do limiar) ou null. */
  worstDrop: RoleMarginChange | null;
  /** Maior ganho de margem (`marginDelta` mais positivo, além do limiar) ou null. */
  bestGain: RoleMarginChange | null;
  /** Quantos papéis tiveram a margem cair além de `ROLE_MARGIN_DROP_EPSILON`. */
  squeezedCount: number;
}

/**
 * Compara a **margem por papel de comprador** entre dois períodos (atual ×
 * anterior), destilando quais TIPOS de canal apertaram a margem líquida. Pura,
 * sem I/O: recebe duas `rankRolesByProfit` já computadas (cada uma sobre os shows
 * do seu período) e cruza os papéis presentes nos DOIS anos por `role` — só quem
 * voltou tem variação de margem interpretável (um canal novo ou que sumiu não
 * "apertou", só entrou/saiu da carteira). O grupo "sem contratante" (`role:
 * null`) é ignorado: não é um canal renegociável.
 *
 * Ordena por `marginDelta` crescente (o maior aperto primeiro), com desempate
 * determinístico. `worstDrop`/`bestGain` só apontam variações materiais (além de
 * `ROLE_MARGIN_DROP_EPSILON`); `squeezedCount` conta as quedas materiais. O
 * chamador decide quando exibir (tipicamente só com um ano específico e ao menos
 * um papel em comum — senão a leitura é vazia/enganosa). É o rollup por papel de
 * `compareContactMargins` (D372, por pessoa).
 */
export function compareRoleMargins(
  current: RolesProfitability,
  previous: RolesProfitability,
  epsilon: number = ROLE_MARGIN_DROP_EPSILON,
): RoleMarginComparison {
  const previousByRole = new Map<string, RoleProfitRow>();
  for (const row of previous.rows) {
    if (row.role != null) previousByRole.set(row.role, row);
  }

  const changes: RoleMarginChange[] = [];
  for (const row of current.rows) {
    if (row.role == null) continue;
    const prev = previousByRole.get(row.role);
    if (!prev) continue;
    changes.push({
      role: row.role,
      currentMargin: row.margin,
      previousMargin: prev.margin,
      marginDelta: row.margin - prev.margin,
      currentNet: row.totalNet,
      previousNet: prev.totalNet,
      netDelta: row.totalNet - prev.totalNet,
      currentShowCount: row.showCount,
      previousShowCount: prev.showCount,
    });
  }

  // Maior aperto primeiro (delta mais negativo); empate determinístico.
  changes.sort(
    (a, b) =>
      a.marginDelta - b.marginDelta ||
      b.currentNet - a.currentNet ||
      a.role.localeCompare(b.role),
  );

  const drops = changes.filter((c) => c.marginDelta <= -epsilon);
  const gains = changes.filter((c) => c.marginDelta >= epsilon);

  return {
    changes,
    comparedCount: changes.length,
    worstDrop: drops[0] ?? null,
    bestGain: gains.length > 0 ? gains[gains.length - 1] : null,
    squeezedCount: drops.length,
  };
}

// ── Concentração de clientes (risco de dependência de contratante) ──────────
// Mede o quanto a receita se concentra em poucos contratantes — o risco de
// carreira de depender de um único cliente ("e se o contratante que paga metade
// do meu faturamento sumir?"). Distinto da rentabilidade (líquido por
// contratante, D105): aqui o foco é a **receita bruta** (cachê + extras) que se
// perderia se o contratante saísse, não a margem. Usa receita bruta — e não o
// líquido — porque a dependência é sobre de onde o dinheiro **entra**; o líquido
// pode ser negativo e não forma participações válidas (que precisam somar 1).
// Espelha o vocabulário de concentração de `incomeMix` (HHI, nº efetivo, nível),
// mas sobre contratantes em vez de categorias de receita. Ignora o grupo "sem
// contratante" (não é um cliente acionável).

export interface ClientShareSlice {
  /** Contratante da fatia (sempre identificado). */
  contact: ContactProfitContact;
  /** Receita bruta do contratante = cachê + extras (centavos). */
  revenue: number;
  /** Participação na receita total dos contratantes identificados (0..1). */
  share: number;
}

export interface ClientConcentration {
  /** Contratantes por receita decrescente (empate por nome pt-BR, depois id). */
  clients: ClientShareSlice[];
  /** Receita somada dos contratantes identificados (centavos). */
  total: number;
  /** Nº de contratantes identificados com receita > 0. */
  clientCount: number;
  /** Maior contratante, ou null se não há receita. */
  top: ClientShareSlice | null;
  /** Participação do maior contratante (0..1). */
  topShare: number;
  /** Participação acumulada dos 3 maiores contratantes (0..1). */
  top3Share: number;
  /**
   * Índice de Herfindahl–Hirschman (HHI): soma dos quadrados das participações
   * (0..1). 1 = um único contratante; quanto menor, mais distribuído.
   */
  hhi: number;
  /** Nº efetivo de clientes (1/HHI, índice de Simpson); 0 se não há receita. */
  effectiveClients: number;
  /** Veredito de concentração (mesmos limiares de `incomeMix`, ver D45). */
  level: DiversificationLevel;
}

/**
 * Deriva a concentração de clientes a partir das linhas de `rankContactsByProfit`.
 * Considera apenas contratantes **identificados** com receita bruta positiva
 * (cachê + extras); o grupo "sem contratante" e quem só teve despesa são
 * ignorados. Reaproveita os mesmos limiares de diversificação de `incomeMix`
 * (`diversificationLevel`). Pura.
 */
export function clientConcentration(rows: ContactProfitRow[]): ClientConcentration {
  const clientsRaw = rows
    .filter((r) => r.contact !== null)
    .map((r) => ({ contact: r.contact!, revenue: r.totalFee + r.totalExtra }))
    .filter((c) => c.revenue > 0);

  const total = clientsRaw.reduce((acc, c) => acc + c.revenue, 0);

  const clients: ClientShareSlice[] = clientsRaw
    .map((c) => ({
      contact: c.contact,
      revenue: c.revenue,
      share: total === 0 ? 0 : c.revenue / total,
    }))
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
        a.contact.id.localeCompare(b.contact.id),
    );

  const hhi = clients.reduce((acc, c) => acc + c.share * c.share, 0);
  const top3Share = clients.slice(0, 3).reduce((acc, c) => acc + c.share, 0);

  return {
    clients,
    total,
    clientCount: clients.length,
    top: clients[0] ?? null,
    topShare: clients[0]?.share ?? 0,
    top3Share,
    hhi,
    effectiveClients: hhi === 0 ? 0 : 1 / hhi,
    level: diversificationLevel(hhi, clients.length),
  };
}

export interface ClientConcentrationHeadline {
  /**
   * Deve aparecer no Painel? Só quando a carteira está **concentrada**
   * (veredito `concentrated`) — um único contratante ou poucos dominando a
   * receita. Com `moderate`/`diversified` o aviso seria ruído, não alerta
   * (mesma disciplina de `cashBurnHeadline`/`paymentLagHeadline`: o nudge só
   * surge quando o veredito morde).
   */
  show: boolean;
  /**
   * Caso extremo: **um único** contratante responde por toda a receita, ou o
   * maior sozinho carrega ≥ 2/3 dela. Permite ao Painel subir o tom (🔴 vs 🟠).
   */
  critical: boolean;
  /** Participação do maior contratante na receita bruta (0..1). */
  topShare: number;
  /** Maior contratante (id/nome/papel), ou null se não há receita. */
  top: ContactProfitContact | null;
  /** Nº de contratantes identificados com receita bruta positiva. */
  clientCount: number;
  /** Veredito completo de concentração (para quem quiser o detalhe). */
  level: DiversificationLevel;
}

/**
 * Resumo de Painel da **concentração de clientes**: deriva, de uma
 * `clientConcentration` já computada, se o nudge de risco de dependência deve
 * aparecer e com que urgência. Pura, sem I/O — espelha `cashBurnHeadline` (D103)
 * e `paymentLagHeadline` (D70): a regra de exibição vive aqui, o dashboard só
 * consome. Só dispara quando a carteira está de fato concentrada (`concentrated`),
 * para não nagar quem já diversificou; o caso `critical` (cliente único ou um
 * dominante ≥ 2/3) merece o tom mais forte.
 */
export function clientConcentrationHeadline(
  concentration: ClientConcentration,
): ClientConcentrationHeadline {
  const show =
    concentration.level === "concentrated" && concentration.clientCount > 0;
  const critical =
    show && (concentration.clientCount === 1 || concentration.topShare >= 2 / 3);
  return {
    show,
    critical,
    topShare: concentration.topShare,
    top: concentration.top?.contact ?? null,
    clientCount: concentration.clientCount,
    level: concentration.level,
  };
}

/**
 * Mínimo estrutural que `compareClientConcentration` precisa de cada período: a
 * participação do maior contratante e o nº de clientes efetivos. Tanto o
 * `ClientConcentration` daqui (sobre `rankContactsByProfit`) quanto o
 * `ClientConcentration<C>` de `contacts.ts` (sobre shows por contato, usado na
 * tela `/contatos/concentracao`) satisfazem esta forma — por isso o comparativo
 * é genérico e serve aos dois eixos sem duplicar a aritmética de tendência.
 */
export interface ClientConcentrationLike {
  topShare: number;
  effectiveClients: number;
}

export interface ClientConcentrationComparison<
  T extends ClientConcentrationLike = ClientConcentration,
> {
  /** Concentração do período atual (tipicamente o ano selecionado). */
  current: T;
  /** Concentração do período de comparação (tipicamente o ano anterior). */
  previous: T;
  /**
   * Variação da participação do maior contratante (atual − anterior, em pontos
   * -1..1). Positivo = o maior cliente pesa **mais** agora (carteira mais
   * concentrada).
   */
  topShareDelta: number;
  /**
   * Variação do nº de clientes efetivos (atual − anterior, índice de Simpson).
   * Positivo = carteira **mais distribuída** agora (mais diversificada).
   */
  effectiveClientsDelta: number;
  /**
   * Direção do **risco de concentração** entre os dois períodos, decidida pela
   * variação de `topShare` (a leitura-manchete) contra `GEO_TREND_EPSILON`:
   * - "improved": menos concentrado agora (o maior cliente encolheu além do limiar);
   * - "worsened": mais concentrado agora (o maior cliente cresceu além do limiar);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **concentração de clientes** entre dois períodos (atual × anterior),
 * espelhando `compareGeoConcentration` (D120) num eixo de cliente em vez de praça.
 * Pura, sem I/O: recebe duas `clientConcentration` já computadas (cada uma sobre
 * as linhas de `rankContactsByProfit` do seu período) e devolve as variações de
 * `topShare` e de clientes efetivos, além de um veredito de tendência (mesmo
 * limiar `GEO_TREND_EPSILON` e mesma regra de `concentrationTrend`). O chamador
 * decide quando exibir (tipicamente só com um ano específico selecionado e o ano
 * anterior tendo contratante — caso contrário a leitura é enganosa).
 */
export function compareClientConcentration<T extends ClientConcentrationLike>(
  current: T,
  previous: T,
): ClientConcentrationComparison<T> {
  const topShareDelta = current.topShare - previous.topShare;
  const effectiveClientsDelta =
    current.effectiveClients - previous.effectiveClients;

  return {
    current,
    previous,
    topShareDelta,
    effectiveClientsDelta,
    trend: concentrationTrend(topShareDelta),
  };
}

// ── Comparativo de margem por contratante ano a ano (quais casas apertam) ────
//
// A concentração de clientes (D109/D139) responde "de quem eu dependo?" — um
// risco de carteira sobre a RECEITA BRUTA. Este eixo responde à outra metade da
// pergunta de rentabilidade: dos contratantes que voltaram de um ano para o
// outro, QUAIS estão apertando a margem líquida (cachês achatados, despesas
// maiores) — a decisão acionável "renegocie cachê/despesas com essas casas".
// Espelha o par contagem↔margem dos nudges do Painel (`lossShareRiseHeadline`/
// D367, `portfolioMarginDropHeadline`/D368), aqui destilado por PESSOA em vez de
// pela carteira inteira, sobre duas `rankContactsByProfit` já computadas (um ano
// e o anterior). Ver DECISIONS.md D372.

/**
 * Limiar de materialidade (em pontos de margem, 0..1) para um contratante contar
 * como "apertando" a margem de um ano para o outro. Abaixo dele a variação é
 * ruído (um extra pontual, um custo de deslocamento a mais) e não vira sinal.
 * Espelha `GEO_TREND_EPSILON`/`LOSS_SHARE_TREND_EPSILON` (0,05 = 5 p.p.). É
 * **hipótese** de produto (ver Bloqueios), parametrizável para teste/ajuste.
 */
export const CONTACT_MARGIN_DROP_EPSILON = 0.05;

/** Variação da margem (e do resultado) de um contratante entre dois períodos. */
export interface ContactMarginChange {
  /** Contratante — presente nos DOIS períodos, logo nunca "sem contratante". */
  contact: ContactProfitContact;
  /** Margem agregada no período atual (net / receita bruta, 0..1). */
  currentMargin: number;
  /** Margem agregada no período de comparação (0..1). */
  previousMargin: number;
  /**
   * Variação da margem (atual − anterior, em pontos -1..1). Negativo = a casa
   * ficou **menos** rentável agora (aperto de margem, a leitura acionável).
   */
  marginDelta: number;
  /** Resultado líquido somado no período atual (centavos). */
  currentNet: number;
  /** Resultado líquido somado no período de comparação (centavos). */
  previousNet: number;
  /** Variação do resultado líquido (atual − anterior, centavos, assinado). */
  netDelta: number;
  /** Nº de shows do contratante no período atual. */
  currentShowCount: number;
  /** Nº de shows do contratante no período de comparação. */
  previousShowCount: number;
}

export interface ContactMarginComparison {
  /**
   * Contratantes presentes nos DOIS períodos, por `marginDelta` CRESCENTE — os
   * maiores apertos (delta mais negativo) primeiro, que é a leitura acionável.
   * Empate por resultado atual desc, nome (pt-BR) e id (determinístico).
   */
  changes: ContactMarginChange[];
  /** Nº de contratantes comparados (presentes nos dois períodos). */
  comparedCount: number;
  /** Maior aperto de margem (`marginDelta` mais negativo, além do limiar) ou null. */
  worstDrop: ContactMarginChange | null;
  /** Maior ganho de margem (`marginDelta` mais positivo, além do limiar) ou null. */
  bestGain: ContactMarginChange | null;
  /** Quantos contratantes tiveram a margem cair além de `CONTACT_MARGIN_DROP_EPSILON`. */
  squeezedCount: number;
}

/**
 * Compara a **margem por contratante** entre dois períodos (atual × anterior),
 * destilando quais casas apertaram a margem líquida. Pura, sem I/O: recebe duas
 * `rankContactsByProfit` já computadas (cada uma sobre os shows do seu período) e
 * cruza os contratantes que aparecem nos DOIS anos por `contact.id` — só quem
 * voltou tem uma variação de margem interpretável (uma casa nova ou que sumiu não
 * "apertou", só entrou/saiu da carteira). O grupo "sem contratante" (`contact:
 * null`) é ignorado: não é uma relação renegociável.
 *
 * Ordena por `marginDelta` crescente (o maior aperto primeiro), com desempate
 * determinístico. `worstDrop`/`bestGain` só apontam variações materiais (além de
 * `CONTACT_MARGIN_DROP_EPSILON`); `squeezedCount` conta as quedas materiais. O
 * chamador decide quando exibir (tipicamente só com um ano específico e ao menos
 * um contratante em comum — senão a leitura é vazia/enganosa).
 */
export function compareContactMargins(
  current: ContactsProfitability,
  previous: ContactsProfitability,
  epsilon: number = CONTACT_MARGIN_DROP_EPSILON,
): ContactMarginComparison {
  const previousById = new Map<string, ContactProfitRow>();
  for (const row of previous.rows) {
    if (row.contact) previousById.set(row.contact.id, row);
  }

  const changes: ContactMarginChange[] = [];
  for (const row of current.rows) {
    if (!row.contact) continue;
    const prev = previousById.get(row.contact.id);
    if (!prev) continue;
    changes.push({
      contact: row.contact,
      currentMargin: row.margin,
      previousMargin: prev.margin,
      marginDelta: row.margin - prev.margin,
      currentNet: row.totalNet,
      previousNet: prev.totalNet,
      netDelta: row.totalNet - prev.totalNet,
      currentShowCount: row.showCount,
      previousShowCount: prev.showCount,
    });
  }

  // Maior aperto primeiro (delta mais negativo); empate determinístico.
  changes.sort(
    (a, b) =>
      a.marginDelta - b.marginDelta ||
      b.currentNet - a.currentNet ||
      a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
      a.contact.id.localeCompare(b.contact.id),
  );

  const drops = changes.filter((c) => c.marginDelta <= -epsilon);
  const gains = changes.filter((c) => c.marginDelta >= epsilon);

  return {
    changes,
    comparedCount: changes.length,
    worstDrop: drops[0] ?? null,
    bestGain: gains.length > 0 ? gains[gains.length - 1] : null,
    squeezedCount: drops.length,
  };
}

// ── Manchete "uma casa está apertando a margem" para o Painel (D374) ─────────
//
// Os nudges de rentabilidade do Painel `lossShareRiseHeadline` (D367, contagem) e
// `portfolioMarginDropHeadline` (D368, margem agregada) falam da carteira INTEIRA:
// "uma fatia maior deu prejuízo" / "cada real bruto sobra menos". Mas a carteira
// pode estar saudável no agregado enquanto UMA casa recorrente — um contratante
// importante que voltou — está silenciosamente achatando o seu cachê ou empurrando
// mais despesas. Esse aperto pontual é diluído pela média e não acende os nudges
// agregados; é justamente o que este destila, nomeando a casa: a leitura acionável
// "renegocie cachê/despesas com essa casa específica". É o eco no Painel do
// comparativo de margem por contratante (`compareContactMargins`/D372, tela
// `/contatos/rentabilidade`) — granularidade de PESSOA, complementar (não
// redundante) aos nudges agregados, por isso NÃO cede a vez a eles: os três podem
// coexistir porque respondem perguntas diferentes (carteira × casa).
//
// Espelha o alvo do drill-down: `compareContactMargins` na tela de contratantes
// opera sobre TODOS os shows do ano (não recorta por natureza), então o nudge lê a
// mesma comparação — clicar "ver casa" mostra os mesmos números (ver D374; o
// recorte por natureza no eixo de contratante fica como consistência futura).

/**
 * Nº mínimo de shows do contratante em CADA ano para o aperto virar nudge: 2.
 * Uma casa com 1 show por ano tem margem ruidosa (uma despesa grande vira −50 p.p.);
 * exigir repetição garante que é uma RELAÇÃO recorrente, não um gig isolado.
 * **Hipótese** — o piso de recorrência pode variar por perfil de agenda; validar.
 */
export const CONTACT_SQUEEZE_MIN_SHOWS = 2;

/**
 * Queda mínima de margem (pontos, 0..1) do pior contratante para o nudge disparar:
 * 0,10 = 10 p.p. a menos por real bruto, alinhado ao `MARGIN_DROP_MIN_POINTS` do
 * nudge agregado (o `CONTACT_MARGIN_DROP_EPSILON`=0,05 que marca "material" no card
 * é baixo demais para um alarme do Painel). **Hipótese** (ver acima).
 */
export const CONTACT_SQUEEZE_MIN_POINTS = 0.1;

/**
 * Queda de margem (pontos) a partir da qual o aperto entra na faixa crítica
 * (vermelho): 0,20 = 20 p.p., espelhando a escalada `critical` dos nudges irmãos.
 * **Hipótese** (ver acima).
 */
export const CONTACT_SQUEEZE_CRITICAL_POINTS = 0.2;

export interface ContactMarginSqueezeHeadline {
  /**
   * Deve aparecer no Painel? Só quando o PIOR contratante (o de maior aperto no
   * comparativo) caiu ≥ `minPoints` de margem E tem ≥ `minShows` shows em CADA ano
   * (relação recorrente, não gig isolado). Sem contratante em aperto material, ou
   * amostra fina, o aviso seria ruído — mesma disciplina dos nudges irmãos.
   */
  show: boolean;
  /** Aperto acentuado (margem caiu ≥ `criticalPoints`)? */
  critical: boolean;
  /** Nome do contratante que mais apertou (para a moldura textual); "" se `!show`. */
  contactName: string;
  /** Papel do contratante (ex.: "Contratante"/"Produtor"); "" se `!show`. */
  contactRole: string;
  /** Margem líquida agregada da casa no ano atual (0..1; pode ser negativa). */
  currentMargin: number;
  /** Margem líquida agregada da casa no ano anterior (0..1). */
  previousMargin: number;
  /** Variação da margem (atual − anterior, pontos); ≤ 0 quando `show`. */
  marginDelta: number;
  /** Resultado líquido somado da casa no ano atual (centavos, para a moldura). */
  currentNet: number;
  /** Variação do resultado líquido da casa (atual − anterior, centavos, assinado). */
  netDelta: number;
  /** Nº de shows da casa no ano atual (para a moldura textual). */
  currentShowCount: number;
  /** Nº de shows da casa no ano anterior. */
  previousShowCount: number;
  /** Quantas casas apertaram a margem materialmente (para "e outras N"). */
  squeezedCount: number;
}

const EMPTY_CONTACT_SQUEEZE: ContactMarginSqueezeHeadline = {
  show: false,
  critical: false,
  contactName: "",
  contactRole: "",
  currentMargin: 0,
  previousMargin: 0,
  marginDelta: 0,
  currentNet: 0,
  netDelta: 0,
  currentShowCount: 0,
  previousShowCount: 0,
  squeezedCount: 0,
};

/**
 * Decide se o Painel deve alertar que UMA casa específica está apertando a margem —
 * o eco por PESSOA do comparativo de margem por contratante (`compareContactMargins`
 * /D372) no dashboard, complementar aos nudges agregados de rentabilidade (D367/D368).
 * Recebe uma `ContactMarginComparison` já computada (cruzamento dos contratantes nos
 * dois anos) e não faz I/O. `show` só quando o pior aperto (`worstDrop`) caiu ≥
 * `minPoints` de margem E a casa tem ≥ `minShows` shows em CADA ano (relação
 * recorrente); `critical` quando a queda atinge `criticalPoints`. Como os nudges
 * irmãos, fica raro por gate. Pura.
 */
export function contactMarginSqueezeHeadline(
  comparison: ContactMarginComparison,
  minShows: number = CONTACT_SQUEEZE_MIN_SHOWS,
  minPoints: number = CONTACT_SQUEEZE_MIN_POINTS,
  criticalPoints: number = CONTACT_SQUEEZE_CRITICAL_POINTS,
): ContactMarginSqueezeHeadline {
  const worst = comparison.worstDrop;
  if (!worst) return EMPTY_CONTACT_SQUEEZE;

  const material = worst.marginDelta <= -minPoints;
  const recurring =
    worst.currentShowCount >= minShows && worst.previousShowCount >= minShows;
  const show = material && recurring;
  if (!show) return EMPTY_CONTACT_SQUEEZE;

  return {
    show: true,
    critical: worst.marginDelta <= -criticalPoints,
    contactName: worst.contact.name,
    contactRole: worst.contact.role,
    currentMargin: worst.currentMargin,
    previousMargin: worst.previousMargin,
    marginDelta: worst.marginDelta,
    currentNet: worst.currentNet,
    netDelta: worst.netDelta,
    currentShowCount: worst.currentShowCount,
    previousShowCount: worst.previousShowCount,
    squeezedCount: comparison.squeezedCount,
  };
}

// ── Recorte por período (ano) da rentabilidade por contratante ──────────────

/** Valor do seletor de período: um ano específico ou "all" (sem recorte). */
export type ProfitYearFilter = number | "all";

/**
 * Anos (decrescente) presentes nas datas dos shows — para montar o seletor de
 * período da rentabilidade por contratante. Usa o ano **UTC**, consistente com
 * as demais agregações financeiras (que normalizam por UTC), e deduplica.
 */
export function showProfitYears(dates: Date[]): number[] {
  const years = new Set<number>();
  for (const d of dates) years.add(d.getUTCFullYear());
  return [...years].sort((a, b) => b - a);
}

/**
 * Resolve o parâmetro `?ano=` no recorte de período da rentabilidade:
 * - vazio, "todos" ou ano fora dos disponíveis → `"all"` (sem recorte);
 * - "YYYY" presente em `availableYears` → aquele ano.
 * Aceita query repetida (usa o primeiro valor), espelhando `parseBurnWindow`.
 */
export function parseProfitYear(
  raw: string | string[] | undefined,
  availableYears: number[],
): ProfitYearFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null) return "all";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "todos") return "all";
  if (/^\d{4}$/.test(trimmed)) {
    const y = Number(trimmed);
    if (availableYears.includes(y)) return y;
  }
  return "all";
}

/**
 * Filtra shows pelo ano (UTC) da `date`; `"all"` devolve a lista inalterada.
 * Mantém `rankContactsByProfit` agnóstico ao recorte — filtra-se **antes** de
 * agregar, então a regra "um pagador por show" e o P&L seguem intocados.
 */
export function filterShowsByYear<S extends { date: Date }>(
  shows: S[],
  year: ProfitYearFilter,
): S[] {
  if (year === "all") return shows;
  return shows.filter((s) => s.date.getUTCFullYear() === year);
}

// ── Recorte por natureza do show (todos × só firmes) ────────────────────────
//
// Algumas leituras de carteira (a distribuição de resultado por show, D365) por
// padrão contam TODOS os shows não cancelados — inclusive PROPOSTAS ainda em
// aberto, cujo P&L é uma expectativa, não um resultado realizado. Este recorte
// deixa o músico separar "a foto da agenda inteira" da "foto só do que é dinheiro
// firme" (CONFIRMED+PLAYED), espelhando o escopo da amostra da antecedência
// (`BookingLeadTimeScope`/D190) no eixo do resultado. Ver DECISIONS.md D369.

/**
 * Natureza da amostra de shows numa leitura de carteira:
 * - `"all"`: todos os shows que a agregação já conta (não cancelados) — inclui
 *   propostas em aberto (comportamento histórico);
 * - `"firm"`: só compromissos **firmes** (CONFIRMED+PLAYED) — a foto do que já é
 *   dinheiro fechado, sem o ruído das propostas que ainda podem não acontecer.
 */
export type ShowNatureFilter = "all" | "firm";

/** Natureza padrão (histórica): conta todos os shows não cancelados. */
export const DEFAULT_SHOW_NATURE: ShowNatureFilter = "all";

/**
 * Resolve o parâmetro `?natureza=` no recorte por natureza. Só `"firm"` liga o
 * recorte de compromissos firmes; qualquer outro valor (vazio, "todos" ou
 * desconhecido) devolve `"all"` (sem recorte). Aceita query repetida (usa o
 * primeiro valor), espelhando `parseProfitYear`/`parseLeadTimeScope`.
 */
export function parseShowNature(raw: string | string[] | undefined): ShowNatureFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim().toLowerCase() === "firm" ? "firm" : "all";
}

/**
 * Filtra shows pela natureza; `"all"` devolve a lista inalterada (a agregação
 * ainda descarta CANCELLED por conta própria). `"firm"` mantém só CONFIRMED+
 * PLAYED. Filtra-se **antes** de agregar, mantendo `rankShowsByProfit` agnóstico
 * ao recorte — o P&L por show segue intocado.
 */
export function filterShowsByNature<S extends ShowLike>(
  shows: S[],
  nature: ShowNatureFilter,
): S[] {
  if (nature === "all") return shows;
  return shows.filter((s) => isConfirmedBooking(s.status));
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

/** Uma categoria com o total no período atual, no anterior e a variação entre eles. */
export interface CategoryDelta {
  /** Nome da categoria (em branco/ausente cai em "Sem categoria"). */
  category: string;
  /** Total da categoria no período atual (centavos). */
  amount: number;
  /** Total da categoria no período anterior (centavos). */
  previousAmount: number;
  /** Variação atual vs anterior (reaproveita `computeDelta`). */
  delta: MetricDelta;
}

/** Comparativo da quebra por categoria entre dois períodos (atual vs anterior). */
export interface CategoryReportComparison {
  /** Categorias de receita presentes em qualquer um dos dois períodos. */
  income: CategoryDelta[];
  /** Categorias de despesa presentes em qualquer um dos dois períodos. */
  expense: CategoryDelta[];
  /** Soma das receitas no período atual. */
  totalIncome: number;
  /** Soma das despesas no período atual. */
  totalExpense: number;
  /** Soma das receitas no período anterior. */
  previousTotalIncome: number;
  /** Soma das despesas no período anterior. */
  previousTotalExpense: number;
  /** Variação do total de receitas (atual vs anterior). */
  incomeDelta: MetricDelta;
  /** Variação do total de despesas (atual vs anterior). */
  expenseDelta: MetricDelta;
  /** Maior alta de receita (delta > 0), ou null se nenhuma subiu. */
  topIncomeRise: CategoryDelta | null;
  /** Maior alta de despesa (delta > 0), ou null se nenhuma subiu. */
  topExpenseRise: CategoryDelta | null;
  /** Maior queda de despesa (delta < 0) — a economia do período, ou null. */
  topExpenseDrop: CategoryDelta | null;
}

/**
 * Compara a quebra por categoria de dois períodos (tipicamente mês atual vs mês
 * anterior), respondendo "o que mudou, categoria por categoria?". Reaproveita
 * `categoryReport` (mesma definição de categoria/"Sem categoria") e `computeDelta`
 * (mesma semântica de variação do relatório mensal — uma fonte de verdade).
 *
 * Cada lista (receitas e despesas) traz toda categoria presente em qualquer um
 * dos dois períodos (ausente num lado conta como 0), ordenada pelo **maior
 * movimento absoluto** primeiro (`|delta|` desc; empate por valor atual desc e
 * depois nome pt-BR) — quem mais mudou, para cima ou para baixo, aparece no topo.
 * Os destaques isolam a maior alta de receita/despesa e a maior queda de despesa
 * (economia). Pura.
 */
export function compareCategoryReports(
  current: TxLike[],
  previous: TxLike[],
): CategoryReportComparison {
  const cur = categoryReport(current);
  const prev = categoryReport(previous);

  const build = (
    curSlices: CategorySlice[],
    prevSlices: CategorySlice[],
  ): CategoryDelta[] => {
    const curMap = new Map(curSlices.map((s) => [s.category, s.amount]));
    const prevMap = new Map(prevSlices.map((s) => [s.category, s.amount]));
    const categories = new Set<string>([...curMap.keys(), ...prevMap.keys()]);

    return Array.from(categories)
      .map((category) => {
        const amount = curMap.get(category) ?? 0;
        const previousAmount = prevMap.get(category) ?? 0;
        return {
          category,
          amount,
          previousAmount,
          delta: computeDelta(amount, previousAmount),
        };
      })
      .sort(
        (a, b) =>
          Math.abs(b.delta.delta) - Math.abs(a.delta.delta) ||
          b.amount - a.amount ||
          a.category.localeCompare(b.category, "pt-BR"),
      );
  };

  const income = build(cur.income, prev.income);
  const expense = build(cur.expense, prev.expense);

  const maxBy = (
    rows: CategoryDelta[],
    keep: (delta: number, best: number) => boolean,
  ): CategoryDelta | null => {
    let best: CategoryDelta | null = null;
    for (const r of rows) {
      if (keep(r.delta.delta, best?.delta.delta ?? 0)) best = r;
    }
    return best;
  };

  return {
    income,
    expense,
    totalIncome: cur.totalIncome,
    totalExpense: cur.totalExpense,
    previousTotalIncome: prev.totalIncome,
    previousTotalExpense: prev.totalExpense,
    incomeDelta: computeDelta(cur.totalIncome, prev.totalIncome),
    expenseDelta: computeDelta(cur.totalExpense, prev.totalExpense),
    topIncomeRise: maxBy(income, (d, best) => d > 0 && d > best),
    topExpenseRise: maxBy(expense, (d, best) => d > 0 && d > best),
    topExpenseDrop: maxBy(expense, (d, best) => d < 0 && d < best),
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

/** Uma categoria no mix, com total, contagem e participação no tipo. */
interface CategoryMixSlice {
  category: string;
  amount: number;
  count: number;
  share: number;
}

/** Estatísticas de concentração compartilhadas por `incomeMix`/`expenseMix`. */
interface CategoryMixStats {
  slices: CategoryMixSlice[];
  total: number;
  hhi: number;
  top3Share: number;
  top: CategoryMixSlice | null;
}

/**
 * Núcleo compartilhado do mix por categoria: agrupa as transações de um único
 * `type` (INCOME ou EXPENSE) por categoria, calcula participação (`share`),
 * ordena por valor decrescente (desempate por nome pt-BR) e deriva o HHI e a
 * concentração das 3 maiores. Categorias em branco/ausentes caem em
 * "Sem categoria". Pura. Base de `incomeMix` (fontes de renda) e `expenseMix`
 * (composição de despesas).
 */
function categoryMixStats(txs: TxLike[], type: TransactionType): CategoryMixStats {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;

  for (const t of txs) {
    if (t.type !== type) continue;
    const category = t.category?.trim() || "Sem categoria";
    const entry = map.get(category) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    map.set(category, entry);
    total += t.amount;
  }

  const slices: CategoryMixSlice[] = Array.from(map.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      share: total === 0 ? 0 : amount / total,
    }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, "pt-BR"));

  const hhi = slices.reduce((acc, s) => acc + s.share * s.share, 0);
  const top3Share = slices.slice(0, 3).reduce((acc, s) => acc + s.share, 0);

  return { slices, total, hhi, top3Share, top: slices[0] ?? null };
}

/**
 * Calcula o mix de receitas por fonte (categoria) sobre as transações INCOME do
 * recorte. Cada fonte recebe seu total, participação (`share`) e contagem; o
 * relatório traz a concentração nas maiores (topShare/top3Share), o HHI, o
 * número efetivo de fontes e o veredito de diversificação. Despesas são
 * ignoradas. Categorias em branco/ausentes caem em "Sem categoria". Pura.
 */
export function incomeMix(txs: TxLike[]): IncomeMix {
  const { slices, total, hhi, top3Share, top } = categoryMixStats(txs, "INCOME");

  return {
    sources: slices,
    total,
    sourceCount: slices.length,
    top,
    topShare: top?.share ?? 0,
    top3Share,
    hhi,
    effectiveSources: hhi === 0 ? 0 : 1 / hhi,
    level: diversificationLevel(hhi, slices.length),
  };
}

/**
 * Anos (UTC, decrescente) das transações de RECEITA — alimenta o seletor de
 * período de `/financas/fontes-de-renda` sem oferecer um ano sem receita (ao
 * contrário de `showProfitYears`, que parte de uma lista qualquer e poderia
 * oferecer um ano vazio). Espelho de `feeDistributionYears`/`weekdayPerformanceYears`
 * no eixo de transação: parte do mesmo gate que `incomeMix` (só `type === "INCOME"`),
 * então todo ano oferecido tem ao menos uma fonte de renda. Pura.
 */
export function incomeMixYears(txs: TxLike[]): number[] {
  const years = new Set<number>();
  for (const t of txs) {
    if (t.type !== "INCOME") continue;
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

// ── Composição de despesas (para onde vai o dinheiro?) ──────────────────────
// Espelho de `incomeMix` para o lado das despesas: agrupa as despesas (EXPENSE)
// por categoria (= rubrica de gasto: transporte, equipamento, marketing, etc.),
// com a participação de cada uma, a concentração nas maiores e o HHI. Responde
// "para onde vai o meu dinheiro e o quanto um único gasto domina o orçamento?".
// Distinto dos custos fixos (D39, foco em recorrência) e do relatório mensal
// (que olha um mês): aqui o foco é a COMPOSIÇÃO de toda a despesa do recorte.

export interface ExpenseCategorySlice {
  /** Nome da rubrica (categoria; em branco/ausente cai em "Sem categoria"). */
  category: string;
  /** Total gasto na rubrica no recorte (centavos). */
  amount: number;
  /** Participação no total de despesas (0..1). */
  share: number;
  /** Nº de transações de despesa nessa rubrica. */
  count: number;
}

export interface ExpenseMix {
  /** Rubricas de despesa, ordem decrescente por valor (empate por nome, pt-BR). */
  categories: ExpenseCategorySlice[];
  /** Soma de todas as despesas do recorte (centavos). */
  total: number;
  /** Nº de rubricas (categorias de despesa) distintas. */
  categoryCount: number;
  /** Maior rubrica, ou null se não há despesa. */
  top: ExpenseCategorySlice | null;
  /** Participação da maior rubrica (0..1). */
  topShare: number;
  /** Participação acumulada das 3 maiores rubricas (0..1). */
  top3Share: number;
  /**
   * Índice de concentração de Herfindahl–Hirschman (HHI): soma dos quadrados
   * das participações (0..1). 1 = uma única rubrica; quanto menor, mais pulverizado.
   */
  hhi: number;
  /**
   * Número efetivo de rubricas (1/HHI, índice de Simpson): "como se" a despesa
   * fosse repartida em N rubricas de mesmo tamanho. 0 quando não há despesa.
   */
  effectiveCategories: number;
  /**
   * Veredito de concentração (mesma escala de `incomeMix`): `concentrated` = um
   * gasto domina; `diversified` = despesa pulverizada em várias rubricas. Aqui é
   * informativo (concentrar não é necessariamente ruim), não um alerta de risco.
   */
  level: DiversificationLevel;
}

/**
 * Calcula a composição das despesas por rubrica (categoria) sobre as transações
 * EXPENSE do recorte. Espelho de `incomeMix`: cada rubrica recebe total,
 * participação e contagem; o relatório traz a concentração nas maiores, o HHI e
 * o número efetivo de rubricas. Receitas são ignoradas. Categorias em
 * branco/ausentes caem em "Sem categoria". Pura.
 */
export function expenseMix(txs: TxLike[]): ExpenseMix {
  const { slices, total, hhi, top3Share, top } = categoryMixStats(txs, "EXPENSE");

  return {
    categories: slices,
    total,
    categoryCount: slices.length,
    top,
    topShare: top?.share ?? 0,
    top3Share,
    hhi,
    effectiveCategories: hhi === 0 ? 0 : 1 / hhi,
    level: diversificationLevel(hhi, slices.length),
  };
}

/**
 * Anos (UTC, decrescente) das transações de DESPESA — alimenta o seletor de
 * período de `/financas/composicao-despesas` sem oferecer um ano sem despesa.
 * Espelho de `incomeMixYears` no eixo de gasto: parte do mesmo gate que
 * `expenseMix` (só `type === "EXPENSE"`), então todo ano oferecido tem ao menos
 * uma rubrica de despesa. Pura.
 */
export function expenseMixYears(txs: TxLike[]): number[] {
  const years = new Set<number>();
  for (const t of txs) {
    if (t.type !== "EXPENSE") continue;
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Variação do gasto de UMA rubrica (categoria) entre dois períodos (o ano
 * selecionado × o anterior). `amountDelta` positivo = você gastou MAIS nessa
 * rubrica; negativo = gastou menos (economizou). Espelho do
 * `ContactPaymentLagChange`/D195 no eixo de despesa.
 */
export interface ExpenseCategoryChange {
  /** Nome da rubrica (já normalizado por `expenseMix`; "Sem categoria" para vazias). */
  category: string;
  /** Gasto na rubrica no período atual (centavos). */
  currentAmount: number;
  /** Gasto na rubrica no período anterior (centavos). */
  previousAmount: number;
  /** Variação do gasto (atual − anterior, centavos). Positivo = gastou mais. */
  amountDelta: number;
  /** Participação da rubrica na despesa total do período atual (0..1). */
  currentShare: number;
  /** Participação da rubrica na despesa total do período anterior (0..1). */
  previousShare: number;
}

export interface ExpenseMixComparison {
  /**
   * Rubricas presentes nos DOIS períodos, com a variação do gasto. Ordenadas do
   * maior aumento à maior queda (quem mais subiu primeiro), para o "mover" de
   * cima do card ser a rubrica que mais pesou a mais no orçamento.
   */
  changes: ExpenseCategoryChange[];
  /** Despesa total do período atual (centavos). */
  currentTotal: number;
  /** Despesa total do período anterior (centavos). */
  previousTotal: number;
  /** Variação da despesa total (atual − anterior, centavos). */
  totalDelta: number;
  /** Rubrica que mais AUMENTOU de gasto (maior `amountDelta > 0`); null se nenhuma subiu. */
  biggestIncrease: ExpenseCategoryChange | null;
  /** Rubrica que mais CAIU de gasto (menor `amountDelta < 0`); null se nenhuma caiu. */
  biggestDecrease: ExpenseCategoryChange | null;
  /** Rubricas que só tiveram gasto no período atual (novas no orçamento). */
  newCategories: ExpenseCategorySlice[];
  /** Rubricas que tinham gasto no anterior mas não no atual (sumiram do orçamento). */
  droppedCategories: ExpenseCategorySlice[];
}

/**
 * Compara a **composição das despesas** entre dois períodos (tipicamente um ano ×
 * o ano anterior), casando as rubricas por nome de categoria, respondendo "em que
 * rubricas estou gastando mais/menos do que no ano passado?".
 *
 * No espírito do card de "quem mudou de ritmo" (`comparePaymentLagByContact`/D195) e
 * dos movers da sazonalidade (`compareGigSeasonality`/D215): em vez de despejar todas
 * as rubricas na tela, destila os dois **movers** — a rubrica que mais subiu e a que
 * mais caiu de gasto — mantendo a tela enxuta. Os `changes` completos ficam disponíveis
 * para quem quiser detalhar.
 *
 * Diferente do prazo de recebimento (onde descer é a melhora) ou do booking lead time
 * (onde subir é), aqui a direção é informativa por si: gastar menos numa rubrica costuma
 * ser bom, gastar mais merece um olhar — mas o helper só reporta o fato, sem veredito de
 * bom/ruim (concentrar/gastar não é intrinsecamente errado, como já frisa `expenseMix`).
 * Sem limiar de estabilidade: qualquer `amountDelta` não-nulo conta (dinheiro raramente
 * empata em centavos), então os movers cobrem toda variação real.
 *
 * Puro, sem I/O: recebe dois `expenseMix` já computados (cada um sobre as transações do
 * seu período). O chamador decide quando exibir (tipicamente só com um ano específico e
 * ambos os períodos com despesa).
 */
export function compareExpenseMix(
  current: ExpenseMix,
  previous: ExpenseMix,
): ExpenseMixComparison {
  const prevByCategory = new Map<string, ExpenseCategorySlice>();
  for (const c of previous.categories) prevByCategory.set(c.category, c);

  const currentCategories = new Set<string>();
  const changes: ExpenseCategoryChange[] = [];
  const newCategories: ExpenseCategorySlice[] = [];

  for (const cur of current.categories) {
    currentCategories.add(cur.category);
    const prev = prevByCategory.get(cur.category);
    if (!prev) {
      newCategories.push(cur);
      continue;
    }
    changes.push({
      category: cur.category,
      currentAmount: cur.amount,
      previousAmount: prev.amount,
      amountDelta: cur.amount - prev.amount,
      currentShare: cur.share,
      previousShare: prev.share,
    });
  }

  const droppedCategories = previous.categories.filter(
    (c) => !currentCategories.has(c.category),
  );

  // Maior aumento no topo (variação desc); empate estável pelo nome da rubrica (pt-BR).
  changes.sort(
    (a, b) =>
      b.amountDelta - a.amountDelta ||
      a.category.localeCompare(b.category, "pt-BR"),
  );

  let biggestIncrease: ExpenseCategoryChange | null = null;
  let biggestDecrease: ExpenseCategoryChange | null = null;
  for (const c of changes) {
    if (
      c.amountDelta > 0 &&
      (!biggestIncrease || c.amountDelta > biggestIncrease.amountDelta)
    ) {
      biggestIncrease = c;
    }
    if (
      c.amountDelta < 0 &&
      (!biggestDecrease || c.amountDelta < biggestDecrease.amountDelta)
    ) {
      biggestDecrease = c;
    }
  }

  return {
    changes,
    currentTotal: current.total,
    previousTotal: previous.total,
    totalDelta: current.total - previous.total,
    biggestIncrease,
    biggestDecrease,
    newCategories,
    droppedCategories,
  };
}

/**
 * Variação da receita de UMA fonte (categoria) entre dois períodos (o ano
 * selecionado × o anterior). `amountDelta` positivo = essa fonte rendeu MAIS;
 * negativo = rendeu menos (encolheu). Espelho de `ExpenseCategoryChange`/D224 no
 * eixo de receita.
 */
export interface IncomeSourceChange {
  /** Nome da fonte (já normalizado por `incomeMix`; "Sem categoria" para vazias). */
  category: string;
  /** Receita da fonte no período atual (centavos). */
  currentAmount: number;
  /** Receita da fonte no período anterior (centavos). */
  previousAmount: number;
  /** Variação da receita (atual − anterior, centavos). Positivo = rendeu mais. */
  amountDelta: number;
  /** Participação da fonte na receita total do período atual (0..1). */
  currentShare: number;
  /** Participação da fonte na receita total do período anterior (0..1). */
  previousShare: number;
}

export interface IncomeMixComparison {
  /**
   * Fontes presentes nos DOIS períodos, com a variação da receita. Ordenadas do
   * maior crescimento à maior queda (quem mais subiu primeiro), para o "mover" de
   * cima do card ser a fonte que mais engordou o faturamento.
   */
  changes: IncomeSourceChange[];
  /** Receita total do período atual (centavos). */
  currentTotal: number;
  /** Receita total do período anterior (centavos). */
  previousTotal: number;
  /** Variação da receita total (atual − anterior, centavos). */
  totalDelta: number;
  /** Fonte que mais CRESCEU de receita (maior `amountDelta > 0`); null se nenhuma subiu. */
  biggestIncrease: IncomeSourceChange | null;
  /** Fonte que mais CAIU de receita (menor `amountDelta < 0`); null se nenhuma caiu. */
  biggestDecrease: IncomeSourceChange | null;
  /** Fontes que só tiveram receita no período atual (novas no faturamento). */
  newSources: IncomeSourceSlice[];
  /** Fontes que tinham receita no anterior mas não no atual (sumiram do faturamento). */
  droppedSources: IncomeSourceSlice[];
}

/**
 * Compara o **mix de receitas** (fontes de renda) entre dois períodos (tipicamente
 * um ano × o ano anterior), casando as fontes por nome de categoria, respondendo
 * "que fontes de renda cresceram/encolheram frente ao ano passado?".
 *
 * Espelho simétrico de `compareExpenseMix`/D224 no eixo de receita, no mesmo
 * espírito de "movers" (`comparePaymentLagByContact`/D195, `compareGigSeasonality`/
 * D215): em vez de despejar todas as fontes na tela, destila os dois **movers** — a
 * fonte que mais cresceu e a que mais caiu — mantendo a tela enxuta. Os `changes`
 * completos ficam disponíveis para quem quiser detalhar.
 *
 * Diferente da despesa (onde gastar menos costuma ser bom), aqui crescer uma fonte é
 * geralmente positivo e uma fonte encolher merece um olhar — mas, como
 * `compareExpenseMix`, o helper só reporta o fato, sem veredito de bom/ruim (a leitura
 * de risco fica com o HHI/veredito de `incomeMix`). Sem limiar de estabilidade: qualquer
 * `amountDelta` não-nulo conta, então os movers cobrem toda variação real.
 *
 * Puro, sem I/O: recebe dois `incomeMix` já computados (cada um sobre as transações do
 * seu período). O chamador decide quando exibir (tipicamente só com um ano específico e
 * ambos os períodos com receita).
 */
export function compareIncomeMix(
  current: IncomeMix,
  previous: IncomeMix,
): IncomeMixComparison {
  const prevByCategory = new Map<string, IncomeSourceSlice>();
  for (const s of previous.sources) prevByCategory.set(s.category, s);

  const currentCategories = new Set<string>();
  const changes: IncomeSourceChange[] = [];
  const newSources: IncomeSourceSlice[] = [];

  for (const cur of current.sources) {
    currentCategories.add(cur.category);
    const prev = prevByCategory.get(cur.category);
    if (!prev) {
      newSources.push(cur);
      continue;
    }
    changes.push({
      category: cur.category,
      currentAmount: cur.amount,
      previousAmount: prev.amount,
      amountDelta: cur.amount - prev.amount,
      currentShare: cur.share,
      previousShare: prev.share,
    });
  }

  const droppedSources = previous.sources.filter(
    (s) => !currentCategories.has(s.category),
  );

  // Maior crescimento no topo (variação desc); empate estável pelo nome da fonte (pt-BR).
  changes.sort(
    (a, b) =>
      b.amountDelta - a.amountDelta ||
      a.category.localeCompare(b.category, "pt-BR"),
  );

  let biggestIncrease: IncomeSourceChange | null = null;
  let biggestDecrease: IncomeSourceChange | null = null;
  for (const c of changes) {
    if (
      c.amountDelta > 0 &&
      (!biggestIncrease || c.amountDelta > biggestIncrease.amountDelta)
    ) {
      biggestIncrease = c;
    }
    if (
      c.amountDelta < 0 &&
      (!biggestDecrease || c.amountDelta < biggestDecrease.amountDelta)
    ) {
      biggestDecrease = c;
    }
  }

  return {
    changes,
    currentTotal: current.total,
    previousTotal: previous.total,
    totalDelta: current.total - previous.total,
    biggestIncrease,
    biggestDecrease,
    newSources,
    droppedSources,
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

// ── Resumo trimestral ────────────────────────────────────────────────────────
//
// Entre o Relatório mensal (um mês) e o Resumo anual (12 meses) falta a cadência
// trimestral — o período natural de revisão de progresso (e de pacing contra a
// meta anual de faturamento). Esta função deriva os 4 trimestres do
// `annualSummary` (uma só fonte de verdade da agregação mensal), agrupando
// jan–mar (Q1), abr–jun (Q2), jul–set (Q3) e out–dez (Q4). Pura.

export interface QuarterSummary {
  /** Trimestre 1–4. */
  quarter: number;
  /** Rótulo curto, ex.: "1º tri". */
  label: string;
  /** Meses (1–12) que compõem o trimestre. */
  monthIndexes: number[];
  income: number;
  expense: number;
  /** income − expense (regime de competência). */
  net: number;
}

export interface QuarterlySummary {
  /** Ano de referência. */
  year: number;
  /** Exatamente 4 trimestres (Q1→Q4), zeros inclusive. */
  quarters: QuarterSummary[];
  /** Soma das receitas do ano. */
  totalIncome: number;
  /** Soma das despesas do ano. */
  totalExpense: number;
  /** totalIncome − totalExpense. */
  net: number;
  /** Trimestre de maior resultado entre os com movimento; null se nenhum teve. */
  best: QuarterSummary | null;
  /** Trimestre de menor resultado entre os com movimento; null se nenhum teve. */
  worst: QuarterSummary | null;
}

const QUARTER_LABELS = ["1º tri", "2º tri", "3º tri", "4º tri"];

const MONTH_GOAL_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * Consolida as transações de um ano em 4 trimestres, com os totais do ano e o
 * melhor/pior trimestre (por resultado líquido) entre os que tiveram movimento.
 * Responde "como foi cada trimestre?" — a cadência de revisão entre o mês e o
 * ano. Deriva do `annualSummary` (mesma fonte de agregação mensal); pura.
 */
export function quarterlySummary(txs: TxLike[], year: number): QuarterlySummary {
  const annual = annualSummary(txs, year);

  const quarters: QuarterSummary[] = [0, 1, 2, 3].map((q) => {
    const months = annual.months.slice(q * 3, q * 3 + 3);
    const income = sum(months.map((m) => m.income));
    const expense = sum(months.map((m) => m.expense));
    return {
      quarter: q + 1,
      label: QUARTER_LABELS[q],
      monthIndexes: months.map((m) => m.monthIndex),
      income,
      expense,
      net: income - expense,
    };
  });

  // Melhor/pior entre trimestres com movimento (receita ou despesa > 0). Empate
  // pelo trimestre mais cedo (ordem estável, já que percorremos Q1→Q4).
  const active = quarters.filter((q) => q.income > 0 || q.expense > 0);
  let best: QuarterSummary | null = null;
  let worst: QuarterSummary | null = null;
  for (const q of active) {
    if (best === null || q.net > best.net) best = q;
    if (worst === null || q.net < worst.net) worst = q;
  }

  return {
    year,
    quarters,
    totalIncome: annual.totalIncome,
    totalExpense: annual.totalExpense,
    net: annual.net,
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

/** Horizontes (em meses) oferecidos no seletor da projeção de caixa. */
export const CASHFLOW_HORIZON_PRESETS = [3, 6, 12, 24] as const;

/** Horizonte default da projeção de caixa (em meses). */
export const CASHFLOW_HORIZON_DEFAULT = 6;

/**
 * Lê o horizonte da projeção de caixa de um query param (`?meses=`) e o restringe
 * aos presets oferecidos no seletor (`CASHFLOW_HORIZON_PRESETS`); qualquer outro
 * valor — ausente, vazio, não-numérico ou fora dos presets — cai no
 * `CASHFLOW_HORIZON_DEFAULT`. Aceita string única ou repetida (usa a primeira).
 *
 * Diferente de `parseBurnWindow` (que clampa para [1,24] qualquer inteiro), aqui
 * só os quatro presets do seletor valem — assim a página `/financas/fluxo-de-caixa`
 * e a rota de export compartilham exatamente o mesmo conjunto de horizontes. Pura.
 */
export function parseCashflowHorizon(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return (CASHFLOW_HORIZON_PRESETS as readonly number[]).includes(n)
    ? n
    : CASHFLOW_HORIZON_DEFAULT;
}

// ── Agenda de contas a pagar/receber (F3 — "o que vence quando") ────────────

/** Janela de vencimento de uma pendência (relativa a hoje, comparada por dia UTC). */
export type DueBucketKey = "overdue" | "today" | "week" | "later";

/** Ordem canônica das janelas (do mais urgente ao menos). */
export const DUE_BUCKET_ORDER: DueBucketKey[] = ["overdue", "today", "week", "later"];

/** Rótulo pt-BR de cada janela de vencimento (compartilhado entre a página e o CSV). */
export const DUE_BUCKET_LABELS: Record<DueBucketKey, string> = {
  overdue: "Vencidas",
  today: "Hoje",
  week: "Próximos 7 dias",
  later: "Mais tarde",
};

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

// ── Promessas de pagamento (priorizar o follow-up das promessas furadas) ────
//
// Ao cobrar um cachê em aberto, o músico pode registrar a DATA PROMETIDA de
// pagamento pelo contratante. Esta lógica classifica cada promessa e separa as
// FURADAS (data já passou e o cachê continua em aberto) das ainda no prazo, para
// que a cobrança volte a quem prometeu e não cumpriu. Ver DECISIONS.md D94.

/** Um show carregado com a data prometida de pagamento (opcional). */
export interface PromisableShowLike extends ReceivableShowLike {
  paymentPromisedAt?: Date | string | null;
}

export type PaymentPromiseStatus = "none" | "pending" | "broken";

/**
 * Classifica a promessa de pagamento de um recebível em aberto:
 *  - "none": sem data prometida registrada (ou data inválida);
 *  - "pending": data prometida é hoje ou no futuro — ainda dentro do prazo;
 *  - "broken": data prometida já passou — promessa furada.
 * Como `reconcileShowFees` só devolve linhas em aberto, basta comparar a data
 * prometida com hoje (meia-noite UTC) para saber se a promessa foi quebrada.
 */
export function paymentPromiseStatus(
  promisedAt: Date | string | null | undefined,
  now: Date | string = new Date(),
): PaymentPromiseStatus {
  if (promisedAt == null || promisedAt === "") return "none";
  const promisedMs = utcMidnight(promisedAt);
  if (Number.isNaN(promisedMs)) return "none";
  return promisedMs < utcMidnight(now) ? "broken" : "pending";
}

export interface ReceivablePromiseRow<S extends ReceivableShowLike = ReceivableShowLike> {
  row: ShowReceivableRow<S>;
  status: Exclude<PaymentPromiseStatus, "none">;
  /** Data prometida normalizada à meia-noite UTC. */
  promisedAt: Date;
}

export interface PaymentPromiseSummary<S extends ReceivableShowLike = ReceivableShowLike> {
  /** Promessas furadas (data passou), da mais antiga à mais recente. */
  broken: ReceivablePromiseRow<S>[];
  /** Promessas no prazo (hoje/futuro), da mais próxima à mais distante. */
  pending: ReceivablePromiseRow<S>[];
  brokenCount: number;
  pendingCount: number;
  /** Total em aberto coberto por promessas furadas (centavos). */
  brokenOutstanding: number;
  /** Total em aberto coberto por promessas no prazo (centavos). */
  pendingOutstanding: number;
}

/**
 * Varre os recebíveis em aberto e separa os que têm promessa de pagamento em
 * furadas × no prazo, com totais por grupo. Linhas sem promessa são ignoradas.
 * Cada grupo sai ordenado pela data prometida (mais urgente primeiro) e, em
 * empate, pelo id do show — determinístico para a UI e os testes.
 */
export function summarizePaymentPromises<S extends PromisableShowLike>(
  rows: ShowReceivableRow<S>[],
  now: Date | string = new Date(),
): PaymentPromiseSummary<S> {
  const broken: ReceivablePromiseRow<S>[] = [];
  const pending: ReceivablePromiseRow<S>[] = [];

  for (const row of rows) {
    const status = paymentPromiseStatus(row.show.paymentPromisedAt, now);
    if (status === "none") continue;
    const ms = utcMidnight(row.show.paymentPromisedAt as Date | string);
    const entry: ReceivablePromiseRow<S> = {
      row,
      status,
      promisedAt: new Date(ms),
    };
    (status === "broken" ? broken : pending).push(entry);
  }

  const byDate = (a: ReceivablePromiseRow<S>, b: ReceivablePromiseRow<S>) =>
    a.promisedAt.getTime() - b.promisedAt.getTime() ||
    a.row.show.id.localeCompare(b.row.show.id);
  broken.sort(byDate);
  pending.sort(byDate);

  return {
    broken,
    pending,
    brokenCount: broken.length,
    pendingCount: pending.length,
    brokenOutstanding: sum(broken.map((e) => e.row.outstanding)),
    pendingOutstanding: sum(pending.map((e) => e.row.outstanding)),
  };
}

// ── Recebíveis vencidos SEM promessa (a cobrança que nem começou) ────────────
//
// `summarizePaymentPromises` cobre quem JÁ prometeu (furadas × no prazo) e ignora
// de propósito as linhas sem promessa. Mas o dinheiro mais fácil de esquecer é
// justamente o dos shows já vencidos há um bom tempo para os quais NENHUMA promessa
// foi registrada — a conversa de cobrança nem começou. Esta leitura destila esses
// recebíveis: em aberto, sem promessa e já parados além de um limiar de dias.

export interface AwaitingPromiseRow<S extends ReceivableShowLike = ReceivableShowLike> {
  row: ShowReceivableRow<S>;
  /** Dias decorridos desde a data do show (>= 0). */
  daysOutstanding: number;
}

export interface ReceivablesAwaitingPromise<
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Recebíveis vencidos sem promessa, do atraso mais longo ao mais curto. */
  rows: AwaitingPromiseRow<S>[];
  count: number;
  /** Total em aberto sem promessa e já vencido além do limiar (centavos). */
  totalOutstanding: number;
  /** Maior atraso em dias no grupo (0 se vazio). */
  maxDaysOutstanding: number;
}

/**
 * Limiar padrão (dias) a partir do qual um recebível sem promessa vira alerta de
 * cobrança. 30 dias: passou de "recém-tocado" para "já devia ter combinado o pagamento".
 */
export const AWAITING_PROMISE_MIN_DAYS = 30;

/**
 * Varre os recebíveis em aberto (saída de `reconcileShowFees`) e destila os que
 * NÃO têm promessa de pagamento registrada (`paymentPromiseStatus` === "none") e já
 * estão parados há pelo menos `minDaysOutstanding` dias — a cobrança que ainda nem
 * começou e o dinheiro mais fácil de esquecer. Complementa `summarizePaymentPromises`
 * (que só olha quem já prometeu). Ordena do atraso mais longo ao mais curto (id
 * desempata); `now` e o limiar são injetáveis para teste.
 */
export function receivablesAwaitingPromise<S extends PromisableShowLike>(
  rows: ShowReceivableRow<S>[],
  opts: { now?: Date | string; minDaysOutstanding?: number } = {},
): ReceivablesAwaitingPromise<S> {
  const now = opts.now ?? new Date();
  const todayMs = utcMidnight(now);
  const minDays = opts.minDaysOutstanding ?? AWAITING_PROMISE_MIN_DAYS;

  const matched: AwaitingPromiseRow<S>[] = [];
  for (const row of rows) {
    if (paymentPromiseStatus(row.show.paymentPromisedAt, now) !== "none") continue;
    const days = Math.max(
      0,
      Math.round((todayMs - utcMidnight(row.show.date)) / DAY_MS),
    );
    if (days < minDays) continue;
    matched.push({ row, daysOutstanding: days });
  }

  matched.sort(
    (a, b) =>
      b.daysOutstanding - a.daysOutstanding ||
      a.row.show.id.localeCompare(b.row.show.id),
  );

  return {
    rows: matched,
    count: matched.length,
    totalOutstanding: sum(matched.map((m) => m.row.outstanding)),
    maxDaysOutstanding: matched.reduce((m, a) => Math.max(m, a.daysOutstanding), 0),
  };
}

// ── Nudge de Painel: cobrança que ainda nem começou ─────────────────────────
//
// `receivablesAwaitingPromise` mora na tela `/shows/a-receber` (banner âmbar). Este
// headline leva o mesmo sinal ao Painel num relance, espelhando os irmãos
// (`bookingLeadTimeHeadline`/`staleProposalsHeadline`): puro, sem I/O, recebe o report
// já computado sobre os recebíveis carregados e decide se o Painel deve avisar.

export interface AwaitingPromiseHeadline {
  /** Aparecer no Painel? Só quando há ≥1 recebível vencido além do limiar e SEM promessa. */
  show: boolean;
  /**
   * Ao menos um recebível sem promessa parado há ≥ `criticalDays` — a cobrança nunca
   * começou E o dinheiro já esfriou de vez. Permite ao Painel subir o tom (🔴 vs 🔔).
   */
  critical: boolean;
  /** Nº de cachês sem promessa e já vencidos além do limiar. */
  count: number;
  /** Total em aberto desse grupo (centavos). */
  totalOutstanding: number;
  /** Maior atraso (dias) no grupo (0 se vazio). */
  maxDaysOutstanding: number;
}

/**
 * Limiar (dias) a partir do qual um recebível SEM promessa vira alerta **crítico** no
 * Painel — o mesmo corte do balde "encalhado" do aging (90 dias): passou de "esqueci de
 * combinar" para "o dinheiro esfriou de vez sem nenhuma conversa de cobrança".
 */
export const AWAITING_PROMISE_CRITICAL_DAYS = 90;

/**
 * Deriva o nudge de Painel de `receivablesAwaitingPromise`. Puro, sem I/O: recebe o
 * report já computado. Dispara com qualquer recebível vencido além do limiar e sem
 * promessa (`count > 0`); `critical` quando o mais antigo já passou de `criticalDays`.
 */
export function awaitingPromiseHeadline(
  report: ReceivablesAwaitingPromise,
  opts: { criticalDays?: number } = {},
): AwaitingPromiseHeadline {
  const criticalDays = opts.criticalDays ?? AWAITING_PROMISE_CRITICAL_DAYS;
  return {
    show: report.count > 0,
    critical: report.maxDaysOutstanding >= criticalDays,
    count: report.count,
    totalOutstanding: report.totalOutstanding,
    maxDaysOutstanding: report.maxDaysOutstanding,
  };
}

// ── Nudge de Painel: promessas de pagamento a vencer nos próximos dias ──────
//
// Os três sinais de recebível já no Painel são todos NEGATIVOS: encalhado (🚨),
// promessa furada (🤝) e cobrança que nem começou (🔔). Falta o lado que planeja
// o caixa: das promessas que o contratante fez e que ainda estão NO PRAZO
// (`summarizePaymentPromises().pending`), quais chegam já-já? Esta leitura destila
// as promessas no prazo cuja data cai dentro de uma janela curta (padrão 7 dias) —
// o dinheiro que se pode esperar na semana e cuja falta, se não pingar, é a próxima
// cobrança a fazer. Puro, sem I/O: recebe o `PaymentPromiseSummary` já computado.

/**
 * Janela padrão (dias) para uma promessa de pagamento no prazo virar "a vencer" —
 * o horizonte de caixa da semana. 7 dias: chega dentro dos próximos sete dias.
 */
export const PROMISE_DUE_SOON_DAYS = 7;

export interface PromisesDueSoonHeadline {
  /** Aparecer no Painel? Só quando há ≥1 promessa no prazo vencendo na janela. */
  show: boolean;
  /** Nº de promessas no prazo cuja data cai dentro da janela. */
  count: number;
  /** Total em aberto coberto por essas promessas (centavos). */
  totalOutstanding: number;
  /** Dias até a promessa mais próxima da janela (0 = vence hoje). */
  nextDays: number;
  /** Dias até a promessa mais distante ainda dentro da janela. */
  maxDays: number;
}

/**
 * Deriva de um `PaymentPromiseSummary` (D284) o nudge das promessas no prazo que
 * vencem em breve. Varre `summary.pending` (promessas hoje/futuras, já ordenadas da
 * mais próxima à mais distante) e retém as que caem em [hoje, hoje+`withinDays`];
 * soma o saldo em aberto e reporta o menor/maior nº de dias até o vencimento na
 * janela. Puro; `now` e a janela são injetáveis para teste.
 */
export function promisesDueSoonHeadline<S extends ReceivableShowLike>(
  summary: PaymentPromiseSummary<S>,
  opts: { now?: Date | string; withinDays?: number } = {},
): PromisesDueSoonHeadline {
  const now = opts.now ?? new Date();
  const todayMs = utcMidnight(now);
  const within = opts.withinDays ?? PROMISE_DUE_SOON_DAYS;

  let count = 0;
  let totalOutstanding = 0;
  let nextDays = Infinity;
  let maxDays = 0;
  for (const entry of summary.pending) {
    const days = Math.round((entry.promisedAt.getTime() - todayMs) / DAY_MS);
    if (days < 0 || days > within) continue;
    count += 1;
    totalOutstanding += entry.row.outstanding;
    if (days < nextDays) nextDays = days;
    if (days > maxDays) maxDays = days;
  }

  return {
    show: count > 0,
    count,
    totalOutstanding,
    nextDays: count > 0 ? nextDays : 0,
    maxDays,
  };
}

// ── Cobrança que ainda nem começou, por contratante (de quem nunca cobrei) ──
//
// `receivablesAwaitingPromise` (D287) responde, na carteira inteira, "quanto há
// vencido sem nenhuma promessa registrada?" — mas não diz de QUEM é essa cobrança
// nunca iniciada. Esta leitura quebra o mesmo recorte (recebíveis em aberto, SEM
// promessa e parados há ≥ limiar de dias) pelo contratante responsável pelo
// pagamento, o companheiro por-devedor da leitura da carteira: com quem a conversa
// de cobrança nem começou, e quem concentra o dinheiro mais fácil de esquecer.
// Espelha o agrupamento de `outstandingByContact` (mesmo `getPayer`, mesmo grupo
// `null` "sem contratante" por último), filtrado ao subconjunto sem promessa.

export interface AwaitingPromiseContactRow<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Contratante devedor; `null` agrega os shows sem contato vinculado. */
  contact: C | null;
  /** Nº de cachês sem promessa e já vencidos além do limiar desse contratante. */
  count: number;
  /** Total em aberto sem promessa desse contratante (centavos). */
  totalOutstanding: number;
  /** Maior atraso (dias desde o show) entre os cachês sem promessa do contratante. */
  maxDaysOutstanding: number;
  /** Cachês sem promessa do contratante, do atraso mais longo ao mais curto. */
  rows: AwaitingPromiseRow<S>[];
}

export interface AwaitingPromiseByContact<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Grupos por contratante, do maior saldo sem promessa ao menor; o grupo `null`
   * (sem contratante) vai sempre por último. */
  rows: AwaitingPromiseContactRow<C, S>[];
  /** Nº total de cachês sem promessa além do limiar. */
  count: number;
  /** Soma em aberto de tudo sem promessa além do limiar (centavos). */
  totalOutstanding: number;
  /** Nº de contratantes identificados com cobrança nunca iniciada (exclui `null`). */
  contactCount: number;
  /** Contratante que mais concentra cobrança nunca iniciada (maior total), ou null. */
  topContact: AwaitingPromiseContactRow<C, S> | null;
}

/**
 * Agrupa a "cobrança que ainda nem começou" (`receivablesAwaitingPromise`/D287) pelo
 * contratante que responde pelo pagamento. Puro, sem I/O: varre os recebíveis em
 * aberto (saída de `reconcileShowFees`), retém os SEM promessa (`paymentPromiseStatus`
 * === "none") e já parados há ≥ `minDaysOutstanding` dias (mesmo filtro da leitura da
 * carteira), e os agrupa por `getPayer(show)` (ex.: billing.pickPayerContact; `null`
 * cai em "sem contratante"). Grupos ordenados do MAIOR saldo sem promessa ao menor
 * (desempate: atraso mais longo, depois id); o grupo `null` vai sempre por último. Os
 * cachês de cada grupo vão do atraso mais longo ao mais curto (id desempata). `now` e
 * o limiar são injetáveis para teste.
 */
export function awaitingPromiseByContact<
  C extends { id: string },
  S extends PromisableShowLike,
>(
  rows: ShowReceivableRow<S>[],
  getPayer: (show: S) => C | null,
  opts: { now?: Date | string; minDaysOutstanding?: number } = {},
): AwaitingPromiseByContact<C, S> {
  const now = opts.now ?? new Date();
  const todayMs = utcMidnight(now);
  const minDays = opts.minDaysOutstanding ?? AWAITING_PROMISE_MIN_DAYS;

  interface Group {
    contact: C | null;
    total: number;
    maxDays: number;
    rows: AwaitingPromiseRow<S>[];
  }
  const NO_CONTACT = " "; // chave reservada para o grupo sem contratante
  const groups = new Map<string, Group>();

  for (const row of rows) {
    if (paymentPromiseStatus(row.show.paymentPromisedAt, now) !== "none") continue;
    const days = Math.max(
      0,
      Math.round((todayMs - utcMidnight(row.show.date)) / DAY_MS),
    );
    if (days < minDays) continue;
    const contact = getPayer(row.show);
    const key = contact ? contact.id : NO_CONTACT;
    const g =
      groups.get(key) ??
      ({ contact, total: 0, maxDays: 0, rows: [] } as Group);
    g.total += row.outstanding;
    g.maxDays = Math.max(g.maxDays, days);
    g.rows.push({ row, daysOutstanding: days });
    groups.set(key, g);
  }

  const rowsOut: AwaitingPromiseContactRow<C, S>[] = [];
  let count = 0;
  let totalOutstanding = 0;
  for (const g of groups.values()) {
    g.rows.sort(
      (a, b) =>
        b.daysOutstanding - a.daysOutstanding ||
        a.row.show.id.localeCompare(b.row.show.id),
    );
    count += g.rows.length;
    totalOutstanding += g.total;
    rowsOut.push({
      contact: g.contact,
      count: g.rows.length,
      totalOutstanding: g.total,
      maxDaysOutstanding: g.maxDays,
      rows: g.rows,
    });
  }

  // Maior saldo sem promessa → menor; o grupo sem contratante (null) por último.
  rowsOut.sort((a, b) => {
    if (!a.contact !== !b.contact) return a.contact ? -1 : 1;
    return (
      b.totalOutstanding - a.totalOutstanding ||
      b.maxDaysOutstanding - a.maxDaysOutstanding ||
      (a.contact?.id ?? "").localeCompare(b.contact?.id ?? "")
    );
  });

  const identified = rowsOut.filter((r) => r.contact);
  return {
    rows: rowsOut,
    count,
    totalOutstanding,
    contactCount: identified.length,
    topContact: identified[0] ?? null,
  };
}

// ── Cachês a receber por contratante (de quem cobrar primeiro) ──────────────
//
// O aging (`bucketReceivablesByAge`) responde "qual dinheiro está parado há mais
// tempo?"; esta visão responde "QUEM está te devendo — e há quanto tempo?",
// agrupando o saldo em aberto pelo contratante responsável pelo pagamento. É a
// lista de cobrança priorizada: quem deve mais (e há mais tempo) vem primeiro.

export interface ContactReceivableRow<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Contratante devedor; `null` agrega os shows sem contato vinculado. */
  contact: C | null;
  /** Total ainda a receber atribuído a esse contratante (centavos). */
  outstanding: number;
  /** Nº de shows com saldo em aberto desse contratante. */
  showCount: number;
  /** Maior atraso (dias desde o show) entre os shows do contratante. */
  maxDaysOutstanding: number;
  /** Atraso médio (dias) ponderado pelo valor em aberto. */
  weightedAvgDays: number;
  /** Balde de aging do atraso MAIS LONGO do contratante (para destacar urgência). */
  oldestBucket: ReceivableAgeBucketKey;
  /** Participação no total a receber (0..1). 0 se o total for 0. */
  share: number;
  /** Shows em aberto do contratante, do atraso mais longo ao mais curto. */
  rows: AgedReceivableRow<S>[];
}

export interface OutstandingByContact<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Grupos por contratante, do maior saldo devedor ao menor; o grupo `null`
   * (sem contratante) vai sempre por último. */
  rows: ContactReceivableRow<C, S>[];
  /** Nº de contratantes devedores identificados (exclui o grupo `null`). */
  contactCount: number;
  /** Nº de shows com saldo em aberto. */
  count: number;
  /** Soma de tudo que ainda falta receber (centavos). */
  totalOutstanding: number;
  /** Maior devedor identificado (maior `outstanding`), ou null. */
  topDebtor: ContactReceivableRow<C, S> | null;
  /** Devedor com o atraso mais longo (maior `maxDaysOutstanding`), ou null. */
  oldestDebtor: ContactReceivableRow<C, S> | null;
}

/**
 * Agrupa os cachês a receber (saída de `reconcileShowFees`) pelo contratante que
 * responde pelo pagamento, para priorizar a cobrança por DEVEDOR — complementa o
 * aging por idade com "quem te deve mais, e há quanto tempo".
 *
 * - Reaproveita a idade do atraso de `bucketReceivablesByAge` (mesma regra: dias
 *   UTC desde a data do show, nunca negativo; mesmos baldes de aging).
 * - `getPayer(show)` escolhe o contratante de cada show (ex.: billing.pickPayerContact);
 *   `null` cai no grupo "sem contratante". A identidade do contato vem de `id`.
 * - Por contratante: soma o saldo em aberto, conta os shows, guarda o pior atraso
 *   (`maxDaysOutstanding`) e o atraso médio ponderado pelo valor (`weightedAvgDays`);
 *   `oldestBucket` é o balde de aging do pior atraso (sinal de urgência).
 * - Grupos ordenados do MAIOR saldo devedor ao menor (desempate: atraso mais longo,
 *   depois id); o grupo `null` vai sempre por último. Os shows de cada grupo vão do
 *   atraso mais longo ao mais curto (id desempata). Pura; `now` injetável.
 */
export function outstandingByContact<
  C extends { id: string },
  S extends ReceivableShowLike,
>(
  receivables: ShowReceivables<S>,
  getPayer: (show: S) => C | null,
  opts: { now?: Date | string } = {},
): OutstandingByContact<C, S> {
  const todayMs = utcMidnight(opts.now ?? new Date());

  interface Group {
    contact: C | null;
    outstanding: number;
    weightedDays: number;
    maxDays: number;
    rows: AgedReceivableRow<S>[];
  }
  const NO_CONTACT = " "; // chave reservada para o grupo sem contratante
  const groups = new Map<string, Group>();

  for (const row of receivables.rows) {
    const days = Math.max(
      0,
      Math.round((todayMs - utcMidnight(row.show.date)) / DAY_MS),
    );
    const aged: AgedReceivableRow<S> = {
      row,
      daysOutstanding: days,
      bucket: receivableAgeBucket(days),
    };
    const contact = getPayer(row.show);
    const key = contact ? contact.id : NO_CONTACT;
    const g =
      groups.get(key) ??
      ({ contact, outstanding: 0, weightedDays: 0, maxDays: 0, rows: [] } as Group);
    g.outstanding += row.outstanding;
    g.weightedDays += days * row.outstanding;
    g.maxDays = Math.max(g.maxDays, days);
    g.rows.push(aged);
    groups.set(key, g);
  }

  const totalOutstanding = receivables.totalOutstanding;
  const rows: ContactReceivableRow<C, S>[] = [];
  for (const g of groups.values()) {
    g.rows.sort(
      (a, b) =>
        b.daysOutstanding - a.daysOutstanding ||
        a.row.show.id.localeCompare(b.row.show.id),
    );
    rows.push({
      contact: g.contact,
      outstanding: g.outstanding,
      showCount: g.rows.length,
      maxDaysOutstanding: g.maxDays,
      weightedAvgDays:
        g.outstanding === 0 ? 0 : Math.round(g.weightedDays / g.outstanding),
      oldestBucket: receivableAgeBucket(g.maxDays),
      share: totalOutstanding === 0 ? 0 : g.outstanding / totalOutstanding,
      rows: g.rows,
    });
  }

  // Maior saldo devedor → menor; o grupo sem contratante (contact null) por último.
  rows.sort((a, b) => {
    if (!a.contact !== !b.contact) return a.contact ? -1 : 1;
    return (
      b.outstanding - a.outstanding ||
      b.maxDaysOutstanding - a.maxDaysOutstanding ||
      (a.contact?.id ?? "").localeCompare(b.contact?.id ?? "")
    );
  });

  const identified = rows.filter((r) => r.contact);
  const oldestDebtor = identified.reduce<ContactReceivableRow<C, S> | null>(
    (best, r) =>
      best == null || r.maxDaysOutstanding > best.maxDaysOutstanding ? r : best,
    null,
  );

  return {
    rows,
    contactCount: identified.length,
    count: receivables.rows.length,
    totalOutstanding,
    topDebtor: identified[0] ?? null,
    oldestDebtor,
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
 * Anos (UTC, decrescente) dos shows que entram na leitura de prazo de
 * recebimento — para montar o seletor de período de `/shows/prazo-recebimento`.
 * Considera só os shows com prazo **mensurável** (não cancelados e com ao menos
 * um recebimento INCOME/`received`/vinculado/positivo, a mesma amostra de
 * `paymentLag`): um ano em que nenhum cachê caiu no caixa não mede prazo e não
 * deve virar uma opção vazia no seletor (mesmo cuidado de `cancelledShowYears`/
 * `bookingLeadTimeYears`, que se ancoram no sinal da tela e não em todos os
 * shows). O ano é o da `date` do show — o mesmo eixo de `filterShowsByYear`,
 * que recorta a lista antes de `paymentLag`.
 */
export function paymentLagYears<S extends ReceivableShowLike>(
  shows: S[],
  txs: TxLike[],
): number[] {
  // Shows que receberam ao menos um pagamento qualificável — a mesma regra de
  // entrada de `paymentLag`, para o seletor casar com a amostra da tela.
  const paidShowIds = new Set<string>();
  for (const t of txs) {
    if (t.type !== "INCOME" || !t.received || t.showId == null || t.amount <= 0) continue;
    paidShowIds.add(t.showId);
  }

  const years = new Set<number>();
  for (const s of shows) {
    if (s.status === "CANCELLED" || !paidShowIds.has(s.id)) continue;
    const d = typeof s.date === "string" ? new Date(s.date) : s.date;
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Limiar (em dias) para o comparativo ano a ano do prazo de recebimento tratar
 * uma variação como tendência e não como ruído — o mesmo espírito de
 * `LEAD_TIME_TREND_EPSILON` (7 dias) no eixo de antecedência: uma diferença de
 * poucos dias no DSO mediano entre dois anos é oscilação normal, não uma
 * mudança de hábito de recebimento.
 */
export const PAYMENT_LAG_TREND_EPSILON = 7;

export interface PaymentLagComparison<
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Prazo de recebimento do período atual (tipicamente o ano selecionado). */
  current: PaymentLag<S>;
  /** Prazo de recebimento do período de comparação (tipicamente o ano anterior). */
  previous: PaymentLag<S>;
  /**
   * Variação do prazo MEDIANO (atual − anterior, em dias). Negativo = recebendo
   * **mais rápido** agora (melhora); positivo = mais devagar (piora). Ao
   * contrário do booking lead time, aqui **descer** a mediana é a melhora —
   * mesma direção que cancelamento/concentração (um número menor é melhor).
   */
  medianDaysDelta: number;
  /** Variação do prazo MÉDIO (DSO ponderado, atual − anterior, em dias). */
  avgDaysDelta: number;
  /**
   * Direção do hábito de recebimento entre os dois períodos, decidida pela
   * variação da **mediana** contra `PAYMENT_LAG_TREND_EPSILON`:
   * - "improved": mediana caiu além do limiar (o caixa entra mais cedo);
   * - "worsened": mediana subiu além do limiar (o caixa demora mais a entrar);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara o **prazo de recebimento** (DSO) entre dois períodos (atual ×
 * anterior), espelhando `compareBookingLeadTime` (D187) mas no eixo de dinheiro
 * e com a direção **invertida**: aqui um DSO menor é a melhora (o cachê entra
 * mais cedo), como em `compareCancellationRate`. Pura, sem I/O: recebe dois
 * `paymentLag` já computados (cada um sobre os shows do seu período) e devolve a
 * variação da mediana e da média, além de um veredito de tendência ancorado na
 * **mediana** (resiste a um recebimento muito atrasado, como o próprio
 * `paymentLag`/D57). O chamador decide quando exibir (tipicamente só com um ano
 * específico e ambos os períodos com recebimento — senão a comparação de
 * medianas seria enganosa).
 */
export function comparePaymentLag<S extends ReceivableShowLike>(
  current: PaymentLag<S>,
  previous: PaymentLag<S>,
): PaymentLagComparison<S> {
  const medianDaysDelta = current.medianDays - previous.medianDays;
  return {
    current,
    previous,
    medianDaysDelta,
    avgDaysDelta: current.avgDays - previous.avgDays,
    trend:
      medianDaysDelta <= -PAYMENT_LAG_TREND_EPSILON
        ? "improved"
        : medianDaysDelta >= PAYMENT_LAG_TREND_EPSILON
          ? "worsened"
          : "stable",
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
  /**
   * Prazo MEDIANO (dias) ponderado pelo valor sobre os shows do contratante: o
   * dia em que metade do que esse contratante pagou já tinha entrado. Robusto a
   * outlier — um único show muito atrasado infla `avgDays`, mas não a mediana.
   * Com poucos shows é ruidoso (a UI gateia por `MIN_MEDIAN_LAG_SAMPLE`); o
   * helper computa sempre. 0 se o grupo não recebeu nada.
   */
  medianDays: number;
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
 * Amostra mínima de shows pagos de um contratante para exibir o prazo MEDIANO
 * dele: com 1–2 shows a mediana é tão ruidosa quanto a média (era a ressalva que
 * mantinha o item adiado na D57). Gate de apresentação — o helper computa sempre.
 */
export const MIN_MEDIAN_LAG_SAMPLE = 3;

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
      // Mediana ponderada pelo valor sobre o prazo de cada show do grupo — mesmos
      // insumos do avgDays (avgDays do show, peso = recebido), espelhando o
      // `medianDays` global de `paymentLag`. Resiste a um show muito atrasado.
      medianDays: weightedMedian(
        g.shows.map((s) => ({ value: s.avgDays, weight: s.received })),
      ),
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
 * Variação do prazo de recebimento de UM contratante entre dois períodos (o ano
 * selecionado × o anterior). Espelha o comparativo global (`PaymentLagComparison`/
 * D193) mas por pagador. `avgDaysDelta` negativo = o contratante passou a te pagar
 * **mais rápido** (melhora); positivo = mais devagar (piora).
 */
export interface ContactPaymentLagChange<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /** Contratante comparado — sempre identificado (o grupo "sem contratante" fica de fora). */
  contact: C;
  /** Linha do contratante no período atual. */
  current: ContactPaymentLagRow<C, S>;
  /** Linha do contratante no período anterior. */
  previous: ContactPaymentLagRow<C, S>;
  /**
   * Variação do prazo MÉDIO ponderado (atual − anterior, em dias). Negativo =
   * pagando mais rápido agora; positivo = mais devagar. Ancora o veredito.
   */
  avgDaysDelta: number;
  /** Variação do prazo MEDIANO (atual − anterior, em dias) — só informativo. */
  medianDaysDelta: number;
  /**
   * Direção do hábito de pagamento do contratante, pela variação da **média**
   * contra `PAYMENT_LAG_TREND_EPSILON`:
   * - "improved": a média caiu além do limiar (te paga mais cedo);
   * - "worsened": subiu além do limiar (demora mais);
   * - "stable": dentro do limiar (ruído).
   */
  trend: "improved" | "worsened" | "stable";
}

export interface PaymentLagByContactComparison<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> {
  /**
   * Contratantes presentes nos DOIS períodos, com a variação do prazo. Ordenados
   * da maior piora à maior melhora (quem desacelerou primeiro), para o "mover" de
   * cima do card ser o que mais merece atenção.
   */
  changes: ContactPaymentLagChange<C, S>[];
  /** Quem mais acelerou (variação de média mais negativa entre os "improved"). */
  biggestImprovement: ContactPaymentLagChange<C, S> | null;
  /** Quem mais desacelerou (variação de média mais positiva entre os "worsened"). */
  biggestWorsening: ContactPaymentLagChange<C, S> | null;
  /** Contratantes que só pagaram no período atual (novos pagadores). */
  newContacts: ContactPaymentLagRow<C, S>[];
  /** Contratantes que pagaram no anterior mas não no atual (sumiram do caixa). */
  droppedContacts: ContactPaymentLagRow<C, S>[];
}

/**
 * Compara o **prazo de recebimento por contratante** entre dois períodos (atual ×
 * anterior), casando os contratantes por `contact.id`. Para cada um presente nos
 * dois períodos devolve a variação do prazo (quem começou a te pagar mais rápido /
 * mais devagar); os que aparecem só num período viram `newContacts`/`droppedContacts`.
 *
 * Pura, sem I/O: recebe dois `paymentLagByContact` já computados (cada um sobre os
 * shows do seu período). Ao contrário do booking lead time (subir é melhora), aqui
 * **descer** o prazo é a melhora — o cachê entra mais cedo, como no comparativo
 * global (D193) e na taxa de cancelamento (D181).
 *
 * O veredito por contratante ancora na **média ponderada** (`avgDays`), não na
 * mediana como o comparativo global: por pagador a amostra costuma ser pequena
 * (< `MIN_MEDIAN_LAG_SAMPLE`) e a mediana fica ruidosa, ao passo que `avgDays` está
 * sempre definido e é exatamente o eixo por que a página ordena e destaca "paga
 * mais rápido/devagar". Reusa `PAYMENT_LAG_TREND_EPSILON` (=7 dias) como limiar. O
 * chamador decide quando exibir (tipicamente só com um ano específico e ambos os
 * períodos com recebimento).
 */
export function comparePaymentLagByContact<
  C extends { id: string },
  S extends ReceivableShowLike,
>(
  current: PaymentLagByContact<C, S>,
  previous: PaymentLagByContact<C, S>,
): PaymentLagByContactComparison<C, S> {
  const prevById = new Map<string, ContactPaymentLagRow<C, S>>();
  for (const r of previous.rows) {
    if (r.contact) prevById.set(r.contact.id, r);
  }

  const currentIds = new Set<string>();
  const changes: ContactPaymentLagChange<C, S>[] = [];
  const newContacts: ContactPaymentLagRow<C, S>[] = [];

  for (const cur of current.rows) {
    if (!cur.contact) continue; // grupo "sem contratante" não é comparável
    currentIds.add(cur.contact.id);
    const prev = prevById.get(cur.contact.id);
    if (!prev) {
      newContacts.push(cur);
      continue;
    }
    const avgDaysDelta = cur.avgDays - prev.avgDays;
    changes.push({
      contact: cur.contact,
      current: cur,
      previous: prev,
      avgDaysDelta,
      medianDaysDelta: cur.medianDays - prev.medianDays,
      trend:
        avgDaysDelta <= -PAYMENT_LAG_TREND_EPSILON
          ? "improved"
          : avgDaysDelta >= PAYMENT_LAG_TREND_EPSILON
            ? "worsened"
            : "stable",
    });
  }

  const droppedContacts = previous.rows.filter(
    (r): r is ContactPaymentLagRow<C, S> & { contact: C } =>
      !!r.contact && !currentIds.has(r.contact.id),
  );

  // Maior piora no topo (variação de média desc); empate estável pelo id.
  changes.sort(
    (a, b) =>
      b.avgDaysDelta - a.avgDaysDelta || a.contact.id.localeCompare(b.contact.id),
  );

  let biggestImprovement: ContactPaymentLagChange<C, S> | null = null;
  let biggestWorsening: ContactPaymentLagChange<C, S> | null = null;
  for (const c of changes) {
    if (
      c.trend === "improved" &&
      (!biggestImprovement || c.avgDaysDelta < biggestImprovement.avgDaysDelta)
    ) {
      biggestImprovement = c;
    }
    if (
      c.trend === "worsened" &&
      (!biggestWorsening || c.avgDaysDelta > biggestWorsening.avgDaysDelta)
    ) {
      biggestWorsening = c;
    }
  }

  return { changes, biggestImprovement, biggestWorsening, newContacts, droppedContacts };
}

/**
 * Status de uma linha da tabela por contratante (período atual) frente ao período
 * anterior, para a coluna "vs. {ano-1}":
 * - "changed": o contratante existia nos dois períodos — traz a variação do prazo;
 * - "new": só apareceu no período atual (começou a pagar agora);
 * - "none": o grupo "sem contratante" (não é comparável).
 */
export type ContactPaymentLagRowStatus<
  C,
  S extends ReceivableShowLike = ReceivableShowLike,
> =
  | { kind: "changed"; change: ContactPaymentLagChange<C, S> }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da tabela por contratante (período atual) com sua situação no
 * comparativo `comparePaymentLagByContact`, indexando por `contact.id` para o
 * consumidor resolver a coluna "vs. {ano-1}" em O(1) — sem repetir a varredura na
 * apresentação. Puro: recebe o comparativo já computado e devolve uma função de
 * lookup. Um contratante presente nos dois períodos vira "changed"; um que só está
 * no atual (em `newContacts`) vira "new"; qualquer outro id (incluindo o grupo sem
 * contratante) vira "none".
 */
export function indexContactPaymentLagChanges<
  C extends { id: string },
  S extends ReceivableShowLike,
>(
  comparison: PaymentLagByContactComparison<C, S>,
): (contactId: string | null | undefined) => ContactPaymentLagRowStatus<C, S> {
  const changedById = new Map<string, ContactPaymentLagChange<C, S>>();
  for (const c of comparison.changes) changedById.set(c.contact.id, c);
  const newIds = new Set<string>();
  for (const r of comparison.newContacts) if (r.contact) newIds.add(r.contact.id);

  return (contactId) => {
    if (!contactId) return { kind: "none" };
    const change = changedById.get(contactId);
    if (change) return { kind: "changed", change };
    if (newIds.has(contactId)) return { kind: "new" };
    return { kind: "none" };
  };
}

// ── Manchete de prazo de recebimento POR CONTRATANTE para o Painel (quem passou a pagar mais devagar?) ──
// Enquanto `paymentLagHeadline` (D70) alerta sobre o DSO do caixa INTEIRO (o prazo
// mediano em ABSOLUTO), este destila QUAL contratante recorrente passou a te pagar
// com materialmente MAIS dias de atraso de um ano para o outro — o eco de
// `comparePaymentLagByContact` (D194) no dashboard, irmão no eixo do recebimento de
// `contactBookingLeadTimeDropHeadline` (D272, antecedência) e `contactConversionDropHeadline`
// (D248, conversão). Fecha a paridade: os eixos por-contratante mais novos (antecedência,
// conversão, deliberação) já ecoavam no Painel; o do prazo de recebimento — o ORIGINAL
// da família (D194/D195) — só vivia na página. É mais acionável (diz DE QUEM renegociar
// prazo / cobrar adiantamento) e pega o caso que o nudge absoluto perde: o caixa segue com
// DSO saudável na média, mas um pagador específico começou a te deixar esperando.
//
// Ancora na MÉDIA ponderada (`avgDays`), não na mediana — a mesma escolha deliberada de
// `comparePaymentLagByContact` (a amostra por pagador costuma ser pequena e a mediana fica
// ruidosa; `avgDays` está sempre definido e é o eixo por que a página ordena/destaca). Reusa
// o gate de confiança do axis (amostra ≥ `MIN_MEDIAN_LAG_SAMPLE` shows pagos nas DUAS coortes)
// e um piso de piora material (≥ `PAYMENT_LAG_RISE_DAYS`, o dobro do `PAYMENT_LAG_TREND_EPSILON`
// do veredito do card). Só a ponta de PIORA (pagar mais devagar) vira nudge; passar a pagar
// mais rápido é boa notícia. Pura, sem I/O.

/**
 * Aumento mínimo do prazo médio (em dias) para o nudge de "passou a pagar mais
 * devagar" por contratante disparar. Duas semanas — o dobro de
 * `PAYMENT_LAG_TREND_EPSILON` (=7, o limiar do veredito do card), espelhando
 * `LEAD_TIME_DROP_DAYS` no eixo da antecedência: o Painel só alerta com uma piora de
 * prazo de fato material, não qualquer oscilação.
 */
export const PAYMENT_LAG_RISE_DAYS = 14;
/** Aumento do prazo médio (em dias) que escala o nudge para crítico (um mês a mais para o caixa entrar). */
export const PAYMENT_LAG_RISE_CRITICAL_DAYS = 30;

/** Manchete de prazo de recebimento por contratante para o Painel (nudge de piora do prazo ano a ano). */
export interface ContactPaymentLagRiseHeadline<C> {
  /** True quando o nudge deve aparecer (um contratante com piora confiável e material). */
  show: boolean;
  /** True quando a piora desse contratante entra na faixa crítica (≥ `criticalDays`). */
  critical: boolean;
  /** O contratante que mais desacelerou (dentre os que passam no gate), ou `null`. */
  contact: C | null;
  /** Aumento do prazo médio em dias (atual − anterior); ≥ 0 quando `show`. */
  riseDays: number;
  /** Prazo médio do contratante na coorte atual (dias). */
  currentAvgDays: number;
  /** Prazo médio do contratante na coorte anterior (dias). */
  previousAvgDays: number;
  /** Shows pagos do contratante na coorte atual (a amostra da média). */
  sample: number;
  /**
   * Quantos OUTROS contratantes também passaram no gate de piora material e
   * confiável (para o banner: "+N desaceleraram"). 0 quando só um qualifica.
   */
  others: number;
}

/**
 * Decide se o Painel deve alertar que UM contratante específico passou a te pagar
 * com materialmente MAIS dias de atraso de um ano para o outro — o eco de
 * `comparePaymentLagByContact` (D194) no dashboard, irmão por-contratante de
 * `paymentLagHeadline` no eixo absoluto e espelho de
 * `contactBookingLeadTimeDropHeadline` (D272) no eixo do recebimento. Recebe um
 * comparativo já computado (dois `paymentLagByContact`, cada um sobre a coorte do
 * seu ano) e não faz I/O.
 *
 * Varre os `changes` (já ordenados da maior piora à maior melhora, por `avgDaysDelta`
 * desc) e escolhe o contratante de MAIOR piora de prazo que ainda tenha amostra
 * confiável — ao menos `minSample` shows pagos em CADA coorte, para a média não se
 * apoiar em 1–2 shows — e alta de ao menos `riseDays` dias. `critical` quando essa
 * alta chega a `criticalDays` ou mais; `others` conta quantos outros contratantes
 * também passariam no mesmo gate (o banner os resume). Como os nudges irmãos, só a
 * ponta de PIORA vira alerta e o gate o mantém raro. Ancora na MÉDIA (`avgDays`),
 * como o comparativo. Pura.
 */
export function contactPaymentLagRiseHeadline<
  C extends { id: string; name: string },
  S extends ReceivableShowLike,
>(
  comparison: PaymentLagByContactComparison<C, S>,
  minSample: number = MIN_MEDIAN_LAG_SAMPLE,
  riseDays: number = PAYMENT_LAG_RISE_DAYS,
  criticalDays: number = PAYMENT_LAG_RISE_CRITICAL_DAYS,
): ContactPaymentLagRiseHeadline<C> {
  const qualifies = (c: ContactPaymentLagChange<C, S>): boolean => {
    const reliable =
      c.current.showCount >= minSample && c.previous.showCount >= minSample;
    return reliable && c.avgDaysDelta >= riseDays;
  };

  // `changes` já vem ordenado por `avgDaysDelta` desc (maior piora de prazo
  // primeiro), então o primeiro que passa no gate é o de maior alta.
  const worst = comparison.changes.find(qualifies) ?? null;
  if (!worst) {
    return {
      show: false,
      critical: false,
      contact: null,
      riseDays: 0,
      currentAvgDays: 0,
      previousAvgDays: 0,
      sample: 0,
      others: 0,
    };
  }

  const rise = worst.avgDaysDelta;
  const others = comparison.changes.reduce(
    (n, c) => (c !== worst && qualifies(c) ? n + 1 : n),
    0,
  );
  return {
    show: true,
    critical: rise >= criticalDays,
    contact: worst.contact,
    riseDays: rise,
    currentAvgDays: worst.current.avgDays,
    previousAvgDays: worst.previous.avgDays,
    sample: worst.current.showCount,
    others,
  };
}

/**
 * Decide quanto lançar ao quitar um cachê, dado o valor pedido pelo usuário e o
 * saldo em aberto (recalculado no servidor — a fonte de verdade). Regras:
 * saldo em aberto (recalculado no servidor — a fonte de verdade). Regras:
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

/**
 * Resolve a data prometida de pagamento ("YYYY-MM-DD") para um `Date` à meia-noite
 * UTC, ou `null` quando vazia/inválida (sinal de "limpar a promessa"). Diferente de
 * `resolveReceivedDate`, datas no FUTURO são válidas — uma promessa é, por natureza,
 * uma data futura. O servidor usa isto para nunca confiar num valor cru do cliente.
 */
export function resolvePromiseDate(raw: string | null | undefined): Date | null {
  if (!isValidDateKey(raw)) return null;
  const [y, m, d] = raw.trim().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
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

// ── Contas fixas ainda não lançadas no mês (lembrete acionável) ──────────────
//
// `recurringExpenses` (D39) descobre QUAIS são os custos fixos; isto responde
// "quais ainda NÃO lancei este mês?". Cruza as categorias recorrentes ainda
// ativas com as despesas já registradas no mês de referência: a categoria que
// costuma cair todo mês mas ainda não apareceu vira um lembrete — com a conta
// típica pré-calculada, para lançar com um clique (ver D91).

export interface PendingFixedCost {
  /** Categoria recorrente sem lançamento no mês de referência. */
  category: string;
  /** Conta típica (centavos) — `avgPerActiveMonth` da categoria em `recurringExpenses`. */
  typicalAmount: number;
  /** Última ocorrência da categoria ("YYYY-MM"). */
  lastMonth: string;
  /** Nº de meses distintos em que a categoria já apareceu. */
  monthsActive: number;
}

export interface PendingFixedCostsReport {
  /** Mês de referência verificado ("YYYY-MM"). */
  month: string;
  /** Categorias recorrentes ativas SEM despesa lançada no mês de referência. */
  pending: PendingFixedCost[];
  /** Nº de categorias recorrentes ativas já lançadas no mês de referência. */
  loggedCount: number;
  /** Total de categorias recorrentes ativas (lançadas + pendentes). */
  activeCount: number;
  /** Soma das contas típicas das pendentes (centavos). */
  totalPending: number;
}

/**
 * Lista os CUSTOS FIXOS recorrentes que costumam cair todo mês mas ainda não
 * foram lançados no mês de referência (`options.now`, default agora). Reaproveita
 * `recurringExpenses` para identificar as categorias recorrentes AINDA ATIVAS e
 * filtra as que já têm ao menos uma despesa registrada no mês — o restante é o
 * que falta lançar, ordenado pela maior conta típica primeiro (a ordem de
 * `recurringExpenses`). Pura; mesmas opções/semântica de `recurringExpenses`.
 */
export function pendingFixedCosts(
  txs: TxLike[],
  options: RecurringExpensesOptions = {},
): PendingFixedCostsReport {
  const month = monthKey(options.now ?? new Date());
  const active = recurringExpenses(txs, options).categories.filter((c) => c.active);

  // Categorias de despesa que JÁ têm ao menos um lançamento no mês de referência.
  const loggedThisMonth = new Set<string>();
  for (const t of txs) {
    if (t.type !== "EXPENSE" || t.amount <= 0) continue;
    if (monthKey(t.date) !== month) continue;
    const category = (t.category ?? "").trim() || "Sem categoria";
    loggedThisMonth.add(category);
  }

  const pending: PendingFixedCost[] = [];
  let loggedCount = 0;
  for (const c of active) {
    if (loggedThisMonth.has(c.category)) {
      loggedCount += 1;
      continue;
    }
    pending.push({
      category: c.category,
      typicalAmount: c.avgPerActiveMonth,
      lastMonth: c.lastMonth,
      monthsActive: c.monthsActive,
    });
  }

  const totalPending = pending.reduce((sum, c) => sum + c.typicalAmount, 0);

  return {
    month,
    pending,
    loggedCount,
    activeCount: active.length,
    totalPending,
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

/**
 * Abaixo desta fração da meta o déficit de shows é crítico: o ritmo atual cobre
 * metade ou menos dos shows/mês necessários para bancar o custo fixo. HIPÓTESE de
 * planejamento (ver D68/D99 — os limiares de nudge são calibráveis).
 */
export const BREAK_EVEN_CRITICAL_RATIO = 0.5;

export interface BreakEvenHeadline {
  /**
   * Deve aparecer no Painel? Só quando há uma meta de shows a bater
   * (`showsNeeded != null`) e o ritmo atual **não a cobre** (`covered === false`).
   * Sem custo fixo, com o show médio no vermelho (`showsNeeded == null`) ou já
   * cobrindo a conta (`covered === true`) o aviso seria ruído — mesma disciplina de
   * `cashBurnHeadline`/`yearToDatePaceHeadline`.
   */
  show: boolean;
  /** Déficit acentuado (ritmo atual ≤ metade da meta de shows/mês)? */
  critical: boolean;
  /** Shows/mês necessários para cobrir o custo fixo (não-`null` quando `show`). */
  showsNeeded: number | null;
  /** Ritmo atual de shows realizados por mês (o que falta para a meta). */
  avgShowsPerMonth: number;
  /** Custo fixo mensal estimado (centavos) que sustenta a meta. */
  monthlyFixedCost: number;
}

/**
 * Resumo de Painel do **ponto de equilíbrio** em shows: deriva, de um
 * `computeBreakEven` já computado, se o nudge deve aparecer e com que urgência.
 * Pura, sem I/O — espelha `cashBurnHeadline`/`yearToDatePaceHeadline`: a regra de
 * exibição vive aqui, o dashboard só consome. Complementa o nudge de fôlego de
 * caixa (`cashBurnHeadline`, que olha o caixa): este responde "meu ritmo de shows
 * cobre o custo fixo do mês?" — dispara só quando o músico está abaixo da meta.
 */
export function breakEvenHeadline(analysis: BreakEvenAnalysis): BreakEvenHeadline {
  const show = analysis.showsNeeded != null && analysis.covered === false;
  const critical =
    show &&
    analysis.showsNeeded! > 0 &&
    analysis.avgShowsPerMonth / analysis.showsNeeded! <= BREAK_EVEN_CRITICAL_RATIO;
  return {
    show,
    critical,
    showsNeeded: analysis.showsNeeded,
    avgShowsPerMonth: analysis.avgShowsPerMonth,
    monthlyFixedCost: analysis.monthlyFixedCost,
  };
}

// ── Fôlego de caixa (por quantos meses o caixa cobre os custos fixos) ────────

/** Dias médios por mês (365,25 / 12) — para projetar a data de esgotamento. */
const AVG_DAYS_PER_MONTH = 365.25 / 12;

/**
 * Veredito do fôlego de caixa:
 * - `no-cost`: não há custo fixo recorrente identificado — nada a sustentar.
 * - `negative`: caixa atual ≤ 0 — já no vermelho, não há fôlego a medir.
 * - `critical`: o caixa cobre menos de `CRITICAL_RUNWAY_MONTHS` meses de custo fixo.
 * - `tight`: cobre de `CRITICAL` a menos de `HEALTHY_RUNWAY_MONTHS` meses.
 * - `healthy`: cobre `HEALTHY_RUNWAY_MONTHS` meses ou mais.
 */
export type RunwayVerdict = "healthy" | "tight" | "critical" | "no-cost" | "negative";

/** Abaixo disto o fôlego é crítico (meses). HIPÓTESE de planejamento — ver D99. */
export const CRITICAL_RUNWAY_MONTHS = 3;
/** A partir disto o fôlego é confortável (meses). HIPÓTESE de planejamento — ver D99. */
export const HEALTHY_RUNWAY_MONTHS = 6;

export interface CashRunway {
  /** Caixa realizado atual (recebido − pago), em centavos. Pode ser negativo. */
  currentCash: number;
  /** Custo fixo mensal estimado (centavos) — de `recurringExpenses`. */
  monthlyFixedCost: number;
  /**
   * Por quantos meses o caixa atual cobre o custo fixo: `currentCash / monthlyFixedCost`.
   * Número não arredondado (≥ 0). `null` quando não há o que medir:
   * - `monthlyFixedCost <= 0` (sem custo fixo recorrente), ou
   * - `currentCash <= 0` (caixa já zerado/negativo).
   */
  runwayMonths: number | null;
  /**
   * Data estimada em que o caixa zera (`now` + `runwayMonths` meses, mês ≈ 30,44 dias).
   * `null` quando `runwayMonths` é `null`. Aproximada (planejamento, não contabilidade).
   */
  depletionDate: Date | null;
  /** Veredito de saúde do fôlego (ver `RunwayVerdict`). */
  verdict: RunwayVerdict;
}

/**
 * Fôlego de caixa: "se as receitas parassem hoje, por quantos meses o caixa atual
 * cobriria meus custos fixos?". Cruza dois números já existentes:
 *
 * - `currentCash` = caixa realizado de `summarizeFinances` (recebido − pago); só o
 *   que de fato entrou/saiu, não pendências (o pessimismo é deliberado — fôlego é o
 *   que você tem em mãos, não o que promete entrar).
 * - `monthlyFixedCost` = `recurringExpenses().estimatedMonthlyFixedCost` (D39): a soma
 *   das contas típicas das categorias recorrentes ainda ativas.
 *
 * `runwayMonths = currentCash / monthlyFixedCost`. É um indicador de resiliência
 * (fundo de emergência do autônomo), complementar ao ponto de equilíbrio (D40, que
 * mede o fluxo necessário) e à reserva de impostos (D41). Pura; `now` e as opções de
 * recorrência são injetáveis.
 */
export function cashRunway(
  txs: TxLike[],
  options: { now?: Date | string; recurring?: RecurringExpensesOptions } = {},
): CashRunway {
  const now = options.now ?? new Date();
  const currentCash = summarizeFinances(txs).cashBalance;
  const monthlyFixedCost = recurringExpenses(txs, {
    now,
    ...options.recurring,
  }).estimatedMonthlyFixedCost;

  if (monthlyFixedCost <= 0) {
    return { currentCash, monthlyFixedCost, runwayMonths: null, depletionDate: null, verdict: "no-cost" };
  }
  if (currentCash <= 0) {
    return { currentCash, monthlyFixedCost, runwayMonths: null, depletionDate: null, verdict: "negative" };
  }

  const runwayMonths = currentCash / monthlyFixedCost;
  const nowMs = (typeof now === "string" ? new Date(now) : now).getTime();
  const depletionDate = new Date(nowMs + runwayMonths * AVG_DAYS_PER_MONTH * 86_400_000);

  const verdict: RunwayVerdict =
    runwayMonths < CRITICAL_RUNWAY_MONTHS
      ? "critical"
      : runwayMonths < HEALTHY_RUNWAY_MONTHS
        ? "tight"
        : "healthy";

  return { currentCash, monthlyFixedCost, runwayMonths, depletionDate, verdict };
}

// ── Fôlego de caixa pelo burn rate realizado (gasto líquido recente) ─────────

/**
 * Janela padrão (meses completos anteriores ao mês corrente) usada para medir o
 * burn rate. 6 meses suaviza a sazonalidade de quem tem renda irregular sem
 * diluir demais uma virada recente de patamar.
 */
export const DEFAULT_BURN_WINDOW_MONTHS = 6;

/** Menor janela de burn rate admitida (1 mês). */
export const BURN_WINDOW_MIN = 1;
/** Maior janela de burn rate admitida (24 meses). */
export const BURN_WINDOW_MAX = 24;

/**
 * Janelas oferecidas no seletor da página de fôlego de caixa. Trimestre (3),
 * semestre (6, default), ano (12) e dois anos (24) cobrem do recorte recente à
 * média mais suave. Todas dentro de [`BURN_WINDOW_MIN`, `BURN_WINDOW_MAX`].
 */
export const BURN_WINDOW_PRESETS: readonly number[] = [3, 6, 12, 24];

/**
 * Veredito do fôlego pelo burn rate:
 * - `surplus`: no período observado o caixa **cresceu** (entrou mais do que saiu) —
 *   não há queima a sustentar; o fôlego é, na prática, ilimitado.
 * - `negative`: caixa atual ≤ 0 — já no vermelho, não há fôlego a medir.
 * - `critical` / `tight` / `healthy`: mesmos limiares de `cashRunway`
 *   (`CRITICAL_RUNWAY_MONTHS` / `HEALTHY_RUNWAY_MONTHS`).
 */
export type BurnRunwayVerdict = "healthy" | "tight" | "critical" | "surplus" | "negative";

export interface CashBurnRunway {
  /** Caixa realizado atual (recebido − pago), em centavos. Pode ser negativo. */
  currentCash: number;
  /** Nº de meses completos observados na janela (entrada saneada). */
  windowMonths: number;
  /** Receita recebida no caixa dentro da janela (centavos). */
  windowReceivedIncome: number;
  /** Despesa paga no caixa dentro da janela (centavos). */
  windowPaidExpense: number;
  /**
   * Fluxo de caixa líquido médio por mês na janela (centavos): pode ser positivo
   * (caixa cresce) ou negativo (caixa queima). `(received − paid) / windowMonths`.
   */
  avgMonthlyNet: number;
  /**
   * Queima média de caixa por mês (centavos, ≥ 0): `max(0, -avgMonthlyNet)`.
   * Zero quando o caixa não queima (média de fluxo ≥ 0).
   */
  monthlyBurn: number;
  /**
   * Por quantos meses o caixa atual cobre a queima média: `currentCash / monthlyBurn`.
   * Número não arredondado (≥ 0). `null` quando não há o que medir:
   * - `monthlyBurn <= 0` (caixa não queima — verdict `surplus`), ou
   * - `currentCash <= 0` (caixa já zerado/negativo — verdict `negative`).
   */
  runwayMonths: number | null;
  /**
   * Data estimada em que o caixa zera (`now` + `runwayMonths` meses). `null` quando
   * `runwayMonths` é `null`. Aproximada (planejamento, não contabilidade).
   */
  depletionDate: Date | null;
  /** Veredito de saúde do fôlego (ver `BurnRunwayVerdict`). */
  verdict: BurnRunwayVerdict;
}

/**
 * Fôlego de caixa pelo **burn rate realizado**: "ao meu ritmo real de gasto dos
 * últimos meses, por quantos meses o caixa atual me sustenta?".
 *
 * Diferente de `cashRunway` (que cobre só o custo fixo recorrente, D99), aqui o
 * denominador é o fluxo de caixa líquido médio efetivo da janela — **inclui custos
 * variáveis e desconta a receita que de fato entrou**. É o cenário "completo": se o
 * músico já cobre os gastos com a renda corrente, o caixa não queima (`surplus`) e o
 * fôlego é ilimitado; se queima, mede quanto tempo o colchão dura nesse ritmo.
 *
 * Janela = os `months` meses **completos** anteriores ao mês corrente (exclui o mês
 * em curso, ainda parcial, para não subestimar/superestimar a queima). Considera só o
 * caixa realizado (`received === true`), em paridade com `currentCash`. Pura; `now` e
 * o tamanho da janela são injetáveis.
 */
export function cashBurnRunway(
  txs: TxLike[],
  options: { now?: Date | string; months?: number } = {},
): CashBurnRunway {
  const now = typeof options.now === "string" ? new Date(options.now) : (options.now ?? new Date());
  const windowMonths = sanitizeBurnWindow(options.months);
  const currentCash = summarizeFinances(txs).cashBalance;

  // Janela: [primeiro dia de (mês corrente − windowMonths), primeiro dia do mês corrente).
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const windowEndMs = Date.UTC(y, m, 1);
  const windowStartMs = Date.UTC(y, m - windowMonths, 1);

  let windowReceivedIncome = 0;
  let windowPaidExpense = 0;
  for (const t of txs) {
    if (!t.received) continue;
    const ts = txTime(t);
    if (ts < windowStartMs || ts >= windowEndMs) continue;
    if (t.type === "INCOME") windowReceivedIncome += t.amount;
    else windowPaidExpense += t.amount;
  }

  const avgMonthlyNet = Math.round((windowReceivedIncome - windowPaidExpense) / windowMonths);
  const monthlyBurn = Math.max(0, -avgMonthlyNet);

  const base = {
    currentCash,
    windowMonths,
    windowReceivedIncome,
    windowPaidExpense,
    avgMonthlyNet,
    monthlyBurn,
  };

  if (monthlyBurn <= 0) {
    return { ...base, runwayMonths: null, depletionDate: null, verdict: "surplus" };
  }
  if (currentCash <= 0) {
    return { ...base, runwayMonths: null, depletionDate: null, verdict: "negative" };
  }

  const runwayMonths = currentCash / monthlyBurn;
  const depletionDate = new Date(now.getTime() + runwayMonths * AVG_DAYS_PER_MONTH * 86_400_000);
  const verdict: BurnRunwayVerdict =
    runwayMonths < CRITICAL_RUNWAY_MONTHS
      ? "critical"
      : runwayMonths < HEALTHY_RUNWAY_MONTHS
        ? "tight"
        : "healthy";

  return { ...base, runwayMonths, depletionDate, verdict };
}

/**
 * Sanitiza a janela de burn rate: inteiro em [`BURN_WINDOW_MIN`, `BURN_WINDOW_MAX`],
 * default `DEFAULT_BURN_WINDOW_MONTHS`.
 */
function sanitizeBurnWindow(months: number | undefined): number {
  if (months === undefined || !Number.isFinite(months)) return DEFAULT_BURN_WINDOW_MONTHS;
  const n = Math.trunc(months);
  if (n < BURN_WINDOW_MIN) return BURN_WINDOW_MIN;
  if (n > BURN_WINDOW_MAX) return BURN_WINDOW_MAX;
  return n;
}

/**
 * Lê a janela de burn rate de um query param (`?meses=`) e a saneia para
 * [`BURN_WINDOW_MIN`, `BURN_WINDOW_MAX`]. Aceita string única ou repetida (usa a
 * primeira); valor ausente, vazio ou não-numérico cai no `fallback`. Pura — espelha
 * `parseWeekendWindow` (shows.ts) reaproveitando `sanitizeBurnWindow` para o clamp.
 */
export function parseBurnWindow(
  raw: string | string[] | undefined,
  fallback: number = DEFAULT_BURN_WINDOW_MONTHS,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return sanitizeBurnWindow(n);
}

// ── Ritmo do mês corrente ("como vai o mês até agora?") ──────────────────────

/**
 * Veredito do ritmo do mês: comparando a **projeção** de receita do mês corrente
 * (extrapolação pro-rata do que já foi lançado) contra o "mês típico" recente.
 * `insufficient` quando não há histórico de receita para servir de base.
 */
export type MonthPaceVerdict = "ahead" | "onPace" | "behind" | "insufficient";

/**
 * Folga relativa (±10%) em torno do mês típico dentro da qual o ritmo é
 * considerado "no ritmo" — evita classificar oscilações normais como alerta.
 */
export const MONTH_PACE_EPSILON = 0.1;

export interface MonthPace {
  /** Mês corrente "YYYY-MM" (UTC). */
  month: string;
  /** Dia de referência dentro do mês (1–31), extraído de `now` (UTC). */
  dayOfMonth: number;
  /** Total de dias do mês corrente. */
  daysInMonth: number;
  /** Fração do mês já decorrida = `dayOfMonth / daysInMonth` (0 < elapsed ≤ 1). */
  elapsed: number;
  /**
   * Receitas/despesas **lançadas** no mês corrente até `now` (regime de
   * competência, pela `date` da transação — a mesma base de `summarizeFinances`
   * e da sazonalidade), em centavos.
   */
  income: number;
  expense: number;
  /** `income − expense` do mês corrente até agora. */
  net: number;
  /**
   * Projeção linear (pro-rata) do fechamento do mês: valor até agora ÷ `elapsed`,
   * arredondado. Pressupõe lançamentos uniformes no mês (hipótese frágil cedo no
   * mês — a UI deve sinalizar; ver DECISIONS).
   */
  projectedIncome: number;
  projectedExpense: number;
  /** `projectedIncome − projectedExpense`. */
  projectedNet: number;
  /**
   * "Mês típico" recente: média dos meses **completos com movimento** na janela
   * (centavos). Base para dizer se o mês corrente vai acima/abaixo do normal.
   */
  baselineIncome: number;
  baselineExpense: number;
  /** `baselineIncome − baselineExpense`. */
  baselineNet: number;
  /** Quanto se esperaria já ter lançado a esta altura num mês típico = baseline × `elapsed`. */
  expectedIncomeByNow: number;
  expectedExpenseByNow: number;
  /** Nº de meses completos (com movimento) que entraram na baseline. */
  baselineMonths: number;
  /** Janela (em meses completos anteriores) considerada para a baseline. */
  windowMonths: number;
  /** Comparação da **projeção** vs. o mês típico (`current` = projeção, `previous` = baseline). */
  incomeVsBaseline: MetricDelta;
  expenseVsBaseline: MetricDelta;
  netVsBaseline: MetricDelta;
  /**
   * Veredito do ritmo, decidido pela **receita** (o sinal mais limpo: despesas
   * costumam ser esporádicas). `insufficient` quando não há base de receita.
   */
  verdict: MonthPaceVerdict;
}

/**
 * Ritmo do mês corrente: "estou faturando no ritmo de um mês normal?".
 *
 * Soma o que já foi **lançado** no mês corrente (regime de competência, pela
 * `date`), projeta o fechamento do mês por extrapolação pro-rata (valor ÷ fração
 * do mês decorrida) e compara essa projeção com o "mês típico" recente — a média
 * dos meses **completos com movimento** dentro da janela (default
 * `DEFAULT_BURN_WINDOW_MONTHS`, mesma família de janela do burn rate / D102,
 * saneada por `sanitizeBurnWindow`).
 *
 * A baseline ignora o mês corrente (parcial) e os meses sem movimento, para que a
 * referência seja "um mês típico em que houve trabalho" (mesmo critério de
 * `monthlySeasonality`/D35), não diluída por meses parados de um histórico curto.
 *
 * Pura; `now` e a janela são injetáveis. Usa UTC via `monthKey` (consistente com
 * as demais agregações financeiras).
 */
export function currentMonthPace(
  txs: TxLike[],
  options: { now?: Date | string; months?: number } = {},
): MonthPace {
  const now = typeof options.now === "string" ? new Date(options.now) : (options.now ?? new Date());
  const windowMonths = sanitizeBurnWindow(options.months);

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const elapsed = dayOfMonth / daysInMonth;

  const monthStartMs = Date.UTC(y, m, 1);
  const monthEndMs = Date.UTC(y, m + 1, 1);

  // Mês corrente até agora (inclui o dia de hoje inteiro, regime de competência).
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    const ts = txTime(t);
    if (ts < monthStartMs || ts >= monthEndMs) continue;
    if (t.type === "INCOME") income += t.amount;
    else expense += t.amount;
  }
  const net = income - expense;

  const projectedIncome = Math.round(income / elapsed);
  const projectedExpense = Math.round(expense / elapsed);
  const projectedNet = projectedIncome - projectedExpense;

  // Baseline: meses completos anteriores ao mês corrente, dentro da janela,
  // agregados por mês; só os que tiveram movimento entram na média.
  const windowStartMs = Date.UTC(y, m - windowMonths, 1);
  const perMonth = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    const ts = txTime(t);
    if (ts < windowStartMs || ts >= monthStartMs) continue;
    const key = monthKey(t.date);
    const entry = perMonth.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") entry.income += t.amount;
    else entry.expense += t.amount;
    perMonth.set(key, entry);
  }
  const active = Array.from(perMonth.values()).filter((e) => e.income > 0 || e.expense > 0);
  const baselineMonths = active.length;
  const baselineIncome =
    baselineMonths === 0 ? 0 : Math.round(sum(active.map((e) => e.income)) / baselineMonths);
  const baselineExpense =
    baselineMonths === 0 ? 0 : Math.round(sum(active.map((e) => e.expense)) / baselineMonths);
  const baselineNet = baselineIncome - baselineExpense;

  const expectedIncomeByNow = Math.round(baselineIncome * elapsed);
  const expectedExpenseByNow = Math.round(baselineExpense * elapsed);

  let verdict: MonthPaceVerdict;
  if (baselineMonths === 0 || baselineIncome === 0) {
    verdict = "insufficient";
  } else {
    const ratio = projectedIncome / baselineIncome;
    verdict =
      ratio >= 1 + MONTH_PACE_EPSILON
        ? "ahead"
        : ratio <= 1 - MONTH_PACE_EPSILON
          ? "behind"
          : "onPace";
  }

  return {
    month: monthKey(now),
    dayOfMonth,
    daysInMonth,
    elapsed,
    income,
    expense,
    net,
    projectedIncome,
    projectedExpense,
    projectedNet,
    baselineIncome,
    baselineExpense,
    baselineNet,
    expectedIncomeByNow,
    expectedExpenseByNow,
    baselineMonths,
    windowMonths,
    incomeVsBaseline: computeDelta(projectedIncome, baselineIncome),
    expenseVsBaseline: computeDelta(projectedExpense, baselineExpense),
    netVsBaseline: computeDelta(projectedNet, baselineNet),
    verdict,
  };
}

export type MonthYoYVerdict = "ahead" | "onPace" | "behind" | "insufficient";

export interface MonthYoYPace {
  /** Mês corrente "YYYY-MM" (UTC). */
  month: string;
  /** Mesmo mês do calendário, um ano antes ("YYYY-MM", UTC). */
  lastYearMonth: string;
  /** Dia de referência dentro do mês (1–31), de `now` (UTC). */
  dayOfMonth: number;
  /** Total de dias do mês corrente. */
  daysInMonth: number;
  /** Fração do mês já decorrida (0 < elapsed ≤ 1). */
  elapsed: number;
  /** Receitas/despesas lançadas no mês corrente até `now` (competência), em centavos. */
  income: number;
  expense: number;
  /** Projeção pro-rata do fechamento do mês corrente (mesma base de `currentMonthPace`). */
  projectedIncome: number;
  projectedExpense: number;
  /** `projectedIncome − projectedExpense`. */
  projectedNet: number;
  /**
   * Mesmo mês do ano anterior — mês **inteiro** já fechado (regime de competência,
   * pela `date`), em centavos. Âncora sazonal: compara igual-com-igual (mês cheio
   * projetado × mês cheio realizado), distinta da média móvel de `currentMonthPace`.
   */
  lastYearIncome: number;
  lastYearExpense: number;
  /** `lastYearIncome − lastYearExpense`. */
  lastYearNet: number;
  /**
   * Mesmo mês do ano anterior, mas só **até o mesmo dia do mês** (`dayOfMonth`),
   * em centavos. Leitura maçã-com-maçã que não depende da projeção: "até esta
   * data, eu estava à frente de onde estou agora?". Meses mais curtos no ano
   * anterior (fevereiro) truncam naturalmente — um dia inexistente nunca soma.
   */
  lastYearIncomeToDate: number;
  lastYearExpenseToDate: number;
  /** `lastYearIncomeToDate − lastYearExpenseToDate`. */
  lastYearNetToDate: number;
  /** Houve qualquer movimento no mesmo mês do ano anterior? */
  lastYearHasMovement: boolean;
  /** Comparação da projeção do mês vs. o mesmo mês do ano anterior. */
  incomeVsLastYear: MetricDelta;
  expenseVsLastYear: MetricDelta;
  netVsLastYear: MetricDelta;
  /**
   * Comparação do **lançado até agora** (mês corrente) vs. o lançado **até o
   * mesmo dia** do mesmo mês no ano anterior — sem projeção de permeio, útil cedo
   * no mês quando a extrapolação pro-rata ainda é frágil.
   */
  incomeToDateVsLastYear: MetricDelta;
  expenseToDateVsLastYear: MetricDelta;
  netToDateVsLastYear: MetricDelta;
  /**
   * Veredito do ritmo pela **receita** (sinal mais limpo). `insufficient` quando o
   * mesmo mês do ano anterior não teve receita (sem âncora sazonal).
   */
  verdict: MonthYoYVerdict;
}

/**
 * Ritmo do mês corrente contra o **mesmo mês do ano anterior** (eixo sazonal),
 * complemento de `currentMonthPace` (que compara contra a média móvel recente).
 *
 * Projeta o fechamento do mês corrente por extrapolação pro-rata (reaproveitando
 * `currentMonthPace`) e compara com o mês inteiro, já fechado, do mesmo mês um ano
 * atrás (competência, pela `date`). É comparação igual-com-igual — mês cheio × mês
 * cheio — útil quando o negócio é sazonal (dezembro contra dezembro, não contra a
 * média dos últimos meses). `insufficient` sem receita no mês de referência.
 *
 * Também expõe o mesmo mês do ano anterior recortado **até o mesmo dia do mês**
 * (`lastYear*ToDate`): uma leitura que não depende da projeção pro-rata (frágil
 * cedo no mês) — "até esta data, eu estava à frente de onde estou agora?".
 *
 * Pura; `now` é injetável. UTC via `monthKey`, consistente com as demais agregações.
 */
export function monthYoYPace(
  txs: TxLike[],
  options: { now?: Date | string } = {},
): MonthYoYPace {
  const now = typeof options.now === "string" ? new Date(options.now) : (options.now ?? new Date());
  const pace = currentMonthPace(txs, { now });

  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  // Mesmo mês, ano anterior — mês inteiro (regime de competência, pela `date`).
  const lyStartMs = Date.UTC(y - 1, mo, 1);
  const lyEndMs = Date.UTC(y - 1, mo + 1, 1);
  let lastYearIncome = 0;
  let lastYearExpense = 0;
  // Mesmo mês do ano anterior, só até o mesmo dia do mês (maçã-com-maçã).
  let lastYearIncomeToDate = 0;
  let lastYearExpenseToDate = 0;
  for (const t of txs) {
    const ts = txTime(t);
    if (ts < lyStartMs || ts >= lyEndMs) continue;
    const d = typeof t.date === "string" ? new Date(t.date) : t.date;
    const withinDay = d.getUTCDate() <= pace.dayOfMonth;
    if (t.type === "INCOME") {
      lastYearIncome += t.amount;
      if (withinDay) lastYearIncomeToDate += t.amount;
    } else {
      lastYearExpense += t.amount;
      if (withinDay) lastYearExpenseToDate += t.amount;
    }
  }
  const lastYearNet = lastYearIncome - lastYearExpense;
  const lastYearNetToDate = lastYearIncomeToDate - lastYearExpenseToDate;
  const lastYearHasMovement = lastYearIncome > 0 || lastYearExpense > 0;

  let verdict: MonthYoYVerdict;
  if (lastYearIncome === 0) {
    verdict = "insufficient";
  } else {
    const ratio = pace.projectedIncome / lastYearIncome;
    verdict =
      ratio >= 1 + MONTH_PACE_EPSILON
        ? "ahead"
        : ratio <= 1 - MONTH_PACE_EPSILON
          ? "behind"
          : "onPace";
  }

  return {
    month: pace.month,
    lastYearMonth: monthKey(new Date(lyStartMs)),
    dayOfMonth: pace.dayOfMonth,
    daysInMonth: pace.daysInMonth,
    elapsed: pace.elapsed,
    income: pace.income,
    expense: pace.expense,
    projectedIncome: pace.projectedIncome,
    projectedExpense: pace.projectedExpense,
    projectedNet: pace.projectedNet,
    lastYearIncome,
    lastYearExpense,
    lastYearNet,
    lastYearIncomeToDate,
    lastYearExpenseToDate,
    lastYearNetToDate,
    lastYearHasMovement,
    incomeVsLastYear: computeDelta(pace.projectedIncome, lastYearIncome),
    expenseVsLastYear: computeDelta(pace.projectedExpense, lastYearExpense),
    netVsLastYear: computeDelta(pace.projectedNet, lastYearNet),
    incomeToDateVsLastYear: computeDelta(pace.income, lastYearIncomeToDate),
    expenseToDateVsLastYear: computeDelta(pace.expense, lastYearExpenseToDate),
    netToDateVsLastYear: computeDelta(pace.income - pace.expense, lastYearNetToDate),
    verdict,
  };
}

export type YearToDateVerdict = "ahead" | "onPace" | "behind" | "insufficient";

export interface YearToDatePace {
  /** Ano corrente (UTC). */
  year: number;
  /** Ano anterior (year − 1). */
  lastYear: number;
  /** Mês do corte (0–11, UTC) — o "até aqui" comum aos dois anos. */
  cutoffMonth: number;
  /** Dia do corte no ano corrente (1–31, UTC). */
  cutoffDay: number;
  /**
   * Dia do ano já decorrido (1–366, UTC) e total de dias do ano corrente.
   * `elapsed = dayOfYear / daysInYear` é a fração do ano percorrida.
   */
  dayOfYear: number;
  daysInYear: number;
  elapsed: number;
  /**
   * Acumulado do ano corrente do 1º de janeiro até o fim do dia do corte
   * (regime de competência, pela `date` da transação), em centavos.
   */
  income: number;
  expense: number;
  /** `income − expense` do ano corrente até o corte. */
  net: number;
  /**
   * Mesmo período do ano anterior — do 1º de janeiro até o **mesmo** mês/dia,
   * já decorrido (competência), em centavos. Comparação igual-com-igual (mesma
   * fração do ano), o eixo que responde "estou à frente de onde eu estava nesta
   * época no ano passado?". O dia do corte é limitado ao último dia do mês no ano
   * anterior (ex.: 29/fev cai para 28/fev) para manter a janela alinhada.
   */
  lastYearIncome: number;
  lastYearExpense: number;
  /** `lastYearIncome − lastYearExpense`. */
  lastYearNet: number;
  /** Houve qualquer movimento no mesmo período do ano anterior? */
  lastYearHasMovement: boolean;
  /** Comparação do acumulado do ano corrente vs. o mesmo período do ano anterior. */
  incomeVsLastYear: MetricDelta;
  expenseVsLastYear: MetricDelta;
  netVsLastYear: MetricDelta;
  /**
   * Veredito pela **receita** (sinal mais limpo). `insufficient` quando o mesmo
   * período do ano anterior não teve receita (sem base de comparação).
   */
  verdict: YearToDateVerdict;
}

/**
 * Ritmo do ano corrente contra o **mesmo período do ano anterior** (acumulado
 * ano-a-ano até a data), complemento anual de `monthYoYPace`.
 *
 * Soma o acumulado do ano corrente (1º jan → corte, competência pela `date`) e o
 * compara com o acumulado do ano anterior até o **mesmo** mês/dia. É comparação
 * igual-com-igual — mesma fração do ano percorrida nos dois lados — distinta de:
 * `yearlyHistory`/`crescimento` (anos **fechados** inteiros), `projectYearEnd`/
 * `projecao-ano` (projeta o fechamento do ano) e `monthYoYPace` (só o mês corrente).
 * Responde "estou à frente de onde eu estava nesta época do ano passado?".
 *
 * Não projeta o fechamento (isso é trabalho de `projectYearEnd`): aqui são dois
 * acumulados reais lado a lado. Usa a folga relativa `MONTH_PACE_EPSILON` (±10%)
 * para o veredito; `insufficient` sem receita no período de referência.
 *
 * Pura; `now` é injetável. UTC, consistente com as demais agregações financeiras.
 */
export function yearToDatePace(
  txs: TxLike[],
  options: { now?: Date | string } = {},
): YearToDatePace {
  const now = typeof options.now === "string" ? new Date(options.now) : (options.now ?? new Date());

  const year = now.getUTCFullYear();
  const lastYear = year - 1;
  const cutoffMonth = now.getUTCMonth();
  const cutoffDay = now.getUTCDate();

  const startMs = Date.UTC(year, 0, 1);
  // Inclui o dia do corte inteiro (até o início do dia seguinte).
  const cutoffMs = Date.UTC(year, cutoffMonth, cutoffDay + 1);

  const dayOfYear = Math.round((Date.UTC(year, cutoffMonth, cutoffDay) - startMs) / 86_400_000) + 1;
  const daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - startMs) / 86_400_000);
  const elapsed = dayOfYear / daysInYear;

  // Ano anterior: mesmo mês/dia, limitando o dia ao último do mês (29/fev → 28/fev).
  const lyMonthDays = new Date(Date.UTC(lastYear, cutoffMonth + 1, 0)).getUTCDate();
  const lyCutoffDay = Math.min(cutoffDay, lyMonthDays);
  const lyStartMs = Date.UTC(lastYear, 0, 1);
  const lyCutoffMs = Date.UTC(lastYear, cutoffMonth, lyCutoffDay + 1);

  let income = 0;
  let expense = 0;
  let lastYearIncome = 0;
  let lastYearExpense = 0;
  for (const t of txs) {
    const ts = txTime(t);
    if (ts >= startMs && ts < cutoffMs) {
      if (t.type === "INCOME") income += t.amount;
      else expense += t.amount;
    } else if (ts >= lyStartMs && ts < lyCutoffMs) {
      if (t.type === "INCOME") lastYearIncome += t.amount;
      else lastYearExpense += t.amount;
    }
  }
  const net = income - expense;
  const lastYearNet = lastYearIncome - lastYearExpense;
  const lastYearHasMovement = lastYearIncome > 0 || lastYearExpense > 0;

  let verdict: YearToDateVerdict;
  if (lastYearIncome === 0) {
    verdict = "insufficient";
  } else {
    const ratio = income / lastYearIncome;
    verdict =
      ratio >= 1 + MONTH_PACE_EPSILON
        ? "ahead"
        : ratio <= 1 - MONTH_PACE_EPSILON
          ? "behind"
          : "onPace";
  }

  return {
    year,
    lastYear,
    cutoffMonth,
    cutoffDay,
    dayOfYear,
    daysInYear,
    elapsed,
    income,
    expense,
    net,
    lastYearIncome,
    lastYearExpense,
    lastYearNet,
    lastYearHasMovement,
    incomeVsLastYear: computeDelta(income, lastYearIncome),
    expenseVsLastYear: computeDelta(expense, lastYearExpense),
    netVsLastYear: computeDelta(net, lastYearNet),
    verdict,
  };
}

/**
 * Abaixo de 75% da receita do mesmo período do ano passado (≥ 25% de atraso) o
 * nudge de ritmo do ano vira `critical` — passou de "vale empurrar" para "está
 * ficando para trás de verdade". Espelha a lógica de limiar crítico dos demais
 * headlines do Painel.
 */
export const YTD_PACE_CRITICAL_RATIO = 0.75;

export interface YearToDatePaceHeadline {
  /**
   * Deve aparecer no Painel? Só quando o acumulado do ano corrente está **atrás**
   * do mesmo ponto do ano passado (`verdict === "behind"`). Com `ahead`/`onPace`
   * (ritmo bom/em linha) ou `insufficient` (sem base de comparação) o aviso seria
   * ruído — mesma disciplina de `cashBurnHeadline`/`geoConcentrationHeadline`.
   */
  show: boolean;
  /** Atraso acentuado (receita YTD ≤ 75% da do ano passado, ou seja ≥ 25% abaixo)? */
  critical: boolean;
  /** Receita acumulada do ano corrente até o corte (centavos). */
  income: number;
  /** Receita acumulada do mesmo período do ano anterior (centavos). */
  lastYearIncome: number;
  /** Variação relativa da receita YTD vs. ano anterior (ex.: −0,3 = 30% abaixo); `null` sem base. */
  pct: number | null;
  /** Ano corrente e anterior, para a moldura textual. */
  year: number;
  lastYear: number;
  /** Veredito completo do ritmo do ano (para quem quiser o detalhe). */
  verdict: YearToDateVerdict;
}

/**
 * Resumo de Painel do **ritmo do ano** (acumulado ano-a-ano até a data): deriva, de
 * um `yearToDatePace` já computado, se o nudge deve aparecer e com que urgência.
 * Pura, sem I/O — espelha `cashBurnHeadline`/`geoConcentrationHeadline`: a regra de
 * exibição vive aqui, o dashboard só consome. Complementa o nudge mensal de meta
 * (`goalRun`/ritmo necessário): este olha o acumulado do ano **contra o próprio
 * ano passado**, respondendo "estou atrás de onde eu estava nesta época?".
 */
export function yearToDatePaceHeadline(pace: YearToDatePace): YearToDatePaceHeadline {
  const show = pace.verdict === "behind";
  const critical =
    show && pace.lastYearIncome > 0 && pace.income / pace.lastYearIncome <= YTD_PACE_CRITICAL_RATIO;
  return {
    show,
    critical,
    income: pace.income,
    lastYearIncome: pace.lastYearIncome,
    pct: pace.incomeVsLastYear.pct,
    year: pace.year,
    lastYear: pace.lastYear,
    verdict: pace.verdict,
  };
}

export interface CashBurnHeadline {
  /**
   * Deve aparecer no Painel? Só quando o fôlego pelo ritmo real **morde**
   * (`tight`/`critical`). Com `surplus` (caixa cresce — não há queima),
   * `healthy` (fôlego folgado) ou `negative` (caixa já zerado, sem runway a
   * medir) o aviso seria ruído, não alerta.
   */
  show: boolean;
  /** Veredito é crítico (fôlego < `CRITICAL_RUNWAY_MONTHS` meses)? */
  critical: boolean;
  /**
   * Por quantos meses o caixa dura no ritmo real de gasto. Sempre um número
   * (não-`null`) quando `show` é `true`, pois `tight`/`critical` só ocorrem com
   * `runwayMonths` definido.
   */
  runwayMonths: number | null;
  /** Queima média mensal de caixa (centavos, ≥ 0) que sustenta o cálculo. */
  monthlyBurn: number;
  /** Veredito completo do burn rate (para quem quiser o detalhe). */
  verdict: BurnRunwayVerdict;
}

/**
 * Resumo de Painel do fôlego de caixa pelo **burn rate realizado**: deriva, de um
 * `cashBurnRunway` já computado, se o nudge deve aparecer e com que urgência. Pura,
 * sem I/O — espelha `paymentLagHeadline` (D70): a regra de exibição vive aqui, o
 * dashboard só consome. Complementa o nudge de `cashRunway` (que cobre só o custo
 * fixo, D100): este inclui custos variáveis e desconta a receita que entrou, então
 * só dispara quando o músico de fato queima caixa no ritmo recente.
 */
export function cashBurnHeadline(burn: CashBurnRunway): CashBurnHeadline {
  const show = burn.verdict === "tight" || burn.verdict === "critical";
  return {
    show,
    critical: burn.verdict === "critical",
    runwayMonths: burn.runwayMonths,
    monthlyBurn: burn.monthlyBurn,
    verdict: burn.verdict,
  };
}

export interface CashFlowMonth {
  /** Mês de competência do caixa, "YYYY-MM" (UTC). */
  monthKey: string;
  /** Receita recebida no caixa nesse mês (centavos, ≥ 0). */
  received: number;
  /** Despesa paga no caixa nesse mês (centavos, ≥ 0). */
  paid: number;
  /**
   * Fluxo de caixa líquido do mês (centavos): `received − paid`. Positivo = o caixa
   * cresceu no mês; negativo = queimou.
   */
  net: number;
}

/**
 * Fluxo de caixa realizado **mês a mês** dentro da janela de burn rate — a textura por
 * trás do `avgMonthlyNet` de `cashBurnRunway`. Uma média de 6 meses pode esconder que a
 * queima é recente (caixa positivo no começo, despencando no fim) ou pontual; este
 * detalhamento revela a tendência.
 *
 * Usa exatamente a mesma janela e o mesmo critério de `cashBurnRunway` — os `months`
 * meses **completos** anteriores ao mês corrente (exclui o mês em curso), só caixa
 * realizado (`received === true`) — de modo que a soma dos `net` dividida pela janela
 * reproduz o `avgMonthlyNet` daquele helper (a menos do arredondamento). Sempre devolve
 * uma entrada por mês da janela (mês sem movimento vem zerado), em ordem cronológica.
 * Pura; `now` e o tamanho da janela são injetáveis.
 */
export function cashFlowByMonth(
  txs: TxLike[],
  options: { now?: Date | string; months?: number } = {},
): CashFlowMonth[] {
  const now = typeof options.now === "string" ? new Date(options.now) : (options.now ?? new Date());
  const windowMonths = sanitizeBurnWindow(options.months);

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const windowEndMs = Date.UTC(y, m, 1);
  const windowStartMs = Date.UTC(y, m - windowMonths, 1);

  // Pré-popula a janela em ordem cronológica para que meses sem movimento apareçam zerados.
  const months: CashFlowMonth[] = [];
  const index = new Map<string, CashFlowMonth>();
  for (let i = windowMonths; i >= 1; i--) {
    const key = monthKey(new Date(Date.UTC(y, m - i, 1)));
    const entry: CashFlowMonth = { monthKey: key, received: 0, paid: 0, net: 0 };
    months.push(entry);
    index.set(key, entry);
  }

  for (const t of txs) {
    if (!t.received) continue;
    const ts = txTime(t);
    if (ts < windowStartMs || ts >= windowEndMs) continue;
    const entry = index.get(monthKey(t.date));
    if (!entry) continue;
    if (t.type === "INCOME") entry.received += t.amount;
    else entry.paid += t.amount;
  }

  for (const entry of months) entry.net = entry.received - entry.paid;
  return months;
}

/**
 * Limiar relativo (15%) para a tendência de queima: a metade recente da janela só
 * conta como "acelerando" ou "aliviando" se o seu fluxo líquido médio mensal divergir
 * em ≥ 15% (em módulo, sobre a maior das duas médias ou o piso `CASH_FLOW_TREND_FLOOR`)
 * da metade antiga. Abaixo disso é ruído → `stable`. Espelha o papel de
 * `GEO_TREND_EPSILON` na concentração (D120), aqui aplicado a centavos via razão.
 */
export const CASH_FLOW_TREND_EPSILON = 0.15;

/**
 * Piso (R$ 500/mês em centavos) para o denominador da razão de tendência: evita que
 * uma diferença minúscula entre duas médias quase nulas estoure o limiar relativo e
 * vire um falso "acelerando/aliviando".
 */
export const CASH_FLOW_TREND_FLOOR = 500_00;

export type CashFlowTrendDirection = "accelerating" | "easing" | "stable" | "insufficient";

export interface CashFlowTrend {
  /**
   * Para onde aponta a queima ao longo da janela, comparando a metade recente com a
   * metade antiga do fluxo líquido mensal:
   * - `accelerating`: o caixa piorou — a metade recente líquida é ≥ `EPSILON` abaixo
   *   da antiga (queima acelerando / superávit encolhendo).
   * - `easing`: o caixa melhorou — a metade recente é ≥ `EPSILON` acima da antiga
   *   (queima desacelerando / superávit crescendo).
   * - `stable`: variação dentro do limiar — a média conta a história toda.
   * - `insufficient`: janela curta demais para partir em duas metades comparáveis
   *   (< 2 meses em alguma metade).
   */
  direction: CashFlowTrendDirection;
  /** Fluxo líquido médio mensal da metade **recente** (centavos). */
  recentAvgNet: number;
  /** Fluxo líquido médio mensal da metade **antiga** (centavos). */
  olderAvgNet: number;
  /**
   * `recentAvgNet − olderAvgNet` (centavos). Positivo = caixa melhorando (easing),
   * negativo = piorando (accelerating). É a diferença que sustenta o veredito.
   */
  delta: number;
  /** Nº de meses na metade recente comparada. */
  recentMonths: number;
  /** Nº de meses na metade antiga comparada. */
  olderMonths: number;
}

/**
 * Veredito de **tendência** da queima de caixa: a média de `cashBurnRunway`/`cashFlowByMonth`
 * é um número só e esconde a direção — um caixa que estava positivo e despencou no fim da
 * janela tem a mesma média que um que vem se recuperando. Este helper parte a janela em
 * metade antiga × metade recente e compara o fluxo líquido médio mensal de cada uma, dizendo
 * se a queima está **acelerando**, **aliviando** ou **estável**.
 *
 * Recebe a saída de `cashFlowByMonth` (cronológica, mês mais antigo primeiro). Com um nº
 * ímpar de meses, descarta o mês do meio (o pivô) para manter as metades simétricas. Exige
 * ≥ 2 meses em cada metade (janela efetiva ≥ 4 ou ≥ 5) — abaixo disso devolve `insufficient`,
 * pois 1 mês por lado é ruído puro. Pura, sem I/O; espelha a mecânica de limiar de
 * `concentrationTrend` (D120), adaptada a centavos via razão relativa com piso.
 */
export function cashFlowTrend(months: CashFlowMonth[]): CashFlowTrend {
  const half = Math.floor(months.length / 2);
  const older = months.slice(0, half);
  const recent = months.slice(months.length - half); // descarta o mês do meio se ímpar

  const olderAvgNet = half > 0 ? Math.round(sum(older.map((m) => m.net)) / half) : 0;
  const recentAvgNet = half > 0 ? Math.round(sum(recent.map((m) => m.net)) / half) : 0;
  const delta = recentAvgNet - olderAvgNet;

  if (half < 2) {
    return {
      direction: "insufficient",
      recentAvgNet,
      olderAvgNet,
      delta,
      recentMonths: recent.length,
      olderMonths: older.length,
    };
  }

  const denom = Math.max(Math.abs(olderAvgNet), Math.abs(recentAvgNet), CASH_FLOW_TREND_FLOOR);
  const ratio = delta / denom;
  const direction: CashFlowTrendDirection =
    ratio >= CASH_FLOW_TREND_EPSILON
      ? "easing"
      : ratio <= -CASH_FLOW_TREND_EPSILON
        ? "accelerating"
        : "stable";

  return { direction, recentAvgNet, olderAvgNet, delta, recentMonths: half, olderMonths: half };
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

/** Menor alíquota de reserva aceita, em porcentagem. */
export const MIN_TAX_RATE_PERCENT = 0;
/** Maior alíquota de reserva aceita, em porcentagem. */
export const MAX_TAX_RATE_PERCENT = 100;

/**
 * Sanea uma alíquota em PORCENTAGEM (0–100) vinda do usuário — query string
 * (`?aliquota=`), formulário de Conta, etc. Aceita vírgula ou ponto como
 * separador decimal e espaços em volta; devolve o número em porcentagem quando
 * válido e dentro da faixa [0, 100], ou `null` quando vazio/ausente/inválido/
 * fora da faixa. A conversão para a fração [0,1] que `taxReserve` espera fica a
 * cargo do chamador (`percent / 100`). Pura, sem I/O — fonte única do parsing
 * da alíquota, compartilhada pela página, pelo export CSV e pela ação de Conta.
 */
export function parseTaxRatePercent(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n < MIN_TAX_RATE_PERCENT || n > MAX_TAX_RATE_PERCENT) {
    return null;
  }
  return n;
}

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

// ── Comparativo ano a ano da taxa de concretização do funil ─────────────────
//
// A pergunta de progressão do funil: "de tudo que negociei e teve desfecho,
// fechei uma fração maior de shows este ano que no ano passado?". Ancora na
// **taxa de concretização** (PLAYED / decididos) — a única métrica do funil que
// faz sentido comparar entre dois anos fechados (contagem/valor em aberto são
// um retrato do *agora*, não de um ano). Recorta-se por ano da `date` do show
// antes de agregar (mesmo eixo de `filterShowsByYear`/D108), reusando o
// snapshot `showPipeline` de cada período. Fecha o gap do padrão "vs. {ano-1}"
// no funil, já presente nas irmãs de tendência (antecedência/D187,
// cachê/D209, rentabilidade/D210).

/**
 * Limiar (em pontos, 0..1) abaixo do qual a variação da taxa de concretização
 * entre dois períodos é ruído ("stable"). Cinco pontos percentuais — grande o
 * bastante para não oscilar com um único show a mais fechado numa amostra
 * pequena, pequeno o bastante para captar uma melhora real de fechamento.
 * Espelha a disciplina de epsilon de `LEAD_TIME_TREND_EPSILON` (D187) no eixo
 * de concretização.
 */
export const CONVERSION_TREND_EPSILON = 0.05;

export interface ShowPipelineComparison {
  /** Funil do período atual (tipicamente o ano selecionado). */
  current: ShowPipeline;
  /** Funil do período de comparação (tipicamente o ano anterior). */
  previous: ShowPipeline;
  /**
   * Variação da taxa de concretização (atual − anterior, em pontos 0..1).
   * `null` quando algum dos períodos não tem show decidido (taxa indefinida) —
   * aí não há comparação possível. Positivo = fechando uma fração maior agora
   * (melhora); negativo = perdendo mais do que negocia (piora).
   */
  conversionRateDelta: number | null;
  /** Variação da contagem de shows realizados (atual − anterior). */
  playedCountDelta: number;
  /** Variação da contagem de shows decididos — PLAYED+CANCELLED (atual − anterior). */
  decidedCountDelta: number;
  /**
   * Direção do fechamento entre os dois períodos, decidida pela variação da
   * taxa de concretização contra `CONVERSION_TREND_EPSILON`:
   * - "improved": taxa subiu além do limiar (fechando mais do que negocia);
   * - "worsened": taxa caiu além do limiar (perdendo mais do que negocia);
   * - "stable": variação dentro do limiar, ou taxa indefinida em algum período.
   * Aqui **subir** a taxa é a melhora (direção igual ao cachê/antecedência,
   * oposta ao DSO/cancelamento).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **taxa de concretização** do funil entre dois períodos (atual ×
 * anterior), espelhando `compareBookingLeadTime` (D187) no eixo de fechamento.
 * Pura, sem I/O: recebe dois `showPipeline` já computados (cada um sobre os
 * shows do seu período) e devolve a variação da taxa de concretização (e das
 * contagens de realizados/decididos) + um veredito de tendência. Quando algum
 * período não tem show decidido a taxa é indefinida: `conversionRateDelta`
 * fica `null` e o veredito é "stable" (sem base para ler tendência). O chamador
 * decide quando exibir (tipicamente só com um ano específico e ambos os
 * períodos tendo shows decididos).
 */
export function compareShowPipelines(
  current: ShowPipeline,
  previous: ShowPipeline,
): ShowPipelineComparison {
  const conversionRateDelta =
    current.conversionRate == null || previous.conversionRate == null
      ? null
      : current.conversionRate - previous.conversionRate;
  return {
    current,
    previous,
    conversionRateDelta,
    playedCountDelta: current.playedCount - previous.playedCount,
    decidedCountDelta: current.decidedCount - previous.decidedCount,
    trend:
      conversionRateDelta == null
        ? "stable"
        : conversionRateDelta >= CONVERSION_TREND_EPSILON
          ? "improved"
          : conversionRateDelta <= -CONVERSION_TREND_EPSILON
            ? "worsened"
            : "stable",
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

// ── Cachê médio ano a ano (estou cobrando mais este ano do que no passado?) ──

export interface FeeTrendYear {
  /** Ano civil (UTC), ex.: 2026. */
  year: number;
  /** Nº de shows realizados com cachê no ano. */
  count: number;
  /** Soma dos cachês do ano (centavos). */
  totalFee: number;
  /** Cachê médio do ano = round(totalFee / count) (centavos). */
  avgFee: number;
  /** Menor cachê individual do ano (centavos). */
  minFee: number;
  /** Maior cachê individual do ano (centavos). */
  maxFee: number;
}

export interface FeeTrendByYear {
  /** Anos com shows realizados, em ordem cronológica crescente. */
  years: FeeTrendYear[];
  /**
   * Variação **ano a ano** do cachê médio: o ano mais recente com shows vs. o
   * ano civil **imediatamente anterior** — mas só quando esse ano anterior
   * também tem shows realizados. Se o ano anterior está vazio (um hiato), não é
   * um "ano a ano" honesto e `yoy` fica `null` (o salto de 2024→2026 misturaria
   * duas variações num delta só). `null` também com menos de dois anos ativos.
   * Reaproveita `computeDelta`. Distinto do `trend` mês-a-mês de `feeTrend`, que
   * compara o primeiro e o último mês e por isso mistura sazonalidade (jan × dez).
   */
  yoy: {
    /** Ano mais recente com shows realizados. */
    current: FeeTrendYear;
    /** Ano civil imediatamente anterior (também com shows). */
    previous: FeeTrendYear;
    /** Variação do cachê médio (atual vs. anterior). */
    delta: MetricDelta;
  } | null;
}

/**
 * Evolução do cachê médio dos shows realizados agrupada por **ano civil**,
 * respondendo à pergunta central da página no eixo que não sofre com
 * sazonalidade: "estou cobrando mais este ano do que no ano passado?". Mesmos
 * critérios de inclusão de `feeTrend` (só `isHappenedGig` com `fee > 0`); a
 * chave de ano vem de `monthKey` (UTC) para casar exatamente com o agrupamento
 * mensal. Pura; `now` injetável para teste.
 */
export function feeTrendByYear(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): FeeTrendByYear {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const feesByYear = new Map<number, number[]>();
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const year = Number(monthKey(s.date).slice(0, 4));
    const list = feesByYear.get(year);
    if (list) list.push(s.fee);
    else feesByYear.set(year, [s.fee]);
  }

  const years: FeeTrendYear[] = [...feesByYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const fees = feesByYear.get(year)!;
      const totalFee = sum(fees);
      return {
        year,
        count: fees.length,
        totalFee,
        avgFee: Math.round(totalFee / fees.length),
        minFee: Math.min(...fees),
        maxFee: Math.max(...fees),
      };
    });

  let yoy: FeeTrendByYear["yoy"] = null;
  if (years.length >= 2) {
    const current = years[years.length - 1];
    const previous = years[years.length - 2];
    // Só é "ano a ano" se o anterior é o ano civil imediatamente antes (sem hiato).
    if (previous.year === current.year - 1) {
      yoy = { current, previous, delta: computeDelta(current.avgFee, previous.avgFee) };
    }
  }

  return { years, yoy };
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

/**
 * Anos (UTC, decrescente) dos shows que de fato entram na distribuição por
 * faixa de cachê — i.e. realizados (`isHappenedGig`) com cachê > 0, exatamente
 * o mesmo recorte de `feeDistribution`. Alimenta o seletor de período de
 * `/shows/faixas-de-cache` sem oferecer anos vazios (ao contrário de
 * `showProfitYears`, que parte de uma lista já filtrada pela própria tela e
 * pode oferecer um ano sem shows priced). Pura; `now` injetável para teste.
 */
export function feeDistributionYears(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): number[] {
  const todayMs = utcMidnight(opts.now ?? new Date());
  const years = new Set<number>();
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Variação relativa mínima do cachê mediano (5%) para o comparativo ano a ano de
 * `feeDistribution` ler como tendência, e não ruído. Espelha a disciplina de
 * limiar relativo de `cashFlowTrend` (D126), mas mais apertada por o cachê
 * mediano ser mais estável que o fluxo de caixa mês a mês.
 */
export const FEE_TREND_EPSILON = 0.05;

/**
 * Piso absoluto (centavos, R$ 50) para a variação do cachê mediano contar. Junto
 * ao `FEE_TREND_EPSILON`, evita que um centavo de diferença numa mediana pequena
 * — ou um passo relativo grande sobre uma base minúscula — vire "subiu/caiu".
 */
export const FEE_TREND_FLOOR = 50_00;

/**
 * A faixa "premium" da tabela de cachês: a mais alta de `FEE_BANDS`
 * (`gte5k` = "Acima de R$ 5.000"). É o topo natural para medir "estou levando
 * mais shows para a faixa alta?", complementando a mediana no comparativo ano a
 * ano: dois anos podem ter a **mesma** mediana enquanto a cauda de cima
 * engorda — a participação premium captura essa migração que a mediana esconde.
 */
export const PREMIUM_FEE_BAND_KEY: FeeBandKey = "gte5k";

/**
 * Participação (nº de shows, 0..1) da faixa premium (`PREMIUM_FEE_BAND_KEY`)
 * numa distribuição já computada. Lê o `countShare` da faixa direto de `bands`
 * (que sempre traz as 6 faixas, inclusive as vazias) — zero agregação nova. 0
 * quando não há shows na faixa (ou nenhum show no período).
 */
export function premiumBandShare(dist: FeeDistribution): number {
  const band = dist.bands.find((b) => b.key === PREMIUM_FEE_BAND_KEY);
  return band ? band.countShare : 0;
}

/**
 * Variação, faixa a faixa, da participação (nº de shows) de um período para o
 * outro — o "formato da tabela de cachês mudou?" no eixo de cada degrau. Espelha
 * a granularidade das colunas "vs. {ano-1}" por linha já consolidadas no app
 * (`ContactPipelineChange`/`StageDurationChange`, D238/D282), agora sobre as
 * faixas de preço. A participação (`countShare`) é neutra por faixa: subir num
 * degrau alto é bom, num baixo é o contrário — a leitura direcional fica com o
 * veredito da mediana (`trend`); aqui só descrevemos o deslocamento.
 */
export interface FeeBandShareChange {
  /** Chave da faixa (`FeeBandKey`), na ordem canônica de `FEE_BANDS`. */
  key: FeeBandKey;
  /** Rótulo legível da faixa (ex.: "Acima de R$ 5.000"). */
  label: string;
  /** Nº de shows na faixa no período atual. */
  currentCount: number;
  /** Nº de shows na faixa no período anterior. */
  previousCount: number;
  /** Participação (nº de shows, 0..1) da faixa no período atual. */
  currentCountShare: number;
  /** Participação (nº de shows, 0..1) da faixa no período anterior. */
  previousCountShare: number;
  /**
   * Variação da participação (atual − anterior, em pontos 0..1). Positivo = mais
   * da agenda caiu nesta faixa agora; negativo = menos.
   */
  countShareDelta: number;
}

export interface FeeDistributionComparison {
  /** Distribuição do período atual (tipicamente o ano selecionado). */
  current: FeeDistribution;
  /** Distribuição do período de comparação (tipicamente o ano anterior). */
  previous: FeeDistribution;
  /**
   * Variação do cachê **mediano** (atual − anterior, centavos). Positivo = a
   * tabela de cachês subiu (o show típico paga mais agora — a leitura de
   * progressão de carreira); negativo = caiu. Aqui **subir** é a melhora.
   */
  medianFeeDelta: number;
  /** Variação do cachê **médio** (atual − anterior, centavos). Informativo. */
  avgFeeDelta: number;
  /**
   * Variação **relativa** do cachê mediano (atual/anterior − 1); `null` quando o
   * ano anterior não tem mediana (`medianFee === 0`) e a razão seria indefinida.
   */
  medianFeePct: number | null;
  /**
   * Direção da tabela de cachês entre os dois períodos, decidida pela variação do
   * cachê **mediano** (robusto a um show fora da curva) contra o limiar:
   * - "up": mediana subiu além do limiar (cachês maiores — progressão);
   * - "down": mediana caiu além do limiar (cachês menores — atenção);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "up" | "down" | "stable";
  /**
   * Participação (nº de shows, 0..1) na faixa premium (`PREMIUM_FEE_BAND_KEY`,
   * "Acima de R$ 5.000") no período **atual**. Complementa a mediana: mostra
   * quanto da agenda já paga no topo da tabela.
   */
  premiumShareCurrent: number;
  /** Idem, no período **anterior**. */
  premiumSharePrevious: number;
  /**
   * Variação da participação premium (atual − anterior, em pontos 0..1).
   * Positivo = mais shows migraram para a faixa alta (progressão que a mediana
   * pode não mostrar quando o meio da distribuição não se moveu). Apenas
   * informativo — não altera o veredito `trend`, que segue ancorado na mediana.
   */
  premiumShareDelta: number;
  /**
   * Deslocamento da participação (nº de shows) faixa a faixa, na ordem canônica
   * de `FEE_BANDS` (sempre as 6 faixas, inclusive as zeradas). É o detalhe por
   * degrau que a coluna "vs. {ano-1}" da tabela e do CSV consomem — mostra para
   * ONDE a agenda migrou, complementando o resumo (mediana/premium).
   */
  bandChanges: FeeBandShareChange[];
}

/**
 * Compara a **distribuição de cachês** entre dois períodos (atual × anterior),
 * espelhando o comparativo ano a ano de `compareBookingLeadTime`/
 * `compareGeoConcentration` (D187/D120) no eixo do nível de preço. Pura, sem
 * I/O: recebe duas `feeDistribution` já computadas (cada uma sobre os shows do
 * seu período) e devolve a variação do cachê mediano/médio + um veredito de
 * tendência. Ancora o veredito na **mediana** (resiste a um cachê fora da curva,
 * como a própria `feeDistribution`); a média entra só como informação. O
 * chamador decide quando exibir (tipicamente só com um ano específico e ambos os
 * períodos tendo shows — caso contrário a comparação de medianas seria
 * enganosa: mediana de amostra vazia é 0).
 *
 * A tendência exige as **duas** condições — variação relativa ≥ `FEE_TREND_EPSILON`
 * (5%) **e** absoluta ≥ `FEE_TREND_FLOOR` (R$ 50) — para não oscilar nem numa
 * mediana pequena (onde 5% é trocado) nem numa grande (onde R$ 50 é troco).
 */
export function compareFeeDistribution(
  current: FeeDistribution,
  previous: FeeDistribution,
): FeeDistributionComparison {
  const medianFeeDelta = current.medianFee - previous.medianFee;
  const absOver = Math.abs(medianFeeDelta) >= FEE_TREND_FLOOR;
  const relOver =
    previous.medianFee > 0
      ? Math.abs(medianFeeDelta) / previous.medianFee >= FEE_TREND_EPSILON
      : medianFeeDelta !== 0; // sem base anterior, qualquer variação já conta
  const material = absOver && relOver;
  const premiumShareCurrent = premiumBandShare(current);
  const premiumSharePrevious = premiumBandShare(previous);
  // Deslocamento faixa a faixa: ambas as distribuições sempre trazem as 6 faixas
  // canônicas, então casa por chave (robusto à ordem) preservando a ordem de
  // `current.bands` (= ordem de FEE_BANDS). Faixa ausente no anterior conta como 0.
  const previousByKey = new Map(previous.bands.map((b) => [b.key, b]));
  const bandChanges: FeeBandShareChange[] = current.bands.map((cb) => {
    const pb = previousByKey.get(cb.key);
    const previousCount = pb ? pb.count : 0;
    const previousCountShare = pb ? pb.countShare : 0;
    return {
      key: cb.key,
      label: cb.label,
      currentCount: cb.count,
      previousCount,
      currentCountShare: cb.countShare,
      previousCountShare,
      countShareDelta: cb.countShare - previousCountShare,
    };
  });
  return {
    current,
    previous,
    medianFeeDelta,
    avgFeeDelta: current.avgFee - previous.avgFee,
    medianFeePct: previous.medianFee > 0 ? medianFeeDelta / previous.medianFee : null,
    trend: !material ? "stable" : medianFeeDelta > 0 ? "up" : "down",
    premiumShareCurrent,
    premiumSharePrevious,
    premiumShareDelta: premiumShareCurrent - premiumSharePrevious,
    bandChanges,
  };
}

/**
 * Lookup O(1) `FeeBandKey` → `FeeBandShareChange` a partir de uma
 * `FeeDistributionComparison` já computada, para a tabela e o CSV alinharem a
 * coluna "vs. {ano-1}" a cada linha de faixa sem varrer `bandChanges`. Espelha
 * `indexStageDurationChanges`/`indexContactPipelineChanges` (D238/D282). Pura.
 */
export function indexFeeBandShareChanges(
  comparison: FeeDistributionComparison,
): Map<FeeBandKey, FeeBandShareChange> {
  return new Map(comparison.bandChanges.map((c) => [c.key, c]));
}

// ── Manchete de queda do cachê típico para o Painel (meu preço encolheu?) ────
//
// `compareFeeDistribution` (D187) já mede se o cachê mediano subiu/caiu de um ano
// para o outro, mas o sinal só vivia na tela `/shows/faixas-de-cache`. Uma erosão
// do preço típico é um risco de carreira tão acionável quanto a conversão caindo
// (D245) ou a antecedência encolhendo (D272) — quando o show mediano passa a pagar
// menos, é hora de revisar tabela/mix de contratantes antes que vire tendência.
// Este é o eco desse comparativo no dashboard, no espírito dos nudges irmãos de
// "piora": só a ponta ruim (`trend === "down"`) vira alerta; um cachê SUBINDO é
// boa notícia e não precisa de banner.

/**
 * Amostra mínima de shows realizados com cachê em CADA ano para a queda do cachê
 * mediano virar nudge. A mediana de 1–2 shows é o próprio show — abaixo disto a
 * comparação leria ruído de amostra como tendência de preço. Espelha a disciplina
 * de `CONVERSION_DROP_MIN_DECIDED`/`MIN_LEAD_TIME_SAMPLE` nos nudges irmãos.
 */
export const FEE_DROP_MIN_SAMPLE = 3;

/**
 * Razão do cachê mediano (atual ÷ anterior) a partir da qual a queda entra na faixa
 * crítica (vermelho): mediana atual ≤ 75% da anterior, i.e. caiu 25% ou mais.
 * Espelha `YTD_PACE_CRITICAL_RATIO` (o atraso acentuado do ritmo do ano).
 */
export const FEE_DROP_CRITICAL_RATIO = 0.75;

export interface FeeDropHeadline {
  /**
   * Deve aparecer no Painel? Só quando o cachê mediano **caiu** materialmente de um
   * ano para o outro (`trend === "down"` de `compareFeeDistribution`) E ambos os
   * anos têm amostra confiável (≥ `minSample` shows realizados com cachê cada). Com
   * `up`/`stable`, ou amostra fina em algum lado, o aviso seria ruído — mesma
   * disciplina de `proposalConversionHeadline`/`yearToDatePaceHeadline`.
   */
  show: boolean;
  /** Queda acentuada (mediana atual ≤ `criticalRatio` × a anterior, i.e. ≥ 25% abaixo)? */
  critical: boolean;
  /** Cachê mediano do ano atual (centavos). */
  currentMedian: number;
  /** Cachê mediano do ano anterior (centavos). */
  previousMedian: number;
  /** Variação do cachê mediano (atual − anterior, centavos); ≤ 0 quando `show`. */
  medianFeeDelta: number;
  /** Variação relativa do cachê mediano (ex.: −0,3 = 30% abaixo); definida quando `show`. */
  pct: number | null;
  /** Shows realizados com cachê no ano atual (para a moldura textual). */
  currentShows: number;
  /** Shows realizados com cachê no ano anterior. */
  previousShows: number;
}

/**
 * Decide se o Painel deve alertar que o cachê típico (mediano) caiu de um ano para
 * o outro — o eco de `compareFeeDistribution` (D187) no dashboard. Recebe um
 * comparativo já computado (as duas distribuições) e não faz I/O. `show` só quando
 * a tendência da mediana é de QUEDA (`trend === "down"`, que já embute os limiares
 * absoluto/relativo de `FEE_TREND_FLOOR`/`FEE_TREND_EPSILON`) **e** ambos os anos
 * têm ≥ `minSample` shows realizados com cachê; `critical` quando a mediana atual
 * afunda para ≤ `criticalRatio` da anterior. Como os nudges irmãos, fica raro por
 * gate. Pura.
 */
export function feeDropHeadline(
  comparison: FeeDistributionComparison,
  minSample: number = FEE_DROP_MIN_SAMPLE,
  criticalRatio: number = FEE_DROP_CRITICAL_RATIO,
): FeeDropHeadline {
  const { current, previous, medianFeeDelta, medianFeePct, trend } = comparison;
  const reliable =
    current.totalShows >= minSample && previous.totalShows >= minSample;
  const show = reliable && trend === "down";
  const critical =
    show && previous.medianFee > 0 && current.medianFee <= criticalRatio * previous.medianFee;
  return {
    show,
    critical,
    currentMedian: current.medianFee,
    previousMedian: previous.medianFee,
    medianFeeDelta,
    pct: medianFeePct,
    currentShows: current.totalShows,
    previousShows: previous.totalShows,
  };
}

// ── Manchete de erosão da faixa premium para o Painel (o topo esvaziou?) ─────
//
// `feeDropHeadline` (D274) já avisa quando o cachê MEDIANO cai — o meio da tabela
// de preços encolheu. Mas há uma piora mais sutil que a mediana não vê: a **cauda
// de cima** esvazia sem o meio se mover (você continua fechando os shows do meio
// no mesmo valor, mas parou de emplacar os cachês de topo). `compareFeeDistribution`
// (D187) já computa `premiumShareDelta` — a variação da participação da faixa
// premium (`PREMIUM_FEE_BAND_KEY`, "Acima de R$ 5.000") de um ano para o outro —,
// mas esse sinal só vivia na tela `/shows/faixas-de-cache`. Este é o eco dele no
// Painel, no espírito dos nudges irmãos de "piora".
//
// Densidade (a razão de o item ter sido adiado na D274, alt. b): o nudge dispara
// SÓ quando a mediana NÃO está em queda (`trend !== "down"`) — assim ele é
// mutuamente exclusivo com `feeDropHeadline`, nunca somando um segundo banner de
// cachê ao Painel. Quando a mediana já caiu, aquele é o titular; a erosão premium
// só fala quando o meio se manteve e o topo, silenciosamente, secou.

/**
 * Amostra mínima de shows realizados com cachê em CADA ano para a erosão da faixa
 * premium virar nudge — mesmo lastro de `FEE_DROP_MIN_SAMPLE`: abaixo disto a
 * participação é ruído de amostra, não tendência de mix.
 */
export const PREMIUM_EROSION_MIN_SAMPLE = 3;

/**
 * Queda mínima (em pontos de participação, 0..1) da faixa premium para o nudge
 * disparar: 0,15 = 15 p.p. dos shows saíram do topo da tabela. **Hipótese** — o
 * que conta como "esvaziamento material" do topo varia por circuito/preço; validar
 * com uso real antes de virar premissa fixa.
 */
export const PREMIUM_EROSION_MIN_POINTS = 0.15;

/**
 * Queda da participação premium (em pontos) a partir da qual a erosão entra na
 * faixa crítica (vermelho): 0,30 = 30 p.p. a menos no topo. Espelha a escalada
 * `critical` de `feeDropHeadline`. **Hipótese** (ver acima).
 */
export const PREMIUM_EROSION_CRITICAL_POINTS = 0.3;

export interface FeePremiumErosionHeadline {
  /**
   * Deve aparecer no Painel? Só quando a participação da faixa premium **caiu**
   * materialmente de um ano para o outro (`premiumShareDelta ≤ −minPoints`), havia
   * o que erodir (`premiumSharePrevious > 0`), a mediana **não** está em queda
   * (`trend !== "down"` — cede a vez ao `feeDropHeadline`, evitando dois banners de
   * cachê) E ambos os anos têm amostra confiável (≥ `minSample` shows priced cada).
   */
  show: boolean;
  /** Erosão acentuada (participação premium caiu ≥ `criticalPoints`)? */
  critical: boolean;
  /** Participação da faixa premium no ano atual (0..1). */
  premiumShareCurrent: number;
  /** Participação da faixa premium no ano anterior (0..1). */
  premiumSharePrevious: number;
  /** Variação da participação premium (atual − anterior, pontos); ≤ 0 quando `show`. */
  premiumShareDelta: number;
  /** Shows realizados com cachê no ano atual (para a moldura textual). */
  currentShows: number;
  /** Shows realizados com cachê no ano anterior. */
  previousShows: number;
}

/**
 * Decide se o Painel deve alertar que a faixa premium (o topo da tabela de cachês)
 * esvaziou de um ano para o outro — o eco de `compareFeeDistribution` (D187) no
 * dashboard, complementar a `feeDropHeadline` (D274, que olha a MEDIANA). Recebe um
 * comparativo já computado (as duas distribuições) e não faz I/O. `show` só quando a
 * participação premium caiu materialmente com base a erodir, a mediana NÃO está em
 * queda (mutuamente exclusivo com `feeDropHeadline`) e ambos os anos têm ≥ `minSample`
 * shows priced; `critical` quando a queda atinge `criticalPoints`. Como os nudges
 * irmãos, fica raro por gate. Pura.
 */
export function feePremiumErosionHeadline(
  comparison: FeeDistributionComparison,
  minSample: number = PREMIUM_EROSION_MIN_SAMPLE,
  minPoints: number = PREMIUM_EROSION_MIN_POINTS,
  criticalPoints: number = PREMIUM_EROSION_CRITICAL_POINTS,
): FeePremiumErosionHeadline {
  const { current, previous, trend, premiumShareCurrent, premiumSharePrevious, premiumShareDelta } =
    comparison;
  const reliable =
    current.totalShows >= minSample && previous.totalShows >= minSample;
  const eroded = premiumSharePrevious > 0 && premiumShareDelta <= -minPoints;
  const show = reliable && trend !== "down" && eroded;
  const critical = show && premiumShareDelta <= -criticalPoints;
  return {
    show,
    critical,
    premiumShareCurrent,
    premiumSharePrevious,
    premiumShareDelta,
    currentShows: current.totalShows,
    previousShows: previous.totalShows,
  };
}

// ── Manchete de mais shows no vermelho para o Painel (a carteira piorou?) ────
//
// `showResultDistribution` (D365) fotografa a saúde da carteira — quantos shows
// rodam no prejuízo — e `compareShowResultDistribution` (D366) já mede se a fração
// NO VERMELHO subiu ou caiu de um ano para o outro, mas esse veredito só vivia na
// tela `/shows/rentabilidade/distribuicao`. Este é o eco dele no Painel: quando a
// fatia da carteira que dá prejuízo CRESCE de forma material, vira o nudge "revise
// cachês/despesas dessas casas" — no espírito dos nudges de "piora" irmãos
// (`feeDropHeadline`/D274, `feePremiumErosionHeadline`/D293). Só a piora acende
// banner; menos shows no vermelho é boa notícia e não precisa de aviso. Ver
// DECISIONS.md D367.

/**
 * Amostra mínima de shows analisados em CADA ano para o crescimento da fração no
 * vermelho virar nudge — mesmo lastro de `PREMIUM_EROSION_MIN_SAMPLE`: abaixo disto
 * um único show a mais no prejuízo move a fração sem significar tendência.
 */
export const LOSS_SHARE_RISE_MIN_SAMPLE = 3;

/**
 * Alta da fração no vermelho (em pontos de participação, 0..1) a partir da qual a
 * piora entra na faixa crítica (vermelho): 0,20 = 20 p.p. a mais da carteira caiu
 * no prejuízo. Acima do limiar de materialidade (`LOSS_SHARE_TREND_EPSILON`, que já
 * decide o veredito "worsened") e no espírito da escalada `critical` dos nudges de
 * cachê. **Hipótese** pelo mesmo motivo de `LOSS_SHARE_TREND_EPSILON` (ver acima);
 * validar com uso real antes de virar premissa fixa.
 */
export const LOSS_SHARE_RISE_CRITICAL_POINTS = 0.2;

export interface LossShareRiseHeadline {
  /**
   * Deve aparecer no Painel? Só quando a fração de shows no vermelho **subiu**
   * materialmente de um ano para o outro (`trend === "worsened"` de
   * `compareShowResultDistribution`, que já embute o limiar `LOSS_SHARE_TREND_EPSILON`)
   * E ambos os anos têm amostra confiável (≥ `minSample` shows analisados cada). Com
   * `improved`/`stable`, ou amostra fina em algum lado, o aviso seria ruído — mesma
   * disciplina de `feePremiumErosionHeadline`/`feeDropHeadline`.
   */
  show: boolean;
  /** Piora acentuada (fração no vermelho subiu ≥ `criticalPoints`)? */
  critical: boolean;
  /** Fração no vermelho do ano atual (0..1). */
  lossShareCurrent: number;
  /** Fração no vermelho do ano anterior (0..1). */
  lossSharePrevious: number;
  /** Variação da fração no vermelho (atual − anterior, pontos); ≥ 0 quando `show`. */
  lossShareDelta: number;
  /** Nº de shows no vermelho no ano atual (para a moldura textual). */
  lossCountCurrent: number;
  /** Nº de shows no vermelho no ano anterior. */
  lossCountPrevious: number;
  /** Prejuízo somado dos shows no vermelho no ano atual (centavos, ≤ 0). */
  lossNetCurrent: number;
  /** Shows analisados no ano atual (para a moldura textual). */
  currentShows: number;
  /** Shows analisados no ano anterior. */
  previousShows: number;
}

/**
 * Decide se o Painel deve alertar que uma fatia maior da carteira passou a dar
 * prejuízo de um ano para o outro — o eco de `compareShowResultDistribution` (D366)
 * no dashboard, no espírito dos nudges de "piora" de cachê (`feeDropHeadline`/D274,
 * `feePremiumErosionHeadline`/D293). Recebe um comparativo já computado (as duas
 * distribuições) e não faz I/O. `show` só quando o veredito é de PIORA
 * (`trend === "worsened"`, que já embute `LOSS_SHARE_TREND_EPSILON`) **e** ambos os
 * anos têm ≥ `minSample` shows analisados; `critical` quando a fração no vermelho
 * sobe ≥ `criticalPoints`. Como os nudges irmãos, fica raro por gate. Pura.
 */
export function lossShareRiseHeadline(
  comparison: ShowResultDistributionComparison,
  minSample: number = LOSS_SHARE_RISE_MIN_SAMPLE,
  criticalPoints: number = LOSS_SHARE_RISE_CRITICAL_POINTS,
): LossShareRiseHeadline {
  const { current, previous, lossShareDelta, trend } = comparison;
  const reliable = current.count >= minSample && previous.count >= minSample;
  const show = reliable && trend === "worsened";
  const critical = show && lossShareDelta >= criticalPoints;
  return {
    show,
    critical,
    lossShareCurrent: current.lossShare,
    lossSharePrevious: previous.lossShare,
    lossShareDelta,
    lossCountCurrent: current.lossCount,
    lossCountPrevious: previous.lossCount,
    lossNetCurrent: current.lossNet,
    currentShows: current.count,
    previousShows: previous.count,
  };
}

// ── Manchete de erosão da margem AGREGADA para o Painel (o R$ minguou?) ──────
//
// `lossShareRiseHeadline` (D367) avisa quando MAIS shows caem no vermelho — um
// sinal de CONTAGEM. Mas há uma piora que a contagem não vê: o mesmo número de
// shows continua no azul, só que cada um passou a sobrar menos depois dos custos
// (cachês achatados, despesas maiores). A leitura ponderada por R$ dessa piora é a
// MARGEM LÍQUIDA AGREGADA da carteira (`totalMargin` de `rankShowsByProfit`:
// `totalNet / totalIncome`, onde um show grande pesa mais que um pequeno). Este é o
// eco dela no Painel, complementar ao nudge de contagem (D367) e no molde de
// `feePremiumErosionHeadline` (D293) vs. `feeDropHeadline`.
//
// Densidade (a razão de o item ter sido adiado na D367, alt. b): o nudge dispara SÓ
// quando a contagem no vermelho NÃO subiu materialmente (`lossShareRose === false`)
// — assim é mutuamente exclusivo com `lossShareRiseHeadline`, nunca somando um
// segundo banner de rentabilidade ao Painel. Quando mais shows já caíram no
// vermelho, aquele é o titular; a erosão de margem só fala quando a contagem se
// manteve e o que minguou foi o quanto cada gig lucrativo sobra. Ver D368.

/**
 * Amostra mínima de shows analisados em CADA ano para a queda da margem agregada
 * virar nudge — mesmo lastro de `LOSS_SHARE_RISE_MIN_SAMPLE`: abaixo disto a margem
 * ponderada oscila por um único show grande, não por tendência de carteira.
 */
export const MARGIN_DROP_MIN_SAMPLE = 3;

/**
 * Queda mínima (em pontos de margem, 0..1) da margem líquida agregada para o nudge
 * disparar: 0,10 = 10 p.p. a menos de cada real bruto sobrando depois dos custos.
 * **Hipótese** — o que conta como "erosão material" da margem varia por circuito/
 * custo fixo; validar com uso real antes de virar premissa fixa.
 */
export const MARGIN_DROP_MIN_POINTS = 0.1;

/**
 * Queda da margem agregada (em pontos) a partir da qual a erosão entra na faixa
 * crítica (vermelho): 0,20 = 20 p.p. a menos. Espelha a escalada `critical` dos
 * nudges irmãos de rentabilidade/cachê. **Hipótese** (ver acima).
 */
export const MARGIN_DROP_CRITICAL_POINTS = 0.2;

/** Campos de `rankShowsByProfit` que o nudge de margem lê (estruturalmente). */
type MarginReadableReport = Pick<
  ShowsProfitability,
  "totalMargin" | "count" | "totalNet"
>;

export interface PortfolioMarginDropHeadline {
  /**
   * Deve aparecer no Painel? Só quando a margem líquida AGREGADA **caiu**
   * materialmente de um ano para o outro (`marginDelta ≤ −minPoints`), a contagem de
   * shows no vermelho NÃO subiu materialmente (`lossShareRose === false` — cede a vez
   * ao `lossShareRiseHeadline`, evitando dois banners de rentabilidade) E ambos os
   * anos têm amostra confiável (≥ `minSample` shows analisados cada). Mesma disciplina
   * de `feePremiumErosionHeadline` vs. `feeDropHeadline`.
   */
  show: boolean;
  /** Erosão acentuada (margem agregada caiu ≥ `criticalPoints`)? */
  critical: boolean;
  /** Margem líquida agregada do ano atual (0..1; pode ser negativa). */
  marginCurrent: number;
  /** Margem líquida agregada do ano anterior (0..1; pode ser negativa). */
  marginPrevious: number;
  /** Variação da margem agregada (atual − anterior, pontos); ≤ 0 quando `show`. */
  marginDelta: number;
  /** Resultado líquido somado do ano atual (centavos, para a moldura textual). */
  totalNetCurrent: number;
  /** Shows analisados no ano atual (para a moldura textual). */
  currentShows: number;
  /** Shows analisados no ano anterior. */
  previousShows: number;
}

/**
 * Decide se o Painel deve alertar que a margem líquida AGREGADA da carteira encolheu
 * de um ano para o outro — o eco ponderado por R$ da piora de rentabilidade, no
 * espírito de `feePremiumErosionHeadline` (D293) vs. `feeDropHeadline`. Recebe as
 * duas `rankShowsByProfit` já computadas (cada uma sobre os shows do seu período) e o
 * veredito do nudge de contagem (`lossShareRose`) para não somar dois banners, e não
 * faz I/O. `show` só quando a margem caiu ≥ `minPoints`, a contagem no vermelho NÃO
 * subiu materialmente (mutuamente exclusivo com `lossShareRiseHeadline`) e ambos os
 * anos têm ≥ `minSample` shows analisados; `critical` quando a queda atinge
 * `criticalPoints`. Como os nudges irmãos, fica raro por gate. Pura.
 */
export function portfolioMarginDropHeadline(
  current: MarginReadableReport,
  previous: MarginReadableReport,
  lossShareRose: boolean,
  minSample: number = MARGIN_DROP_MIN_SAMPLE,
  minPoints: number = MARGIN_DROP_MIN_POINTS,
  criticalPoints: number = MARGIN_DROP_CRITICAL_POINTS,
): PortfolioMarginDropHeadline {
  const marginDelta = current.totalMargin - previous.totalMargin;
  const reliable = current.count >= minSample && previous.count >= minSample;
  const dropped = marginDelta <= -minPoints;
  const show = reliable && !lossShareRose && dropped;
  const critical = show && marginDelta <= -criticalPoints;
  return {
    show,
    critical,
    marginCurrent: current.totalMargin,
    marginPrevious: previous.totalMargin,
    marginDelta,
    totalNetCurrent: current.totalNet,
    currentShows: current.count,
    previousShows: previous.count,
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

/**
 * Anos (UTC, decrescente) dos shows que de fato entram no desempenho por dia
 * da semana — i.e. realizados (`isHappenedGig`) com cachê > 0, exatamente o
 * mesmo recorte de `weekdayPerformance`. Alimenta o seletor de período de
 * `/shows/dias-semana` sem oferecer anos vazios. Espelho direto de
 * `feeDistributionYears` (o gate das duas telas é idêntico); mantido como
 * função própria para a tela poder evoluir seu recorte sem acoplar-se à
 * distribuição de cachês. Pura; `now` injetável para teste.
 */
export function weekdayPerformanceYears(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): number[] {
  const todayMs = utcMidnight(opts.now ?? new Date());
  const years = new Set<number>();
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Dias que contam como "fim de semana" no contexto de shows ao vivo: as noites
 * em que o público sai — sexta (5), sábado (6) e domingo (0). Os demais (segunda
 * a quinta) são "dias de semana". Índice 0 = domingo .. 6 = sábado (mesma
 * convenção de `WeekdayStat.weekday` / `getUTCDay`).
 */
export const WEEKEND_WEEKDAYS: readonly number[] = [5, 6, 0];

/** Um lado do split fim de semana × dias de semana. */
export interface WeekdaySplitBucket {
  /** Nº de shows realizados neste bloco de dias. */
  count: number;
  /** Soma dos cachês neste bloco (centavos). */
  totalFee: number;
  /** Cachê médio por show do bloco = round(totalFee / count); 0 se vazio. */
  avgFee: number;
  /** Participação no nº total de shows do período (0..1). */
  countShare: number;
  /** Participação no faturamento total do período (0..1). */
  feeShare: number;
}

export interface WeekdaySplit {
  /** Sexta + sábado + domingo. */
  weekend: WeekdaySplitBucket;
  /** Segunda a quinta. */
  weekday: WeekdaySplitBucket;
}

/**
 * Parte o desempenho por dia da semana em dois blocos — fim de semana
 * (sex/sáb/dom) × dias de semana (seg–qui) — respondendo "que fração dos meus
 * shows e do meu faturamento vem das noites de fim de semana, e o cachê médio de
 * fim de semana é maior?". Distinto dos destaques por dia (`bestByAvg` etc., que
 * olham um único dia) e do módulo de fins de semana livres (que é sobre agenda
 * futura, não faturamento realizado).
 *
 * Deriva direto dos 7 `wp.days` já computados por `weekdayPerformance` — soma os
 * dois blocos, **zero agregação nova e zero I/O**. As participações usam os
 * mesmos totais do período (`wp.totalShows`/`wp.totalFee`), então respeitam
 * automaticamente qualquer recorte (`?ano=`) aplicado antes de `weekdayPerformance`.
 * Pura.
 */
export function weekdaySplit(wp: WeekdayPerformance): WeekdaySplit {
  const isWeekend = (weekday: number) => WEEKEND_WEEKDAYS.includes(weekday);

  const bucketOf = (predicate: (weekday: number) => boolean): WeekdaySplitBucket => {
    const days = wp.days.filter((d) => predicate(d.weekday));
    const count = days.reduce((acc, d) => acc + d.count, 0);
    const totalFee = days.reduce((acc, d) => acc + d.totalFee, 0);
    return {
      count,
      totalFee,
      avgFee: count > 0 ? Math.round(totalFee / count) : 0,
      countShare: wp.totalShows > 0 ? count / wp.totalShows : 0,
      feeShare: wp.totalFee > 0 ? totalFee / wp.totalFee : 0,
    };
  };

  return {
    weekend: bucketOf(isWeekend),
    weekday: bucketOf((weekday) => !isWeekend(weekday)),
  };
}

export interface WeekdayPerformanceDayChange {
  /** Dia da semana: 0 = domingo .. 6 = sábado (UTC). */
  weekday: number;
  /** Rótulo longo ("Domingo", "Segunda"…). */
  label: string;
  /** Nº de shows deste dia da semana no período atual. */
  currentCount: number;
  /** Nº de shows deste dia da semana no período anterior. */
  previousCount: number;
  /** Variação do nº de shows (atual − anterior); pode ser negativa. */
  countDelta: number;
  /** Faturamento deste dia no período atual (centavos). */
  currentTotalFee: number;
  /** Faturamento deste dia no período anterior (centavos). */
  previousTotalFee: number;
  /** Variação do faturamento (atual − anterior, centavos); pode ser negativa. */
  feeDelta: number;
}

export interface WeekdayPerformanceComparison {
  /** Sempre 7 dias (domingo→sábado), inclusive os sem mudança. */
  days: WeekdayPerformanceDayChange[];
  /** Variação do nº total de shows (atual − anterior). */
  totalShowsDelta: number;
  /** Variação do faturamento total (atual − anterior, centavos). */
  totalFeeDelta: number;
  /**
   * Dia que mais GANHOU shows (maior `countDelta > 0`; empate → maior `feeDelta`,
   * depois dia mais cedo na semana); null se nenhum dia subiu.
   */
  biggestGain: WeekdayPerformanceDayChange | null;
  /**
   * Dia que mais PERDEU shows (menor `countDelta < 0`; empate → menor `feeDelta`,
   * depois dia mais cedo na semana); null se nenhum dia caiu.
   */
  biggestDrop: WeekdayPerformanceDayChange | null;
}

/**
 * Compara o **desempenho por dia da semana** entre dois períodos (tipicamente um
 * ano × o ano anterior), dia a dia da semana, respondendo "em que dias da semana
 * passei a tocar mais/menos do que no ano passado — a agenda migrou para outros
 * dias?". Espelho fiel de `compareGigSeasonality` (D223) no eixo do dia da semana:
 * em vez de despejar os 7 baldes na tela, destila os dois **movers** — o dia que
 * mais cresceu e o que mais caiu em nº de shows — mantendo a tela enxuta; os 7
 * `days` ficam disponíveis para quem quiser detalhar.
 *
 * Ancora no **nº de shows** (`count`), o eixo primário da página (o `busiest`), com
 * o `feeDelta` como desempate — um dia que trocou um show barato por um caro, mesmo
 * com `countDelta` empatado, vence. Puro, sem I/O: recebe dois `weekdayPerformance`
 * já computados (cada um sobre os shows do seu período). O chamador decide quando
 * exibir (tipicamente só com um ano específico e ambos os períodos com shows).
 */
export function compareWeekdayPerformance(
  current: WeekdayPerformance,
  previous: WeekdayPerformance,
): WeekdayPerformanceComparison {
  // Ambos os desempenhos trazem sempre os 7 dias em ordem (dom→sáb), então o
  // índice `i` casa o mesmo dia da semana nos dois períodos — sem lookup.
  const days: WeekdayPerformanceDayChange[] = current.days.map((cur, i) => {
    const prev = previous.days[i];
    return {
      weekday: cur.weekday,
      label: cur.label,
      currentCount: cur.count,
      previousCount: prev.count,
      countDelta: cur.count - prev.count,
      currentTotalFee: cur.totalFee,
      previousTotalFee: prev.totalFee,
      feeDelta: cur.totalFee - prev.totalFee,
    };
  });

  // Iteramos dom→sáb exigindo `>`/`<` estrito no desempate, então o dia mais cedo
  // na semana vence empates — mesma disciplina determinística do `pick` de
  // `weekdayPerformance` e dos movers de `compareGigSeasonality`.
  let biggestGain: WeekdayPerformanceDayChange | null = null;
  let biggestDrop: WeekdayPerformanceDayChange | null = null;
  for (const d of days) {
    if (d.countDelta > 0) {
      if (
        biggestGain == null ||
        d.countDelta > biggestGain.countDelta ||
        (d.countDelta === biggestGain.countDelta && d.feeDelta > biggestGain.feeDelta)
      ) {
        biggestGain = d;
      }
    }
    if (d.countDelta < 0) {
      if (
        biggestDrop == null ||
        d.countDelta < biggestDrop.countDelta ||
        (d.countDelta === biggestDrop.countDelta && d.feeDelta < biggestDrop.feeDelta)
      ) {
        biggestDrop = d;
      }
    }
  }

  return {
    days,
    totalShowsDelta: current.totalShows - previous.totalShows,
    totalFeeDelta: current.totalFee - previous.totalFee,
    biggestGain,
    biggestDrop,
  };
}

/** Tendência de um dia no comparativo por dia da semana: subiu, caiu ou estável. */
export type WeekdayPerformanceDayTrend = "up" | "down" | "flat";

/**
 * Classifica um dia do comparativo (`WeekdayPerformanceDayChange`) em `up`/`down`/
 * `flat`, para colorir a tabela de detalhe dos 7 dias de forma consistente com os
 * **movers** de `compareWeekdayPerformance`: ancora no nº de shows (`countDelta`) e,
 * com contagem empatada, usa o faturamento (`feeDelta`) como desempate — um dia que
 * trocou um show barato por um caro conta como "subiu" mesmo sem mudar a contagem.
 * Só é `flat` quando os dois deltas são zero. Puro, sem I/O. Espelho de
 * `classifyGigSeasonalityMonthChange`.
 */
export function classifyWeekdayPerformanceDayChange(
  change: WeekdayPerformanceDayChange,
): WeekdayPerformanceDayTrend {
  if (change.countDelta > 0) return "up";
  if (change.countDelta < 0) return "down";
  // Contagem empatada: o faturamento desempata, na mesma disciplina dos movers.
  if (change.feeDelta > 0) return "up";
  if (change.feeDelta < 0) return "down";
  return "flat";
}

/** Rótulos longos dos meses (Janeiro..Dezembro), índice 0 = janeiro. */
export const GIG_MONTH_LABELS: readonly string[] = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Rótulos curtos dos meses (jan..dez), índice 0 = janeiro. */
export const GIG_MONTH_SHORT: readonly string[] = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export interface GigMonthStat {
  /** Mês do ano: 0 = janeiro .. 11 = dezembro (UTC). */
  month: number;
  /** Rótulo longo ("Janeiro", "Fevereiro"…). */
  label: string;
  /** Nº de shows realizados nesse mês do ano (somado entre todos os anos). */
  count: number;
  /** Soma dos cachês nesse mês (centavos). */
  totalFee: number;
  /** Cachê médio nesse mês = round(totalFee / count); 0 se não houver shows. */
  avgFee: number;
  /** Participação no nº de shows = count / totalShows (0..1). */
  countShare: number;
  /** Participação no faturamento = totalFee / faturamento total (0..1). */
  feeShare: number;
}

export interface GigSeasonality {
  /** Sempre 12 entradas, de janeiro (0) a dezembro (11), inclusive meses sem shows. */
  months: GigMonthStat[];
  /** Nº total de shows realizados considerados (com cachê > 0). */
  totalShows: number;
  /** Soma de todos os cachês considerados (centavos). */
  totalFee: number;
  /** Cachê médio geral por show = round(totalFee / totalShows); 0 se nenhum. */
  avgFee: number;
  /** Mês com maior cachê médio (empate → maior nº de shows, depois mês mais cedo); null se nenhum. */
  bestByAvg: GigMonthStat | null;
  /** Mês com maior faturamento total (empate → maior nº de shows, depois mês mais cedo); null se nenhum. */
  bestByVolume: GigMonthStat | null;
  /** Mês com mais shows (empate → maior faturamento, depois mês mais cedo); null se nenhum. */
  busiest: GigMonthStat | null;
  /**
   * Mês mais quieto — o de MENOS shows entre os que tiveram algum (empate →
   * menor faturamento, depois mês mais cedo); null se nenhum. O vale da
   * temporada, para saber onde prospectar mais ou rever o preço. Considera só
   * meses com shows (`count > 0`): um mês historicamente vazio não é "fraco",
   * é ausência de dado.
   */
  quietest: GigMonthStat | null;
}

/**
 * Agrega os shows já realizados por MÊS DO ANO (jan→dez), somando todos os anos,
 * respondendo "quais meses da temporada historicamente rendem mais shows e
 * maiores cachês?" — a sazonalidade da agenda, para planejar prospecção e preço.
 *
 * - "Realizado" = `isHappenedGig` (PLAYED, ou CONFIRMED com data já passada);
 *   propostos, cancelados e futuros ficam de fora (mesma postura de
 *   `weekdayPerformance`/`feeTrend`).
 * - Só shows com cachê registrado (`fee > 0`) entram — gigs sem cachê
 *   distorceriam a média.
 * - O mês é extraído em UTC (`getUTCMonth`) para estabilidade nos testes; os
 *   anos são colapsados num só calendário de 12 meses (jan de 2023 e jan de 2024
 *   caem no mesmo balde "Janeiro").
 * - `months` traz sempre os 12 meses, mesmo os zerados, para o gráfico não
 *   "pular" meses e revelar as lacunas da temporada. Pura; `now` injetável.
 */
/**
 * Anos (UTC, decrescente) dos shows que **entram** na sazonalidade — só os gigs
 * já acontecidos com cachê (mesmo critério de `gigSeasonality`: `isHappenedGig`
 * + `fee > 0`). Alimenta o `PeriodPicker` de `/shows/sazonalidade` sem oferecer
 * anos que renderiam a tela vazia (um ano só com propostos/futuros não vira
 * pílula), espelhando a disciplina de `cancelledShowYears`/`bookingLeadTimeYears`
 * (D180). Distinto de `showProfitYears`, que olha a `date` de todos os shows.
 * Pura; `now` injetável.
 */
export function gigSeasonalityYears(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): number[] {
  const todayMs = utcMidnight(opts.now ?? new Date());
  const years = new Set<number>();
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const d = typeof s.date === "string" ? new Date(s.date) : s.date;
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

export function gigSeasonality(
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): GigSeasonality {
  const todayMs = utcMidnight(opts.now ?? new Date());

  const feesByMonth: number[][] = Array.from({ length: 12 }, () => []);
  for (const s of shows) {
    if (!isHappenedGig(s, todayMs)) continue;
    if (s.fee <= 0) continue;
    const d = typeof s.date === "string" ? new Date(s.date) : s.date;
    feesByMonth[d.getUTCMonth()].push(s.fee);
  }

  const totalShows = feesByMonth.reduce((acc, fees) => acc + fees.length, 0);
  const totalFee = feesByMonth.reduce((acc, fees) => acc + sum(fees), 0);

  const months: GigMonthStat[] = feesByMonth.map((fees, month) => {
    const monthTotal = sum(fees);
    return {
      month,
      label: GIG_MONTH_LABELS[month],
      count: fees.length,
      totalFee: monthTotal,
      avgFee: fees.length > 0 ? Math.round(monthTotal / fees.length) : 0,
      countShare: totalShows > 0 ? fees.length / totalShows : 0,
      feeShare: totalFee > 0 ? monthTotal / totalFee : 0,
    };
  });

  // Candidatos a "melhor": apenas meses que de fato tiveram shows.
  const active = months.filter((m) => m.count > 0);

  // Empates resolvidos de forma determinística (mês mais cedo vence por iterar
  // de jan→dez e exigir desempate estritamente maior).
  const pick = (
    rank: (m: GigMonthStat) => number,
    tiebreak: (m: GigMonthStat) => number,
  ): GigMonthStat | null => {
    let best: GigMonthStat | null = null;
    for (const m of active) {
      if (
        best == null ||
        rank(m) > rank(best) ||
        (rank(m) === rank(best) && tiebreak(m) > tiebreak(best))
      ) {
        best = m;
      }
    }
    return best;
  };

  return {
    months,
    totalShows,
    totalFee,
    avgFee: totalShows > 0 ? Math.round(totalFee / totalShows) : 0,
    bestByAvg: pick((m) => m.avgFee, (m) => m.count),
    bestByVolume: pick((m) => m.totalFee, (m) => m.count),
    busiest: pick((m) => m.count, (m) => m.totalFee),
    // Espelho de `busiest`: negando rank e desempate, `pick` (que exige `>`
    // estrito e itera jan→dez) devolve o menor count, depois o menor totalFee,
    // depois o mês mais cedo — sem lógica nova.
    quietest: pick((m) => -m.count, (m) => -m.totalFee),
  };
}

export interface GigSeasonalityMonthChange {
  /** Mês do ano: 0 = janeiro .. 11 = dezembro (UTC). */
  month: number;
  /** Rótulo longo ("Janeiro", "Fevereiro"…). */
  label: string;
  /** Nº de shows deste mês no período atual. */
  currentCount: number;
  /** Nº de shows deste mês no período anterior. */
  previousCount: number;
  /** Variação do nº de shows (atual − anterior); pode ser negativa. */
  countDelta: number;
  /** Faturamento deste mês no período atual (centavos). */
  currentTotalFee: number;
  /** Faturamento deste mês no período anterior (centavos). */
  previousTotalFee: number;
  /** Variação do faturamento (atual − anterior, centavos); pode ser negativa. */
  feeDelta: number;
}

export interface GigSeasonalityComparison {
  /** Sempre 12 meses (janeiro→dezembro), inclusive os sem mudança. */
  months: GigSeasonalityMonthChange[];
  /** Variação do nº total de shows (atual − anterior). */
  totalShowsDelta: number;
  /** Variação do faturamento total (atual − anterior, centavos). */
  totalFeeDelta: number;
  /**
   * Mês que mais GANHOU shows (maior `countDelta > 0`; empate → maior `feeDelta`,
   * depois mês mais cedo); null se nenhum mês subiu.
   */
  biggestGain: GigSeasonalityMonthChange | null;
  /**
   * Mês que mais PERDEU shows (menor `countDelta < 0`; empate → menor `feeDelta`,
   * depois mês mais cedo); null se nenhum mês caiu.
   */
  biggestDrop: GigSeasonalityMonthChange | null;
}

/**
 * Compara a **sazonalidade de shows** entre dois períodos (tipicamente um ano ×
 * o ano anterior), mês a mês do calendário, respondendo "em que meses estou
 * agendando mais/menos shows do que no ano passado — a temporada mudou de forma?".
 *
 * Distinto dos comparativos irmãos que ancoram num número único (rentabilidade/
 * D210, concretização do funil/D212): o valor da sazonalidade é a **forma mensal**,
 * então em vez de comparar 12 baldes na tela (adiado na D214(b) por ser passo maior)
 * este helper destila os dois **movers** — o mês que mais cresceu e o que mais caiu
 * em nº de shows — no espírito do card de "quem mudou de ritmo" (`comparePaymentLagByContact`/
 * D195), mantendo a tela enxuta. Os 12 `months` ficam disponíveis para quem quiser detalhar.
 *
 * Ancora no **nº de shows** (`count`), o eixo primário da página (o `busiest`), com o
 * `feeDelta` como desempate — um mês que trocou um show barato por um caro, mesmo com
 * `countDelta` empatado, vence. Puro, sem I/O: recebe duas `gigSeasonality` já computadas
 * (cada uma sobre os shows do seu período). O chamador decide quando exibir (tipicamente
 * só com um ano específico e ambos os períodos com shows).
 */
export function compareGigSeasonality(
  current: GigSeasonality,
  previous: GigSeasonality,
): GigSeasonalityComparison {
  // Ambas as sazonalidades trazem sempre os 12 meses em ordem (jan→dez), então o
  // índice `i` casa o mesmo mês do calendário nos dois períodos — sem lookup.
  const months: GigSeasonalityMonthChange[] = current.months.map((cur, i) => {
    const prev = previous.months[i];
    return {
      month: cur.month,
      label: cur.label,
      currentCount: cur.count,
      previousCount: prev.count,
      countDelta: cur.count - prev.count,
      currentTotalFee: cur.totalFee,
      previousTotalFee: prev.totalFee,
      feeDelta: cur.totalFee - prev.totalFee,
    };
  });

  // Iteramos jan→dez exigindo `>`/`<` estrito no desempate, então o mês mais cedo
  // vence empates — mesma disciplina determinística do `pick` de `gigSeasonality`.
  let biggestGain: GigSeasonalityMonthChange | null = null;
  let biggestDrop: GigSeasonalityMonthChange | null = null;
  for (const m of months) {
    if (m.countDelta > 0) {
      if (
        biggestGain == null ||
        m.countDelta > biggestGain.countDelta ||
        (m.countDelta === biggestGain.countDelta && m.feeDelta > biggestGain.feeDelta)
      ) {
        biggestGain = m;
      }
    }
    if (m.countDelta < 0) {
      if (
        biggestDrop == null ||
        m.countDelta < biggestDrop.countDelta ||
        (m.countDelta === biggestDrop.countDelta && m.feeDelta < biggestDrop.feeDelta)
      ) {
        biggestDrop = m;
      }
    }
  }

  return {
    months,
    totalShowsDelta: current.totalShows - previous.totalShows,
    totalFeeDelta: current.totalFee - previous.totalFee,
    biggestGain,
    biggestDrop,
  };
}

/** Tendência de um mês no comparativo de sazonalidade: subiu, caiu ou estável. */
export type GigSeasonalityMonthTrend = "up" | "down" | "flat";

/**
 * Classifica um mês do comparativo (`GigSeasonalityMonthChange`) em `up`/`down`/
 * `flat`, para colorir a tabela de detalhe dos 12 meses de forma consistente com
 * os **movers** de `compareGigSeasonality`: ancora no nº de shows (`countDelta`) e,
 * com contagem empatada, usa o faturamento (`feeDelta`) como desempate — um mês que
 * trocou um show barato por um caro conta como "subiu" mesmo sem mudar a contagem.
 * Só é `flat` quando os dois deltas são zero. Puro, sem I/O.
 */
export function classifyGigSeasonalityMonthChange(
  change: GigSeasonalityMonthChange,
): GigSeasonalityMonthTrend {
  if (change.countDelta > 0) return "up";
  if (change.countDelta < 0) return "down";
  // Contagem empatada: o faturamento desempata, na mesma disciplina dos movers.
  if (change.feeDelta > 0) return "up";
  if (change.feeDelta < 0) return "down";
  return "flat";
}

/**
 * Quantos meses do calendário à frente o Painel varre em busca do próximo mês
 * forte. Inclui o mês seguinte (`monthsAhead` 1) e **exclui o mês corrente** —
 * já é tarde para prospectar/precificar o mês que está rolando; o valor do nudge
 * é o tempo de antecedência. 4 = uma janela de prospecção realista (~um trimestre).
 */
export const STRONG_MONTH_HORIZON = 4;

/**
 * Mínimo de shows realizados (com cachê) para a sazonalidade ser confiável o
 * bastante para virar nudge no Painel. Abaixo disso a "temporada" é só ruído
 * amostral e o aviso enganaria mais do que ajudaria.
 */
export const STRONG_MONTH_MIN_SHOWS = 6;

/**
 * Um mês conta como "forte" quando sua participação no faturamento histórico
 * (`feeShare`) supera a média uniforme (1/12) por este fator. 1.25 = pelo menos
 * 25% acima do mês médio — alto o bastante para ser de fato um pico de temporada,
 * não uma flutuação qualquer.
 */
export const STRONG_MONTH_FACTOR = 1.25;

export interface GigSeasonalityHeadline {
  /**
   * Deve aparecer no Painel? Só quando há amostra suficiente
   * (`totalShows >= STRONG_MONTH_MIN_SHOWS`) **e** existe um mês forte dentro da
   * janela à frente — caso contrário o nudge seria ruído (mesma disciplina de
   * `geoConcentrationHeadline`/`cashBurnHeadline`).
   */
  show: boolean;
  /** O próximo mês forte na janela (o mais cedo que qualifica), ou null. */
  month: GigMonthStat | null;
  /** Quantos meses à frente está (1 = mês que vem … STRONG_MONTH_HORIZON); 0 se nenhum. */
  monthsAhead: number;
  /**
   * Quantas vezes o `feeShare` do mês supera a média uniforme (1/12), i.e.
   * `feeShare * 12`. Ex.: 1.8 = esse mês historicamente rende 80% acima do mês
   * médio. 0 quando não há mês forte à frente.
   */
  lift: number;
}

/**
 * Resumo de Painel da **sazonalidade dos shows**: deriva, de uma
 * `gigSeasonality` já computada, o **próximo mês forte** que se aproxima — o
 * mais cedo, dentro de `STRONG_MONTH_HORIZON` meses, cujo faturamento histórico
 * está acima da média (≥ `STRONG_MONTH_FACTOR`× o mês médio). Pura, com `now`
 * injetável — espelha `geoConcentrationHeadline` (D114): a regra de exibição
 * vive aqui, o dashboard só consome.
 *
 * Olha **só para frente** (a partir do mês que vem) porque o valor do aviso é a
 * antecedência para prospectar/precificar; e exige amostra mínima
 * (`STRONG_MONTH_MIN_SHOWS`) para não tratar um par de shows como "temporada".
 * O detalhe completo está em `/shows/sazonalidade`.
 */
export function gigSeasonalityHeadline(
  seasonality: GigSeasonality,
  opts: { now?: Date | string } = {},
): GigSeasonalityHeadline {
  const none: GigSeasonalityHeadline = {
    show: false,
    month: null,
    monthsAhead: 0,
    lift: 0,
  };
  if (seasonality.totalShows < STRONG_MONTH_MIN_SHOWS) return none;

  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const currentMonth = nowDate.getUTCMonth();
  const threshold = STRONG_MONTH_FACTOR / 12;

  for (let ahead = 1; ahead <= STRONG_MONTH_HORIZON; ahead++) {
    const m = seasonality.months[(currentMonth + ahead) % 12];
    if (m.count > 0 && m.feeShare >= threshold) {
      return { show: true, month: m, monthsAhead: ahead, lift: m.feeShare * 12 };
    }
  }
  return none;
}

/**
 * Um mês conta como "fraco" (vale da temporada) quando sua participação no
 * faturamento histórico (`feeShare`) fica abaixo da média uniforme (1/12) por
 * este fator. 0.75 = pelo menos 25% abaixo do mês médio — fundo o bastante para
 * ser de fato um vale de temporada, não uma flutuação qualquer. Espelha
 * `STRONG_MONTH_FACTOR` no sentido oposto; o horizonte e a amostra mínima são os
 * mesmos do mês forte (`STRONG_MONTH_HORIZON`/`STRONG_MONTH_MIN_SHOWS`).
 */
export const WEAK_MONTH_FACTOR = 0.75;

export interface GigSeasonalityLull {
  /**
   * Deve aparecer no Painel? Só quando há amostra suficiente
   * (`totalShows >= STRONG_MONTH_MIN_SHOWS`) **e** existe um mês fraco dentro da
   * janela à frente — caso contrário o nudge seria ruído (mesma disciplina de
   * `gigSeasonalityHeadline`).
   */
  show: boolean;
  /** O próximo mês fraco na janela (o mais cedo que qualifica), ou null. */
  month: GigMonthStat | null;
  /** Quantos meses à frente está (1 = mês que vem … STRONG_MONTH_HORIZON); 0 se nenhum. */
  monthsAhead: number;
  /**
   * Quão abaixo da média uniforme (1/12) o `feeShare` do mês fica, como fração:
   * `1 - feeShare * 12`. Ex.: 0.4 = esse mês historicamente rende 40% abaixo do
   * mês médio. 0 quando não há mês fraco à frente.
   */
  shortfall: number;
}

/**
 * Resumo de Painel da **sazonalidade dos shows**, do lado do vale: deriva, de
 * uma `gigSeasonality` já computada, o **próximo mês fraco** que se aproxima — o
 * mais cedo, dentro de `STRONG_MONTH_HORIZON` meses, cujo faturamento histórico
 * fica abaixo da média (≤ `WEAK_MONTH_FACTOR`× o mês médio). Espelho exato de
 * `gigSeasonalityHeadline` (mesma janela, mesma amostra mínima, mesmo `now`
 * injetável), no sentido oposto: enquanto o mês forte é oportunidade de preço, o
 * mês fraco é antecedência para **prospectar e encher a agenda** antes do vale.
 *
 * Exige `count > 0` no mês candidato (simétrico ao mês forte): o sinal é "neste
 * mês, em que você historicamente toca, costuma render menos" — não "você ainda
 * não tem dados desse mês" (isso seria ausência de história, não sazonalidade).
 * O detalhe completo está em `/shows/sazonalidade`.
 */
export function gigSeasonalityLull(
  seasonality: GigSeasonality,
  opts: { now?: Date | string } = {},
): GigSeasonalityLull {
  const none: GigSeasonalityLull = {
    show: false,
    month: null,
    monthsAhead: 0,
    shortfall: 0,
  };
  if (seasonality.totalShows < STRONG_MONTH_MIN_SHOWS) return none;

  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const currentMonth = nowDate.getUTCMonth();
  const threshold = WEAK_MONTH_FACTOR / 12;

  for (let ahead = 1; ahead <= STRONG_MONTH_HORIZON; ahead++) {
    const m = seasonality.months[(currentMonth + ahead) % 12];
    if (m.count > 0 && m.feeShare <= threshold) {
      return {
        show: true,
        month: m,
        monthsAhead: ahead,
        shortfall: 1 - m.feeShare * 12,
      };
    }
  }
  return none;
}

/**
 * Quão vazia a agenda de um mês forte precisa estar — em nº de shows já marcados
 * contra a média histórica de shows/ano naquele mês — para o nudge de "mês forte
 * subagendado" disparar. 0.5 = com menos da METADE dos shows que você costuma
 * tocar naquele mês já na agenda, é hora de correr atrás. Espelha
 * `FUNNEL_ACTIVITY_STALL_FACTOR` no eixo das RESERVAS (a agenda de shows) em vez do
 * TRABALHO de prospecção (o funil). **Hipótese** a validar (ver DECISIONS.md).
 */
export const GIG_SEASON_STALL_FACTOR = 0.5;

export interface GigSeasonalityStall {
  /**
   * Deve aparecer no Painel? Só quando há amostra suficiente
   * (`totalShows >= STRONG_MONTH_MIN_SHOWS`), o próximo mês forte à frente está
   * subagendado (`booked < expected × GIG_SEASON_STALL_FACTOR`) e há histórico de
   * shows nele (`expected > 0`) — caso contrário o nudge seria ruído.
   */
  show: boolean;
  /** O próximo mês forte à frente (o mais cedo que qualifica), ou null. */
  month: GigMonthStat | null;
  /** Quantos meses à frente está (1 = mês que vem … STRONG_MONTH_HORIZON); 0 se nenhum. */
  monthsAhead: number;
  /**
   * Média histórica de shows/ano neste mês do calendário (só entre os anos que de
   * fato tiveram show no mês), o ritmo típico da agenda para essa temporada.
   */
  expected: number;
  /**
   * Shows já na agenda (não cancelados — proposto/confirmado/realizado) para a
   * PRÓXIMA ocorrência do mês (o ano-alvo derivado de `monthsAhead`).
   */
  booked: number;
  /**
   * Subconjunto FIRME de `booked`: só compromissos confirmados/realizados
   * (CONFIRMED+PLAYED), excluindo propostas ainda em aberto. Leitura mais rígida
   * de "quanto da agenda desse mês está de fato fechado" — sempre `≤ booked`.
   * O disparo do stall continua olhando o `booked` amplo (uma proposta já ocupa a
   * agenda; pecar por não-gritar-cedo), mas o detalhe pode revelar que, dos
   * marcados, poucos (ou nenhum) são firmes. Ver D339.
   */
  bookedFirm: number;
  /**
   * Quão abaixo do ritmo típico a agenda está, como fração `clamp(1 −
   * booked/expected, 0..1)`. Ex.: 0.6 = você tem 60% menos shows marcados do que
   * costuma tocar nesse mês. 0 quando não há stall.
   */
  shortfall: number;
  /**
   * Quantas vezes o `feeShare` do mês supera a média uniforme (1/12), i.e.
   * `feeShare * 12`. 0 quando não há mês forte subagendado à frente.
   */
  lift: number;
}

/**
 * Resumo de Painel da **sazonalidade dos shows**, cruzando o pico histórico com a
 * AGENDA real: deriva, de uma `gigSeasonality` já computada + a lista de shows, o
 * **próximo mês forte à frente que está subagendado** — "Setembro costuma ser seu
 * mês mais cheio, mas você só tem 1 show marcado para ele". Espelha
 * `funnelActivitySeasonalityStall` (D333) no eixo das RESERVAS (a agenda) em vez
 * do TRABALHO de prospecção (o funil): enquanto `gigSeasonalityHeadline` (D134) só
 * diz "seu mês caro está chegando — precifique", este cruza esse pico com quantos
 * shows você de fato já lançou para ele, e só grita quando a agenda está rala.
 *
 * Seleciona o MESMO mês da `gigSeasonalityHeadline` (o mais cedo, dentro de
 * `STRONG_MONTH_HORIZON` meses, com `feeShare ≥ STRONG_MONTH_FACTOR/12`) e então
 * decide pelo hiato de reserva; se esse mês está com agenda saudável, NÃO dispara
 * (a manchete comum cobre o "precifique"). Não varre meses mais distantes: o valor
 * do aviso é o mês forte mais PRÓXIMO.
 *
 * O `expected` é a média de shows/ano naquele mês do calendário só entre os shows
 * que JÁ ACONTECERAM (mesma inclusão de `gigSeasonality`: PLAYED ou CONFIRMED com
 * data passada, cachê > 0), por ano ativo. Como a ocorrência-alvo é FUTURA, todo
 * ano contado no baseline já fechou — não há ano parcial a excluir (distinto de
 * D341, que refinou o baseline do funil no MÊS corrente). O `booked` conta os
 * shows NÃO cancelados datados naquele mês/ano — de propósito amplo (uma proposta
 * já ocupa a agenda) para pecar por não-gritar-cedo, não por alarme falso. Puro,
 * com `now` injetável. O detalhe completo está em `/shows/sazonalidade`.
 */
export function gigSeasonalityStall(
  seasonality: GigSeasonality,
  shows: ReceivableShowLike[],
  opts: { now?: Date | string } = {},
): GigSeasonalityStall {
  const none: GigSeasonalityStall = {
    show: false,
    month: null,
    monthsAhead: 0,
    expected: 0,
    booked: 0,
    bookedFirm: 0,
    shortfall: 0,
    lift: 0,
  };
  if (seasonality.totalShows < STRONG_MONTH_MIN_SHOWS) return none;

  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const todayMs = utcMidnight(nowDate);
  const currentMonth = nowDate.getUTCMonth();
  const currentYear = nowDate.getUTCFullYear();
  const threshold = STRONG_MONTH_FACTOR / 12;

  for (let ahead = 1; ahead <= STRONG_MONTH_HORIZON; ahead++) {
    const absolute = currentMonth + ahead;
    const monthIdx = absolute % 12;
    const m = seasonality.months[monthIdx];
    // Pula até o mês forte mais próximo (mesma seleção de `gigSeasonalityHeadline`).
    if (m.count === 0 || m.feeShare < threshold) continue;

    // O ano da próxima ocorrência do mês (horizonte ≤ 4 → cruza no máximo um ano).
    const targetYear = currentYear + Math.floor(absolute / 12);

    // Baseline: média de shows/ano neste mês entre os shows JÁ REALIZADOS (mesma
    // inclusão de `gigSeasonality`: happened + cachê > 0), por ano ativo.
    const yearsWithGig = new Set<number>();
    for (const s of shows) {
      if (!isHappenedGig(s, todayMs)) continue;
      if (s.fee <= 0) continue;
      const d = typeof s.date === "string" ? new Date(s.date) : s.date;
      if (d.getUTCMonth() === monthIdx) yearsWithGig.add(d.getUTCFullYear());
    }
    const activeYears = yearsWithGig.size;
    const expected = activeYears > 0 ? m.count / activeYears : 0;
    if (expected <= 0) return none;

    // Agenda atual da ocorrência-alvo: shows NÃO cancelados datados no mês/ano
    // (proposto/confirmado/realizado — tudo que já ocupa a agenda). `bookedFirm`
    // é o subconjunto firme (CONFIRMED+PLAYED), a leitura mais rígida.
    let booked = 0;
    let bookedFirm = 0;
    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      const d = typeof s.date === "string" ? new Date(s.date) : s.date;
      if (d.getUTCMonth() === monthIdx && d.getUTCFullYear() === targetYear) {
        booked += 1;
        if (s.status === "CONFIRMED" || s.status === "PLAYED") bookedFirm += 1;
      }
    }

    if (booked < expected * GIG_SEASON_STALL_FACTOR) {
      return {
        show: true,
        month: m,
        monthsAhead: ahead,
        expected,
        booked,
        bookedFirm,
        shortfall: Math.max(0, Math.min(1, 1 - booked / expected)),
        lift: m.feeShare * 12,
      };
    }
    // Mês forte mais próximo, mas com agenda saudável: não dispara (a manchete
    // comum cobre o "precifique"). Não varre meses mais distantes.
    return none;
  }
  return none;
}

/**
 * Quão "firme" está a agenda já marcada de um mês forte subagendado:
 * - `"none"`  → há shows marcados, mas NENHUM é firme (só propostas em aberto);
 * - `"some"`  → parte dos marcados é firme, parte ainda é proposta;
 * - `"all"`   → todos os marcados são firmes (CONFIRMED+PLAYED), ou não há
 *               marcado algum (`booked === 0`) — em ambos os casos não há
 *               proposta em aberto a ressalvar.
 * O disparo do `gigSeasonalityStall` (D336) olha o `booked` amplo de propósito
 * (uma proposta já ocupa a agenda), mas para um leitor uma agenda de "3 marcados"
 * que na verdade são 3 propostas ainda abertas está bem mais VAZIA do que o número
 * sugere. Este classificador puro destila esse recorte para as telas sinalizarem a
 * ressalva — sem repetir o `if` em cada surface (Painel + página de sazonalidade).
 * Ver D339 (o campo `bookedFirm`) e D340.
 */
export type GigStallFirmnessLevel = "none" | "some" | "all";

export function gigSeasonalityStallFirmness(
  stall: Pick<GigSeasonalityStall, "booked" | "bookedFirm">,
): GigStallFirmnessLevel {
  // `bookedFirm` é, por construção, sempre `≤ booked` (subconjunto). Defensivo
  // contra dados fora do invariante, tratamos `firm >= booked` como "all".
  const firm = Math.max(0, stall.bookedFirm);
  if (stall.booked <= 0 || firm >= stall.booked) return "all";
  if (firm <= 0) return "none";
  return "some";
}

/**
 * Frase-ressalva de firmeza para o DETALHE do mês forte subagendado na página
 * `/shows/sazonalidade` (`StallDetail`), derivada de `gigSeasonalityStallFirmness`.
 * Antes o detalhe mostrava sempre a contagem crua ("dos quais N firmes") mesmo
 * quando N == booked (nada a ressalvar) ou N == 0 — agora a frase segue o NÍVEL,
 * espelhando o recorte que o Painel (D340) já faz:
 * - `"all"`  → "todos firmes (confirmado/realizado)"  (agenda toda fechada);
 * - `"none"` → "nenhum firme ainda (confirmado/realizado)"  (só propostas);
 * - `"some"` → "dos quais N firme[s] (confirmado/realizado)".
 * Retorna `null` quando não há marcado (`booked === 0`) — as telas já guardam
 * `booked > 0`, mas o helper é defensivo. Ver D341 (unificação da frase).
 */
export function gigSeasonalityStallFirmnessDetail(
  stall: Pick<GigSeasonalityStall, "booked" | "bookedFirm">,
): string | null {
  if (stall.booked <= 0) return null;
  const level = gigSeasonalityStallFirmness(stall);
  if (level === "all") return "todos firmes (confirmado/realizado)";
  if (level === "none") return "nenhum firme ainda (confirmado/realizado)";
  const firm = Math.max(0, Math.min(stall.bookedFirm, stall.booked));
  return `dos quais ${firm} firme${firm === 1 ? "" : "s"} (confirmado/realizado)`;
}

/**
 * Larguras (%, 0..100) dos dois segmentos da micro-barra "marcados × ritmo típico"
 * do `StallDetail` (`/shows/sazonalidade`), quebrando o preenchimento em FIRME
 * (CONFIRMED+PLAYED) e TENTATIVO (propostas ainda em aberto).
 *
 * Até a D341 a barra pintava `booked/expected` num tom só — uma agenda de "3
 * marcados" que são 3 PROPOSTAS em aberto ficava visualmente idêntica a 3 shows
 * FECHADOS, subestimando a emptiness real (a mesma assimetria que a D340 corrigiu
 * no TEXTO do Painel, mas aqui na barra). Este helper puro destila o par de larguras
 * para a barra ganhar dois tons: o firme cheio, o tentativo claro. `firmPct` é a
 * fração firme do ritmo típico; `tentativePct` completa dela até o total marcado.
 *
 * Ambos são frações de `expected`, com o TOTAL (firme+tentativo) clampado a 100% —
 * o stall só dispara com `booked < expected`, mas mantemos o clamp por segurança
 * numérica (idêntico ao clamp inline que a barra já fazia). `bookedFirm` é, por
 * construção, `≤ booked`; defensivo contra dados fora do invariante, clampamos o
 * firme a `[0, booked]` antes de dividir, então `tentativePct ≥ 0` sempre.
 * `{0, 0}` quando não há ritmo típico (`expected ≤ 0`) ou nada marcado. Ver D339
 * (`bookedFirm`), D340 (ressalva no Painel) e D341 (frase unificada).
 */
export interface GigSeasonalityStallBar {
  /** Largura % (0..100) do segmento FIRME (CONFIRMED+PLAYED), tom cheio. */
  firmPct: number;
  /**
   * Largura % (0..100) do segmento TENTATIVO (propostas em aberto), tom claro.
   * Somado a `firmPct` dá a fração marcada do ritmo típico (clampada a 100%).
   */
  tentativePct: number;
}

export function gigSeasonalityStallBar(
  stall: Pick<GigSeasonalityStall, "expected" | "booked" | "bookedFirm">,
): GigSeasonalityStallBar {
  const expected = stall.expected;
  if (!(expected > 0)) return { firmPct: 0, tentativePct: 0 };
  const booked = Math.max(0, stall.booked);
  // `bookedFirm` é subconjunto de `booked`; clamp defensivo a `[0, booked]`.
  const firm = Math.max(0, Math.min(stall.bookedFirm, booked));
  const firmPct = Math.min(firm / expected, 1) * 100;
  const bookedPct = Math.min(booked / expected, 1) * 100;
  // Tentativo preenche do firme até o total marcado; `firm ≤ booked` ⇒ `≥ 0`.
  const tentativePct = Math.max(0, bookedPct - firmPct);
  return { firmPct, tentativePct };
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

// ── Metas: progresso da meta de faturamento anual ──────────────────────────

/** Quanto do ano `year` já passou em relação a `now`, como fração [0, 1]. */
function yearElapsedFraction(year: number, now: Date): number {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const t = now.getTime();
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}

/** Ritmo da meta frente ao esperado linear até agora. */
export type GoalPace = "ahead" | "behind" | "on-track" | null;

export interface RevenueGoalProgress {
  /** Meta de faturamento do ano, em centavos (saneada para inteiro ≥ 0). */
  goal: number;
  /** Ano de referência. */
  year: number;
  /** True se `year` é o ano corrente de `now`. */
  isCurrentYear: boolean;
  /** True se `year` já terminou (passado). */
  isPastYear: boolean;
  /** Receita já recebida no ano (caixa de entrada), em centavos. */
  realized: number;
  /**
   * Projeção de faturamento do ano (recebido + a receber lançado + cachê
   * agendado de shows futuros) — tipicamente `YearEndForecast.projectedIncome`.
   */
  projected: number;
  /** Quanto falta receber para bater a meta: max(0, goal − realized). */
  remaining: number;
  /** realized / goal, fração ≥ 0 (0 se a meta for 0). */
  realizedRatio: number;
  /** projected / goal, fração ≥ 0 (0 se a meta for 0). */
  projectedRatio: number;
  /** True quando a projeção do ano alcança/ultrapassa a meta. */
  onTrackToHit: boolean;
  /** Fração do ano já decorrida [0, 1]; ano passado = 1; futuro = 0. */
  yearElapsed: number;
  /** Meta esperada até agora pelo ritmo linear: round(goal × yearElapsed). */
  expectedByNow: number;
  /** realized − expectedByNow (positivo = adiantado). */
  paceDelta: number;
  /**
   * Ritmo frente à meta linear (só faz sentido no ano corrente):
   * 'ahead' (≥ +5%), 'behind' (≤ −5%), 'on-track' (na faixa), ou `null`
   * (ano passado/futuro, ou cedo demais para julgar — meta esperada nula).
   */
  pace: GoalPace;
}

/**
 * Cruza uma meta de faturamento anual com o realizado e a projeção do ano,
 * respondendo "estou no caminho de bater a meta?". Função pura.
 *
 * - `realized` é a receita já recebida no ano (caixa de entrada).
 * - `projected` é a projeção de faturamento (ex.: `projectYearEnd().projectedIncome`).
 * - O **ritmo** (`pace`) compara o realizado ao esperado por um avanço linear da
 *   meta ao longo do ano (meta × fração do ano decorrida), com faixa de ±5%. Só é
 *   computado no ano corrente; em ano passado a meta já está decidida pelo total,
 *   e em ano futuro ainda não começou.
 *
 * Valores são saneados (não-finitos → 0; meta negativa → 0).
 */
export function computeGoalProgress(
  input: { goal: number; realized: number; projected: number; year: number },
  opts: { now?: Date | string } = {},
): RevenueGoalProgress {
  const sane = (n: number) => (Number.isFinite(n) ? n : 0);
  const goal = Math.max(0, Math.round(sane(input.goal)));
  const realized = Math.round(sane(input.realized));
  const projected = Math.round(sane(input.projected));
  const year = input.year;

  const now = opts.now ? new Date(opts.now) : new Date();
  const nowYear = now.getUTCFullYear();
  const isCurrentYear = nowYear === year;
  const isPastYear = nowYear > year;

  const yearElapsed = yearElapsedFraction(year, now);
  const expectedByNow = Math.round(goal * yearElapsed);
  const paceDelta = realized - expectedByNow;

  let pace: GoalPace = null;
  if (isCurrentYear && goal > 0 && expectedByNow > 0) {
    const ratio = realized / expectedByNow;
    if (ratio >= 1.05) pace = "ahead";
    else if (ratio <= 0.95) pace = "behind";
    else pace = "on-track";
  }

  return {
    goal,
    year,
    isCurrentYear,
    isPastYear,
    realized,
    projected,
    remaining: Math.max(0, goal - realized),
    realizedRatio: goal > 0 ? realized / goal : 0,
    projectedRatio: goal > 0 ? projected / goal : 0,
    onTrackToHit: goal > 0 && projected >= goal,
    yearElapsed,
    expectedByNow,
    paceDelta,
    pace,
  };
}

// ── Meta × cenário conservador: a meta resiste só com shows confirmados? ──────
//
// `computeGoalProgress` cruza a meta com a projeção OTIMISTA do ano (todos os
// shows futuros, incluindo os ainda a confirmar — `projectYearEnd().projectedIncome`).
// Quem planeja com cautela quer também o piso: "e se só os shows JÁ confirmados
// se pagarem, ainda bato a meta?". O cenário conservador (`applyYearEndScenario`,
// D66) já deriva a receita projetada apenas dos confirmados — então basta rodar
// `computeGoalProgress` nos dois cenários e comparar. Pura: compõe o helper já
// testado sem revarrer transações/shows. Ver D79.

export interface GoalScenarioComparison {
  /** Progresso da meta sob a projeção otimista (todos os shows futuros). */
  optimistic: RevenueGoalProgress;
  /** Progresso da meta sob a projeção conservadora (só shows confirmados). */
  conservative: RevenueGoalProgress;
  /** Receita projetada a mais no otimista vs. conservador (cachê a confirmar), ≥ 0. */
  tentativeGap: number;
  /** True quando os cenários divergem (há cachê a confirmar na projeção). */
  diverges: boolean;
  /** True quando a meta é alcançada mesmo no cenário conservador (folga real). */
  hitsEvenConservatively: boolean;
  /** True quando a meta só é alcançada contando shows a confirmar (em risco). */
  hitsOnlyWithTentative: boolean;
}

/**
 * Cruza a meta de faturamento com os DOIS cenários da projeção do ano —
 * otimista (todos os shows futuros) e conservador (só os confirmados) —
 * respondendo "bato a meta mesmo que só os shows confirmados se paguem?".
 *
 * - `projectedOptimistic` é `projectYearEnd().projectedIncome`.
 * - `projectedConservative` é `applyYearEndScenario(forecast, "conservative").projectedIncome`.
 * - `tentativeGap` é o cachê de shows a confirmar que separa os dois cenários;
 *   quando é 0 os cenários coincidem (`diverges` falso) e a UI pode omitir o piso.
 *
 * Pura: reaproveita `computeGoalProgress` (que saneia as entradas) em cada cenário.
 */
export function compareGoalScenarios(
  input: {
    goal: number;
    realized: number;
    year: number;
    projectedOptimistic: number;
    projectedConservative: number;
  },
  opts: { now?: Date | string } = {},
): GoalScenarioComparison {
  const optimistic = computeGoalProgress(
    { goal: input.goal, realized: input.realized, projected: input.projectedOptimistic, year: input.year },
    opts,
  );
  const conservative = computeGoalProgress(
    { goal: input.goal, realized: input.realized, projected: input.projectedConservative, year: input.year },
    opts,
  );
  const tentativeGap = Math.max(0, optimistic.projected - conservative.projected);
  return {
    optimistic,
    conservative,
    tentativeGap,
    diverges: tentativeGap > 0,
    hitsEvenConservatively: conservative.onTrackToHit,
    hitsOnlyWithTentative: optimistic.onTrackToHit && !conservative.onTrackToHit,
  };
}

// ── Meta: ritmo necessário no resto do ano ───────────────────────────────────
//
// `computeGoalProgress` diz SE você está adiantado/atrasado (`pace`), mas não
// QUANTO precisa faturar daqui pra frente. Quem está atrás quer o número
// acionável: "para bater a meta, preciso receber R$ X por mês no resto do ano".
// `goalRunRate` deriva isso do progresso já computado — sem revarrer dados:
//   - `requiredPerMonth` = falta receber ÷ meses restantes do calendário
//     (mês corrente incluso — ainda dá pra faturar nele);
//   - `currentPerMonth` = ritmo realizado até agora (recebido ÷ fração do ano
//     decorrida, em meses), para comparar com o que será preciso;
//   - `effortRatio` = required ÷ current: >1 exige faturar acima do ritmo atual.
// Pura: só aritmética sobre `RevenueGoalProgress`. Faz sentido no ano corrente
// (no passado a meta já fechou; no futuro ainda não começou). Ver DECISIONS.md.

export type GoalRunRateVerdict =
  | "hit" // meta já batida (nada a receber)
  | "on-pace" // o ritmo atual já cobre o necessário (effortRatio ≤ 1)
  | "stretch" // precisa acelerar moderadamente (1 < ratio ≤ 1,25)
  | "hard" // precisa acelerar bastante (ratio > 1,25)
  | "unknown"; // sem base de ritmo ainda, ou ano não corrente

export interface GoalRunRate {
  /** Só é acionável no ano corrente com meta > 0. */
  applicable: boolean;
  /** Meses de calendário restantes no ano, mês corrente incluso (1–12). */
  monthsRemaining: number;
  /** Quanto falta receber para a meta, em centavos (= progress.remaining). */
  remaining: number;
  /** Receita/mês necessária no resto do ano: ceil(remaining / monthsRemaining). */
  requiredPerMonth: number;
  /** Ritmo realizado até agora: recebido ÷ meses decorridos (fração do ano × 12). */
  currentPerMonth: number;
  /** requiredPerMonth − currentPerMonth (positivo = precisa acelerar). */
  gapPerMonth: number;
  /**
   * Esforço relativo = requiredPerMonth / currentPerMonth. >1 exige faturar
   * acima do ritmo atual; `null` quando não há base de ritmo (recebido = 0 ou
   * cedo demais no ano) ou a meta já foi batida.
   */
  effortRatio: number | null;
  /** Classificação do esforço necessário daqui pra frente. */
  verdict: GoalRunRateVerdict;
}

/**
 * A partir de um `RevenueGoalProgress`, calcula o **ritmo necessário** para
 * bater a meta no resto do ano — o número acionável que falta ao `pace`.
 * Função pura: só aritmética sobre o progresso já computado.
 *
 * - Só é "acionável" (`applicable`) no ano corrente com meta > 0; fora disso
 *   devolve um shape neutro (`verdict: "unknown"`).
 * - `monthsRemaining` conta o mês corrente (ainda dá pra faturar nele), então é
 *   sempre ≥ 1 no ano corrente.
 * - `currentPerMonth` usa a fração do ano decorrida (em meses) como denominador,
 *   coerente com o `pace` linear de `computeGoalProgress`; é 0 sem base.
 */
export function goalRunRate(
  progress: RevenueGoalProgress,
  opts: { now?: Date | string } = {},
): GoalRunRate {
  const now = opts.now ? new Date(opts.now) : new Date();
  const remaining = Math.max(0, Math.round(progress.remaining));

  // Fora do ano corrente (ou sem meta) o número não é acionável.
  if (!progress.isCurrentYear || progress.goal <= 0) {
    return {
      applicable: false,
      monthsRemaining: progress.isPastYear ? 0 : 12,
      remaining,
      requiredPerMonth: 0,
      currentPerMonth: 0,
      gapPerMonth: 0,
      effortRatio: null,
      verdict: "unknown",
    };
  }

  const monthIndex = now.getUTCMonth(); // 0–11
  const monthsRemaining = 12 - monthIndex; // mês corrente incluso → 1–12
  const elapsedMonths = progress.yearElapsed * 12; // fracionário, coerente com o pace
  const currentPerMonth =
    elapsedMonths > 0 ? Math.round(progress.realized / elapsedMonths) : 0;
  const requiredPerMonth =
    remaining > 0 ? Math.ceil(remaining / monthsRemaining) : 0;
  const gapPerMonth = requiredPerMonth - currentPerMonth;

  let effortRatio: number | null = null;
  let verdict: GoalRunRateVerdict;
  if (remaining <= 0) {
    verdict = "hit";
  } else if (currentPerMonth <= 0) {
    verdict = "unknown";
  } else {
    effortRatio = requiredPerMonth / currentPerMonth;
    if (effortRatio <= 1) verdict = "on-pace";
    else if (effortRatio <= 1.25) verdict = "stretch";
    else verdict = "hard";
  }

  return {
    applicable: true,
    monthsRemaining,
    remaining,
    requiredPerMonth,
    currentPerMonth,
    gapPerMonth,
    effortRatio,
    verdict,
  };
}

// ── Meta por trimestre: a meta anual quebrada em 4 alvos ──────────────────────
//
// A meta de faturamento (D77) é anual e o ritmo necessário (`goalRunRate`, D81) dá
// o número MENSAL que falta — mas o músico costuma revisar o ano em trimestres (o
// "Resumo trimestral", D83, já é essa cadência intermediária entre o mês e o ano).
// `quarterlyGoalProgress` quebra a meta anual em 4 alvos iguais (meta/4, com os
// centavos da divisão distribuídos aos primeiros trimestres para que a soma dos 4
// seja exatamente a meta) e cruza cada alvo com a receita JÁ RECEBIDA naquele
// trimestre — a mesma base de caixa do `realized` da meta anual (não a competência
// do `quarterlySummary`). Responde "em qual trimestre eu fiquei para trás?".
//
// Status por trimestre:
//   - "hit"         recebido ≥ alvo (com alvo > 0)
//   - "upcoming"    trimestre ainda no futuro (ou ano futuro) — nada a cobrar ainda
//   - "in-progress" trimestre corrente, alvo ainda não atingido
//   - "missed"      trimestre já encerrado abaixo do alvo
// Pura: só varre as transações uma vez e faz aritmética. Ver DECISIONS.md.

export type QuarterGoalStatus = "hit" | "missed" | "in-progress" | "upcoming";

export interface QuarterGoalProgress {
  /** Trimestre 1–4. */
  quarter: number;
  /** Rótulo curto, ex.: "1º tri". */
  label: string;
  /** Alvo do trimestre, em centavos (≈ meta/4; a soma dos 4 == meta). */
  target: number;
  /** Receita recebida (caixa) no trimestre, em centavos. */
  realized: number;
  /** max(0, target − realized). */
  remaining: number;
  /** realized / target, fração ≥ 0 (0 se o alvo for 0). */
  ratio: number;
  status: QuarterGoalStatus;
}

export interface QuarterlyGoalProgress {
  /** Ano de referência. */
  year: number;
  /** Meta anual saneada (inteiro ≥ 0). */
  goal: number;
  /** True se `year` é o ano corrente de `now`. */
  isCurrentYear: boolean;
  /** Trimestre corrente 1–4 quando `isCurrentYear`; senão `null`. */
  currentQuarter: number | null;
  /** Exatamente 4 trimestres (Q1→Q4). */
  quarters: QuarterGoalProgress[];
  /** Soma do recebido nos 4 trimestres, em centavos. */
  realized: number;
  /** Quantos trimestres atingiram o alvo. */
  hitCount: number;
}

/**
 * Quebra a meta de faturamento anual em 4 alvos trimestrais (iguais) e cruza cada
 * um com a receita já recebida no trimestre, respondendo "em que trimestre eu
 * fiquei para trás?". Função pura.
 *
 * - O alvo de cada trimestre é `meta/4`; os centavos restantes da divisão são
 *   distribuídos aos primeiros trimestres, de modo que a soma dos 4 alvos seja
 *   exatamente a meta.
 * - `realized` por trimestre usa **só receitas recebidas** (`received`) com data no
 *   ano — a mesma base de caixa do `realized` da meta anual (`computeGoalProgress`).
 * - O `status` depende do tempo: trimestres futuros ficam "upcoming", o corrente
 *   "in-progress" (até bater o alvo), os já encerrados "hit"/"missed".
 *
 * Valores são saneados (não-finitos → 0; meta negativa → 0).
 */
export function quarterlyGoalProgress(
  txs: TxLike[],
  year: number,
  goal: number,
  opts: { now?: Date | string } = {},
): QuarterlyGoalProgress {
  const sane = (n: number) => (Number.isFinite(n) ? n : 0);
  const safeGoal = Math.max(0, Math.round(sane(goal)));

  // Alvos por trimestre: meta/4 com os centavos da divisão distribuídos aos
  // primeiros trimestres, para que a soma dos 4 seja exatamente a meta.
  const base = Math.floor(safeGoal / 4);
  const extra = safeGoal - base * 4; // 0–3
  const targets = [0, 1, 2, 3].map((q) => base + (q < extra ? 1 : 0));

  // Receita recebida (caixa) por trimestre — mesma base do `realized` da meta anual.
  const prefix = `${year}-`;
  const realizedByQuarter = [0, 0, 0, 0];
  for (const t of txs) {
    if (t.type !== "INCOME" || !t.received) continue;
    const key = monthKey(t.date);
    if (!key.startsWith(prefix)) continue;
    const monthIdx = Number(key.slice(5, 7)) - 1; // 0–11
    if (monthIdx < 0 || monthIdx > 11) continue;
    realizedByQuarter[Math.floor(monthIdx / 3)] += t.amount;
  }

  const now = opts.now ? new Date(opts.now) : new Date();
  const isCurrentYear = now.getUTCFullYear() === year;
  const isPastYear = now.getUTCFullYear() > year;
  const currentQuarterIdx = isCurrentYear
    ? Math.floor(now.getUTCMonth() / 3)
    : null;

  const quarters: QuarterGoalProgress[] = [0, 1, 2, 3].map((q) => {
    const target = targets[q];
    const realized = realizedByQuarter[q];
    const hit = target > 0 && realized >= target;
    let status: QuarterGoalStatus;
    if (hit) {
      status = "hit";
    } else if (isPastYear) {
      status = "missed";
    } else if (currentQuarterIdx == null) {
      status = "upcoming"; // ano futuro: nada decorrido
    } else if (q < currentQuarterIdx) {
      status = "missed";
    } else if (q === currentQuarterIdx) {
      status = "in-progress";
    } else {
      status = "upcoming";
    }
    return {
      quarter: q + 1,
      label: QUARTER_LABELS[q],
      target,
      realized,
      remaining: Math.max(0, target - realized),
      ratio: target > 0 ? realized / target : 0,
      status,
    };
  });

  return {
    year,
    goal: safeGoal,
    isCurrentYear,
    currentQuarter: currentQuarterIdx == null ? null : currentQuarterIdx + 1,
    quarters,
    realized: sum(realizedByQuarter),
    hitCount: quarters.filter((q) => q.status === "hit").length,
  };
}

// A meta por trimestre (D85) dá a cadência intermediária; `monthlyGoalProgress`
// é a granularidade mais fina — quebra a meta anual em 12 alvos iguais (meta/12,
// com os centavos da divisão distribuídos aos primeiros meses para que a soma dos
// 12 seja exatamente a meta) e cruza cada alvo com a receita JÁ RECEBIDA naquele
// mês — a mesma base de caixa do `realized` da meta anual (`computeGoalProgress`)
// e do trimestre (`quarterlyGoalProgress`). Responde "em qual mês eu fiquei para
// trás?", com o detalhe que o trimestre esconde.
//
// Status por mês (mesma semântica de `quarterlyGoalProgress`):
//   - "hit"         recebido ≥ alvo (com alvo > 0)
//   - "upcoming"    mês ainda no futuro (ou ano futuro) — nada a cobrar ainda
//   - "in-progress" mês corrente, alvo ainda não atingido
//   - "missed"      mês já encerrado abaixo do alvo
// Pura: varre as transações uma vez e faz aritmética. Ver DECISIONS.md.

export type MonthGoalStatus = QuarterGoalStatus;

export interface MonthGoalProgress {
  /** Mês 1–12. */
  month: number;
  /** Rótulo curto, ex.: "jan". */
  label: string;
  /** Alvo do mês, em centavos (≈ meta/12; a soma dos 12 == meta). */
  target: number;
  /** Receita recebida (caixa) no mês, em centavos. */
  realized: number;
  /** max(0, target − realized). */
  remaining: number;
  /** realized / target, fração ≥ 0 (0 se o alvo for 0). */
  ratio: number;
  status: MonthGoalStatus;
}

export interface MonthlyGoalProgress {
  /** Ano de referência. */
  year: number;
  /** Meta anual saneada (inteiro ≥ 0). */
  goal: number;
  /** True se `year` é o ano corrente de `now`. */
  isCurrentYear: boolean;
  /** Mês corrente 1–12 quando `isCurrentYear`; senão `null`. */
  currentMonth: number | null;
  /** Exatamente 12 meses (jan→dez). */
  months: MonthGoalProgress[];
  /** Soma do recebido nos 12 meses, em centavos. */
  realized: number;
  /** Quantos meses atingiram o alvo. */
  hitCount: number;
}

/**
 * Quebra a meta de faturamento anual em 12 alvos mensais (iguais) e cruza cada um
 * com a receita já recebida no mês, respondendo "em que mês eu fiquei para trás?".
 * Função pura — granularidade fina sobre `quarterlyGoalProgress` (D85).
 *
 * - O alvo de cada mês é `meta/12`; os centavos restantes da divisão são
 *   distribuídos aos primeiros meses, de modo que a soma dos 12 alvos seja
 *   exatamente a meta.
 * - `realized` por mês usa **só receitas recebidas** (`received`) com data no ano —
 *   a mesma base de caixa do `realized` da meta anual (`computeGoalProgress`).
 * - O `status` depende do tempo: meses futuros ficam "upcoming", o corrente
 *   "in-progress" (até bater o alvo), os já encerrados "hit"/"missed".
 *
 * Valores são saneados (não-finitos → 0; meta negativa → 0).
 */
export function monthlyGoalProgress(
  txs: TxLike[],
  year: number,
  goal: number,
  opts: { now?: Date | string } = {},
): MonthlyGoalProgress {
  const sane = (n: number) => (Number.isFinite(n) ? n : 0);
  const safeGoal = Math.max(0, Math.round(sane(goal)));

  // Alvos por mês: meta/12 com os centavos da divisão distribuídos aos primeiros
  // meses, para que a soma dos 12 seja exatamente a meta.
  const base = Math.floor(safeGoal / 12);
  const extra = safeGoal - base * 12; // 0–11
  const targets = Array.from({ length: 12 }, (_, m) => base + (m < extra ? 1 : 0));

  // Receita recebida (caixa) por mês — mesma base do `realized` da meta anual.
  const prefix = `${year}-`;
  const realizedByMonth = Array.from({ length: 12 }, () => 0);
  for (const t of txs) {
    if (t.type !== "INCOME" || !t.received) continue;
    const key = monthKey(t.date);
    if (!key.startsWith(prefix)) continue;
    const monthIdx = Number(key.slice(5, 7)) - 1; // 0–11
    if (monthIdx < 0 || monthIdx > 11) continue;
    realizedByMonth[monthIdx] += t.amount;
  }

  const now = opts.now ? new Date(opts.now) : new Date();
  const isCurrentYear = now.getUTCFullYear() === year;
  const isPastYear = now.getUTCFullYear() > year;
  const currentMonthIdx = isCurrentYear ? now.getUTCMonth() : null;

  const months: MonthGoalProgress[] = Array.from({ length: 12 }, (_, m) => {
    const target = targets[m];
    const realized = realizedByMonth[m];
    const hit = target > 0 && realized >= target;
    let status: MonthGoalStatus;
    if (hit) {
      status = "hit";
    } else if (isPastYear) {
      status = "missed";
    } else if (currentMonthIdx == null) {
      status = "upcoming"; // ano futuro: nada decorrido
    } else if (m < currentMonthIdx) {
      status = "missed";
    } else if (m === currentMonthIdx) {
      status = "in-progress";
    } else {
      status = "upcoming";
    }
    return {
      month: m + 1,
      label: MONTH_GOAL_LABELS[m],
      target,
      realized,
      remaining: Math.max(0, target - realized),
      ratio: target > 0 ? realized / target : 0,
      status,
    };
  });

  return {
    year,
    goal: safeGoal,
    isCurrentYear,
    currentMonth: currentMonthIdx == null ? null : currentMonthIdx + 1,
    months,
    realized: sum(realizedByMonth),
    hitCount: months.filter((m) => m.status === "hit").length,
  };
}
