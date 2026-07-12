import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  rankShowsByProfit,
  compareShowsProfitability,
  rankVenuesByProfit,
  rankCitiesByProfit,
  compareCitiesByProfit,
  cityProfitMovers,
  indexCityProfitChanges,
  rankContactsByProfit,
  rankRolesByProfit,
  roleConcentration,
  compareRoleConcentration,
  clientConcentration,
  clientConcentrationHeadline,
  geoConcentration,
  geoConcentrationHeadline,
  compareGeoConcentration,
  compareClientConcentration,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  summarizeFinances,
  totalsByCategory,
  categoryReport,
  compareCategoryReports,
  totalsByMonth,
  monthlySeasonality,
  monthKey,
  dayKey,
  filterTransactions,
  availableMonths,
  availableCategories,
  isValidMonthKey,
  isValidDateKey,
  hasActiveFilter,
  normalizeText,
  pendingDueStatus,
  isOverdue,
  summarizeOverdue,
  projectCashflow,
  parseCashflowHorizon,
  CASHFLOW_HORIZON_PRESETS,
  CASHFLOW_HORIZON_DEFAULT,
  buildDueAgenda,
  annualSummary,
  quarterlySummary,
  compareAnnualSummaries,
  annualCategoryReport,
  availableYears,
  yearlyHistory,
  projectYearEnd,
  applyYearEndScenario,
  projectYearEndWithFixedCosts,
  projectYearEndPessimistic,
  yearEndScenarioView,
  compareYearEndToPrevious,
  forecastBookedRevenue,
  reconcileShowFees,
  bucketReceivablesByAge,
  outstandingByContact,
  receivableAgeBucket,
  RECEIVABLE_AGE_BUCKET_ORDER,
  resolveSettlementAmount,
  resolveReceivedDate,
  resolvePromiseDate,
  paymentPromiseStatus,
  summarizePaymentPromises,
  receivablesAwaitingPromise,
  AWAITING_PROMISE_MIN_DAYS,
  awaitingPromiseHeadline,
  AWAITING_PROMISE_CRITICAL_DAYS,
  promisesDueSoonHeadline,
  PROMISE_DUE_SOON_DAYS,
  awaitingPromiseByContact,
  computeDelta,
  compareSummaries,
  averageSummaries,
  recurringExpenses,
  pendingFixedCosts,
  computeBreakEven,
  breakEvenHeadline,
  BREAK_EVEN_CRITICAL_RATIO,
  cashRunway,
  cashBurnRunway,
  cashBurnHeadline,
  currentMonthPace,
  monthYoYPace,
  yearToDatePace,
  yearToDatePaceHeadline,
  MONTH_PACE_EPSILON,
  cashFlowByMonth,
  cashFlowTrend,
  parseBurnWindow,
  DEFAULT_BURN_WINDOW_MONTHS,
  BURN_WINDOW_MIN,
  BURN_WINDOW_MAX,
  BURN_WINDOW_PRESETS,
  taxReserve,
  DEFAULT_TAX_RATE,
  showPipeline,
  compareShowPipelines,
  CONVERSION_TREND_EPSILON,
  feeTrend,
  gigCadence,
  feeDistribution,
  feeDistributionYears,
  compareFeeDistribution,
  indexFeeBandShareChanges,
  feeDropHeadline,
  feePremiumErosionHeadline,
  premiumBandShare,
  type FeeDistribution,
  weekdayPerformanceYears,
  feeBandKeyFor,
  FEE_BANDS,
  weekdayPerformance,
  weekdaySplit,
  compareWeekdayPerformance,
  classifyWeekdayPerformanceDayChange,
  type WeekdayPerformanceDayChange,
  WEEKEND_WEEKDAYS,
  gigSeasonality,
  compareGigSeasonality,
  classifyGigSeasonalityMonthChange,
  type GigSeasonalityMonthChange,
  gigSeasonalityYears,
  gigSeasonalityHeadline,
  gigSeasonalityLull,
  STRONG_MONTH_MIN_SHOWS,
  incomeMix,
  incomeMixYears,
  compareIncomeMix,
  expenseMix,
  expenseMixYears,
  compareExpenseMix,
  paymentLag,
  paymentLagYears,
  comparePaymentLag,
  PAYMENT_LAG_TREND_EPSILON,
  paymentLagHeadline,
  paymentLagByContact,
  comparePaymentLagByContact,
  indexContactPaymentLagChanges,
  contactPaymentLagRiseHeadline,
  paymentSpeedBucket,
  PAYMENT_SPEED_BUCKET_ORDER,
  computeGoalProgress,
  compareGoalScenarios,
  goalRunRate,
  quarterlyGoalProgress,
  monthlyGoalProgress,
  type TxLike,
  findCitiesToReengage,
  CITY_REENGAGE_STALE_DAYS,
  citiesToReengageHeadline,
  REENGAGE_HEADLINE_MIN_PAST_SHOWS,
  findVenuesToReengage,
  VENUE_REENGAGE_STALE_DAYS,
  type VenueReengageShowLike,
  type ShowLike,
  type VenueShowLike,
  type ReceivableShowLike,
  type BreakEvenShowLike,
  type PromisableShowLike,
  type CityReengageShowLike,
  parseReengageWindow,
  REENGAGE_WINDOW_DEFAULT,
  REENGAGE_WINDOW_MIN,
  REENGAGE_WINDOW_MAX,
} from "./finance";

const show: ShowLike = { id: "show1", fee: 100_00, status: "CONFIRMED" };

function tx(partial: Partial<TxLike>): TxLike {
  return {
    type: "EXPENSE",
    amount: 0,
    category: "geral",
    date: "2026-03-10T00:00:00.000Z",
    received: true,
    showId: null,
    ...partial,
  };
}

describe("computeShowPnL", () => {
  it("usa apenas o cachê quando não há transações vinculadas", () => {
    const pnl = computeShowPnL(show, []);
    expect(pnl.fee).toBe(100_00);
    expect(pnl.extraIncome).toBe(0);
    expect(pnl.expenses).toBe(0);
    expect(pnl.net).toBe(100_00);
    expect(pnl.margin).toBe(1);
  });

  it("subtrai despesas vinculadas do cachê", () => {
    const txs = [
      tx({ type: "EXPENSE", amount: 30_00, showId: "show1", category: "transporte" }),
      tx({ type: "EXPENSE", amount: 20_00, showId: "show1", category: "equipamento" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.expenses).toBe(50_00);
    expect(pnl.net).toBe(50_00);
    expect(pnl.margin).toBeCloseTo(0.5, 5);
  });

  it("soma receitas extras vinculadas (ex.: merch)", () => {
    const txs = [
      tx({ type: "INCOME", amount: 40_00, showId: "show1", category: "merch" }),
      tx({ type: "EXPENSE", amount: 50_00, showId: "show1", category: "transporte" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.extraIncome).toBe(40_00);
    expect(pnl.expenses).toBe(50_00);
    // 100 + 40 - 50 = 90
    expect(pnl.net).toBe(90_00);
    // margem sobre receita bruta 140 -> 90/140
    expect(pnl.margin).toBeCloseTo(90 / 140, 5);
  });

  it("ignora transações de outros shows e não vinculadas", () => {
    const txs = [
      tx({ type: "EXPENSE", amount: 999_00, showId: "outro", category: "x" }),
      tx({ type: "EXPENSE", amount: 999_00, showId: null, category: "x" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.expenses).toBe(0);
    expect(pnl.net).toBe(100_00);
  });

  it("resultado negativo quando despesas superam a receita", () => {
    const txs = [tx({ type: "EXPENSE", amount: 150_00, showId: "show1" })];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.net).toBe(-50_00);
    expect(pnl.margin).toBeCloseTo(-0.5, 5);
  });

  it("margem é 0 quando a receita bruta é 0 (evita divisão por zero)", () => {
    const free: ShowLike = { id: "show1", fee: 0 };
    const pnl = computeShowPnL(free, []);
    expect(pnl.margin).toBe(0);
    expect(pnl.net).toBe(0);
  });
});

describe("rankShowsByProfit", () => {
  const shows: ShowLike[] = [
    { id: "a", fee: 100_00, status: "PLAYED" },
    { id: "b", fee: 50_00, status: "CONFIRMED" },
    { id: "c", fee: 200_00, status: "CONFIRMED" },
  ];
  const txs: TxLike[] = [
    // a: +0 extra, -90 despesa -> net 10
    tx({ type: "EXPENSE", amount: 90_00, showId: "a" }),
    // b: +0 extra, -0 despesa -> net 50
    // c: +0 extra, -150 despesa -> net 50
    tx({ type: "EXPENSE", amount: 150_00, showId: "c" }),
  ];

  it("retorna estrutura vazia quando não há shows", () => {
    const r = rankShowsByProfit([], txs);
    expect(r.count).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.totalIncome).toBe(0);
    expect(r.totalExpenses).toBe(0);
    expect(r.totalNet).toBe(0);
    expect(r.totalMargin).toBe(0);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
  });

  it("ordena por resultado (net) decrescente e desempata pelo id", () => {
    const r = rankShowsByProfit(shows, txs);
    // nets: a=10, b=50, c=50 -> ordem desc com empate b<c pelo id: b, c, a
    expect(r.rows.map((row) => row.show.id)).toEqual(["b", "c", "a"]);
    expect(r.best?.show.id).toBe("b");
    expect(r.worst?.show.id).toBe("a");
  });

  it("agrega receita bruta, despesas e resultado líquido", () => {
    const r = rankShowsByProfit(shows, txs);
    // receita bruta = 100 + 50 + 200 = 350 ; despesas = 90 + 150 = 240 ; net = 110
    expect(r.totalIncome).toBe(350_00);
    expect(r.totalExpenses).toBe(240_00);
    expect(r.totalNet).toBe(110_00);
    expect(r.count).toBe(3);
  });

  it("calcula a margem líquida AGREGADA (ponderada pela receita, não a média das margens)", () => {
    const r = rankShowsByProfit(shows, txs);
    // margem agregada = totalNet / totalIncome = 110 / 350 ≈ 0,3143 — pesa a
    // receita bruta, não a média simples das margens por show.
    expect(r.totalMargin).toBeCloseTo(110_00 / 350_00, 10);
  });

  it("aceita margem agregada negativa quando as despesas superam a receita", () => {
    const heavy: ShowLike[] = [{ id: "z", fee: 100_00, status: "PLAYED" }];
    const heavyTxs: TxLike[] = [tx({ type: "EXPENSE", amount: 150_00, showId: "z" })];
    const r = rankShowsByProfit(heavy, heavyTxs);
    // net = -50, receita = 100 -> margem = -0,5
    expect(r.totalMargin).toBeCloseTo(-0.5, 10);
  });

  it("margem agregada é 0 quando não há receita bruta", () => {
    const r = rankShowsByProfit([{ id: "g", fee: 0, status: "PLAYED" }], []);
    expect(r.totalIncome).toBe(0);
    expect(r.totalMargin).toBe(0);
  });

  it("soma receitas extras vinculadas na receita bruta", () => {
    const withMerch = [...txs, tx({ type: "INCOME", amount: 30_00, showId: "b" })];
    const r = rankShowsByProfit(shows, withMerch);
    const b = r.rows.find((row) => row.show.id === "b");
    expect(b?.pnl.extraIncome).toBe(30_00);
    expect(b?.pnl.net).toBe(80_00); // 50 cachê + 30 merch
    expect(r.totalIncome).toBe(380_00); // 350 + 30
  });

  it("exclui shows CANCELLED por padrão", () => {
    const withCancelled: ShowLike[] = [
      ...shows,
      { id: "d", fee: 999_00, status: "CANCELLED" },
    ];
    const r = rankShowsByProfit(withCancelled, txs);
    expect(r.count).toBe(3);
    expect(r.rows.map((row) => row.show.id)).not.toContain("d");
  });

  it("permite customizar os status excluídos", () => {
    const r = rankShowsByProfit(shows, txs, { excludeStatuses: ["CONFIRMED"] });
    // exclui b e c (CONFIRMED), mantém só a (PLAYED)
    expect(r.rows.map((row) => row.show.id)).toEqual(["a"]);
    // lista vazia de exclusão inclui tudo (CANCELLED também)
    const all = rankShowsByProfit(
      [...shows, { id: "d", fee: 10_00, status: "CANCELLED" }],
      txs,
      { excludeStatuses: [] },
    );
    expect(all.count).toBe(4);
  });

  it("considera shows sem status (não são excluídos)", () => {
    const r = rankShowsByProfit([{ id: "x", fee: 70_00 }], []);
    expect(r.count).toBe(1);
    expect(r.rows[0].pnl.net).toBe(70_00);
  });
});

describe("compareShowsProfitability", () => {
  // Helper: monta um relatório de rentabilidade a partir de shows + txs.
  const report = (shows: ShowLike[], txs: TxLike[] = []) => rankShowsByProfit(shows, txs);

  it("veredito 'up' quando o resultado médio por show sobe além do limiar", () => {
    // anterior: 1 show net 100 -> médio 100 ; atual: 1 show net 200 -> médio 200
    const prev = report([{ id: "p", fee: 100_00, status: "PLAYED" }]);
    const cur = report([{ id: "c", fee: 200_00, status: "PLAYED" }]);
    const cmp = compareShowsProfitability(cur, prev);
    expect(cmp.trend).toBe("up");
    expect(cmp.avgNet.current).toBe(200_00);
    expect(cmp.avgNet.previous).toBe(100_00);
    expect(cmp.avgNet.delta).toBe(100_00);
    expect(cmp.avgNet.pct).toBe(1); // +100%
  });

  it("ancora no resultado MÉDIO por show, não no total somado", () => {
    // atual: 3 shows de net 100 (total 300, médio 100)
    // anterior: 1 show de net 100 (total 100, médio 100)
    const cur = report([
      { id: "a", fee: 100_00, status: "PLAYED" },
      { id: "b", fee: 100_00, status: "PLAYED" },
      { id: "c", fee: 100_00, status: "PLAYED" },
    ]);
    const prev = report([{ id: "p", fee: 100_00, status: "PLAYED" }]);
    const cmp = compareShowsProfitability(cur, prev);
    // total triplicou, mas o show típico rende o mesmo -> estável
    expect(cmp.trend).toBe("stable");
    expect(cmp.totalNet.delta).toBe(200_00);
    expect(cmp.count.current).toBe(3);
    expect(cmp.count.previous).toBe(1);
  });

  it("veredito 'down' quando o resultado médio por show cai além do limiar", () => {
    const prev = report([{ id: "p", fee: 200_00, status: "PLAYED" }]);
    const cur = report([{ id: "c", fee: 80_00, status: "PLAYED" }]);
    const cmp = compareShowsProfitability(cur, prev);
    expect(cmp.trend).toBe("down");
    expect(cmp.avgNet.delta).toBe(-120_00);
  });

  it("veredito 'stable' quando a variação fica dentro do limiar (relativo OU absoluto)", () => {
    // variação relativa grande (+40%) mas absoluta pequena (R$ 40 < piso R$ 50) -> estável
    const prev = report([{ id: "p", fee: 100_00, status: "PLAYED" }]);
    const cur = report([{ id: "c", fee: 140_00, status: "PLAYED" }]);
    const cmp = compareShowsProfitability(cur, prev);
    expect(cmp.avgNet.delta).toBe(40_00);
    expect(cmp.trend).toBe("stable");

    // variação absoluta grande mas relativa pequena (+2%) -> estável
    const prevBig = report([{ id: "p", fee: 10_000_00, status: "PLAYED" }]);
    const curBig = report([{ id: "c", fee: 10_200_00, status: "PLAYED" }]);
    expect(compareShowsProfitability(curBig, prevBig).trend).toBe("stable");
  });

  it("sem base anterior (médio 0), qualquer resultado atual conta como tendência", () => {
    // anterior: 1 show net 0 -> médio 0 ; atual: 1 show net 100
    const prev = report([{ id: "p", fee: 0, status: "PLAYED" }]);
    const cur = report([{ id: "c", fee: 100_00, status: "PLAYED" }]);
    const cmp = compareShowsProfitability(cur, prev);
    expect(cmp.avgNet.pct).toBeNull(); // base 0 -> pct indefinido
    expect(cmp.trend).toBe("up");
  });
});

describe("rankVenuesByProfit", () => {
  const shows: VenueShowLike[] = [
    { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar do Zé", city: "Recife" },
    { id: "b", fee: 200_00, status: "CONFIRMED", venue: "bar do zé", city: "Recife" }, // mesmo local, grafia diferente
    { id: "c", fee: 50_00, status: "CONFIRMED", venue: "Café Acústico", city: "Olinda" },
    { id: "d", fee: 30_00, status: "CONFIRMED", venue: null, city: "Recife" }, // cai para a cidade
    { id: "e", fee: 10_00, status: "CONFIRMED", venue: "", city: "" }, // sem local
  ];
  const txs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 40_00, showId: "a" }), // Bar do Zé: -40
    tx({ type: "INCOME", amount: 25_00, showId: "c" }), // Café: +25 extra
  ];

  it("retorna estrutura vazia quando não há shows", () => {
    const r = rankVenuesByProfit([], txs);
    expect(r.count).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.totalNet).toBe(0);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
  });

  it("agrupa shows do mesmo local ignorando acento/caixa e soma o P&L", () => {
    const r = rankVenuesByProfit(shows, txs);
    const bar = r.rows.find((row) => row.key === "bar do ze");
    expect(bar).toBeDefined();
    expect(bar!.showCount).toBe(2);
    // cachês 100 + 200 = 300 ; despesa 40 -> net 260
    expect(bar!.totalFee).toBe(300_00);
    expect(bar!.totalExpenses).toBe(40_00);
    expect(bar!.totalNet).toBe(260_00);
    expect(bar!.avgNet).toBe(130_00);
    // grafia exibida: a mais frequente; empate 1x1 -> primeira aparição ("Bar do Zé")
    expect(bar!.name).toBe("Bar do Zé");
  });

  it("usa a cidade quando não há venue e agrupa 'sem local' à parte", () => {
    const r = rankVenuesByProfit(shows, txs);
    // show d (venue null, city Recife) NÃO se junta ao Bar do Zé (chave = "recife")
    const recife = r.rows.find((row) => row.key === "recife");
    expect(recife).toBeDefined();
    expect(recife!.showCount).toBe(1);
    expect(recife!.name).toBe("Recife");

    const semLocal = r.rows.find((row) => row.key === "");
    expect(semLocal).toBeDefined();
    expect(semLocal!.name).toBe("Sem local");
    expect(semLocal!.totalNet).toBe(10_00);
  });

  it("conta receitas extras vinculadas e calcula a margem agregada", () => {
    const r = rankVenuesByProfit(shows, txs);
    const cafe = r.rows.find((row) => row.key === "cafe acustico");
    expect(cafe!.totalExtra).toBe(25_00);
    // bruto = 50 + 25 = 75 ; net = 75 ; margem = 1
    expect(cafe!.totalNet).toBe(75_00);
    expect(cafe!.margin).toBeCloseTo(1);
  });

  it("ordena por resultado total desc e aponta o melhor/pior", () => {
    const r = rankVenuesByProfit(shows, txs);
    // nets: Bar=260, Café=75, Recife=30, Sem local=10
    expect(r.rows.map((row) => row.key)).toEqual(["bar do ze", "cafe acustico", "recife", ""]);
    expect(r.best?.key).toBe("bar do ze");
    expect(r.worst?.key).toBe("");
    expect(r.totalNet).toBe(375_00);
    expect(r.count).toBe(4);
  });

  it("exclui shows cancelados por padrão", () => {
    const withCancelled: VenueShowLike[] = [
      ...shows,
      { id: "x", fee: 999_00, status: "CANCELLED", venue: "Bar do Zé", city: "Recife" },
    ];
    const r = rankVenuesByProfit(withCancelled, txs);
    const bar = r.rows.find((row) => row.key === "bar do ze");
    // cancelado não soma cachê nem conta como show
    expect(bar!.showCount).toBe(2);
    expect(bar!.totalNet).toBe(260_00);
  });

  it("calcula o cachê mediano (preço típico) por local, robusto a outlier", () => {
    // Mesmo palco com 3 shows: cachês 100, 200 e um festival fora da curva de 1000.
    // Média implícita = 433,33 (puxada pelo outlier); mediana = 200 (preço típico).
    const palco: VenueShowLike[] = [
      { id: "v1", fee: 100_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
      { id: "v2", fee: 200_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
      { id: "v3", fee: 1000_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
    ];
    const r = rankVenuesByProfit(palco, []);
    const teatro = r.rows.find((row) => row.key === "teatro x")!;
    expect(teatro.medianFee).toBe(200_00);
    // a mediana ignora o festival que distorceria a média (1300/3 = 433,33)
    expect(teatro.medianFee).not.toBe(Math.round(teatro.totalFee / teatro.showCount));
  });

  it("nº par de shows no local: mediana é a média dos dois centrais", () => {
    const palco: VenueShowLike[] = [
      { id: "v1", fee: 100_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
      { id: "v2", fee: 200_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
      { id: "v3", fee: 300_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
      { id: "v4", fee: 500_00, status: "PLAYED", venue: "Teatro X", city: "Recife" },
    ];
    const r = rankVenuesByProfit(palco, []);
    const teatro = r.rows.find((row) => row.key === "teatro x")!;
    // ordenados: 100, 200, 300, 500 -> (200 + 300) / 2 = 250
    expect(teatro.medianFee).toBe(250_00);
  });
});

describe("rankCitiesByProfit", () => {
  const shows: VenueShowLike[] = [
    { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar do Zé", city: "Recife" },
    { id: "b", fee: 200_00, status: "CONFIRMED", venue: "Café Acústico", city: "recife" }, // mesma cidade, outra casa
    { id: "c", fee: 50_00, status: "CONFIRMED", venue: "Teatro", city: "Olinda" },
    { id: "d", fee: 10_00, status: "CONFIRMED", venue: "Estúdio", city: "" }, // sem cidade
  ];
  const txs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 40_00, showId: "a" }), // Recife: -40
    tx({ type: "INCOME", amount: 25_00, showId: "c" }), // Olinda: +25 extra
  ];

  it("retorna estrutura vazia quando não há shows", () => {
    const r = rankCitiesByProfit([], txs);
    expect(r.count).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.totalNet).toBe(0);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
  });

  it("agrupa casas diferentes da mesma cidade (rollup acima do local)", () => {
    const r = rankCitiesByProfit(shows, txs);
    const recife = r.rows.find((row) => row.key === "recife");
    expect(recife).toBeDefined();
    // duas casas distintas (Bar do Zé + Café Acústico) somam na cidade
    expect(recife!.showCount).toBe(2);
    expect(recife!.totalFee).toBe(300_00);
    expect(recife!.totalExpenses).toBe(40_00);
    expect(recife!.totalNet).toBe(260_00);
    expect(recife!.avgNet).toBe(130_00);
    // grafia exibida: a mais frequente; empate 1x1 -> primeira aparição ("Recife")
    expect(recife!.name).toBe("Recife");
  });

  it("agrupa shows sem cidade em 'Sem cidade'", () => {
    const r = rankCitiesByProfit(shows, txs);
    const sem = r.rows.find((row) => row.key === "");
    expect(sem).toBeDefined();
    expect(sem!.name).toBe("Sem cidade");
    expect(sem!.totalNet).toBe(10_00);
  });

  it("ordena por resultado total desc e aponta o melhor/pior", () => {
    const r = rankCitiesByProfit(shows, txs);
    // nets: Recife=260, Olinda=75 (50+25), Sem cidade=10
    expect(r.rows.map((row) => row.key)).toEqual(["recife", "olinda", ""]);
    expect(r.best?.key).toBe("recife");
    expect(r.worst?.key).toBe("");
    expect(r.totalNet).toBe(345_00);
    expect(r.count).toBe(3);
  });

  it("exclui shows cancelados por padrão", () => {
    const withCancelled: VenueShowLike[] = [
      ...shows,
      { id: "x", fee: 999_00, status: "CANCELLED", venue: "Outra Casa", city: "Recife" },
    ];
    const r = rankCitiesByProfit(withCancelled, txs);
    const recife = r.rows.find((row) => row.key === "recife");
    expect(recife!.showCount).toBe(2);
    expect(recife!.totalNet).toBe(260_00);
  });

  it("calcula o cachê mediano (preço típico) por cidade, robusto a outlier", () => {
    // Recife com 3 shows (casas distintas): 100, 200 e um cachê fora da curva de 1000.
    const cityShows: VenueShowLike[] = [
      { id: "c1", fee: 100_00, status: "PLAYED", venue: "Bar do Zé", city: "Recife" },
      { id: "c2", fee: 200_00, status: "PLAYED", venue: "Café Acústico", city: "Recife" },
      { id: "c3", fee: 1000_00, status: "PLAYED", venue: "Arena", city: "Recife" },
    ];
    const r = rankCitiesByProfit(cityShows, []);
    const recife = r.rows.find((row) => row.key === "recife")!;
    expect(recife.medianFee).toBe(200_00);
    expect(recife.medianFee).not.toBe(Math.round(recife.totalFee / recife.showCount));
  });
});

describe("compareCitiesByProfit", () => {
  // Ano atual: Recife (2 shows, net 300), Olinda (1 show, net 50).
  const currentShows: VenueShowLike[] = [
    { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    { id: "b", fee: 200_00, status: "CONFIRMED", venue: "Café", city: "Recife" },
    { id: "c", fee: 50_00, status: "CONFIRMED", venue: "Teatro", city: "Olinda" },
  ];
  // Ano anterior: Recife (1 show, net 100), João Pessoa (1 show, net 80).
  const previousShows: VenueShowLike[] = [
    { id: "p1", fee: 100_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    { id: "p2", fee: 80_00, status: "PLAYED", venue: "Casa", city: "João Pessoa" },
  ];

  const current = () => rankCitiesByProfit(currentShows, []);
  const previous = () => rankCitiesByProfit(previousShows, []);

  it("casa as cidades pela chave e computa a variação de shows e resultado", () => {
    const changes = compareCitiesByProfit(current(), previous());
    const byKey = indexCityProfitChanges(changes);

    // Recife existia nos dois anos: 1 → 2 shows (+1), net 100 → 300 (+200).
    const recife = byKey.get("recife")!;
    expect(recife.currentCount).toBe(2);
    expect(recife.previousCount).toBe(1);
    expect(recife.countDelta).toBe(1);
    expect(recife.currentNet).toBe(300_00);
    expect(recife.previousNet).toBe(100_00);
    expect(recife.netDelta).toBe(200_00);
  });

  it("trata cidade nova do ano (sem par no anterior) como +tudo", () => {
    const olinda = indexCityProfitChanges(compareCitiesByProfit(current(), previous())).get(
      "olinda",
    )!;
    expect(olinda.previousCount).toBe(0);
    expect(olinda.previousNet).toBe(0);
    expect(olinda.countDelta).toBe(1);
    expect(olinda.netDelta).toBe(50_00);
  });

  it("anexa cidades que sumiram (existiam no anterior, não no atual) com delta negativo", () => {
    const changes = compareCitiesByProfit(current(), previous());
    const jp = changes.find((c) => c.key === "joao pessoa")!;
    expect(jp).toBeDefined();
    expect(jp.currentCount).toBe(0);
    expect(jp.currentNet).toBe(0);
    expect(jp.previousCount).toBe(1);
    expect(jp.countDelta).toBe(-1);
    expect(jp.netDelta).toBe(-80_00);
  });

  it("preserva a ordem do relatório atual (resultado desc), com as sumidas ao final", () => {
    const keys = compareCitiesByProfit(current(), previous()).map((c) => c.key);
    // Atual ordenado por net desc: Recife (300), Olinda (50); depois a sumida.
    expect(keys).toEqual(["recife", "olinda", "joao pessoa"]);
  });

  it("sem base anterior (relatório vazio) → cada cidade atual vira +participação", () => {
    const changes = compareCitiesByProfit(current(), rankCitiesByProfit([], []));
    expect(changes).toHaveLength(2);
    expect(changes.every((c) => c.previousCount === 0 && c.countDelta === c.currentCount)).toBe(
      true,
    );
  });

  it("indexCityProfitChanges mapeia por chave para lookup O(1)", () => {
    const changes = compareCitiesByProfit(current(), previous());
    const map = indexCityProfitChanges(changes);
    expect(map.size).toBe(changes.length);
    for (const c of changes) expect(map.get(c.key)).toBe(c);
  });
});

describe("cityProfitMovers", () => {
  it("sem mudança em nenhuma cidade → ambos os movers nulos", () => {
    // Mesmos shows nos dois períodos: todo countDelta = 0.
    const shows: VenueShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    ];
    const report = rankCitiesByProfit(shows, []);
    const movers = cityProfitMovers(compareCitiesByProfit(report, report));
    expect(movers.biggestGain).toBeNull();
    expect(movers.biggestDrop).toBeNull();
  });

  it("aponta a cidade que mais ganhou e a que mais perdeu shows", () => {
    // Atual: Recife 3 shows, Olinda 1. Anterior: Recife 1, Olinda 3.
    const currentShows: VenueShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED", venue: "B", city: "Recife" },
      { id: "b", fee: 100_00, status: "PLAYED", venue: "C", city: "Recife" },
      { id: "c", fee: 100_00, status: "PLAYED", venue: "D", city: "Recife" },
      { id: "d", fee: 100_00, status: "PLAYED", venue: "E", city: "Olinda" },
    ];
    const previousShows: VenueShowLike[] = [
      { id: "p1", fee: 100_00, status: "PLAYED", venue: "B", city: "Recife" },
      { id: "p2", fee: 100_00, status: "PLAYED", venue: "C", city: "Olinda" },
      { id: "p3", fee: 100_00, status: "PLAYED", venue: "D", city: "Olinda" },
      { id: "p4", fee: 100_00, status: "PLAYED", venue: "E", city: "Olinda" },
    ];
    const movers = cityProfitMovers(
      compareCitiesByProfit(
        rankCitiesByProfit(currentShows, []),
        rankCitiesByProfit(previousShows, []),
      ),
    );
    expect(movers.biggestGain?.key).toBe("recife"); // +2 shows
    expect(movers.biggestGain?.countDelta).toBe(2);
    expect(movers.biggestDrop?.key).toBe("olinda"); // −2 shows
    expect(movers.biggestDrop?.countDelta).toBe(-2);
  });

  it("empate no nº de shows é desempatado pelo resultado (netDelta)", () => {
    // Recife e Olinda ambas +1 show; Recife com show mais caro (maior netDelta).
    const currentShows: VenueShowLike[] = [
      { id: "a", fee: 500_00, status: "PLAYED", venue: "B", city: "Recife" },
      { id: "b", fee: 50_00, status: "PLAYED", venue: "C", city: "Olinda" },
    ];
    const movers = cityProfitMovers(
      compareCitiesByProfit(rankCitiesByProfit(currentShows, []), rankCitiesByProfit([], [])),
    );
    expect(movers.biggestGain?.key).toBe("recife");
    expect(movers.biggestGain?.netDelta).toBe(500_00);
  });

  it("ignora a 'Sem cidade' — não é destino de migração", () => {
    // Único movimento é no balde sem cidade: não deve virar mover.
    const currentShows: VenueShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar", city: null },
    ];
    const movers = cityProfitMovers(
      compareCitiesByProfit(rankCitiesByProfit(currentShows, []), rankCitiesByProfit([], [])),
    );
    expect(movers.biggestGain).toBeNull();
    expect(movers.biggestDrop).toBeNull();
  });

  it("só ganhos (nenhuma cidade caiu) → biggestDrop nulo", () => {
    const currentShows: VenueShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    ];
    const movers = cityProfitMovers(
      compareCitiesByProfit(rankCitiesByProfit(currentShows, []), rankCitiesByProfit([], [])),
    );
    expect(movers.biggestGain?.key).toBe("recife");
    expect(movers.biggestDrop).toBeNull();
  });
});

describe("rankContactsByProfit", () => {
  // Atribuição de pagador: por id do contato. Quem paga é resolvido fora (getPayer),
  // aqui um mapa simples showId -> contratante simula o pickPayerContact da UI.
  const ZE = { id: "ze", name: "Zé Produções", role: "PROMOTER" };
  const ANA = { id: "ana", name: "Ana Booking", role: "BOOKER" };
  const shows: ShowLike[] = [
    { id: "a", fee: 100_00, status: "PLAYED" }, // Zé, -40 -> net 60
    { id: "b", fee: 200_00, status: "CONFIRMED" }, // Zé, +25 extra -> net 225
    { id: "c", fee: 50_00, status: "CONFIRMED" }, // Ana -> net 50
    { id: "d", fee: 30_00, status: "CONFIRMED" }, // sem contratante -> net 30
  ];
  const payers: Record<string, { id: string; name: string; role: string } | null> = {
    a: ZE,
    b: ZE,
    c: ANA,
    d: null,
  };
  const getPayer = (s: ShowLike) => payers[s.id] ?? null;
  const txs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 40_00, showId: "a" }),
    tx({ type: "INCOME", amount: 25_00, showId: "b" }),
  ];

  it("retorna estrutura vazia quando não há shows", () => {
    const r = rankContactsByProfit([], txs, getPayer);
    expect(r.count).toBe(0);
    expect(r.contactCount).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.totalNet).toBe(0);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
  });

  it("soma o P&L por contratante sem dupla contagem (reconcilia com a soma dos shows)", () => {
    const r = rankContactsByProfit(shows, txs, getPayer);
    const ze = r.rows.find((row) => row.contact?.id === "ze");
    expect(ze!.showCount).toBe(2);
    // cachês 100 + 200 = 300; despesa 40; extra 25 -> net 285
    expect(ze!.totalFee).toBe(300_00);
    expect(ze!.totalExtra).toBe(25_00);
    expect(ze!.totalExpenses).toBe(40_00);
    expect(ze!.totalNet).toBe(285_00);
    expect(ze!.avgNet).toBe(142_50);
    // total reconcilia: 285 (Zé) + 50 (Ana) + 30 (sem) = 365
    expect(r.totalNet).toBe(365_00);
    expect(r.count).toBe(4);
  });

  it("calcula o cachê médio (nível de preço) por contratante, distinto do líquido", () => {
    const r = rankContactsByProfit(shows, txs, getPayer);
    const ze = r.rows.find((row) => row.contact?.id === "ze");
    // cachês 100 + 200 = 300 em 2 shows -> 150/show (≠ avgNet 142,50, que é líquido)
    expect(ze!.avgFee).toBe(150_00);
    expect(ze!.avgFee).not.toBe(ze!.avgNet);
    const ana = r.rows.find((row) => row.contact?.id === "ana");
    // único show de 50 -> cachê médio 50 = líquido (sem extras/custos)
    expect(ana!.avgFee).toBe(50_00);
    expect(ana!.avgFee).toBe(ana!.avgNet);
    // grupo sem contratante: 1 show de 30
    const sem = r.rows.find((row) => row.contact === null);
    expect(sem!.avgFee).toBe(30_00);
  });

  it("calcula o cachê mediano (preço típico) por contratante, robusto a outlier", () => {
    // Zé com 3 shows: cachês 100, 200 e um festival fora da curva de 1000.
    // Média = 433,33 (puxada pelo outlier); mediana = 200 (o preço típico).
    const ze3: ShowLike[] = [
      { id: "z1", fee: 100_00, status: "PLAYED" },
      { id: "z2", fee: 200_00, status: "PLAYED" },
      { id: "z3", fee: 1000_00, status: "PLAYED" },
    ];
    const r = rankContactsByProfit(ze3, [], () => ZE);
    const ze = r.rows.find((row) => row.contact?.id === "ze")!;
    expect(ze.medianFee).toBe(200_00);
    expect(ze.avgFee).toBe(433_33); // round(1300/3) — média distorcida pelo outlier
    expect(ze.medianFee).not.toBe(ze.avgFee);
  });

  it("nº par de shows: mediana é a média dos dois centrais", () => {
    const evenShows: ShowLike[] = [
      { id: "p1", fee: 100_00, status: "PLAYED" },
      { id: "p2", fee: 200_00, status: "PLAYED" },
      { id: "p3", fee: 300_00, status: "PLAYED" },
      { id: "p4", fee: 500_00, status: "PLAYED" },
    ];
    const r = rankContactsByProfit(evenShows, [], () => ZE);
    const ze = r.rows.find((row) => row.contact?.id === "ze")!;
    // ordenados: 100, 200, 300, 500 -> (200 + 300) / 2 = 250
    expect(ze.medianFee).toBe(250_00);
  });

  it("expõe o cachê mediano por grupo mesmo com 1 show (igual ao cachê do show)", () => {
    const r = rankContactsByProfit(shows, txs, getPayer);
    // Ana tem só 1 show de 50 -> mediana = 50 (a UI omite por amostra < mínimo)
    const ana = r.rows.find((row) => row.contact?.id === "ana")!;
    expect(ana.medianFee).toBe(50_00);
  });

  it("agrupa shows sem contratante à parte (contact null) e o coloca por último", () => {
    const r = rankContactsByProfit(shows, txs, getPayer);
    const semContratante = r.rows.find((row) => row.contact === null);
    expect(semContratante).toBeDefined();
    expect(semContratante!.totalNet).toBe(30_00);
    expect(r.rows[r.rows.length - 1]).toBe(semContratante);
  });

  it("ordena por resultado desc e aponta melhor/pior só entre identificados", () => {
    const r = rankContactsByProfit(shows, txs, getPayer);
    // nets: Zé=285, Ana=50, sem=30 -> sem contratante nunca é best/worst
    expect(r.rows.map((row) => row.contact?.id ?? "—")).toEqual(["ze", "ana", "—"]);
    expect(r.best?.contact?.id).toBe("ze");
    expect(r.worst?.contact?.id).toBe("ana");
    expect(r.contactCount).toBe(2);
  });

  it("calcula a margem agregada por contratante", () => {
    const r = rankContactsByProfit(shows, txs, getPayer);
    const ana = r.rows.find((row) => row.contact?.id === "ana");
    // bruto 50, net 50 -> margem 1
    expect(ana!.margin).toBeCloseTo(1);
    const ze = r.rows.find((row) => row.contact?.id === "ze");
    // bruto 325, net 285 -> ~0.877
    expect(ze!.margin).toBeCloseTo(285 / 325);
  });

  it("exclui shows cancelados por padrão", () => {
    const withCancelled: ShowLike[] = [
      ...shows,
      { id: "x", fee: 999_00, status: "CANCELLED" },
    ];
    const payersX = { ...payers, x: ZE };
    const r = rankContactsByProfit(
      withCancelled,
      txs,
      (s: ShowLike) => payersX[s.id as keyof typeof payersX] ?? null,
    );
    const ze = r.rows.find((row) => row.contact?.id === "ze");
    expect(ze!.showCount).toBe(2);
    expect(ze!.totalNet).toBe(285_00);
  });
});

describe("rankRolesByProfit", () => {
  // Dois contratantes do mesmo papel (PROMOTER) devem somar num só grupo; um
  // BOOKER em outro; um show sem contratante à parte.
  const ZE = { id: "ze", name: "Zé Produções", role: "PROMOTER" };
  const NEY = { id: "ney", name: "Ney Shows", role: "PROMOTER" };
  const ANA = { id: "ana", name: "Ana Booking", role: "BOOKER" };
  const shows: ShowLike[] = [
    { id: "a", fee: 100_00, status: "PLAYED" }, // Zé (PROMOTER), -40 -> net 60
    { id: "b", fee: 200_00, status: "CONFIRMED" }, // Ney (PROMOTER), +25 extra -> net 225
    { id: "c", fee: 50_00, status: "CONFIRMED" }, // Ana (BOOKER) -> net 50
    { id: "d", fee: 30_00, status: "CONFIRMED" }, // sem contratante -> net 30
  ];
  const payers: Record<string, { id: string; name: string; role: string } | null> = {
    a: ZE,
    b: NEY,
    c: ANA,
    d: null,
  };
  const getPayer = (s: ShowLike) => payers[s.id] ?? null;
  const txs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 40_00, showId: "a" }),
    tx({ type: "INCOME", amount: 25_00, showId: "b" }),
  ];

  it("retorna estrutura vazia quando não há shows", () => {
    const r = rankRolesByProfit([], txs, getPayer);
    expect(r.count).toBe(0);
    expect(r.roleCount).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.totalNet).toBe(0);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
  });

  it("soma o P&L de vários contratantes do mesmo papel num único grupo", () => {
    const r = rankRolesByProfit(shows, txs, getPayer);
    const promoter = r.rows.find((row) => row.role === "PROMOTER");
    // Zé (net 60) + Ney (net 225) somam no papel PROMOTER
    expect(promoter!.showCount).toBe(2);
    expect(promoter!.totalFee).toBe(300_00);
    expect(promoter!.totalExtra).toBe(25_00);
    expect(promoter!.totalExpenses).toBe(40_00);
    expect(promoter!.totalNet).toBe(285_00);
    expect(promoter!.avgNet).toBe(142_50);
    // cachê médio: 300/2 = 150 (≠ avgNet, que é líquido)
    expect(promoter!.avgFee).toBe(150_00);
    // total reconcilia: 285 (PROMOTER) + 50 (BOOKER) + 30 (sem) = 365
    expect(r.totalNet).toBe(365_00);
    expect(r.count).toBe(4);
  });

  it("agrupa shows sem contratante à parte (role null) e o coloca por último", () => {
    const r = rankRolesByProfit(shows, txs, getPayer);
    const sem = r.rows.find((row) => row.role === null);
    expect(sem).toBeDefined();
    expect(sem!.totalNet).toBe(30_00);
    expect(r.rows[r.rows.length - 1]).toBe(sem);
  });

  it("ordena por resultado desc e aponta melhor/pior só entre identificados", () => {
    const r = rankRolesByProfit(shows, txs, getPayer);
    // nets: PROMOTER=285, BOOKER=50, sem=30 -> sem contratante nunca é best/worst
    expect(r.rows.map((row) => row.role ?? "—")).toEqual(["PROMOTER", "BOOKER", "—"]);
    expect(r.best?.role).toBe("PROMOTER");
    expect(r.worst?.role).toBe("BOOKER");
    expect(r.roleCount).toBe(2);
  });

  it("calcula o cachê mediano por papel, robusto a outlier, e exclui cancelados", () => {
    // PROMOTER com 3 shows: cachês 100, 200 e um festival fora da curva de 1000;
    // mais um cancelado que não deve entrar.
    const many: ShowLike[] = [
      { id: "p1", fee: 100_00, status: "PLAYED" },
      { id: "p2", fee: 200_00, status: "PLAYED" },
      { id: "p3", fee: 1000_00, status: "PLAYED" },
      { id: "px", fee: 999_00, status: "CANCELLED" },
    ];
    const r = rankRolesByProfit(many, [], () => ZE);
    const promoter = r.rows.find((row) => row.role === "PROMOTER")!;
    expect(promoter.showCount).toBe(3); // cancelado fora
    expect(promoter.medianFee).toBe(200_00); // preço típico, não a média distorcida
    expect(promoter.avgFee).toBe(433_33); // round(1300/3)
    expect(promoter.medianFee).not.toBe(promoter.avgFee);
  });
});

describe("clientConcentration", () => {
  const ZE = { id: "ze", name: "Zé Produções", role: "PROMOTER" };
  const ANA = { id: "ana", name: "Ana Booking", role: "BOOKER" };
  const LIA = { id: "lia", name: "Lia Eventos", role: "VENUE" };

  // Constrói as linhas via rankContactsByProfit para refletir a entrada real da UI.
  function rowsFrom(
    shows: ShowLike[],
    payers: Record<string, { id: string; name: string; role: string } | null>,
    txs: TxLike[] = [],
  ) {
    return rankContactsByProfit(shows, txs, (s: ShowLike) => payers[s.id] ?? null).rows;
  }

  it("retorna estrutura vazia quando não há contratantes com receita", () => {
    const c = clientConcentration([]);
    expect(c.clients).toEqual([]);
    expect(c.total).toBe(0);
    expect(c.clientCount).toBe(0);
    expect(c.top).toBeNull();
    expect(c.topShare).toBe(0);
    expect(c.top3Share).toBe(0);
    expect(c.hhi).toBe(0);
    expect(c.effectiveClients).toBe(0);
    expect(c.level).toBe("concentrated");
  });

  it("calcula participação sobre a receita bruta e ignora o grupo sem contratante", () => {
    const shows: ShowLike[] = [
      { id: "a", fee: 600_00, status: "PLAYED" }, // Zé
      { id: "b", fee: 300_00, status: "CONFIRMED" }, // Ana
      { id: "c", fee: 100_00, status: "CONFIRMED" }, // Lia
      { id: "d", fee: 999_00, status: "CONFIRMED" }, // sem contratante (não conta)
    ];
    const c = clientConcentration(
      rowsFrom(shows, { a: ZE, b: ANA, c: LIA, d: null }),
    );
    // total = 600+300+100 = 1000 (o show sem contratante de 999 não entra)
    expect(c.total).toBe(1000_00);
    expect(c.clientCount).toBe(3);
    expect(c.top?.contact.id).toBe("ze");
    expect(c.topShare).toBeCloseTo(0.6);
    expect(c.clients.map((s) => s.contact.id)).toEqual(["ze", "ana", "lia"]);
    // HHI = 0,6² + 0,3² + 0,1² = 0,46
    expect(c.hhi).toBeCloseTo(0.46);
    expect(c.effectiveClients).toBeCloseTo(1 / 0.46);
  });

  it("inclui extras na receita bruta do contratante", () => {
    const shows: ShowLike[] = [{ id: "a", fee: 100_00, status: "PLAYED" }];
    const txs: TxLike[] = [tx({ type: "INCOME", amount: 50_00, showId: "a" })];
    const c = clientConcentration(rowsFrom(shows, { a: ZE }, txs));
    // receita bruta = cachê 100 + extra 50 = 150
    expect(c.total).toBe(150_00);
    expect(c.top?.revenue).toBe(150_00);
  });

  it("descarta contratantes sem receita bruta positiva", () => {
    // Zé tem receita; um contratante só com despesa (cachê 0) não vira fatia.
    const shows: ShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED" },
      { id: "b", fee: 0, status: "PLAYED" },
    ];
    const txs: TxLike[] = [tx({ type: "EXPENSE", amount: 20_00, showId: "b" })];
    const c = clientConcentration(rowsFrom(shows, { a: ZE, b: ANA }, txs));
    expect(c.clientCount).toBe(1);
    expect(c.clients.map((s) => s.contact.id)).toEqual(["ze"]);
  });

  it("um único contratante é sempre concentrado (HHI 1)", () => {
    const shows: ShowLike[] = [{ id: "a", fee: 500_00, status: "PLAYED" }];
    const c = clientConcentration(rowsFrom(shows, { a: ZE }));
    expect(c.topShare).toBe(1);
    expect(c.hhi).toBe(1);
    expect(c.effectiveClients).toBe(1);
    expect(c.level).toBe("concentrated");
  });

  it("receita bem distribuída entre muitos contratantes é diversificada", () => {
    // 5 contratantes de 100 cada -> HHI 0,2 (< 0,25) -> diversificada
    const ids = ["c1", "c2", "c3", "c4", "c5"];
    const shows: ShowLike[] = ids.map((id) => ({
      id,
      fee: 100_00,
      status: "PLAYED",
    }));
    const payers = Object.fromEntries(
      ids.map((id) => [id, { id, name: id.toUpperCase(), role: "BOOKER" }]),
    );
    const c = clientConcentration(rowsFrom(shows, payers));
    expect(c.clientCount).toBe(5);
    expect(c.hhi).toBeCloseTo(0.2);
    expect(c.level).toBe("diversified");
    expect(c.top3Share).toBeCloseTo(0.6);
  });
});

describe("roleConcentration", () => {
  // Constrói as linhas via rankRolesByProfit para refletir a entrada real da UI.
  function rowsFrom(
    shows: ShowLike[],
    payers: Record<string, { id: string; name: string; role: string } | null>,
    txs: TxLike[] = [],
  ) {
    return rankRolesByProfit(shows, txs, (s: ShowLike) => payers[s.id] ?? null).rows;
  }

  it("retorna estrutura vazia quando não há papéis com receita", () => {
    const c = roleConcentration([]);
    expect(c.roles).toEqual([]);
    expect(c.total).toBe(0);
    expect(c.roleCount).toBe(0);
    expect(c.top).toBeNull();
    expect(c.topShare).toBe(0);
    expect(c.top3Share).toBe(0);
    expect(c.hhi).toBe(0);
    expect(c.effectiveRoles).toBe(0);
    expect(c.level).toBe("concentrated");
  });

  it("calcula participação sobre a receita bruta por papel e ignora o grupo sem contratante", () => {
    // Dois VENUE somam num grupo (600+? ), um PROMOTER, um BOOKER; um show sem
    // contratante não conta. Receita por papel: VENUE 600, PROMOTER 300, BOOKER 100.
    const VENUE_A = { id: "va", name: "Bar do Zé", role: "VENUE" };
    const VENUE_B = { id: "vb", name: "Teatro Lia", role: "VENUE" };
    const PROM = { id: "p", name: "Ney Shows", role: "PROMOTER" };
    const BOOK = { id: "b", name: "Ana Booking", role: "BOOKER" };
    const shows: ShowLike[] = [
      { id: "a", fee: 400_00, status: "PLAYED" }, // VENUE_A
      { id: "b", fee: 200_00, status: "CONFIRMED" }, // VENUE_B (VENUE total 600)
      { id: "c", fee: 300_00, status: "CONFIRMED" }, // PROMOTER
      { id: "d", fee: 100_00, status: "CONFIRMED" }, // BOOKER
      { id: "e", fee: 999_00, status: "CONFIRMED" }, // sem contratante (não conta)
    ];
    const c = roleConcentration(
      rowsFrom(shows, { a: VENUE_A, b: VENUE_B, c: PROM, d: BOOK, e: null }),
    );
    // total = 600 + 300 + 100 = 1000 (o show sem contratante de 999 não entra)
    expect(c.total).toBe(1000_00);
    expect(c.roleCount).toBe(3);
    expect(c.top?.role).toBe("VENUE");
    expect(c.topShare).toBeCloseTo(0.6);
    expect(c.roles.map((s) => s.role)).toEqual(["VENUE", "PROMOTER", "BOOKER"]);
    // HHI = 0,6² + 0,3² + 0,1² = 0,46
    expect(c.hhi).toBeCloseTo(0.46);
    expect(c.effectiveRoles).toBeCloseTo(1 / 0.46);
    expect(c.top3Share).toBeCloseTo(1);
  });

  it("inclui extras na receita bruta do papel", () => {
    const PROM = { id: "p", name: "Ney Shows", role: "PROMOTER" };
    const shows: ShowLike[] = [{ id: "a", fee: 100_00, status: "PLAYED" }];
    const txs: TxLike[] = [tx({ type: "INCOME", amount: 50_00, showId: "a" })];
    const c = roleConcentration(rowsFrom(shows, { a: PROM }, txs));
    // receita bruta = cachê 100 + extra 50 = 150
    expect(c.total).toBe(150_00);
    expect(c.top?.revenue).toBe(150_00);
  });

  it("descarta papéis sem receita bruta positiva", () => {
    // VENUE tem receita; BOOKER só com despesa (cachê 0) não vira fatia.
    const VENUE = { id: "v", name: "Bar do Zé", role: "VENUE" };
    const BOOK = { id: "b", name: "Ana Booking", role: "BOOKER" };
    const shows: ShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED" },
      { id: "b", fee: 0, status: "PLAYED" },
    ];
    const txs: TxLike[] = [tx({ type: "EXPENSE", amount: 20_00, showId: "b" })];
    const c = roleConcentration(rowsFrom(shows, { a: VENUE, b: BOOK }, txs));
    expect(c.roleCount).toBe(1);
    expect(c.roles.map((s) => s.role)).toEqual(["VENUE"]);
  });

  it("um único papel é sempre concentrado (HHI 1)", () => {
    const VENUE = { id: "v", name: "Bar do Zé", role: "VENUE" };
    const shows: ShowLike[] = [{ id: "a", fee: 500_00, status: "PLAYED" }];
    const c = roleConcentration(rowsFrom(shows, { a: VENUE }));
    expect(c.topShare).toBe(1);
    expect(c.hhi).toBe(1);
    expect(c.effectiveRoles).toBe(1);
    expect(c.level).toBe("concentrated");
  });

  it("receita bem distribuída entre cinco papéis é diversificada", () => {
    // 5 papéis distintos de 100 cada -> HHI 0,2 (< 0,25) -> diversificada
    const roles = ["VENUE", "PROMOTER", "BOOKER", "PRODUCER", "OTHER"];
    const shows: ShowLike[] = roles.map((_role, i) => ({
      id: `s${i}`,
      fee: 100_00,
      status: "PLAYED",
    }));
    const payers = Object.fromEntries(
      roles.map((role, i) => [`s${i}`, { id: `c${i}`, name: role, role }]),
    );
    const c = roleConcentration(rowsFrom(shows, payers));
    expect(c.roleCount).toBe(5);
    expect(c.hhi).toBeCloseTo(0.2);
    expect(c.level).toBe("diversified");
    expect(c.top3Share).toBeCloseTo(0.6);
  });
});

describe("compareRoleConcentration", () => {
  // Concentração por papel a partir de shows brutos (mesma cadeia da UI por
  // período): cada show é atribuído ao papel do pagador informado em `payers`.
  const concFor = (
    shows: ShowLike[],
    payers: Record<string, { id: string; name: string; role: string } | null>,
    txs: TxLike[] = [],
  ) =>
    roleConcentration(
      rankRolesByProfit(shows, txs, (s: ShowLike) => payers[s.id] ?? null).rows,
    );

  // Receita concentrada num papel: VENUE domina (800 de 1000 → topShare 0,8).
  const concentrated = () =>
    concFor(
      [
        { id: "a", fee: 800_00, status: "PLAYED" },
        { id: "b", fee: 100_00, status: "PLAYED" },
        { id: "c", fee: 100_00, status: "PLAYED" },
      ],
      {
        a: { id: "ze", name: "Zé", role: "VENUE" },
        b: { id: "ana", name: "Ana", role: "BOOKER" },
        c: { id: "lia", name: "Lia", role: "PROMOTER" },
      },
    );

  // Receita espalhada: 5 papéis distintos de 200 cada → topShare 0,2.
  const spread = () => {
    const roles = ["VENUE", "BOOKER", "PROMOTER", "PRODUCER", "OTHER"];
    return concFor(
      roles.map((_r, i) => ({ id: `s${i}`, fee: 200_00, status: "PLAYED" })),
      Object.fromEntries(
        roles.map((role, i) => [`s${i}`, { id: `c${i}`, name: role, role }]),
      ),
    );
  };

  it("marca 'improved' quando o maior papel encolhe além do limiar", () => {
    const cmp = compareRoleConcentration(spread(), concentrated());
    // topShare cai de 0,8 → 0,2 (−0,6) ⇒ menos concentrado.
    expect(cmp.topShareDelta).toBeCloseTo(-0.6);
    expect(cmp.effectiveRolesDelta).toBeGreaterThan(0);
    expect(cmp.trend).toBe("improved");
  });

  it("marca 'worsened' quando o maior papel cresce além do limiar", () => {
    const cmp = compareRoleConcentration(concentrated(), spread());
    expect(cmp.topShareDelta).toBeCloseTo(0.6);
    expect(cmp.effectiveRolesDelta).toBeLessThan(0);
    expect(cmp.trend).toBe("worsened");
  });

  it("marca 'stable' quando a variação fica dentro do limiar (ruído)", () => {
    const cmp = compareRoleConcentration(concentrated(), concentrated());
    expect(cmp.topShareDelta).toBeCloseTo(0);
    expect(cmp.trend).toBe("stable");
  });

  it("usa exatamente o limiar como fronteira (≥ ε vira tendência)", () => {
    // topShare 0,55 (VENUE 550/1000) × 0,50 (VENUE 500/1000) → +0,05 == ε.
    const a = concFor(
      [
        { id: "a", fee: 550_00, status: "PLAYED" },
        { id: "b", fee: 450_00, status: "PLAYED" },
      ],
      {
        a: { id: "ze", name: "Zé", role: "VENUE" },
        b: { id: "ana", name: "Ana", role: "BOOKER" },
      },
    );
    const b = concFor(
      [
        { id: "c", fee: 500_00, status: "PLAYED" },
        { id: "d", fee: 500_00, status: "PLAYED" },
      ],
      {
        c: { id: "ze", name: "Zé", role: "VENUE" },
        d: { id: "ana", name: "Ana", role: "BOOKER" },
      },
    );
    const cmp = compareRoleConcentration(a, b);
    expect(cmp.topShareDelta).toBeCloseTo(0.05);
    expect(cmp.trend).toBe("worsened");
  });

  it("preserva as duas concentrações de origem para o detalhe", () => {
    const cur = concentrated();
    const prev = spread();
    const cmp = compareRoleConcentration(cur, prev);
    expect(cmp.current).toBe(cur);
    expect(cmp.previous).toBe(prev);
  });
});

describe("clientConcentrationHeadline", () => {
  const mk = (
    ids: { id: string; revenue: number }[],
  ): ShowLike[] => ids.map((c) => ({ id: c.id, fee: c.revenue, status: "PLAYED" }));
  const payersOf = (ids: string[]) =>
    Object.fromEntries(
      ids.map((id) => [id, { id, name: id.toUpperCase(), role: "BOOKER" }]),
    );
  // Constrói a concentração a partir das linhas reais (mesma cadeia da UI).
  const concentrationFor = (ids: { id: string; revenue: number }[]) =>
    clientConcentration(
      rankContactsByProfit(
        mk(ids),
        [],
        (s: ShowLike) => payersOf(ids.map((c) => c.id))[s.id] ?? null,
      ).rows,
    );

  it("não mostra quando não há contratante com receita (base vazia)", () => {
    const h = clientConcentrationHeadline(clientConcentration([]));
    // Sem receita o veredito é "concentrated", mas clientCount 0 → sem nudge.
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.top).toBeNull();
    expect(h.clientCount).toBe(0);
  });

  it("mostra como crítico quando um único contratante carrega tudo", () => {
    const h = clientConcentrationHeadline(
      concentrationFor([{ id: "ze", revenue: 500_00 }]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.topShare).toBe(1);
    expect(h.top?.id).toBe("ze");
    expect(h.clientCount).toBe(1);
    expect(h.level).toBe("concentrated");
  });

  it("mostra como crítico quando o maior domina ≥ 2/3 mesmo com vários clientes", () => {
    // Zé = 800, outros 4 = 50 cada (200) → topShare 0,8 ≥ 2/3.
    const h = clientConcentrationHeadline(
      concentrationFor([
        { id: "ze", revenue: 800_00 },
        { id: "a", revenue: 50_00 },
        { id: "b", revenue: 50_00 },
        { id: "c", revenue: 50_00 },
        { id: "d", revenue: 50_00 },
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.topShare).toBeCloseTo(0.8);
    expect(h.top?.id).toBe("ze");
  });

  it("mostra sem ser crítico quando concentrado mas o maior fica abaixo de 2/3", () => {
    // 600/300/100 → concentrada (HHI 0,46) mas topShare 0,6 < 2/3 e >1 cliente.
    const h = clientConcentrationHeadline(
      concentrationFor([
        { id: "ze", revenue: 600_00 },
        { id: "ana", revenue: 300_00 },
        { id: "lia", revenue: 100_00 },
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.topShare).toBeCloseTo(0.6);
    expect(h.clientCount).toBe(3);
  });

  it("não mostra quando a receita está diversificada", () => {
    // 5 contratantes de 100 cada → HHI 0,2 → diversificada.
    const h = clientConcentrationHeadline(
      concentrationFor(
        ["c1", "c2", "c3", "c4", "c5"].map((id) => ({ id, revenue: 100_00 })),
      ),
    );
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.level).toBe("diversified");
  });
});

describe("geoConcentration", () => {
  // Constrói as linhas via rankCitiesByProfit para refletir a entrada real da UI.
  const rowsFor = (shows: VenueShowLike[], txs: TxLike[] = []) =>
    rankCitiesByProfit(shows, txs).rows;

  it("retorna estrutura vazia quando não há cidades com receita", () => {
    const c = geoConcentration([]);
    expect(c.places).toEqual([]);
    expect(c.total).toBe(0);
    expect(c.placeCount).toBe(0);
    expect(c.top).toBeNull();
    expect(c.topShare).toBe(0);
    expect(c.top3Share).toBe(0);
    expect(c.hhi).toBe(0);
    expect(c.effectivePlaces).toBe(0);
    expect(c.level).toBe("concentrated");
  });

  it("calcula participação sobre a receita bruta e ignora o grupo sem cidade", () => {
    const shows: VenueShowLike[] = [
      { id: "a", fee: 600_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "b", fee: 300_00, status: "CONFIRMED", venue: "Café", city: "Olinda" },
      { id: "c", fee: 100_00, status: "CONFIRMED", venue: "Teatro", city: "Caruaru" },
      { id: "d", fee: 999_00, status: "CONFIRMED", venue: "Estúdio", city: "" }, // sem cidade: não conta
    ];
    const c = geoConcentration(rowsFor(shows));
    // total = 600+300+100 = 1000 (a cidade vazia de 999 não entra)
    expect(c.total).toBe(1000_00);
    expect(c.placeCount).toBe(3);
    expect(c.top?.key).toBe("recife");
    expect(c.topShare).toBeCloseTo(0.6);
    expect(c.places.map((p) => p.key)).toEqual(["recife", "olinda", "caruaru"]);
    // HHI = 0,6² + 0,3² + 0,1² = 0,46
    expect(c.hhi).toBeCloseTo(0.46);
    expect(c.effectivePlaces).toBeCloseTo(1 / 0.46);
    expect(c.level).toBe("concentrated");
  });

  it("inclui extras na receita bruta da cidade", () => {
    const shows: VenueShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    ];
    const txs: TxLike[] = [tx({ type: "INCOME", amount: 50_00, showId: "a" })];
    const c = geoConcentration(rowsFor(shows, txs));
    // receita bruta = cachê 100 + extra 50 = 150 (independe das despesas)
    expect(c.total).toBe(150_00);
    expect(c.top?.revenue).toBe(150_00);
  });

  it("descarta cidades sem receita bruta positiva", () => {
    // Recife tem receita; uma cidade só com despesa (cachê 0) não vira fatia.
    const shows: VenueShowLike[] = [
      { id: "a", fee: 100_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "b", fee: 0, status: "PLAYED", venue: "Praça", city: "Olinda" },
    ];
    const txs: TxLike[] = [tx({ type: "EXPENSE", amount: 20_00, showId: "b" })];
    const c = geoConcentration(rowsFor(shows, txs));
    expect(c.placeCount).toBe(1);
    expect(c.places.map((p) => p.key)).toEqual(["recife"]);
  });

  it("uma única cidade é sempre concentrada (HHI 1)", () => {
    const shows: VenueShowLike[] = [
      { id: "a", fee: 500_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    ];
    const c = geoConcentration(rowsFor(shows));
    expect(c.topShare).toBe(1);
    expect(c.hhi).toBe(1);
    expect(c.effectivePlaces).toBe(1);
    expect(c.level).toBe("concentrated");
  });

  it("atuação bem espalhada entre muitas cidades é diversificada", () => {
    // 5 cidades de 100 cada -> HHI 0,2 (< 0,25) -> diversificada
    const ids = ["c1", "c2", "c3", "c4", "c5"];
    const shows: VenueShowLike[] = ids.map((id) => ({
      id,
      fee: 100_00,
      status: "PLAYED",
      venue: `Casa ${id}`,
      city: `Cidade ${id}`,
    }));
    const c = geoConcentration(rowsFor(shows));
    expect(c.placeCount).toBe(5);
    expect(c.hhi).toBeCloseTo(0.2);
    expect(c.level).toBe("diversified");
    expect(c.top3Share).toBeCloseTo(0.6);
  });
});

describe("geoConcentrationHeadline", () => {
  // Constrói a concentração a partir das linhas reais (mesma cadeia da UI).
  const headlineFor = (shows: VenueShowLike[], txs: TxLike[] = []) =>
    geoConcentrationHeadline(
      geoConcentration(rankCitiesByProfit(shows, txs).rows),
    );

  it("não mostra quando não há cidade com receita (base vazia)", () => {
    const h = geoConcentrationHeadline(geoConcentration([]));
    // Sem receita o veredito é "concentrated", mas placeCount 0 → sem nudge.
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.top).toBeNull();
    expect(h.placeCount).toBe(0);
  });

  it("mostra como crítico quando uma única cidade carrega tudo", () => {
    const h = headlineFor([
      { id: "a", fee: 500_00, status: "PLAYED", venue: "Bar", city: "Recife" },
    ]);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.topShare).toBe(1);
    expect(h.top?.key).toBe("recife");
    expect(h.placeCount).toBe(1);
    expect(h.level).toBe("concentrated");
  });

  it("mostra como crítico quando a maior praça domina ≥ 2/3 mesmo com várias cidades", () => {
    // Recife 800, outras 4 = 50 cada (200) → topShare 0,8 ≥ 2/3.
    const h = headlineFor([
      { id: "a", fee: 800_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "b", fee: 50_00, status: "PLAYED", venue: "Café", city: "Olinda" },
      { id: "c", fee: 50_00, status: "PLAYED", venue: "Teatro", city: "Caruaru" },
      { id: "d", fee: 50_00, status: "PLAYED", venue: "Praça", city: "Jaboatão" },
      { id: "e", fee: 50_00, status: "PLAYED", venue: "Clube", city: "Paulista" },
    ]);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.topShare).toBeCloseTo(0.8);
    expect(h.top?.key).toBe("recife");
  });

  it("mostra sem ser crítico quando concentrado mas a maior fica abaixo de 2/3", () => {
    // 600/300/100 → concentrada (HHI 0,46) mas topShare 0,6 < 2/3 e >1 cidade.
    const h = headlineFor([
      { id: "a", fee: 600_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "b", fee: 300_00, status: "PLAYED", venue: "Café", city: "Olinda" },
      { id: "c", fee: 100_00, status: "PLAYED", venue: "Teatro", city: "Caruaru" },
    ]);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.topShare).toBeCloseTo(0.6);
    expect(h.placeCount).toBe(3);
  });

  it("não mostra quando a atuação está espalhada", () => {
    // 5 cidades de 100 cada → HHI 0,2 → diversificada.
    const ids = ["c1", "c2", "c3", "c4", "c5"];
    const h = headlineFor(
      ids.map((id) => ({
        id,
        fee: 100_00,
        status: "PLAYED",
        venue: `Casa ${id}`,
        city: `Cidade ${id}`,
      })),
    );
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.level).toBe("diversified");
  });
});

describe("compareGeoConcentration", () => {
  // Concentração a partir de shows brutos (mesma cadeia da UI por período).
  const concFor = (shows: VenueShowLike[], txs: TxLike[] = []) =>
    geoConcentration(rankCitiesByProfit(shows, txs).rows);

  // Atuação concentrada: uma praça domina (Recife 800 de 1000 → topShare 0,8).
  const concentrated = () =>
    concFor([
      { id: "a", fee: 800_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "b", fee: 100_00, status: "PLAYED", venue: "Café", city: "Olinda" },
      { id: "c", fee: 100_00, status: "PLAYED", venue: "Teatro", city: "Caruaru" },
    ]);

  // Atuação espalhada: 5 cidades de 200 cada → topShare 0,2.
  const spread = () =>
    concFor(
      ["c1", "c2", "c3", "c4", "c5"].map((id) => ({
        id,
        fee: 200_00,
        status: "PLAYED",
        venue: `Casa ${id}`,
        city: `Cidade ${id}`,
      })),
    );

  it("marca 'improved' quando a maior praça encolhe além do limiar", () => {
    const cmp = compareGeoConcentration(spread(), concentrated());
    // topShare cai de 0,8 → 0,2 (−0,6) ⇒ menos concentrado.
    expect(cmp.topShareDelta).toBeCloseTo(-0.6);
    expect(cmp.effectivePlacesDelta).toBeGreaterThan(0);
    expect(cmp.trend).toBe("improved");
  });

  it("marca 'worsened' quando a maior praça cresce além do limiar", () => {
    const cmp = compareGeoConcentration(concentrated(), spread());
    expect(cmp.topShareDelta).toBeCloseTo(0.6);
    expect(cmp.effectivePlacesDelta).toBeLessThan(0);
    expect(cmp.trend).toBe("worsened");
  });

  it("marca 'stable' quando a variação fica dentro do limiar (ruído)", () => {
    // Mesma estrutura nos dois períodos → delta 0.
    const cmp = compareGeoConcentration(concentrated(), concentrated());
    expect(cmp.topShareDelta).toBeCloseTo(0);
    expect(cmp.trend).toBe("stable");
  });

  it("usa exatamente o limiar como fronteira (≥ ε vira tendência)", () => {
    // topShare 0,55 (Recife 550/1000) × 0,50 (Recife 500/1000) → +0,05 == ε.
    const a = concFor([
      { id: "a", fee: 550_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "b", fee: 450_00, status: "PLAYED", venue: "Café", city: "Olinda" },
    ]);
    const b = concFor([
      { id: "c", fee: 500_00, status: "PLAYED", venue: "Bar", city: "Recife" },
      { id: "d", fee: 500_00, status: "PLAYED", venue: "Café", city: "Olinda" },
    ]);
    const cmp = compareGeoConcentration(a, b);
    expect(cmp.topShareDelta).toBeCloseTo(0.05);
    expect(cmp.trend).toBe("worsened");
  });

  it("preserva as duas concentrações de origem para o detalhe", () => {
    const cur = concentrated();
    const prev = spread();
    const cmp = compareGeoConcentration(cur, prev);
    expect(cmp.current).toBe(cur);
    expect(cmp.previous).toBe(prev);
  });
});

describe("compareClientConcentration", () => {
  // Concentração de clientes a partir de shows brutos (mesma cadeia da UI por
  // período): cada show é atribuído ao pagador informado em `payers`.
  const concFor = (
    shows: ShowLike[],
    payers: Record<string, { id: string; name: string; role: string } | null>,
    txs: TxLike[] = [],
  ) =>
    clientConcentration(
      rankContactsByProfit(shows, txs, (s: ShowLike) => payers[s.id] ?? null).rows,
    );

  // Carteira concentrada: um contratante domina (Zé 800 de 1000 → topShare 0,8).
  const concentrated = () =>
    concFor(
      [
        { id: "a", fee: 800_00, status: "PLAYED" },
        { id: "b", fee: 100_00, status: "PLAYED" },
        { id: "c", fee: 100_00, status: "PLAYED" },
      ],
      {
        a: { id: "ze", name: "Zé", role: "PROMOTER" },
        b: { id: "ana", name: "Ana", role: "BOOKER" },
        c: { id: "lia", name: "Lia", role: "VENUE" },
      },
    );

  // Carteira espalhada: 5 contratantes de 200 cada → topShare 0,2.
  const spread = () => {
    const ids = ["c1", "c2", "c3", "c4", "c5"];
    return concFor(
      ids.map((id) => ({ id, fee: 200_00, status: "PLAYED" })),
      Object.fromEntries(
        ids.map((id) => [id, { id, name: id.toUpperCase(), role: "BOOKER" }]),
      ),
    );
  };

  it("marca 'improved' quando o maior contratante encolhe além do limiar", () => {
    const cmp = compareClientConcentration(spread(), concentrated());
    // topShare cai de 0,8 → 0,2 (−0,6) ⇒ menos concentrado.
    expect(cmp.topShareDelta).toBeCloseTo(-0.6);
    expect(cmp.effectiveClientsDelta).toBeGreaterThan(0);
    expect(cmp.trend).toBe("improved");
  });

  it("marca 'worsened' quando o maior contratante cresce além do limiar", () => {
    const cmp = compareClientConcentration(concentrated(), spread());
    expect(cmp.topShareDelta).toBeCloseTo(0.6);
    expect(cmp.effectiveClientsDelta).toBeLessThan(0);
    expect(cmp.trend).toBe("worsened");
  });

  it("marca 'stable' quando a variação fica dentro do limiar (ruído)", () => {
    const cmp = compareClientConcentration(concentrated(), concentrated());
    expect(cmp.topShareDelta).toBeCloseTo(0);
    expect(cmp.trend).toBe("stable");
  });

  it("usa exatamente o limiar como fronteira (≥ ε vira tendência)", () => {
    // topShare 0,55 (Zé 550/1000) × 0,50 (Zé 500/1000) → +0,05 == ε.
    const a = concFor(
      [
        { id: "a", fee: 550_00, status: "PLAYED" },
        { id: "b", fee: 450_00, status: "PLAYED" },
      ],
      {
        a: { id: "ze", name: "Zé", role: "PROMOTER" },
        b: { id: "ana", name: "Ana", role: "BOOKER" },
      },
    );
    const b = concFor(
      [
        { id: "c", fee: 500_00, status: "PLAYED" },
        { id: "d", fee: 500_00, status: "PLAYED" },
      ],
      {
        c: { id: "ze", name: "Zé", role: "PROMOTER" },
        d: { id: "ana", name: "Ana", role: "BOOKER" },
      },
    );
    const cmp = compareClientConcentration(a, b);
    expect(cmp.topShareDelta).toBeCloseTo(0.05);
    expect(cmp.trend).toBe("worsened");
  });

  it("preserva as duas concentrações de origem para o detalhe", () => {
    const cur = concentrated();
    const prev = spread();
    const cmp = compareClientConcentration(cur, prev);
    expect(cmp.current).toBe(cur);
    expect(cmp.previous).toBe(prev);
  });

  it("é genérico sobre o mínimo estrutural (serve à concentração de contatos)", () => {
    // A tela `/contatos/concentracao` usa o `ClientConcentration<C>` de
    // `contacts.ts` (com `topShare`/`effectiveClients`), não o de `finance.ts`:
    // o comparativo só depende desse mínimo e reaproveita a mesma aritmética.
    const cur = { topShare: 0.8, effectiveClients: 1.5 };
    const prev = { topShare: 0.2, effectiveClients: 5 };
    const cmp = compareClientConcentration(cur, prev);
    expect(cmp.topShareDelta).toBeCloseTo(0.6);
    expect(cmp.effectiveClientsDelta).toBeCloseTo(-3.5);
    expect(cmp.trend).toBe("worsened");
    // Preserva os objetos de origem tipados como o argumento (não o de finance).
    expect(cmp.current).toBe(cur);
    expect(cmp.previous).toBe(prev);
  });
});

describe("showProfitYears", () => {
  const d = (iso: string) => new Date(iso);

  it("devolve os anos UTC presentes, decrescente e sem duplicar", () => {
    const years = showProfitYears([
      d("2024-03-01T00:00:00Z"),
      d("2026-12-31T00:00:00Z"),
      d("2024-08-15T00:00:00Z"),
      d("2025-01-01T00:00:00Z"),
    ]);
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it("usa o ano UTC mesmo perto da virada (não escorrega de fuso)", () => {
    // 2025-12-31 23:00Z ainda é 2025 em UTC (em -03:00 pareceria 2025 também,
    // mas o ponto é fixar a convenção UTC do módulo).
    const years = showProfitYears([d("2025-12-31T23:00:00Z")]);
    expect(years).toEqual([2025]);
  });

  it("devolve lista vazia sem datas", () => {
    expect(showProfitYears([])).toEqual([]);
  });
});

describe("parseProfitYear", () => {
  const available = [2026, 2025, 2024];

  it("trata vazio/ausente/'todos' como recorte completo ('all')", () => {
    expect(parseProfitYear(undefined, available)).toBe("all");
    expect(parseProfitYear("", available)).toBe("all");
    expect(parseProfitYear("  ", available)).toBe("all");
    expect(parseProfitYear("todos", available)).toBe("all");
    expect(parseProfitYear("TODOS", available)).toBe("all");
  });

  it("aceita um ano de quatro dígitos presente nos disponíveis", () => {
    expect(parseProfitYear("2025", available)).toBe(2025);
    expect(parseProfitYear(" 2024 ", available)).toBe(2024);
  });

  it("cai em 'all' quando o ano não está nos disponíveis ou é inválido", () => {
    expect(parseProfitYear("2020", available)).toBe("all");
    expect(parseProfitYear("20255", available)).toBe("all");
    expect(parseProfitYear("abc", available)).toBe("all");
  });

  it("usa o primeiro valor quando a query vem repetida", () => {
    expect(parseProfitYear(["2026", "2024"], available)).toBe(2026);
    expect(parseProfitYear(["todos", "2024"], available)).toBe("all");
  });
});

describe("filterShowsByYear", () => {
  const shows = [
    { id: "a", date: new Date("2024-05-01T00:00:00Z") },
    { id: "b", date: new Date("2025-02-01T00:00:00Z") },
    { id: "c", date: new Date("2025-11-30T00:00:00Z") },
  ];

  it("devolve a lista inalterada quando 'all'", () => {
    expect(filterShowsByYear(shows, "all")).toBe(shows);
  });

  it("mantém só os shows do ano UTC pedido", () => {
    expect(filterShowsByYear(shows, 2025).map((s) => s.id)).toEqual(["b", "c"]);
    expect(filterShowsByYear(shows, 2024).map((s) => s.id)).toEqual(["a"]);
  });

  it("devolve vazio para um ano sem shows", () => {
    expect(filterShowsByYear(shows, 2030)).toEqual([]);
  });
});

describe("summarizeFinances", () => {
  const txs: TxLike[] = [
    tx({ type: "INCOME", amount: 100_00, received: true }),
    tx({ type: "INCOME", amount: 50_00, received: false }), // a receber
    tx({ type: "EXPENSE", amount: 30_00, received: true }),
    tx({ type: "EXPENSE", amount: 20_00, received: false }), // a pagar
  ];

  it("calcula totais em regime de competência", () => {
    const s = summarizeFinances(txs);
    expect(s.totalIncome).toBe(150_00);
    expect(s.totalExpense).toBe(50_00);
    expect(s.balance).toBe(100_00);
  });

  it("calcula caixa apenas com o que foi recebido/pago", () => {
    const s = summarizeFinances(txs);
    expect(s.receivedIncome).toBe(100_00);
    expect(s.paidExpense).toBe(30_00);
    expect(s.cashBalance).toBe(70_00);
  });

  it("separa pendências (a receber / a pagar)", () => {
    const s = summarizeFinances(txs);
    expect(s.pendingIncome).toBe(50_00);
    expect(s.pendingExpense).toBe(20_00);
  });

  it("zera tudo para lista vazia", () => {
    const s = summarizeFinances([]);
    expect(s).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      receivedIncome: 0,
      paidExpense: 0,
      cashBalance: 0,
      pendingIncome: 0,
      pendingExpense: 0,
    });
  });
});

describe("totalsByCategory", () => {
  it("agrupa por categoria e ordena por movimentação", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 200_00, category: "cachê" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 30_00, category: "transporte" }),
    ];
    const result = totalsByCategory(txs);
    expect(result[0].category).toBe("cachê");
    expect(result[0].income).toBe(200_00);
    const transporte = result.find((r) => r.category === "transporte")!;
    expect(transporte.expense).toBe(80_00);
    expect(transporte.net).toBe(-80_00);
  });
});

describe("incomeMix", () => {
  it("retorna vazio/zerado quando não há receitas", () => {
    const result = incomeMix([
      tx({ type: "EXPENSE", amount: 100_00, category: "transporte" }),
    ]);
    expect(result.sources).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.sourceCount).toBe(0);
    expect(result.top).toBeNull();
    expect(result.topShare).toBe(0);
    expect(result.top3Share).toBe(0);
    expect(result.hhi).toBe(0);
    expect(result.effectiveSources).toBe(0);
  });

  it("ignora despesas e agrupa receitas por fonte (categoria)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 600_00, category: "cachê" }),
      tx({ type: "INCOME", amount: 200_00, category: "cachê" }),
      tx({ type: "INCOME", amount: 200_00, category: "aulas" }),
      tx({ type: "EXPENSE", amount: 999_00, category: "cachê" }),
    ];
    const result = incomeMix(txs);
    expect(result.total).toBe(1000_00);
    expect(result.sourceCount).toBe(2);
    expect(result.sources[0]).toMatchObject({ category: "cachê", amount: 800_00, count: 2 });
    expect(result.sources[0].share).toBeCloseTo(0.8, 10);
    expect(result.sources[1]).toMatchObject({ category: "aulas", amount: 200_00, count: 1 });
    expect(result.top?.category).toBe("cachê");
    expect(result.topShare).toBeCloseTo(0.8, 10);
  });

  it("categoria em branco/ausente cai em 'Sem categoria'", () => {
    const result = incomeMix([
      tx({ type: "INCOME", amount: 100_00, category: "   " }),
    ]);
    expect(result.sources[0].category).toBe("Sem categoria");
  });

  it("ordena por valor decrescente, desempatando por nome (pt-BR)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, category: "streaming" }),
      tx({ type: "INCOME", amount: 100_00, category: "aulas" }),
    ];
    const result = incomeMix(txs);
    expect(result.sources.map((s) => s.category)).toEqual(["aulas", "streaming"]);
  });

  it("calcula top3Share, HHI e nº efetivo de fontes", () => {
    // 4 fontes de R$ 250 cada = participações iguais de 0,25.
    const txs: TxLike[] = ["a", "b", "c", "d"].map((c) =>
      tx({ type: "INCOME", amount: 250_00, category: c }),
    );
    const result = incomeMix(txs);
    expect(result.top3Share).toBeCloseTo(0.75, 10);
    expect(result.hhi).toBeCloseTo(0.25, 10); // 4 × 0,25²
    expect(result.effectiveSources).toBeCloseTo(4, 10); // 1 / 0,25
  });

  it("fonte única → concentrada (HHI = 1)", () => {
    const result = incomeMix([tx({ type: "INCOME", amount: 500_00, category: "cachê" })]);
    expect(result.hhi).toBeCloseTo(1, 10);
    expect(result.effectiveSources).toBeCloseTo(1, 10);
    expect(result.level).toBe("concentrated");
  });

  it("uma fonte dominante (≥45% HHI) → concentrada", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 700_00, category: "cachê" }),
      tx({ type: "INCOME", amount: 200_00, category: "aulas" }),
      tx({ type: "INCOME", amount: 100_00, category: "merch" }),
    ];
    // HHI = 0,7² + 0,2² + 0,1² = 0,54
    const result = incomeMix(txs);
    expect(result.hhi).toBeCloseTo(0.54, 10);
    expect(result.level).toBe("concentrated");
  });

  it("renda bem distribuída → diversificada", () => {
    // 5 fontes iguais → HHI = 0,2, abaixo de 0,25.
    const txs: TxLike[] = ["a", "b", "c", "d", "e"].map((c) =>
      tx({ type: "INCOME", amount: 100_00, category: c }),
    );
    const result = incomeMix(txs);
    expect(result.hhi).toBeCloseTo(0.2, 10);
    expect(result.level).toBe("diversified");
  });

  it("concentração intermediária → moderada", () => {
    // 3 fontes iguais → HHI ≈ 0,333, entre 0,25 e 0,45.
    const txs: TxLike[] = ["a", "b", "c"].map((c) =>
      tx({ type: "INCOME", amount: 100_00, category: c }),
    );
    const result = incomeMix(txs);
    expect(result.hhi).toBeCloseTo(1 / 3, 6);
    expect(result.level).toBe("moderate");
  });
});

describe("incomeMixYears", () => {
  it("retorna os anos UTC das receitas em ordem decrescente, deduplicados", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, date: "2024-05-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, date: "2026-01-02T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, date: "2024-11-20T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, date: "2025-07-01T00:00:00.000Z" }),
    ];
    expect(incomeMixYears(txs)).toEqual([2026, 2025, 2024]);
  });

  it("ignora despesas — só anos com receita aparecem no seletor", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, date: "2026-03-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 999_00, date: "2024-03-01T00:00:00.000Z" }),
    ];
    expect(incomeMixYears(txs)).toEqual([2026]);
  });

  it("usa o ano UTC mesmo na virada do dia (string ISO)", () => {
    // 2025-12-31 23:30 em UTC-3 ainda é 2026-01-01 em UTC.
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, date: "2026-01-01T02:30:00.000Z" }),
    ];
    expect(incomeMixYears(txs)).toEqual([2026]);
  });

  it("aceita date como objeto Date e como string ISO", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, date: new Date("2025-06-15T00:00:00.000Z") }),
      tx({ type: "INCOME", amount: 100_00, date: "2024-06-15T00:00:00.000Z" }),
    ];
    expect(incomeMixYears(txs)).toEqual([2025, 2024]);
  });

  it("retorna vazio quando não há receitas", () => {
    expect(
      incomeMixYears([tx({ type: "EXPENSE", amount: 100_00 })]),
    ).toEqual([]);
  });
});

describe("expenseMixYears", () => {
  it("retorna os anos UTC das despesas em ordem decrescente, deduplicados", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 100_00, date: "2024-05-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, date: "2026-01-02T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, date: "2024-11-20T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, date: "2025-07-01T00:00:00.000Z" }),
    ];
    expect(expenseMixYears(txs)).toEqual([2026, 2025, 2024]);
  });

  it("ignora receitas — só anos com despesa aparecem no seletor", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 100_00, date: "2026-03-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 999_00, date: "2024-03-01T00:00:00.000Z" }),
    ];
    expect(expenseMixYears(txs)).toEqual([2026]);
  });

  it("usa o ano UTC mesmo na virada do dia (string ISO)", () => {
    // 2025-12-31 23:30 em UTC-3 ainda é 2026-01-01 em UTC.
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 100_00, date: "2026-01-01T02:30:00.000Z" }),
    ];
    expect(expenseMixYears(txs)).toEqual([2026]);
  });

  it("aceita date como objeto Date e como string ISO", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 100_00, date: new Date("2025-06-15T00:00:00.000Z") }),
      tx({ type: "EXPENSE", amount: 100_00, date: "2024-06-15T00:00:00.000Z" }),
    ];
    expect(expenseMixYears(txs)).toEqual([2025, 2024]);
  });

  it("retorna vazio quando não há despesas", () => {
    expect(
      expenseMixYears([tx({ type: "INCOME", amount: 100_00 })]),
    ).toEqual([]);
  });

  it("compartilha o gate de expenseMix (só anos com despesa de fato)", () => {
    // Todo ano oferecido tem ao menos uma despesa que entra no expenseMix.
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 300_00, date: "2025-02-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 900_00, date: "2023-02-01T00:00:00.000Z" }),
    ];
    const years = expenseMixYears(txs);
    for (const year of years) {
      const ofYear = txs.filter(
        (t) =>
          (t.date instanceof Date ? t.date : new Date(t.date)).getUTCFullYear() ===
          year,
      );
      expect(expenseMix(ofYear).categoryCount).toBeGreaterThan(0);
    }
    expect(years).toEqual([2025]);
  });
});

describe("expenseMix", () => {
  it("retorna vazio/zerado quando não há despesas", () => {
    const result = expenseMix([
      tx({ type: "INCOME", amount: 100_00, category: "cachê" }),
    ]);
    expect(result.categories).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.categoryCount).toBe(0);
    expect(result.top).toBeNull();
    expect(result.topShare).toBe(0);
    expect(result.top3Share).toBe(0);
    expect(result.hhi).toBe(0);
    expect(result.effectiveCategories).toBe(0);
  });

  it("ignora receitas e agrupa despesas por rubrica (categoria)", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 600_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "equipamento" }),
      tx({ type: "INCOME", amount: 999_00, category: "transporte" }),
    ];
    const result = expenseMix(txs);
    expect(result.total).toBe(1000_00);
    expect(result.categoryCount).toBe(2);
    expect(result.categories[0]).toMatchObject({
      category: "transporte",
      amount: 800_00,
      count: 2,
    });
    expect(result.categories[0].share).toBeCloseTo(0.8, 10);
    expect(result.categories[1]).toMatchObject({
      category: "equipamento",
      amount: 200_00,
      count: 1,
    });
    expect(result.top?.category).toBe("transporte");
    expect(result.topShare).toBeCloseTo(0.8, 10);
  });

  it("categoria em branco/ausente cai em 'Sem categoria'", () => {
    const result = expenseMix([
      tx({ type: "EXPENSE", amount: 100_00, category: "   " }),
    ]);
    expect(result.categories[0].category).toBe("Sem categoria");
  });

  it("ordena por valor decrescente, desempatando por nome (pt-BR)", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 100_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "equipamento" }),
    ];
    const result = expenseMix(txs);
    expect(result.categories.map((c) => c.category)).toEqual([
      "equipamento",
      "transporte",
    ]);
  });

  it("calcula top3Share, HHI e nº efetivo de rubricas", () => {
    // 4 rubricas de R$ 250 cada = participações iguais de 0,25.
    const txs: TxLike[] = ["a", "b", "c", "d"].map((c) =>
      tx({ type: "EXPENSE", amount: 250_00, category: c }),
    );
    const result = expenseMix(txs);
    expect(result.top3Share).toBeCloseTo(0.75, 10);
    expect(result.hhi).toBeCloseTo(0.25, 10);
    expect(result.effectiveCategories).toBeCloseTo(4, 10);
  });

  it("rubrica única → concentrada (HHI = 1)", () => {
    const result = expenseMix([
      tx({ type: "EXPENSE", amount: 500_00, category: "transporte" }),
    ]);
    expect(result.hhi).toBeCloseTo(1, 10);
    expect(result.effectiveCategories).toBeCloseTo(1, 10);
    expect(result.level).toBe("concentrated");
  });

  it("despesa bem distribuída → diversificada", () => {
    // 5 rubricas iguais → HHI = 0,2, abaixo de 0,25.
    const txs: TxLike[] = ["a", "b", "c", "d", "e"].map((c) =>
      tx({ type: "EXPENSE", amount: 100_00, category: c }),
    );
    const result = expenseMix(txs);
    expect(result.hhi).toBeCloseTo(0.2, 10);
    expect(result.level).toBe("diversified");
  });

  it("é o espelho de incomeMix para o lado das despesas (mesma matemática)", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 600_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "equipamento" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "marketing" }),
    ];
    // As mesmas transações como receitas devem produzir os mesmos números.
    const asIncome = txs.map((t) => ({ ...t, type: "INCOME" as const }));
    const expense = expenseMix(txs);
    const income = incomeMix(asIncome);
    expect(expense.total).toBe(income.total);
    expect(expense.categoryCount).toBe(income.sourceCount);
    expect(expense.hhi).toBeCloseTo(income.hhi, 12);
    expect(expense.top3Share).toBeCloseTo(income.top3Share, 12);
    expect(expense.effectiveCategories).toBeCloseTo(income.effectiveSources, 12);
    expect(expense.level).toBe(income.level);
    expect(expense.categories.map((c) => c.category)).toEqual(
      income.sources.map((s) => s.category),
    );
  });
});

describe("compareExpenseMix", () => {
  it("destila os movers: rubrica que mais subiu e a que mais caiu de gasto", () => {
    const current = expenseMix([
      tx({ type: "EXPENSE", amount: 900_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "equipamento" }),
    ]);
    const previous = expenseMix([
      tx({ type: "EXPENSE", amount: 300_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 500_00, category: "equipamento" }),
    ]);
    const cmp = compareExpenseMix(current, previous);
    // transporte: +600; equipamento: -400.
    expect(cmp.biggestIncrease?.category).toBe("transporte");
    expect(cmp.biggestIncrease?.amountDelta).toBe(600_00);
    expect(cmp.biggestDecrease?.category).toBe("equipamento");
    expect(cmp.biggestDecrease?.amountDelta).toBe(-400_00);
    expect(cmp.currentTotal).toBe(1000_00);
    expect(cmp.previousTotal).toBe(800_00);
    expect(cmp.totalDelta).toBe(200_00);
  });

  it("ordena os changes do maior aumento à maior queda", () => {
    const current = expenseMix([
      tx({ type: "EXPENSE", amount: 500_00, category: "a" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "b" }),
      tx({ type: "EXPENSE", amount: 400_00, category: "c" }),
    ]);
    const previous = expenseMix([
      tx({ type: "EXPENSE", amount: 100_00, category: "a" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "b" }),
      tx({ type: "EXPENSE", amount: 900_00, category: "c" }),
    ]);
    const cmp = compareExpenseMix(current, previous);
    // a: +400, b: 0, c: -500.
    expect(cmp.changes.map((c) => c.category)).toEqual(["a", "b", "c"]);
    expect(cmp.changes.map((c) => c.amountDelta)).toEqual([400_00, 0, -500_00]);
  });

  it("separa rubricas novas e sumidas (só num dos períodos)", () => {
    const current = expenseMix([
      tx({ type: "EXPENSE", amount: 200_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 150_00, category: "streaming" }),
    ]);
    const previous = expenseMix([
      tx({ type: "EXPENSE", amount: 200_00, category: "transporte" }),
      tx({ type: "EXPENSE", amount: 300_00, category: "estúdio" }),
    ]);
    const cmp = compareExpenseMix(current, previous);
    expect(cmp.newCategories.map((c) => c.category)).toEqual(["streaming"]);
    expect(cmp.droppedCategories.map((c) => c.category)).toEqual(["estúdio"]);
    // transporte aparece nos dois → vira change (delta 0), não novo/sumido.
    expect(cmp.changes.map((c) => c.category)).toEqual(["transporte"]);
    expect(cmp.biggestIncrease).toBeNull();
    expect(cmp.biggestDecrease).toBeNull();
  });

  it("sem rubricas em comum → sem movers, tudo novo/sumido", () => {
    const current = expenseMix([tx({ type: "EXPENSE", amount: 100_00, category: "x" })]);
    const previous = expenseMix([tx({ type: "EXPENSE", amount: 100_00, category: "y" })]);
    const cmp = compareExpenseMix(current, previous);
    expect(cmp.changes).toEqual([]);
    expect(cmp.biggestIncrease).toBeNull();
    expect(cmp.biggestDecrease).toBeNull();
    expect(cmp.newCategories.map((c) => c.category)).toEqual(["x"]);
    expect(cmp.droppedCategories.map((c) => c.category)).toEqual(["y"]);
    expect(cmp.totalDelta).toBe(0);
  });

  it("empate de amountDelta desempata pelo nome da rubrica (pt-BR)", () => {
    const current = expenseMix([
      tx({ type: "EXPENSE", amount: 300_00, category: "zebra" }),
      tx({ type: "EXPENSE", amount: 300_00, category: "abacaxi" }),
    ]);
    const previous = expenseMix([
      tx({ type: "EXPENSE", amount: 100_00, category: "zebra" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "abacaxi" }),
    ]);
    const cmp = compareExpenseMix(current, previous);
    // Ambos +200; ordem estável por nome.
    expect(cmp.changes.map((c) => c.category)).toEqual(["abacaxi", "zebra"]);
    // O mover de aumento é o primeiro encontrado com o maior delta (abacaxi).
    expect(cmp.biggestIncrease?.category).toBe("abacaxi");
  });
});

describe("compareIncomeMix", () => {
  it("destila os movers: fonte que mais cresceu e a que mais caiu de receita", () => {
    const current = incomeMix([
      tx({ type: "INCOME", amount: 900_00, category: "shows" }),
      tx({ type: "INCOME", amount: 100_00, category: "aulas" }),
    ]);
    const previous = incomeMix([
      tx({ type: "INCOME", amount: 300_00, category: "shows" }),
      tx({ type: "INCOME", amount: 500_00, category: "aulas" }),
    ]);
    const cmp = compareIncomeMix(current, previous);
    // shows: +600; aulas: -400.
    expect(cmp.biggestIncrease?.category).toBe("shows");
    expect(cmp.biggestIncrease?.amountDelta).toBe(600_00);
    expect(cmp.biggestDecrease?.category).toBe("aulas");
    expect(cmp.biggestDecrease?.amountDelta).toBe(-400_00);
    expect(cmp.currentTotal).toBe(1000_00);
    expect(cmp.previousTotal).toBe(800_00);
    expect(cmp.totalDelta).toBe(200_00);
  });

  it("ordena os changes do maior crescimento à maior queda", () => {
    const current = incomeMix([
      tx({ type: "INCOME", amount: 500_00, category: "a" }),
      tx({ type: "INCOME", amount: 100_00, category: "b" }),
      tx({ type: "INCOME", amount: 400_00, category: "c" }),
    ]);
    const previous = incomeMix([
      tx({ type: "INCOME", amount: 100_00, category: "a" }),
      tx({ type: "INCOME", amount: 100_00, category: "b" }),
      tx({ type: "INCOME", amount: 900_00, category: "c" }),
    ]);
    const cmp = compareIncomeMix(current, previous);
    // a: +400, b: 0, c: -500.
    expect(cmp.changes.map((c) => c.category)).toEqual(["a", "b", "c"]);
    expect(cmp.changes.map((c) => c.amountDelta)).toEqual([400_00, 0, -500_00]);
  });

  it("separa fontes novas e sumidas (só num dos períodos)", () => {
    const current = incomeMix([
      tx({ type: "INCOME", amount: 200_00, category: "shows" }),
      tx({ type: "INCOME", amount: 150_00, category: "royalties" }),
    ]);
    const previous = incomeMix([
      tx({ type: "INCOME", amount: 200_00, category: "shows" }),
      tx({ type: "INCOME", amount: 300_00, category: "produção" }),
    ]);
    const cmp = compareIncomeMix(current, previous);
    expect(cmp.newSources.map((s) => s.category)).toEqual(["royalties"]);
    expect(cmp.droppedSources.map((s) => s.category)).toEqual(["produção"]);
    // shows aparece nos dois → vira change (delta 0), não novo/sumido.
    expect(cmp.changes.map((c) => c.category)).toEqual(["shows"]);
    expect(cmp.biggestIncrease).toBeNull();
    expect(cmp.biggestDecrease).toBeNull();
  });

  it("sem fontes em comum → sem movers, tudo novo/sumido", () => {
    const current = incomeMix([tx({ type: "INCOME", amount: 100_00, category: "x" })]);
    const previous = incomeMix([tx({ type: "INCOME", amount: 100_00, category: "y" })]);
    const cmp = compareIncomeMix(current, previous);
    expect(cmp.changes).toEqual([]);
    expect(cmp.biggestIncrease).toBeNull();
    expect(cmp.biggestDecrease).toBeNull();
    expect(cmp.newSources.map((s) => s.category)).toEqual(["x"]);
    expect(cmp.droppedSources.map((s) => s.category)).toEqual(["y"]);
    expect(cmp.totalDelta).toBe(0);
  });

  it("empate de amountDelta desempata pelo nome da fonte (pt-BR)", () => {
    const current = incomeMix([
      tx({ type: "INCOME", amount: 300_00, category: "zebra" }),
      tx({ type: "INCOME", amount: 300_00, category: "abacaxi" }),
    ]);
    const previous = incomeMix([
      tx({ type: "INCOME", amount: 100_00, category: "zebra" }),
      tx({ type: "INCOME", amount: 100_00, category: "abacaxi" }),
    ]);
    const cmp = compareIncomeMix(current, previous);
    // Ambos +200; ordem estável por nome.
    expect(cmp.changes.map((c) => c.category)).toEqual(["abacaxi", "zebra"]);
    expect(cmp.biggestIncrease?.category).toBe("abacaxi");
  });
});

describe("totalsByMonth", () => {
  it("agrupa por mês em ordem cronológica", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, date: "2026-02-15T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 40_00, date: "2026-02-20T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 200_00, date: "2026-01-10T00:00:00.000Z" }),
    ];
    const result = totalsByMonth(txs);
    expect(result.map((r) => r.month)).toEqual(["2026-01", "2026-02"]);
    expect(result[0]).toMatchObject({ month: "2026-01", income: 200_00, net: 200_00 });
    expect(result[1]).toMatchObject({ month: "2026-02", income: 100_00, expense: 40_00, net: 60_00 });
  });
});

describe("monthlySeasonality", () => {
  it("retorna 12 meses zerados e sem melhor/pior quando não há transações", () => {
    const r = monthlySeasonality([]);
    expect(r.months).toHaveLength(12);
    expect(r.months.map((m) => m.monthIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(r.months.every((m) => m.totalIncome === 0 && m.years === 0 && m.avgNet === 0)).toBe(true);
    expect(r.yearsObserved).toBe(0);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
  });

  it("soma o mesmo mês do calendário em anos diferentes e conta os anos ativos", () => {
    const txs: TxLike[] = [
      // Dezembro em dois anos distintos.
      tx({ type: "INCOME", amount: 100_00, date: "2024-12-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 300_00, date: "2025-12-10T00:00:00.000Z" }),
      // Janeiro em um só ano.
      tx({ type: "INCOME", amount: 80_00, date: "2025-01-05T00:00:00.000Z" }),
    ];
    const r = monthlySeasonality(txs);
    const dez = r.months[11];
    const jan = r.months[0];
    expect(dez).toMatchObject({ monthIndex: 12, totalIncome: 400_00, years: 2 });
    expect(dez.avgIncome).toBe(200_00); // 400 / 2 anos ativos
    expect(jan).toMatchObject({ monthIndex: 1, totalIncome: 80_00, years: 1, avgIncome: 80_00 });
    expect(r.yearsObserved).toBe(2); // 2024 e 2025
  });

  it("a média divide só pelos anos com movimento naquele mês, não pelo histórico todo", () => {
    const txs: TxLike[] = [
      // Histórico abrange 2023, 2024 e 2025, mas março só teve movimento em 2025.
      tx({ type: "INCOME", amount: 50_00, date: "2023-06-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 50_00, date: "2024-06-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 600_00, date: "2025-03-01T00:00:00.000Z" }),
    ];
    const r = monthlySeasonality(txs);
    const mar = r.months[2];
    expect(mar.years).toBe(1);
    expect(mar.avgIncome).toBe(600_00); // não diluído por 2023/2024 sem março
    expect(r.yearsObserved).toBe(3);
  });

  it("deriva avgNet de avgIncome−avgExpense e arredonda ao centavo", () => {
    const txs: TxLike[] = [
      // Mesmo mês (abril) em 2 anos: receita 100,01 total / 2 → arredonda; despesa 50,00.
      tx({ type: "INCOME", amount: 100_01, date: "2024-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 30_00, date: "2024-04-02T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 70_00, date: "2025-04-02T00:00:00.000Z" }),
    ];
    const r = monthlySeasonality(txs);
    const abr = r.months[3];
    expect(abr.years).toBe(2);
    expect(abr.avgIncome).toBe(Math.round(100_01 / 2)); // 5001 (centavos)
    expect(abr.avgExpense).toBe(Math.round(100_00 / 2)); // 5000
    expect(abr.avgNet).toBe(abr.avgIncome - abr.avgExpense);
  });

  it("escolhe melhor/pior mês pela média de resultado entre os meses ativos", () => {
    const txs: TxLike[] = [
      // Maio: ótimo resultado típico.
      tx({ type: "INCOME", amount: 500_00, date: "2025-05-01T00:00:00.000Z" }),
      // Setembro: prejuízo típico.
      tx({ type: "EXPENSE", amount: 200_00, date: "2025-09-01T00:00:00.000Z" }),
    ];
    const r = monthlySeasonality(txs);
    expect(r.best?.monthIndex).toBe(5);
    expect(r.worst?.monthIndex).toBe(9);
    expect(r.best?.avgNet).toBe(500_00);
    expect(r.worst?.avgNet).toBe(-200_00);
  });
});

describe("recurringExpenses", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026

  it("retorna vazio e custo zero quando não há despesas", () => {
    const r = recurringExpenses([], { now: NOW });
    expect(r.categories).toEqual([]);
    expect(r.estimatedMonthlyFixedCost).toBe(0);
    expect(r.monthsObserved).toBe(0);
  });

  it("ignora receitas e só considera despesas", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 500_00, category: "Cachê", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 500_00, category: "Cachê", date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 500_00, category: "Cachê", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    expect(r.categories).toEqual([]);
    expect(r.monthsObserved).toBe(0);
  });

  it("só marca como recorrente a categoria com >= minMonths meses distintos", () => {
    const txs: TxLike[] = [
      // Aluguel: 3 meses distintos → recorrente (default minMonths=3).
      tx({ type: "EXPENSE", amount: 80_00, category: "Sala de ensaio", date: "2026-04-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 80_00, category: "Sala de ensaio", date: "2026-05-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 80_00, category: "Sala de ensaio", date: "2026-06-10T00:00:00.000Z" }),
      // Conserto pontual: 1 mês → não recorrente.
      tx({ type: "EXPENSE", amount: 300_00, category: "Equipamento", date: "2026-05-20T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    expect(r.categories.map((c) => c.category)).toEqual(["Sala de ensaio"]);
    const sala = r.categories[0];
    expect(sala.monthsActive).toBe(3);
    expect(sala.total).toBe(240_00);
    expect(sala.avgPerActiveMonth).toBe(80_00);
    expect(r.monthsObserved).toBe(3); // abr, mai, jun têm despesas
  });

  it("conta monthsObserved como o nº de meses distintos com qualquer despesa", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 10_00, category: "A", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 10_00, category: "B", date: "2026-04-15T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 10_00, category: "A", date: "2026-05-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    expect(r.monthsObserved).toBe(2); // abril e maio
  });

  it("calcula avgPerActiveMonth pela conta típica (total / meses-ativos) e arredonda", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 33_33, category: "Streaming", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 33_33, category: "Streaming", date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 33_34, category: "Streaming", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    const s = r.categories[0];
    expect(s.total).toBe(100_00);
    expect(s.avgPerActiveMonth).toBe(Math.round(100_00 / 3)); // 3333 centavos
  });

  it("computa regularity como meses-ativos / janela (gaps reduzem a regularidade)", () => {
    const txs: TxLike[] = [
      // Apareceu em abr, jun, jul (pulou maio) → janela abr..jul = 4 meses, ativos = 3.
      tx({ type: "EXPENSE", amount: 50_00, category: "Telefone", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "Telefone", date: "2026-06-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "Telefone", date: "2026-07-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: "2026-07-15T00:00:00.000Z" });
    const t = r.categories[0];
    expect(t.monthsActive).toBe(3);
    expect(t.monthsSpan).toBe(4);
    expect(t.regularity).toBeCloseTo(3 / 4);
  });

  it("custo fixo estimado soma só as categorias ainda ativas (recentes)", () => {
    const txs: TxLike[] = [
      // Ativa: última ocorrência em junho/2026 (= now).
      tx({ type: "EXPENSE", amount: 100_00, category: "Sala", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "Sala", date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, category: "Sala", date: "2026-06-01T00:00:00.000Z" }),
      // Cortada: recorreu, mas a última foi em jan/2026 (> 2 meses atrás).
      tx({ type: "EXPENSE", amount: 40_00, category: "App antigo", date: "2025-11-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 40_00, category: "App antigo", date: "2025-12-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 40_00, category: "App antigo", date: "2026-01-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    const sala = r.categories.find((c) => c.category === "Sala")!;
    const app = r.categories.find((c) => c.category === "App antigo")!;
    expect(sala.active).toBe(true);
    expect(app.active).toBe(false);
    expect(r.estimatedMonthlyFixedCost).toBe(100_00); // só a "Sala"
  });

  it("ordena por conta típica (avgPerActiveMonth) desc", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 20_00, category: "Pequena", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 20_00, category: "Pequena", date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 20_00, category: "Pequena", date: "2026-06-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "Grande", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "Grande", date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "Grande", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    expect(r.categories.map((c) => c.category)).toEqual(["Grande", "Pequena"]);
  });

  it("agrupa despesas sem categoria sob 'Sem categoria'", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 10_00, category: "  ", date: "2026-04-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 10_00, category: "", date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 10_00, category: "  ", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = recurringExpenses(txs, { now: NOW });
    expect(r.categories[0].category).toBe("Sem categoria");
    expect(r.categories[0].monthsActive).toBe(3);
  });
});

describe("pendingFixedCosts", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026

  // Custo fixo recorrente (3 meses): abr/mai/jun. Helper para reduzir ruído.
  function recurring(category: string, amount: number, months: string[]): TxLike[] {
    return months.map((m) =>
      tx({ type: "EXPENSE", amount, category, date: `2026-${m}-10T00:00:00.000Z` }),
    );
  }

  it("retorna vazio quando não há custos fixos recorrentes", () => {
    const r = pendingFixedCosts([], { now: NOW });
    expect(r.pending).toEqual([]);
    expect(r.totalPending).toBe(0);
    expect(r.activeCount).toBe(0);
    expect(r.loggedCount).toBe(0);
    expect(r.month).toBe("2026-06");
  });

  it("lista a categoria recorrente ativa ainda não lançada no mês de referência", () => {
    // Sala de ensaio caiu em mar/abr/mai mas ainda não em junho → pendente.
    const txs = recurring("Sala de ensaio", 80_00, ["03", "04", "05"]);
    const r = pendingFixedCosts(txs, { now: NOW });
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0]).toMatchObject({
      category: "Sala de ensaio",
      typicalAmount: 80_00,
      lastMonth: "2026-05",
      monthsActive: 3,
    });
    expect(r.totalPending).toBe(80_00);
    expect(r.activeCount).toBe(1);
    expect(r.loggedCount).toBe(0);
  });

  it("não lista a categoria que JÁ tem despesa lançada no mês de referência", () => {
    // Recorrente em abr/mai e também já lançada em junho → não pendente.
    const txs = recurring("Streaming", 30_00, ["04", "05", "06"]);
    const r = pendingFixedCosts(txs, { now: NOW });
    expect(r.pending).toEqual([]);
    expect(r.loggedCount).toBe(1);
    expect(r.activeCount).toBe(1);
    expect(r.totalPending).toBe(0);
  });

  it("ignora categorias encerradas (sem lançamento recente)", () => {
    // Telefone caiu em jan/fev/mar; em junho (now) já passou da janela ativa → fora.
    const txs = recurring("Telefone antigo", 50_00, ["01", "02", "03"]);
    const r = pendingFixedCosts(txs, { now: NOW });
    expect(r.pending).toEqual([]);
    expect(r.activeCount).toBe(0);
  });

  it("ordena as pendentes pela maior conta típica primeiro", () => {
    const txs = [
      ...recurring("Sala de ensaio", 80_00, ["03", "04", "05"]),
      ...recurring("Streaming", 30_00, ["03", "04", "05"]),
      ...recurring("Transporte", 120_00, ["03", "04", "05"]),
    ];
    const r = pendingFixedCosts(txs, { now: NOW });
    expect(r.pending.map((c) => c.category)).toEqual([
      "Transporte",
      "Sala de ensaio",
      "Streaming",
    ]);
    expect(r.totalPending).toBe(120_00 + 80_00 + 30_00);
  });

  it("separa lançadas de pendentes no mesmo mês (loggedCount/totalPending)", () => {
    const txs = [
      // Já lançada em junho → loggedCount.
      ...recurring("Streaming", 30_00, ["04", "05", "06"]),
      // Pendente em junho → pending.
      ...recurring("Sala de ensaio", 80_00, ["03", "04", "05"]),
    ];
    const r = pendingFixedCosts(txs, { now: NOW });
    expect(r.activeCount).toBe(2);
    expect(r.loggedCount).toBe(1);
    expect(r.pending.map((c) => c.category)).toEqual(["Sala de ensaio"]);
    expect(r.totalPending).toBe(80_00);
  });

  it("usa o mês de `now` como referência", () => {
    // Sala caiu em mai/jun/jul (última ocorrência ainda dentro da janela ativa em
    // agosto) mas não em agosto → pendente quando avaliada com now = agosto.
    const txs = recurring("Sala de ensaio", 80_00, ["05", "06", "07"]);
    const r = pendingFixedCosts(txs, { now: "2026-08-10T00:00:00.000Z" });
    expect(r.month).toBe("2026-08");
    expect(r.pending.map((c) => c.category)).toEqual(["Sala de ensaio"]);
  });
});

describe("monthKey", () => {
  it("extrai YYYY-MM em UTC", () => {
    expect(monthKey("2026-06-16T12:00:00.000Z")).toBe("2026-06");
    expect(monthKey(new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12");
  });
});

describe("isValidMonthKey", () => {
  it("aceita YYYY-MM válidos", () => {
    expect(isValidMonthKey("2026-06")).toBe(true);
    expect(isValidMonthKey("2026-01")).toBe(true);
    expect(isValidMonthKey("2026-12")).toBe(true);
  });
  it("rejeita formatos/valores inválidos e vazios", () => {
    expect(isValidMonthKey("2026-13")).toBe(false);
    expect(isValidMonthKey("2026-00")).toBe(false);
    expect(isValidMonthKey("2026-6")).toBe(false);
    expect(isValidMonthKey("junho")).toBe(false);
    expect(isValidMonthKey("")).toBe(false);
    expect(isValidMonthKey(null)).toBe(false);
    expect(isValidMonthKey(undefined)).toBe(false);
  });
});

describe("filterTransactions", () => {
  const txs: TxLike[] = [
    tx({ type: "INCOME", amount: 100_00, date: "2026-01-10T00:00:00.000Z", showId: "s1", received: true, category: "cachê" }),
    tx({ type: "EXPENSE", amount: 30_00, date: "2026-01-20T00:00:00.000Z", showId: "s1", received: false, category: "transporte" }),
    tx({ type: "INCOME", amount: 50_00, date: "2026-02-05T00:00:00.000Z", showId: null, received: false, category: "merch" }),
    tx({ type: "EXPENSE", amount: 20_00, date: "2026-02-15T00:00:00.000Z", showId: "s2", received: true, category: "transporte" }),
  ];

  it("retorna tudo quando o filtro está vazio", () => {
    expect(filterTransactions(txs, {})).toHaveLength(4);
  });

  it("filtra por categoria", () => {
    const r = filterTransactions(txs, { category: "transporte" });
    expect(r).toHaveLength(2);
    expect(r.every((t) => t.category === "transporte")).toBe(true);
  });

  it("combina categoria com outro critério (categoria + tipo)", () => {
    const r = filterTransactions(txs, { category: "transporte", type: "EXPENSE" });
    expect(r).toHaveLength(2);
    expect(filterTransactions(txs, { category: "transporte", type: "INCOME" })).toHaveLength(0);
  });

  it("filtra por mês", () => {
    const r = filterTransactions(txs, { month: "2026-01" });
    expect(r).toHaveLength(2);
    expect(r.every((t) => monthKey(t.date) === "2026-01")).toBe(true);
  });

  it("filtra por tipo", () => {
    expect(filterTransactions(txs, { type: "INCOME" })).toHaveLength(2);
    expect(filterTransactions(txs, { type: "EXPENSE" })).toHaveLength(2);
  });

  it("filtra por show", () => {
    const r = filterTransactions(txs, { showId: "s1" });
    expect(r).toHaveLength(2);
    expect(r.every((t) => t.showId === "s1")).toBe(true);
  });

  it("filtra por status de caixa (received)", () => {
    expect(filterTransactions(txs, { received: false })).toHaveLength(2);
    expect(filterTransactions(txs, { received: true })).toHaveLength(2);
  });

  it("combina critérios (mês + tipo)", () => {
    const r = filterTransactions(txs, { month: "2026-01", type: "EXPENSE" });
    expect(r).toHaveLength(1);
    expect(r[0].amount).toBe(30_00);
  });

  it("ignora mês inválido (não filtra por mês)", () => {
    expect(filterTransactions(txs, { month: "2026-13" })).toHaveLength(4);
    expect(filterTransactions(txs, { month: "" })).toHaveLength(4);
  });

  it("filtra por período com limite inferior (from, inclusive)", () => {
    const r = filterTransactions(txs, { from: "2026-02-05" });
    expect(r).toHaveLength(2);
    expect(r.every((t) => dayKey(t.date) >= "2026-02-05")).toBe(true);
  });

  it("filtra por período com limite superior (to, inclusive)", () => {
    const r = filterTransactions(txs, { to: "2026-01-20" });
    expect(r).toHaveLength(2);
    expect(r.every((t) => dayKey(t.date) <= "2026-01-20")).toBe(true);
  });

  it("filtra por intervalo fechado (from + to, ambos inclusivos)", () => {
    const r = filterTransactions(txs, { from: "2026-01-20", to: "2026-02-05" });
    expect(r).toHaveLength(2);
    expect(r.map((t) => dayKey(t.date)).sort()).toEqual(["2026-01-20", "2026-02-05"]);
  });

  it("intervalo invertido (from > to) não casa com nada", () => {
    expect(filterTransactions(txs, { from: "2026-02-10", to: "2026-01-01" })).toHaveLength(0);
  });

  it("ignora datas de período inválidas (não filtra por período)", () => {
    expect(filterTransactions(txs, { from: "2026-13-40" })).toHaveLength(4);
    expect(filterTransactions(txs, { to: "" })).toHaveLength(4);
  });

  it("combina período com outro critério (intervalo + tipo)", () => {
    const r = filterTransactions(txs, { from: "2026-01-01", to: "2026-01-31", type: "EXPENSE" });
    expect(r).toHaveLength(1);
    expect(r[0].amount).toBe(30_00);
  });

  const qTxs: TxLike[] = [
    tx({ type: "INCOME", amount: 100_00, category: "cachê", description: "Show no Bar São João" }),
    tx({ type: "EXPENSE", amount: 30_00, category: "transporte", description: "Gasolina da van" }),
    tx({ type: "EXPENSE", amount: 20_00, category: "equipamento", description: "Cordas de violão" }),
    tx({ type: "INCOME", amount: 50_00, category: "merch", description: "Venda de camisetas" }),
  ];

  it("filtra por texto na descrição (sem distinção de maiúsculas/minúsculas)", () => {
    const r = filterTransactions(qTxs, { q: "GASOLINA" });
    expect(r).toHaveLength(1);
    expect(r[0].description).toBe("Gasolina da van");
  });

  it("filtra por texto também na categoria", () => {
    const r = filterTransactions(qTxs, { q: "merch" });
    expect(r).toHaveLength(1);
    expect(r[0].description).toBe("Venda de camisetas");
  });

  it("ignora acentos na busca (são casa com sao e vice-versa)", () => {
    expect(filterTransactions(qTxs, { q: "sao joao" })).toHaveLength(1);
    expect(filterTransactions(qTxs, { q: "violao" })).toHaveLength(1);
  });

  it("ignora termo de busca vazio/em branco (não filtra por texto)", () => {
    expect(filterTransactions(qTxs, { q: "" })).toHaveLength(4);
    expect(filterTransactions(qTxs, { q: "   " })).toHaveLength(4);
  });

  it("combina busca textual com outro critério (q + tipo)", () => {
    expect(filterTransactions(qTxs, { q: "a", type: "INCOME" })).toHaveLength(2);
    expect(filterTransactions(qTxs, { q: "gasolina", type: "INCOME" })).toHaveLength(0);
  });
});

describe("normalizeText", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(normalizeText("São João")).toBe("sao joao");
    expect(normalizeText("CACHÊ")).toBe("cache");
  });
  it("apara espaços das bordas e trata nulos/indefinidos", () => {
    expect(normalizeText("  texto  ")).toBe("texto");
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("availableMonths", () => {
  it("lista meses únicos em ordem decrescente", () => {
    const txs: TxLike[] = [
      tx({ date: "2026-01-10T00:00:00.000Z" }),
      tx({ date: "2026-02-10T00:00:00.000Z" }),
      tx({ date: "2026-02-28T00:00:00.000Z" }),
      tx({ date: "2025-12-31T00:00:00.000Z" }),
    ];
    expect(availableMonths(txs)).toEqual(["2026-02", "2026-01", "2025-12"]);
  });
  it("retorna lista vazia para nenhuma transação", () => {
    expect(availableMonths([])).toEqual([]);
  });
});

describe("availableCategories", () => {
  it("lista categorias únicas em ordem alfabética", () => {
    const txs: TxLike[] = [
      tx({ category: "transporte" }),
      tx({ category: "cachê" }),
      tx({ category: "transporte" }),
      tx({ category: "merch" }),
    ];
    expect(availableCategories(txs)).toEqual(["cachê", "merch", "transporte"]);
  });
  it("ignora categorias vazias/em branco", () => {
    const txs: TxLike[] = [
      tx({ category: "" }),
      tx({ category: "   " }),
      tx({ category: "geral" }),
    ];
    expect(availableCategories(txs)).toEqual(["geral"]);
  });
  it("retorna lista vazia para nenhuma transação", () => {
    expect(availableCategories([])).toEqual([]);
  });
});

describe("hasActiveFilter", () => {
  it("detecta filtros ativos", () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(hasActiveFilter({ month: null, type: null, showId: null })).toBe(false);
    expect(hasActiveFilter({ month: "2026-01" })).toBe(true);
    expect(hasActiveFilter({ type: "INCOME" })).toBe(true);
    expect(hasActiveFilter({ showId: "s1" })).toBe(true);
    expect(hasActiveFilter({ received: false })).toBe(true);
    expect(hasActiveFilter({ category: "transporte" })).toBe(true);
    expect(hasActiveFilter({ from: "2026-01-01" })).toBe(true);
    expect(hasActiveFilter({ to: "2026-01-31" })).toBe(true);
    expect(hasActiveFilter({ q: "gasolina" })).toBe(true);
    expect(hasActiveFilter({ q: "   " })).toBe(false);
  });
});

describe("isValidDateKey", () => {
  it("aceita datas bem formadas", () => {
    expect(isValidDateKey("2026-01-01")).toBe(true);
    expect(isValidDateKey("2026-12-31")).toBe(true);
  });
  it("rejeita formato/valores inválidos e vazios", () => {
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("2026-01-32")).toBe(false);
    expect(isValidDateKey("2026-01")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
    expect(isValidDateKey(null)).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
  });
});

describe("dayKey", () => {
  it("extrai a chave YYYY-MM-DD em UTC", () => {
    expect(dayKey("2026-03-09T23:30:00.000Z")).toBe("2026-03-09");
    expect(dayKey(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-12-31");
  });
});

describe("pendingDueStatus", () => {
  const now = "2026-03-10T12:00:00.000Z";

  it("classifica datas anteriores a hoje como vencidas", () => {
    expect(pendingDueStatus("2026-03-09T00:00:00.000Z", now)).toBe("overdue");
    expect(pendingDueStatus("2026-01-01T00:00:00.000Z", now)).toBe("overdue");
  });
  it("classifica o próprio dia como 'today' (não vencido)", () => {
    expect(pendingDueStatus("2026-03-10T00:00:00.000Z", now)).toBe("today");
    expect(pendingDueStatus("2026-03-10T23:59:59.000Z", now)).toBe("today");
  });
  it("classifica datas futuras como 'upcoming'", () => {
    expect(pendingDueStatus("2026-03-11T00:00:00.000Z", now)).toBe("upcoming");
    expect(pendingDueStatus("2026-12-31T00:00:00.000Z", now)).toBe("upcoming");
  });
});

describe("isOverdue", () => {
  const now = "2026-03-10T12:00:00.000Z";

  it("é vencida quando pendente e a data já passou", () => {
    expect(isOverdue(tx({ received: false, date: "2026-03-09T00:00:00.000Z" }), now)).toBe(true);
  });
  it("não é vencida quando já realizada, mesmo com data passada", () => {
    expect(isOverdue(tx({ received: true, date: "2026-03-09T00:00:00.000Z" }), now)).toBe(false);
  });
  it("não é vencida quando vence hoje ou no futuro", () => {
    expect(isOverdue(tx({ received: false, date: "2026-03-10T00:00:00.000Z" }), now)).toBe(false);
    expect(isOverdue(tx({ received: false, date: "2026-03-11T00:00:00.000Z" }), now)).toBe(false);
  });
});

describe("summarizeOverdue", () => {
  const now = "2026-03-10T12:00:00.000Z";

  it("soma e conta pendências vencidas por tipo", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, received: false, date: "2026-03-08T00:00:00.000Z" }), // vencida
      tx({ type: "INCOME", amount: 40_00, received: false, date: "2026-03-09T00:00:00.000Z" }), // vencida
      tx({ type: "INCOME", amount: 999_00, received: true, date: "2026-03-01T00:00:00.000Z" }), // já recebida
      tx({ type: "INCOME", amount: 7_00, received: false, date: "2026-03-20T00:00:00.000Z" }), // a vencer
      tx({ type: "EXPENSE", amount: 30_00, received: false, date: "2026-03-05T00:00:00.000Z" }), // vencida
      tx({ type: "EXPENSE", amount: 5_00, received: false, date: "2026-03-10T00:00:00.000Z" }), // hoje
    ];
    expect(summarizeOverdue(txs, now)).toEqual({
      income: 140_00,
      expense: 30_00,
      incomeCount: 2,
      expenseCount: 1,
    });
  });
  it("retorna zeros quando não há vencidas", () => {
    expect(summarizeOverdue([], now)).toEqual({
      income: 0,
      expense: 0,
      incomeCount: 0,
      expenseCount: 0,
    });
  });
});

describe("projectCashflow", () => {
  const now = "2026-03-15T12:00:00.000Z"; // mês atual = 2026-03

  it("parte do caixa realizado e ignora pendências quando só há realizadas", () => {
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true }),
      tx({ type: "EXPENSE", amount: 40_00, received: true }),
    ];
    const p = projectCashflow(txs, { now, months: 3 });
    expect(p.startBalance).toBe(60_00);
    expect(p.months).toHaveLength(3);
    expect(p.months.map((m) => m.month)).toEqual(["2026-03", "2026-04", "2026-05"]);
    // nenhuma pendência → saldo projetado constante
    expect(p.months.every((m) => m.endBalance === 60_00)).toBe(true);
  });

  it("distribui pendências por mês de vencimento e acumula o saldo", () => {
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true }), // caixa atual = 100
      tx({ type: "INCOME", amount: 50_00, received: false, date: "2026-04-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 20_00, received: false, date: "2026-04-20T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 70_00, received: false, date: "2026-05-05T00:00:00.000Z" }),
    ];
    const p = projectCashflow(txs, { now, months: 3 });
    expect(p.startBalance).toBe(100_00);
    expect(p.months[0]).toMatchObject({ month: "2026-03", net: 0, endBalance: 100_00 });
    expect(p.months[1]).toMatchObject({
      month: "2026-04",
      income: 50_00,
      expense: 20_00,
      net: 30_00,
      endBalance: 130_00,
    });
    expect(p.months[2]).toMatchObject({
      month: "2026-05",
      net: -70_00,
      endBalance: 60_00,
    });
  });

  it("dobra pendências vencidas/antigas no mês atual", () => {
    const txs = [
      tx({ type: "EXPENSE", amount: 30_00, received: false, date: "2026-01-10T00:00:00.000Z" }), // antiga
      tx({ type: "INCOME", amount: 10_00, received: false, date: "2026-03-02T00:00:00.000Z" }), // já passou no mês
    ];
    const p = projectCashflow(txs, { now, months: 2 });
    expect(p.startBalance).toBe(0);
    expect(p.months[0]).toMatchObject({
      month: "2026-03",
      income: 10_00,
      expense: 30_00,
      net: -20_00,
      endBalance: -20_00,
    });
  });

  it("ignora pendências além do horizonte projetado", () => {
    const txs = [
      tx({ type: "INCOME", amount: 99_00, received: false, date: "2026-09-10T00:00:00.000Z" }),
    ];
    const p = projectCashflow(txs, { now, months: 3 }); // horizonte vai até 2026-05
    expect(p.months.every((m) => m.income === 0 && m.expense === 0)).toBe(true);
    expect(p.months[p.months.length - 1].endBalance).toBe(0);
  });

  it("sinaliza saldo projetado negativo (decisão de caixa)", () => {
    const txs = [
      tx({ type: "INCOME", amount: 50_00, received: true }), // caixa atual = 50
      tx({ type: "EXPENSE", amount: 120_00, received: false, date: "2026-04-10T00:00:00.000Z" }),
    ];
    const p = projectCashflow(txs, { now, months: 2 });
    expect(p.months[1].endBalance).toBe(-70_00);
  });

  it("horizonte mínimo de 1 mês e vira o ano corretamente", () => {
    const p = projectCashflow([], { now: "2026-11-15T00:00:00.000Z", months: 3 });
    expect(p.months.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    const single = projectCashflow([], { now, months: 0 });
    expect(single.months).toHaveLength(1);
  });
});

describe("parseCashflowHorizon", () => {
  it("aceita cada preset oferecido", () => {
    for (const preset of CASHFLOW_HORIZON_PRESETS) {
      expect(parseCashflowHorizon(String(preset))).toBe(preset);
    }
  });

  it("cai no default quando ausente, vazio ou não-numérico", () => {
    expect(parseCashflowHorizon(undefined)).toBe(CASHFLOW_HORIZON_DEFAULT);
    expect(parseCashflowHorizon("")).toBe(CASHFLOW_HORIZON_DEFAULT);
    expect(parseCashflowHorizon("abc")).toBe(CASHFLOW_HORIZON_DEFAULT);
  });

  it("cai no default para inteiros fora dos presets (diferente do clamp de parseBurnWindow)", () => {
    expect(parseCashflowHorizon("5")).toBe(CASHFLOW_HORIZON_DEFAULT);
    expect(parseCashflowHorizon("100")).toBe(CASHFLOW_HORIZON_DEFAULT);
  });

  it("usa o primeiro valor quando o param vem repetido", () => {
    expect(parseCashflowHorizon(["12", "3"])).toBe(12);
  });
});

describe("categoryReport", () => {
  it("lista vazia → tudo zerado", () => {
    const r = categoryReport([]);
    expect(r).toEqual({ income: [], expense: [], totalIncome: 0, totalExpense: 0 });
  });

  it("separa receitas de despesas e agrega por categoria", () => {
    const r = categoryReport([
      tx({ type: "INCOME", amount: 300_00, category: "Cachê" }),
      tx({ type: "INCOME", amount: 100_00, category: "Merch" }),
      tx({ type: "EXPENSE", amount: 80_00, category: "Transporte" }),
      tx({ type: "EXPENSE", amount: 20_00, category: "Transporte" }),
    ]);
    expect(r.totalIncome).toBe(400_00);
    expect(r.totalExpense).toBe(100_00);
    expect(r.income.map((s) => s.category)).toEqual(["Cachê", "Merch"]);
    expect(r.expense).toHaveLength(1);
    expect(r.expense[0]).toMatchObject({ category: "Transporte", amount: 100_00 });
  });

  it("ordena por valor decrescente e calcula a participação (share)", () => {
    const r = categoryReport([
      tx({ type: "EXPENSE", amount: 25_00, category: "Equipamento" }),
      tx({ type: "EXPENSE", amount: 75_00, category: "Transporte" }),
    ]);
    expect(r.expense.map((s) => s.category)).toEqual(["Transporte", "Equipamento"]);
    expect(r.expense[0].share).toBeCloseTo(0.75, 5);
    expect(r.expense[1].share).toBeCloseTo(0.25, 5);
  });

  it("desempata categorias de mesmo valor pelo nome (pt-BR)", () => {
    const r = categoryReport([
      tx({ type: "EXPENSE", amount: 50_00, category: "Ônibus" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "Aluguel" }),
    ]);
    expect(r.expense.map((s) => s.category)).toEqual(["Aluguel", "Ônibus"]);
  });

  it("categoria em branco vira 'Sem categoria'", () => {
    const r = categoryReport([
      tx({ type: "INCOME", amount: 10_00, category: "   " }),
      tx({ type: "INCOME", amount: 10_00, category: "" }),
    ]);
    expect(r.income).toHaveLength(1);
    expect(r.income[0].category).toBe("Sem categoria");
    expect(r.income[0].share).toBeCloseTo(1, 5);
  });
});

describe("compareCategoryReports", () => {
  it("dois períodos vazios → tudo zerado e sem destaques", () => {
    const c = compareCategoryReports([], []);
    expect(c.income).toEqual([]);
    expect(c.expense).toEqual([]);
    expect(c.totalIncome).toBe(0);
    expect(c.totalExpense).toBe(0);
    expect(c.previousTotalIncome).toBe(0);
    expect(c.previousTotalExpense).toBe(0);
    expect(c.topIncomeRise).toBeNull();
    expect(c.topExpenseRise).toBeNull();
    expect(c.topExpenseDrop).toBeNull();
  });

  it("calcula a variação por categoria de despesa (atual vs anterior)", () => {
    const current = [
      tx({ type: "EXPENSE", amount: 150_00, category: "Transporte" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "Equipamento" }),
    ];
    const previous = [
      tx({ type: "EXPENSE", amount: 100_00, category: "Transporte" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "Equipamento" }),
    ];
    const c = compareCategoryReports(current, previous);
    const transporte = c.expense.find((r) => r.category === "Transporte")!;
    expect(transporte.amount).toBe(150_00);
    expect(transporte.previousAmount).toBe(100_00);
    expect(transporte.delta.delta).toBe(50_00);
    expect(transporte.delta.pct).toBeCloseTo(0.5, 5);
    expect(transporte.delta.direction).toBe("up");
    const equip = c.expense.find((r) => r.category === "Equipamento")!;
    expect(equip.delta.delta).toBe(0);
    expect(equip.delta.direction).toBe("flat");
  });

  it("inclui categoria presente só num dos períodos (o outro lado conta como 0)", () => {
    const current = [tx({ type: "EXPENSE", amount: 80_00, category: "Marketing" })];
    const previous = [tx({ type: "EXPENSE", amount: 40_00, category: "Aluguel" })];
    const c = compareCategoryReports(current, previous);
    const marketing = c.expense.find((r) => r.category === "Marketing")!;
    expect(marketing.previousAmount).toBe(0);
    expect(marketing.delta.delta).toBe(80_00);
    expect(marketing.delta.pct).toBeNull(); // base anterior = 0
    const aluguel = c.expense.find((r) => r.category === "Aluguel")!;
    expect(aluguel.amount).toBe(0);
    expect(aluguel.delta.delta).toBe(-40_00);
    expect(aluguel.delta.direction).toBe("down");
  });

  it("ordena pelo maior movimento absoluto (alta ou queda) primeiro", () => {
    const current = [
      tx({ type: "EXPENSE", amount: 100_00, category: "Pequena" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "Subiu" }),
      tx({ type: "EXPENSE", amount: 0, category: "Caiu" }),
    ];
    const previous = [
      tx({ type: "EXPENSE", amount: 90_00, category: "Pequena" }),
      tx({ type: "EXPENSE", amount: 50_00, category: "Subiu" }),
      tx({ type: "EXPENSE", amount: 300_00, category: "Caiu" }),
    ];
    const c = compareCategoryReports(current, previous);
    // |Caiu| = 300, |Subiu| = 150, |Pequena| = 10
    expect(c.expense.map((r) => r.category)).toEqual(["Caiu", "Subiu", "Pequena"]);
  });

  it("destaca a maior alta de despesa, a maior queda e a maior alta de receita", () => {
    const current = [
      tx({ type: "EXPENSE", amount: 300_00, category: "Subiu muito" }),
      tx({ type: "EXPENSE", amount: 10_00, category: "Economizei" }),
      tx({ type: "INCOME", amount: 500_00, category: "Cachê" }),
    ];
    const previous = [
      tx({ type: "EXPENSE", amount: 100_00, category: "Subiu muito" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "Economizei" }),
      tx({ type: "INCOME", amount: 100_00, category: "Cachê" }),
    ];
    const c = compareCategoryReports(current, previous);
    expect(c.topExpenseRise?.category).toBe("Subiu muito");
    expect(c.topExpenseRise?.delta.delta).toBe(200_00);
    expect(c.topExpenseDrop?.category).toBe("Economizei");
    expect(c.topExpenseDrop?.delta.delta).toBe(-190_00);
    expect(c.topIncomeRise?.category).toBe("Cachê");
    expect(c.topIncomeRise?.delta.delta).toBe(400_00);
  });

  it("sem altas/quedas reais → destaques ficam null", () => {
    const txs = [tx({ type: "EXPENSE", amount: 50_00, category: "Fixo" })];
    const c = compareCategoryReports(txs, txs);
    expect(c.topExpenseRise).toBeNull();
    expect(c.topExpenseDrop).toBeNull();
    expect(c.topIncomeRise).toBeNull();
    expect(c.expense[0].delta.direction).toBe("flat");
  });

  it("agrega os totais e as variações de receita e despesa", () => {
    const current = [
      tx({ type: "INCOME", amount: 400_00, category: "Cachê" }),
      tx({ type: "EXPENSE", amount: 120_00, category: "Transporte" }),
    ];
    const previous = [
      tx({ type: "INCOME", amount: 300_00, category: "Cachê" }),
      tx({ type: "EXPENSE", amount: 200_00, category: "Transporte" }),
    ];
    const c = compareCategoryReports(current, previous);
    expect(c.totalIncome).toBe(400_00);
    expect(c.previousTotalIncome).toBe(300_00);
    expect(c.incomeDelta.delta).toBe(100_00);
    expect(c.totalExpense).toBe(120_00);
    expect(c.previousTotalExpense).toBe(200_00);
    expect(c.expenseDelta.delta).toBe(-80_00);
    expect(c.expenseDelta.direction).toBe("down");
  });

  it("categoria em branco vira 'Sem categoria' nos dois lados", () => {
    const c = compareCategoryReports(
      [tx({ type: "EXPENSE", amount: 30_00, category: "  " })],
      [tx({ type: "EXPENSE", amount: 10_00, category: "" })],
    );
    expect(c.expense).toHaveLength(1);
    expect(c.expense[0].category).toBe("Sem categoria");
    expect(c.expense[0].delta.delta).toBe(20_00);
  });
});

describe("annualSummary", () => {
  it("retorna 12 meses (jan→dez) mesmo sem transações", () => {
    const a = annualSummary([], 2026);
    expect(a.year).toBe(2026);
    expect(a.months).toHaveLength(12);
    expect(a.months[0]).toMatchObject({ month: "2026-01", monthIndex: 1 });
    expect(a.months[11]).toMatchObject({ month: "2026-12", monthIndex: 12 });
    expect(a.totalIncome).toBe(0);
    expect(a.totalExpense).toBe(0);
    expect(a.net).toBe(0);
    expect(a.best).toBeNull();
    expect(a.worst).toBeNull();
  });

  it("agrega receitas/despesas por mês e soma os totais do ano", () => {
    const a = annualSummary(
      [
        tx({ type: "INCOME", amount: 100_00, date: "2026-01-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 30_00, date: "2026-01-20T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 50_00, date: "2026-03-05T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(a.months[0]).toMatchObject({ income: 100_00, expense: 30_00, net: 70_00 });
    expect(a.months[2]).toMatchObject({ income: 50_00, expense: 0, net: 50_00 });
    expect(a.months[1]).toMatchObject({ income: 0, expense: 0, net: 0 });
    expect(a.totalIncome).toBe(150_00);
    expect(a.totalExpense).toBe(30_00);
    expect(a.net).toBe(120_00);
  });

  it("ignora transações de outros anos", () => {
    const a = annualSummary(
      [
        tx({ type: "INCOME", amount: 100_00, date: "2025-12-31T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 200_00, date: "2027-01-01T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 40_00, date: "2026-06-15T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(a.totalIncome).toBe(40_00);
    expect(a.months[5].income).toBe(40_00);
  });

  it("aponta o melhor e o pior mês por resultado, só entre meses com movimento", () => {
    const a = annualSummary(
      [
        tx({ type: "INCOME", amount: 100_00, date: "2026-02-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 80_00, date: "2026-05-10T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 20_00, date: "2026-09-10T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(a.best?.month).toBe("2026-02"); // net +100
    expect(a.worst?.month).toBe("2026-05"); // net -80
  });

  it("desempata o melhor/pior mês pelo mês mais cedo", () => {
    const a = annualSummary(
      [
        tx({ type: "INCOME", amount: 50_00, date: "2026-04-10T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 50_00, date: "2026-08-10T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(a.best?.month).toBe("2026-04");
    expect(a.worst?.month).toBe("2026-04");
  });
});

describe("quarterlySummary", () => {
  it("retorna 4 trimestres (Q1→Q4) mesmo sem transações", () => {
    const q = quarterlySummary([], 2026);
    expect(q.year).toBe(2026);
    expect(q.quarters).toHaveLength(4);
    expect(q.quarters[0]).toMatchObject({
      quarter: 1,
      label: "1º tri",
      monthIndexes: [1, 2, 3],
    });
    expect(q.quarters[3]).toMatchObject({
      quarter: 4,
      label: "4º tri",
      monthIndexes: [10, 11, 12],
    });
    expect(q.totalIncome).toBe(0);
    expect(q.totalExpense).toBe(0);
    expect(q.net).toBe(0);
    expect(q.best).toBeNull();
    expect(q.worst).toBeNull();
  });

  it("agrupa os meses no trimestre certo e soma os totais do ano", () => {
    const q = quarterlySummary(
      [
        tx({ type: "INCOME", amount: 100_00, date: "2026-01-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 30_00, date: "2026-03-20T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 50_00, date: "2026-07-05T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 20_00, date: "2026-12-31T00:00:00.000Z" }),
      ],
      2026,
    );
    // Q1: jan +100, mar -30  → net 70
    expect(q.quarters[0]).toMatchObject({ income: 100_00, expense: 30_00, net: 70_00 });
    // Q2: sem movimento
    expect(q.quarters[1]).toMatchObject({ income: 0, expense: 0, net: 0 });
    // Q3: jul +50
    expect(q.quarters[2]).toMatchObject({ income: 50_00, expense: 0, net: 50_00 });
    // Q4: dez +20
    expect(q.quarters[3]).toMatchObject({ income: 20_00, expense: 0, net: 20_00 });
    expect(q.totalIncome).toBe(170_00);
    expect(q.totalExpense).toBe(30_00);
    expect(q.net).toBe(140_00);
  });

  it("ignora transações de outros anos", () => {
    const q = quarterlySummary(
      [
        tx({ type: "INCOME", amount: 100_00, date: "2025-12-31T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 200_00, date: "2027-01-01T00:00:00.000Z" }),
        tx({ type: "INCOME", amount: 40_00, date: "2026-06-15T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(q.totalIncome).toBe(40_00);
    expect(q.quarters[1].income).toBe(40_00); // Q2 (jun)
  });

  it("aponta o melhor e o pior trimestre por resultado, só entre os com movimento", () => {
    const q = quarterlySummary(
      [
        tx({ type: "INCOME", amount: 100_00, date: "2026-02-10T00:00:00.000Z" }), // Q1
        tx({ type: "EXPENSE", amount: 80_00, date: "2026-05-10T00:00:00.000Z" }), // Q2
        tx({ type: "INCOME", amount: 20_00, date: "2026-09-10T00:00:00.000Z" }), // Q3
      ],
      2026,
    );
    expect(q.best?.quarter).toBe(1); // net +100
    expect(q.worst?.quarter).toBe(2); // net -80
  });

  it("desempata o melhor/pior trimestre pelo mais cedo", () => {
    const q = quarterlySummary(
      [
        tx({ type: "INCOME", amount: 50_00, date: "2026-04-10T00:00:00.000Z" }), // Q2
        tx({ type: "INCOME", amount: 50_00, date: "2026-10-10T00:00:00.000Z" }), // Q4
      ],
      2026,
    );
    expect(q.best?.quarter).toBe(2);
    expect(q.worst?.quarter).toBe(2);
  });
});

describe("compareAnnualSummaries", () => {
  it("compara os totais do ano frente ao ano anterior", () => {
    const current = annualSummary(
      [
        tx({ type: "INCOME", amount: 300_00, date: "2026-02-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 100_00, date: "2026-05-10T00:00:00.000Z" }),
      ],
      2026,
    );
    const previous = annualSummary(
      [
        tx({ type: "INCOME", amount: 200_00, date: "2025-02-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 50_00, date: "2025-05-10T00:00:00.000Z" }),
      ],
      2025,
    );

    const cmp = compareAnnualSummaries(current, previous);
    expect(cmp.year).toBe(2026);
    expect(cmp.previousYear).toBe(2025);
    expect(cmp.totalIncome.delta).toBe(100_00);
    expect(cmp.totalIncome.direction).toBe("up");
    expect(cmp.totalExpense.delta).toBe(50_00);
    // resultado: (300-100)=200 vs (200-50)=150 → +50
    expect(cmp.net.delta).toBe(50_00);
    expect(cmp.net.pct).toBeCloseTo(1 / 3);
  });

  it("casa cada mês com o mesmo mês do ano anterior", () => {
    const current = annualSummary(
      [tx({ type: "INCOME", amount: 90_00, date: "2026-02-10T00:00:00.000Z" })],
      2026,
    );
    const previous = annualSummary(
      [tx({ type: "INCOME", amount: 60_00, date: "2025-02-10T00:00:00.000Z" })],
      2025,
    );

    const cmp = compareAnnualSummaries(current, previous);
    expect(cmp.months).toHaveLength(12);
    const fev = cmp.months[1];
    expect(fev.monthIndex).toBe(2);
    expect(fev.income.current).toBe(90_00);
    expect(fev.income.previous).toBe(60_00);
    expect(fev.income.delta).toBe(30_00);
    // janeiro sem movimento nos dois anos → flat
    expect(cmp.months[0].net.direction).toBe("flat");
  });

  it("usa pct null quando o ano anterior estava zerado", () => {
    const current = annualSummary(
      [tx({ type: "INCOME", amount: 100_00, date: "2026-04-10T00:00:00.000Z" })],
      2026,
    );
    const previous = annualSummary([], 2025);
    const cmp = compareAnnualSummaries(current, previous);
    expect(cmp.totalIncome.pct).toBeNull();
    expect(cmp.totalIncome.current).toBe(100_00);
  });
});

describe("annualCategoryReport", () => {
  it("considera só as transações do ano informado", () => {
    const r = annualCategoryReport(
      [
        tx({ type: "INCOME", amount: 300_00, category: "Cachê", date: "2026-02-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 80_00, category: "Transporte", date: "2026-05-10T00:00:00.000Z" }),
        // Fora do ano: não deve entrar.
        tx({ type: "INCOME", amount: 999_00, category: "Cachê", date: "2025-12-31T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 999_00, category: "Transporte", date: "2027-01-01T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(r.totalIncome).toBe(300_00);
    expect(r.totalExpense).toBe(80_00);
    expect(r.income.map((s) => s.category)).toEqual(["Cachê"]);
    expect(r.expense.map((s) => s.category)).toEqual(["Transporte"]);
  });

  it("agrega o ano inteiro por categoria com participação (share)", () => {
    const r = annualCategoryReport(
      [
        tx({ type: "EXPENSE", amount: 75_00, category: "Transporte", date: "2026-01-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 25_00, category: "Equipamento", date: "2026-08-10T00:00:00.000Z" }),
      ],
      2026,
    );
    expect(r.expense.map((s) => s.category)).toEqual(["Transporte", "Equipamento"]);
    expect(r.expense[0].share).toBeCloseTo(0.75, 5);
    expect(r.totalExpense).toBe(100_00);
  });

  it("ano sem movimento → tudo zerado", () => {
    const r = annualCategoryReport(
      [tx({ type: "INCOME", amount: 100_00, date: "2025-06-10T00:00:00.000Z" })],
      2026,
    );
    expect(r).toEqual({ income: [], expense: [], totalIncome: 0, totalExpense: 0 });
  });
});

describe("availableYears", () => {
  it("retorna anos únicos em ordem decrescente", () => {
    expect(
      availableYears([
        tx({ date: "2024-05-01T00:00:00.000Z" }),
        tx({ date: "2026-01-01T00:00:00.000Z" }),
        tx({ date: "2024-12-01T00:00:00.000Z" }),
      ]),
    ).toEqual([2026, 2024]);
  });

  it("lista vazia → []", () => {
    expect(availableYears([])).toEqual([]);
  });
});

describe("yearlyHistory", () => {
  it("lista vazia → série vazia e zeros", () => {
    const h = yearlyHistory([]);
    expect(h.years).toEqual([]);
    expect(h.totalIncome).toBe(0);
    expect(h.totalExpense).toBe(0);
    expect(h.net).toBe(0);
    expect(h.avgNetPerYear).toBe(0);
    expect(h.bestYear).toBeNull();
    expect(h.worstYear).toBeNull();
    expect(h.trend).toBeNull();
  });

  it("agrega receita/despesa por ano em ordem crescente", () => {
    const h = yearlyHistory([
      tx({ type: "INCOME", amount: 200_00, date: "2025-04-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 50_00, date: "2025-09-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, date: "2024-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 30_00, date: "2024-06-10T00:00:00.000Z" }),
    ]);
    expect(h.years.map((y) => y.year)).toEqual([2024, 2025]);
    expect(h.years[0]).toMatchObject({ income: 100_00, expense: 30_00, net: 70_00 });
    expect(h.years[1]).toMatchObject({ income: 200_00, expense: 50_00, net: 150_00 });
    expect(h.totalIncome).toBe(300_00);
    expect(h.totalExpense).toBe(80_00);
    expect(h.net).toBe(220_00);
    expect(h.avgNetPerYear).toBe(110_00);
  });

  it("calcula o crescimento de cada ano frente ao ano ativo anterior", () => {
    const h = yearlyHistory([
      tx({ type: "INCOME", amount: 100_00, date: "2024-01-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 150_00, date: "2025-01-10T00:00:00.000Z" }),
    ]);
    expect(h.years[0].previousYear).toBeNull();
    expect(h.years[0].netDelta).toBeNull();
    expect(h.years[1].previousYear).toBe(2024);
    expect(h.years[1].netDelta?.delta).toBe(50_00);
    expect(h.years[1].netDelta?.direction).toBe("up");
    expect(h.years[1].netDelta?.pct).toBeCloseTo(0.5);
    expect(h.years[1].incomeDelta?.delta).toBe(50_00);
  });

  it("compara com o ano ativo anterior mesmo havendo uma lacuna", () => {
    const h = yearlyHistory([
      tx({ type: "INCOME", amount: 100_00, date: "2022-01-10T00:00:00.000Z" }),
      // 2023 e 2024 sem movimento.
      tx({ type: "INCOME", amount: 300_00, date: "2025-01-10T00:00:00.000Z" }),
    ]);
    expect(h.years.map((y) => y.year)).toEqual([2022, 2025]);
    expect(h.years[1].previousYear).toBe(2022); // o predecessor é 2022, não 2024
    expect(h.years[1].netDelta?.delta).toBe(200_00);
  });

  it("aponta o melhor e o pior ano por resultado líquido", () => {
    const h = yearlyHistory([
      tx({ type: "INCOME", amount: 100_00, date: "2023-01-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 500_00, date: "2024-01-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 50_00, date: "2025-01-10T00:00:00.000Z" }),
    ]);
    expect(h.bestYear?.year).toBe(2024); // net +500
    expect(h.worstYear?.year).toBe(2025); // net -50
  });

  it("trend compara o resultado do último ano vs o primeiro", () => {
    const h = yearlyHistory([
      tx({ type: "INCOME", amount: 100_00, date: "2023-01-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 80_00, date: "2024-01-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 250_00, date: "2025-01-10T00:00:00.000Z" }),
    ]);
    expect(h.trend?.current).toBe(250_00);
    expect(h.trend?.previous).toBe(100_00);
    expect(h.trend?.delta).toBe(150_00);
    expect(h.trend?.direction).toBe("up");
  });

  it("um único ano ativo → sem deltas nem trend", () => {
    const h = yearlyHistory([
      tx({ type: "INCOME", amount: 100_00, date: "2025-01-10T00:00:00.000Z" }),
    ]);
    expect(h.years).toHaveLength(1);
    expect(h.years[0].netDelta).toBeNull();
    expect(h.trend).toBeNull();
    expect(h.bestYear?.year).toBe(2025);
    expect(h.worstYear?.year).toBe(2025);
  });
});

describe("projectYearEnd", () => {
  const now = "2026-06-15T12:00:00.000Z"; // hoje = 2026-06-15 (UTC)

  it("soma realizado, pendente lançado e cachês futuros não lançados", () => {
    const txs: TxLike[] = [
      // Receita já recebida no ano.
      tx({ type: "INCOME", amount: 300_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      // Receita lançada e pendente no ano.
      tx({ type: "INCOME", amount: 100_00, received: false, date: "2026-05-10T00:00:00.000Z" }),
      // Despesa paga e despesa pendente no ano.
      tx({ type: "EXPENSE", amount: 80_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 20_00, received: false, date: "2026-04-10T00:00:00.000Z" }),
    ];
    const shows = [
      // Show futuro confirmado, sem receita lançada → entra inteiro como agendado.
      { id: "s1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
    ];

    const f = projectYearEnd(txs, shows, 2026, { now });
    expect(f.isCurrentYear).toBe(true);
    expect(f.realizedIncome).toBe(300_00);
    expect(f.pendingIncome).toBe(100_00);
    expect(f.scheduledIncome).toBe(500_00);
    expect(f.scheduledConfirmed).toBe(500_00);
    expect(f.scheduledTentative).toBe(0);
    expect(f.scheduledShowCount).toBe(1);
    expect(f.projectedIncome).toBe(900_00);

    expect(f.realizedExpense).toBe(80_00);
    expect(f.pendingExpense).toBe(20_00);
    expect(f.projectedExpense).toBe(100_00);

    expect(f.realizedResult).toBe(220_00); // 300 − 80
    expect(f.projectedResult).toBe(800_00); // 900 − 100
  });

  it("abate do cachê agendado a receita já lançada para o show (sem dupla contagem)", () => {
    const txs: TxLike[] = [
      // Sinal de 200 já recebido para o show futuro s1 (qualquer período).
      tx({ type: "INCOME", amount: 200_00, received: true, showId: "s1", date: "2026-04-01T00:00:00.000Z" }),
    ];
    const shows = [
      { id: "s1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
    ];

    const f = projectYearEnd(txs, shows, 2026, { now });
    // Já recebido 200 do cachê de 500 → só faltam 300 agendados.
    expect(f.realizedIncome).toBe(200_00);
    expect(f.scheduledIncome).toBe(300_00);
    expect(f.projectedIncome).toBe(500_00);
    expect(f.scheduledShowCount).toBe(1);
  });

  it("ignora shows passados, cancelados e sem cachê na parte agendada", () => {
    const shows = [
      { id: "passado", fee: 400_00, status: "PLAYED", date: "2026-01-10T00:00:00.000Z" }, // já passou
      { id: "cancel", fee: 400_00, status: "CANCELLED", date: "2026-09-10T00:00:00.000Z" },
      { id: "semfee", fee: 0, status: "CONFIRMED", date: "2026-09-10T00:00:00.000Z" },
      { id: "ok", fee: 400_00, status: "PROPOSED", date: "2026-09-10T00:00:00.000Z" }, // tentativo
    ];
    const f = projectYearEnd([], shows, 2026, { now });
    expect(f.scheduledShowCount).toBe(1);
    expect(f.scheduledIncome).toBe(400_00);
    expect(f.scheduledTentative).toBe(400_00);
    expect(f.scheduledConfirmed).toBe(0);
    expect(f.scheduledTentativeCount).toBe(1);
    expect(f.scheduledConfirmedCount).toBe(0);
  });

  it("conta confirmados e tentativos separadamente", () => {
    const shows = [
      { id: "c1", fee: 300_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
      { id: "c2", fee: 200_00, status: "PLAYED", date: "2026-10-01T00:00:00.000Z" },
      { id: "t1", fee: 150_00, status: "PROPOSED", date: "2026-11-01T00:00:00.000Z" },
    ];
    const f = projectYearEnd([], shows, 2026, { now });
    expect(f.scheduledShowCount).toBe(3);
    expect(f.scheduledConfirmedCount).toBe(2);
    expect(f.scheduledTentativeCount).toBe(1);
    expect(f.scheduledConfirmed).toBe(500_00);
    expect(f.scheduledTentative).toBe(150_00);
  });

  it("um show de hoje ainda conta como futuro (>= hoje)", () => {
    const shows = [
      { id: "hoje", fee: 250_00, status: "CONFIRMED", date: "2026-06-15T00:00:00.000Z" },
    ];
    const f = projectYearEnd([], shows, 2026, { now });
    expect(f.scheduledIncome).toBe(250_00);
  });

  it("considera só transações e shows do ano informado", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, received: true, date: "2025-12-31T00:00:00.000Z" }), // outro ano
      tx({ type: "INCOME", amount: 50_00, received: true, date: "2026-03-01T00:00:00.000Z" }),
    ];
    const shows = [
      { id: "outro", fee: 999_00, status: "CONFIRMED", date: "2027-01-01T00:00:00.000Z" }, // outro ano
    ];
    const f = projectYearEnd(txs, shows, 2026, { now });
    expect(f.realizedIncome).toBe(50_00);
    expect(f.scheduledIncome).toBe(0);
  });

  it("ano passado: sem shows futuros, projeção = resultado lançado do ano", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 200_00, received: true, date: "2025-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 50_00, received: false, date: "2025-05-10T00:00:00.000Z" }),
    ];
    const shows = [
      { id: "s1", fee: 500_00, status: "CONFIRMED", date: "2025-09-01T00:00:00.000Z" },
    ];
    const f = projectYearEnd(txs, shows, 2025, { now });
    expect(f.isCurrentYear).toBe(false);
    expect(f.scheduledIncome).toBe(0); // show de 2025 já passou frente a 2026-06
    expect(f.projectedIncome).toBe(200_00);
    expect(f.projectedExpense).toBe(50_00);
    expect(f.projectedResult).toBe(150_00);
  });
});

describe("applyYearEndScenario", () => {
  const now = "2026-06-15T12:00:00.000Z";

  function forecastWithTentative() {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 300_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
    ];
    const shows = [
      { id: "c1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
      { id: "t1", fee: 200_00, status: "PROPOSED", date: "2026-10-01T00:00:00.000Z" },
    ];
    return projectYearEnd(txs, shows, 2026, { now });
  }

  it("otimista devolve o forecast inalterado", () => {
    const f = forecastWithTentative();
    expect(applyYearEndScenario(f, "optimistic")).toBe(f);
  });

  it("conservador remove os cachês a confirmar da receita e reprojeta", () => {
    const f = forecastWithTentative();
    // Otimista: 300 recebido + 500 confirmado + 200 tentativo = 1000 receita.
    expect(f.projectedIncome).toBe(1_000_00);
    expect(f.projectedResult).toBe(900_00); // 1000 − 100

    const c = applyYearEndScenario(f, "conservative");
    expect(c.scheduledTentative).toBe(0);
    expect(c.scheduledIncome).toBe(500_00); // só o confirmado
    expect(c.projectedIncome).toBe(800_00); // 300 + 500
    expect(c.projectedResult).toBe(700_00); // 800 − 100
    expect(c.scheduledShowCount).toBe(1); // só o show confirmado
    expect(c.scheduledTentativeCount).toBe(0);
    // Despesas e contagem de confirmados intactas.
    expect(c.projectedExpense).toBe(f.projectedExpense);
    expect(c.scheduledConfirmedCount).toBe(1);
    expect(c.scheduledConfirmed).toBe(500_00);
  });

  it("sem cachês a confirmar, conservador coincide com o forecast", () => {
    const shows = [
      { id: "c1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
    ];
    const f = projectYearEnd([], shows, 2026, { now });
    expect(f.scheduledTentative).toBe(0);
    expect(applyYearEndScenario(f, "conservative")).toBe(f);
  });
});

describe("projectYearEndWithFixedCosts", () => {
  const now = "2026-06-15T12:00:00.000Z"; // hoje = 2026-06-15 (UTC), mês atual = junho

  it("aplica o custo fixo aos meses futuros do ano sem despesa lançada", () => {
    // Sem nenhuma despesa lançada → jul..dez (6 meses) recebem o custo fixo.
    const f = projectYearEnd([], [], 2026, { now });
    const s = projectYearEndWithFixedCosts(f, [], 1_000_00, { now });
    expect(s.applicable).toBe(true);
    expect(s.monthlyFixedCost).toBe(1_000_00);
    expect(s.monthsEstimated).toBe(6); // jul, ago, set, out, nov, dez
    expect(s.estimatedRemainingFixedCost).toBe(6_000_00);
    expect(s.projectedExpenseWithFixed).toBe(6_000_00); // forecast tinha 0
    expect(s.projectedResultWithFixed).toBe(-6_000_00);
  });

  it("não conta meses futuros que já têm despesa lançada (sem dupla contagem)", () => {
    const txs: TxLike[] = [
      // Despesa já lançada (pendente) em setembro → setembro não recebe o custo fixo.
      tx({ type: "EXPENSE", amount: 333_00, received: false, date: "2026-09-10T00:00:00.000Z" }),
    ];
    const f = projectYearEnd(txs, [], 2026, { now });
    const s = projectYearEndWithFixedCosts(f, txs, 1_000_00, { now });
    expect(s.monthsEstimated).toBe(5); // jul, ago, out, nov, dez (set fora)
    expect(s.estimatedRemainingFixedCost).toBe(5_000_00);
    // projectedExpense (333 do pendente) + 5.000 estimados.
    expect(s.projectedExpenseWithFixed).toBe(333_00 + 5_000_00);
  });

  it("ignora o mês corrente (parcialmente realizado)", () => {
    // Junho (mês atual) sem despesa: ainda assim não entra na estimativa.
    const f = projectYearEnd([], [], 2026, { now });
    const s = projectYearEndWithFixedCosts(f, [], 500_00, { now });
    expect(s.monthsEstimated).toBe(6); // só jul..dez, junho fora
  });

  it("custo fixo zero ou negativo zera a estimativa", () => {
    const f = projectYearEnd([], [], 2026, { now });
    expect(projectYearEndWithFixedCosts(f, [], 0, { now }).applicable).toBe(false);
    expect(projectYearEndWithFixedCosts(f, [], -100, { now }).estimatedRemainingFixedCost).toBe(0);
  });

  it("ano que não é o corrente: não estima (degrada para o forecast cru)", () => {
    const f = projectYearEnd([], [], 2025, { now });
    const s = projectYearEndWithFixedCosts(f, [], 1_000_00, { now });
    expect(s.applicable).toBe(false);
    expect(s.monthsEstimated).toBe(0);
    expect(s.estimatedRemainingFixedCost).toBe(0);
    expect(s.projectedExpenseWithFixed).toBe(f.projectedExpense);
    expect(s.projectedResultWithFixed).toBe(f.projectedResult);
  });

  it("em dezembro não há meses futuros no ano", () => {
    const dec = "2026-12-10T12:00:00.000Z";
    const f = projectYearEnd([], [], 2026, { now: dec });
    const s = projectYearEndWithFixedCosts(f, [], 1_000_00, { now: dec });
    expect(s.monthsEstimated).toBe(0);
    expect(s.estimatedRemainingFixedCost).toBe(0);
  });
});

describe("projectYearEndPessimistic", () => {
  const now = "2026-06-15T12:00:00.000Z"; // hoje = 2026-06-15 (UTC), mês atual = junho

  function forecastWithTentative() {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 300_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
    ];
    const shows = [
      { id: "c1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
      { id: "t1", fee: 200_00, status: "PROPOSED", date: "2026-10-01T00:00:00.000Z" },
    ];
    return { f: projectYearEnd(txs, shows, 2026, { now }), txs };
  }

  it("cruza o piso de receita (só confirmados) com o teto de despesa (custos fixos)", () => {
    const { f, txs } = forecastWithTentative();
    // Otimista: 300 recebido + 500 confirmado + 200 tentativo = 1000 receita; 100 despesa.
    expect(f.projectedIncome).toBe(1_000_00);
    expect(f.projectedResult).toBe(900_00);

    const p = projectYearEndPessimistic(f, txs, 1_000_00, { now });
    expect(p.applicable).toBe(true);
    // Receita conservadora: descarta os 200 a confirmar → 800.
    expect(p.projectedIncome).toBe(800_00);
    expect(p.droppedTentative).toBe(200_00);
    expect(p.droppedTentativeCount).toBe(1);
    // Despesa: 100 lançada + custo fixo de 1.000/mês × jul..dez (6 meses) = 6.100.
    expect(p.estimatedRemainingFixedCost).toBe(6_000_00);
    expect(p.projectedExpense).toBe(100_00 + 6_000_00);
    // Piso: 800 − 6.100 = −5.300.
    expect(p.projectedResult).toBe(800_00 - 6_100_00);
    expect(p.fixedCost.monthsEstimated).toBe(6);
  });

  it("sem tentativo nem custo fixo, não é aplicável (coincide com o cru)", () => {
    const shows = [
      { id: "c1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
    ];
    const f = projectYearEnd([], shows, 2026, { now });
    const p = projectYearEndPessimistic(f, [], 0, { now });
    expect(p.applicable).toBe(false);
    expect(p.droppedTentative).toBe(0);
    expect(p.estimatedRemainingFixedCost).toBe(0);
    expect(p.projectedResult).toBe(f.projectedResult);
  });

  it("aplicável só pelo eixo da receita (sem custo fixo)", () => {
    const { f, txs } = forecastWithTentative();
    const p = projectYearEndPessimistic(f, txs, 0, { now });
    expect(p.applicable).toBe(true);
    expect(p.estimatedRemainingFixedCost).toBe(0);
    expect(p.projectedIncome).toBe(800_00); // só descartou o tentativo
    expect(p.projectedExpense).toBe(100_00);
    expect(p.projectedResult).toBe(700_00);
  });

  it("aplicável só pelo eixo da despesa (sem cachê a confirmar)", () => {
    const shows = [
      { id: "c1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
    ];
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 300_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
    ];
    const f = projectYearEnd(txs, shows, 2026, { now });
    const p = projectYearEndPessimistic(f, txs, 1_000_00, { now });
    expect(p.applicable).toBe(true);
    expect(p.droppedTentative).toBe(0);
    expect(p.projectedIncome).toBe(f.projectedIncome); // nada a descartar
    expect(p.estimatedRemainingFixedCost).toBe(6_000_00);
    expect(p.projectedExpense).toBe(6_000_00); // forecast sem despesa lançada
  });
});

describe("yearEndScenarioView", () => {
  const now = "2026-06-15T12:00:00.000Z"; // hoje = 2026-06-15 (UTC), mês atual = junho

  function setup() {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 300_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
    ];
    const shows = [
      { id: "c1", fee: 500_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
      { id: "t1", fee: 200_00, status: "PROPOSED", date: "2026-10-01T00:00:00.000Z" },
    ];
    return { f: projectYearEnd(txs, shows, 2026, { now }), txs };
  }

  it("otimista: forecast cru, sem custo fixo nem descarte", () => {
    const { f, txs } = setup();
    const v = yearEndScenarioView(f, txs, 1_000_00, "optimistic", { now });
    expect(v.mode).toBe("optimistic");
    expect(v.projectedIncome).toBe(1_000_00); // 300 + 500 + 200
    expect(v.projectedExpense).toBe(100_00);
    expect(v.projectedResult).toBe(900_00);
    expect(v.estimatedRemainingFixedCost).toBe(0);
    expect(v.droppedTentative).toBe(0);
    expect(v.droppedTentativeCount).toBe(0);
    expect(v.scheduledTentative).toBe(200_00);
  });

  it("conservador: descarta os cachês a confirmar da receita, despesa intacta", () => {
    const { f, txs } = setup();
    const v = yearEndScenarioView(f, txs, 1_000_00, "conservative", { now });
    expect(v.mode).toBe("conservative");
    expect(v.projectedIncome).toBe(800_00); // 300 + 500 (sem o tentativo)
    expect(v.projectedExpense).toBe(100_00); // sem custo fixo
    expect(v.projectedResult).toBe(700_00);
    expect(v.estimatedRemainingFixedCost).toBe(0);
    expect(v.scheduledTentative).toBe(0);
    expect(v.droppedTentative).toBe(200_00);
    expect(v.droppedTentativeCount).toBe(1);
  });

  it("pior caso: receita só confirmada E despesa com custo fixo futuro", () => {
    const { f, txs } = setup();
    const v = yearEndScenarioView(f, txs, 1_000_00, "pessimistic", { now });
    expect(v.mode).toBe("pessimistic");
    // Receita conservadora: 800. Despesa: 100 + 1.000×6 (jul..dez) = 6.100.
    expect(v.projectedIncome).toBe(800_00);
    expect(v.estimatedRemainingFixedCost).toBe(6_000_00);
    expect(v.projectedExpense).toBe(6_100_00);
    expect(v.projectedResult).toBe(800_00 - 6_100_00);
    expect(v.droppedTentative).toBe(200_00);
    expect(v.droppedTentativeCount).toBe(1);
    expect(v.scheduledTentative).toBe(0);
  });

  it("pior caso sem custo fixo coincide com o conservador", () => {
    const { f, txs } = setup();
    const cons = yearEndScenarioView(f, txs, 0, "conservative", { now });
    const pess = yearEndScenarioView(f, txs, 0, "pessimistic", { now });
    expect(pess.estimatedRemainingFixedCost).toBe(0);
    expect(pess.projectedResult).toBe(cons.projectedResult);
    expect(pess.projectedIncome).toBe(cons.projectedIncome);
    expect(pess.projectedExpense).toBe(cons.projectedExpense);
  });

  it("a composição soma os totais em cada cenário", () => {
    const { f, txs } = setup();
    for (const mode of ["optimistic", "conservative", "pessimistic"] as const) {
      const v = yearEndScenarioView(f, txs, 1_000_00, mode, { now });
      expect(v.realizedIncome + v.pendingIncome + v.scheduledIncome).toBe(
        v.projectedIncome,
      );
      expect(
        v.realizedExpense + v.pendingExpense + v.estimatedRemainingFixedCost,
      ).toBe(v.projectedExpense);
      expect(v.projectedIncome - v.projectedExpense).toBe(v.projectedResult);
      expect(v.year).toBe(2026);
    }
  });

  it("compõe com compareYearEndToPrevious respeitando o cenário", () => {
    const { f, txs } = setup();
    // Ano anterior já encerrado: cenário não tem efeito (sem shows futuros).
    const prev = projectYearEnd(
      [tx({ type: "INCOME", amount: 600_00, received: true, date: "2025-02-10T00:00:00.000Z" })],
      [],
      2025,
      { now },
    );
    const view = yearEndScenarioView(f, txs, 0, "conservative", { now });
    const prevView = yearEndScenarioView(prev, txs, 0, "conservative", { now });
    const cmp = compareYearEndToPrevious(view, prevView);
    expect(cmp.year).toBe(2026);
    expect(cmp.previousYear).toBe(2025);
    expect(cmp.hasPreviousData).toBe(true);
    // Resultado conservador 2026 = 700; 2025 = 600. Delta +100.
    expect(cmp.result.current).toBe(700_00);
    expect(cmp.result.previous).toBe(600_00);
    expect(cmp.result.delta).toBe(100_00);
  });
});

describe("compareYearEndToPrevious", () => {
  const now = "2026-06-15T12:00:00.000Z"; // hoje = 2026-06-15 (UTC)

  it("compara resultado/receita/despesa projetados do ano com o ano anterior", () => {
    const txs: TxLike[] = [
      // Ano anterior (2025), já encerrado: fechou em 400 (receita) − 100 (despesa).
      tx({ type: "INCOME", amount: 400_00, received: true, date: "2025-03-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 100_00, received: true, date: "2025-04-10T00:00:00.000Z" }),
      // Ano corrente (2026): 300 recebido + 200 agendado = 500 receita; 80 despesa.
      tx({ type: "INCOME", amount: 300_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 80_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
    ];
    const showsCurrent = [
      { id: "s1", fee: 200_00, status: "CONFIRMED", date: "2026-09-01T00:00:00.000Z" },
    ];
    const current = projectYearEnd(txs, showsCurrent, 2026, { now });
    const previous = projectYearEnd(txs, [], 2025, { now });

    const c = compareYearEndToPrevious(current, previous);
    expect(c.year).toBe(2026);
    expect(c.previousYear).toBe(2025);
    expect(c.hasPreviousData).toBe(true);

    // Resultado: 2026 projetado = 500 − 80 = 420; 2025 fechado = 400 − 100 = 300.
    expect(c.result.current).toBe(420_00);
    expect(c.result.previous).toBe(300_00);
    expect(c.result.delta).toBe(120_00);
    expect(c.result.direction).toBe("up");
    expect(c.result.pct).toBeCloseTo(0.4, 5); // 120/300

    // Receita: 500 vs 400.
    expect(c.income.delta).toBe(100_00);
    // Despesa: 80 vs 100 → caiu (bom, mas direction é só o sinal).
    expect(c.expense.delta).toBe(-20_00);
    expect(c.expense.direction).toBe("down");
  });

  it("sem movimento no ano anterior: hasPreviousData false e pct nulo", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
    ];
    const current = projectYearEnd(txs, [], 2026, { now });
    const previous = projectYearEnd(txs, [], 2025, { now });

    const c = compareYearEndToPrevious(current, previous);
    expect(c.hasPreviousData).toBe(false);
    expect(c.result.previous).toBe(0);
    expect(c.result.pct).toBeNull(); // sem base anterior
  });
});

describe("buildDueAgenda", () => {
  const now = "2026-03-15T12:00:00.000Z"; // hoje = 2026-03-15 (UTC)

  function buckets(agenda: ReturnType<typeof buildDueAgenda>) {
    return Object.fromEntries(agenda.buckets.map((b) => [b.key, b]));
  }

  it("ignora transações já realizadas e devolve 4 janelas zeradas quando vazio", () => {
    const agenda = buildDueAgenda(
      [
        tx({ type: "INCOME", amount: 100_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
        tx({ type: "EXPENSE", amount: 40_00, received: true, date: "2026-03-20T00:00:00.000Z" }),
      ],
      { now },
    );
    expect(agenda.count).toBe(0);
    expect(agenda.totalIncome).toBe(0);
    expect(agenda.totalExpense).toBe(0);
    expect(agenda.buckets.map((b) => b.key)).toEqual(["overdue", "today", "week", "later"]);
    expect(agenda.buckets.every((b) => b.count === 0 && b.net === 0)).toBe(true);
  });

  it("distribui as pendências nas janelas pelo vencimento (UTC)", () => {
    const txs = [
      tx({ type: "EXPENSE", amount: 20_00, received: false, date: "2026-03-01T00:00:00.000Z" }), // vencida
      tx({ type: "INCOME", amount: 50_00, received: false, date: "2026-03-15T00:00:00.000Z" }), // hoje
      tx({ type: "EXPENSE", amount: 30_00, received: false, date: "2026-03-18T00:00:00.000Z" }), // +3d → semana
      tx({ type: "INCOME", amount: 70_00, received: false, date: "2026-03-22T00:00:00.000Z" }), // +7d → semana (limite)
      tx({ type: "INCOME", amount: 90_00, received: false, date: "2026-04-30T00:00:00.000Z" }), // mais tarde
    ];
    const b = buckets(buildDueAgenda(txs, { now }));
    expect(b.overdue.count).toBe(1);
    expect(b.overdue.expense).toBe(20_00);
    expect(b.today.count).toBe(1);
    expect(b.today.income).toBe(50_00);
    expect(b.week.count).toBe(2); // +3d e +7d
    expect(b.week.income).toBe(70_00);
    expect(b.week.expense).toBe(30_00);
    expect(b.later.count).toBe(1);
    expect(b.later.income).toBe(90_00);
  });

  it("calcula income/expense/net por janela e totais gerais", () => {
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: false, date: "2026-03-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 40_00, received: false, date: "2026-03-12T00:00:00.000Z" }),
    ];
    const agenda = buildDueAgenda(txs, { now });
    const b = buckets(agenda);
    expect(b.overdue).toMatchObject({ income: 100_00, expense: 40_00, net: 60_00, count: 2 });
    expect(agenda.totalIncome).toBe(100_00);
    expect(agenda.totalExpense).toBe(40_00);
    expect(agenda.count).toBe(2);
  });

  it("ordena os itens da janela por vencimento crescente e informa daysUntil", () => {
    const txs = [
      tx({ type: "EXPENSE", amount: 10_00, received: false, date: "2026-03-05T00:00:00.000Z" }), // -10
      tx({ type: "EXPENSE", amount: 10_00, received: false, date: "2026-03-01T00:00:00.000Z" }), // -14
      tx({ type: "EXPENSE", amount: 10_00, received: false, date: "2026-03-14T00:00:00.000Z" }), // -1
    ];
    const overdue = buckets(buildDueAgenda(txs, { now })).overdue;
    expect(overdue.items.map((i) => i.daysUntil)).toEqual([-14, -10, -1]);
    expect(overdue.items.every((i) => i.bucket === "overdue")).toBe(true);
  });

  it("respeita weekHorizon customizado", () => {
    const txs = [
      tx({ type: "INCOME", amount: 10_00, received: false, date: "2026-03-18T00:00:00.000Z" }), // +3d
    ];
    // horizonte de 2 dias → +3d cai em "later"
    const b = buckets(buildDueAgenda(txs, { now, weekHorizon: 2 }));
    expect(b.week.count).toBe(0);
    expect(b.later.count).toBe(1);
  });
});

describe("forecastBookedRevenue", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  function s(partial: Partial<{ fee: number; status: string; date: string }>) {
    return {
      fee: 100_00,
      status: "CONFIRMED",
      date: "2026-04-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("retorna vazio quando não há shows futuros", () => {
    const f = forecastBookedRevenue([], { now });
    expect(f.months).toEqual([]);
    expect(f.total).toBe(0);
    expect(f.count).toBe(0);
    expect(f.confirmedTotal).toBe(0);
    expect(f.tentativeTotal).toBe(0);
    expect(f.nextMonth).toBeNull();
  });

  it("ignora shows passados, mas inclui o show de hoje", () => {
    const shows = [
      s({ date: "2026-03-01T20:00:00.000Z", fee: 50_00 }), // passado
      s({ date: "2026-03-15T20:00:00.000Z", fee: 70_00 }), // hoje (>= hoje)
      s({ date: "2026-04-02T20:00:00.000Z", fee: 90_00 }), // futuro
    ];
    const f = forecastBookedRevenue(shows, { now });
    expect(f.count).toBe(2);
    expect(f.total).toBe(160_00);
    expect(f.months.map((m) => m.month)).toEqual(["2026-03", "2026-04"]);
    expect(f.nextMonth).toBe("2026-03");
  });

  it("ignora shows cancelados", () => {
    const shows = [
      s({ date: "2026-04-10T20:00:00.000Z", fee: 100_00, status: "CANCELLED" }),
      s({ date: "2026-04-12T20:00:00.000Z", fee: 60_00, status: "CONFIRMED" }),
    ];
    const f = forecastBookedRevenue(shows, { now });
    expect(f.count).toBe(1);
    expect(f.total).toBe(60_00);
  });

  it("agrupa por mês e mantém total = confirmed + tentative", () => {
    const shows = [
      s({ date: "2026-04-05T20:00:00.000Z", fee: 100_00, status: "CONFIRMED" }),
      s({ date: "2026-04-20T20:00:00.000Z", fee: 30_00, status: "PROPOSED" }),
      s({ date: "2026-05-01T20:00:00.000Z", fee: 200_00, status: "PLAYED" }),
    ];
    const f = forecastBookedRevenue(shows, { now });
    const abr = f.months.find((m) => m.month === "2026-04")!;
    expect(abr.count).toBe(2);
    expect(abr.total).toBe(130_00);
    expect(abr.confirmed).toBe(100_00);
    expect(abr.tentative).toBe(30_00);
    expect(abr.confirmed + abr.tentative).toBe(abr.total);
    const mai = f.months.find((m) => m.month === "2026-05")!;
    expect(mai.confirmed).toBe(200_00); // PLAYED conta como confirmado
  });

  it("classifica status ausente como tentativo", () => {
    const shows = [{ fee: 40_00, date: "2026-04-10T20:00:00.000Z" }];
    const f = forecastBookedRevenue(shows, { now });
    expect(f.confirmedTotal).toBe(0);
    expect(f.tentativeTotal).toBe(40_00);
  });

  it("soma os totais gerais e ordena os meses crescente", () => {
    const shows = [
      s({ date: "2026-06-10T20:00:00.000Z", fee: 100_00, status: "PROPOSED" }),
      s({ date: "2026-04-10T20:00:00.000Z", fee: 200_00, status: "CONFIRMED" }),
      s({ date: "2026-05-10T20:00:00.000Z", fee: 50_00, status: "CONFIRMED" }),
    ];
    const f = forecastBookedRevenue(shows, { now });
    expect(f.months.map((m) => m.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(f.total).toBe(350_00);
    expect(f.confirmedTotal).toBe(250_00);
    expect(f.tentativeTotal).toBe(100_00);
    expect(f.nextMonth).toBe("2026-04");
  });
});

describe("reconcileShowFees", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T20:00:00.000Z",
      ...partial,
    };
  }

  it("lista o gig realizado sem nenhuma receita lançada como totalmente a receber", () => {
    const shows = [gig({ id: "g1", fee: 100_00 })];
    const r = reconcileShowFees(shows, [], { now });
    expect(r.count).toBe(1);
    expect(r.rows[0].outstanding).toBe(100_00);
    expect(r.rows[0].collected).toBe(0);
    expect(r.rows[0].registeredPending).toBe(0);
    expect(r.rows[0].unregistered).toBe(true);
    expect(r.totalOutstanding).toBe(100_00);
    expect(r.totalFee).toBe(100_00);
    expect(r.totalCollected).toBe(0);
  });

  it("considera só a receita recebida no abatimento (pendente não reduz o saldo)", () => {
    const shows = [gig({ id: "g1", fee: 100_00 })];
    const txs = [
      tx({ type: "INCOME", amount: 40_00, received: true, showId: "g1" }),
      tx({ type: "INCOME", amount: 60_00, received: false, showId: "g1" }),
    ];
    const r = reconcileShowFees(shows, txs, { now });
    expect(r.rows[0].collected).toBe(40_00);
    expect(r.rows[0].registeredPending).toBe(60_00);
    expect(r.rows[0].outstanding).toBe(60_00); // 100 − 40 recebidos
    expect(r.rows[0].unregistered).toBe(false);
  });

  it("omite o gig já quitado (recebido >= cachê) e nunca fica negativo", () => {
    const shows = [gig({ id: "g1", fee: 100_00 })];
    const txs = [tx({ type: "INCOME", amount: 120_00, received: true, showId: "g1" })];
    const r = reconcileShowFees(shows, txs, { now });
    expect(r.count).toBe(0);
    expect(r.totalOutstanding).toBe(0);
  });

  it("inclui Confirmado com data passada, mas ignora Confirmado futuro, Proposto e Cancelado", () => {
    const shows = [
      gig({ id: "passado", status: "CONFIRMED", date: "2026-03-01T20:00:00.000Z" }),
      gig({ id: "futuro", status: "CONFIRMED", date: "2026-04-01T20:00:00.000Z" }),
      gig({ id: "proposto", status: "PROPOSED", date: "2026-03-01T20:00:00.000Z" }),
      gig({ id: "cancelado", status: "CANCELLED", date: "2026-03-01T20:00:00.000Z" }),
    ];
    const r = reconcileShowFees(shows, [], { now });
    expect(r.rows.map((row) => row.show.id)).toEqual(["passado"]);
  });

  it("ignora shows sem cachê (fee <= 0)", () => {
    const shows = [gig({ id: "g1", fee: 0 }), gig({ id: "g2", fee: 50_00 })];
    const r = reconcileShowFees(shows, [], { now });
    expect(r.rows.map((row) => row.show.id)).toEqual(["g2"]);
  });

  it("não confunde receita de outro show (filtra por showId)", () => {
    const shows = [gig({ id: "g1", fee: 100_00 })];
    const txs = [tx({ type: "INCOME", amount: 100_00, received: true, showId: "outro" })];
    const r = reconcileShowFees(shows, txs, { now });
    expect(r.rows[0].outstanding).toBe(100_00);
  });

  it("despesa vinculada não abate o cachê a receber", () => {
    const shows = [gig({ id: "g1", fee: 100_00 })];
    const txs = [tx({ type: "EXPENSE", amount: 30_00, received: true, showId: "g1" })];
    const r = reconcileShowFees(shows, txs, { now });
    expect(r.rows[0].outstanding).toBe(100_00);
  });

  it("ordena do gig mais antigo ao mais recente, desempatando por id", () => {
    const shows = [
      gig({ id: "b", date: "2026-02-10T20:00:00.000Z" }),
      gig({ id: "a", date: "2026-01-05T20:00:00.000Z" }),
      gig({ id: "c", date: "2026-02-10T20:00:00.000Z" }),
    ];
    const r = reconcileShowFees(shows, [], { now });
    expect(r.rows.map((row) => row.show.id)).toEqual(["a", "b", "c"]);
  });
});

describe("paymentPromiseStatus", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  it("classifica como 'none' quando não há data prometida", () => {
    expect(paymentPromiseStatus(null, now)).toBe("none");
    expect(paymentPromiseStatus(undefined, now)).toBe("none");
    expect(paymentPromiseStatus("", now)).toBe("none");
  });

  it("classifica como 'none' quando a data é inválida", () => {
    expect(paymentPromiseStatus("não-é-data", now)).toBe("none");
  });

  it("classifica como 'pending' quando a data prometida é hoje ou no futuro", () => {
    expect(paymentPromiseStatus("2026-03-15T00:00:00.000Z", now)).toBe("pending"); // hoje
    expect(paymentPromiseStatus("2026-03-20T00:00:00.000Z", now)).toBe("pending"); // futuro
  });

  it("classifica como 'broken' quando a data prometida já passou", () => {
    expect(paymentPromiseStatus("2026-03-14T00:00:00.000Z", now)).toBe("broken");
    expect(paymentPromiseStatus(new Date("2026-01-01T00:00:00.000Z"), now)).toBe("broken");
  });

  it("compara por dia UTC, ignorando a hora do dia", () => {
    // prometido para hoje, mas às 23h — ainda é 'pending' (não passou o dia)
    expect(paymentPromiseStatus("2026-03-15T23:59:00.000Z", now)).toBe("pending");
  });
});

describe("summarizePaymentPromises", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  function gig(partial: Partial<PromisableShowLike>): PromisableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-02-01T20:00:00.000Z",
      ...partial,
    };
  }

  it("separa promessas furadas das no prazo, com totais por grupo", () => {
    const shows = [
      gig({ id: "furada", paymentPromisedAt: "2026-03-10T00:00:00.000Z" }), // passou
      gig({ id: "noprazo", paymentPromisedAt: "2026-03-20T00:00:00.000Z" }), // futuro
      gig({ id: "sempromessa" }), // ignorada
    ];
    const summary = summarizePaymentPromises(reconcileShowFees(shows, [], { now }).rows, now);
    expect(summary.brokenCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.broken.map((e) => e.row.show.id)).toEqual(["furada"]);
    expect(summary.pending.map((e) => e.row.show.id)).toEqual(["noprazo"]);
    expect(summary.brokenOutstanding).toBe(100_00);
    expect(summary.pendingOutstanding).toBe(100_00);
  });

  it("desconta o já recebido no total da promessa (usa o saldo em aberto)", () => {
    const shows = [gig({ id: "furada", fee: 100_00, paymentPromisedAt: "2026-03-10T00:00:00.000Z" })];
    const txs = [tx({ type: "INCOME", amount: 30_00, received: true, showId: "furada" })];
    const summary = summarizePaymentPromises(reconcileShowFees(shows, txs, { now }).rows, now);
    expect(summary.brokenOutstanding).toBe(70_00);
  });

  it("ordena as furadas da data prometida mais antiga à mais recente", () => {
    const shows = [
      gig({ id: "b", paymentPromisedAt: "2026-03-12T00:00:00.000Z" }),
      gig({ id: "a", paymentPromisedAt: "2026-03-05T00:00:00.000Z" }),
      gig({ id: "c", paymentPromisedAt: "2026-03-12T00:00:00.000Z" }),
    ];
    const summary = summarizePaymentPromises(reconcileShowFees(shows, [], { now }).rows, now);
    expect(summary.broken.map((e) => e.row.show.id)).toEqual(["a", "b", "c"]);
  });

  it("retorna grupos vazios quando nenhum recebível tem promessa", () => {
    const shows = [gig({ id: "g1" }), gig({ id: "g2" })];
    const summary = summarizePaymentPromises(reconcileShowFees(shows, [], { now }).rows, now);
    expect(summary.brokenCount).toBe(0);
    expect(summary.pendingCount).toBe(0);
    expect(summary.brokenOutstanding).toBe(0);
    expect(summary.pendingOutstanding).toBe(0);
  });
});

describe("receivablesAwaitingPromise", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  function gig(partial: Partial<PromisableShowLike>): PromisableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-02-01T20:00:00.000Z", // 42 dias antes de "now"
      ...partial,
    };
  }

  it("lista só os vencidos além do limiar e SEM promessa", () => {
    const shows = [
      gig({ id: "velho-sem-promessa", date: "2026-02-01T00:00:00.000Z" }), // 42 dias
      gig({ id: "com-promessa", paymentPromisedAt: "2026-03-10T00:00:00.000Z" }), // tem promessa → fora
      gig({ id: "recente-sem-promessa", date: "2026-03-01T00:00:00.000Z" }), // 14 dias → abaixo do limiar
    ];
    const list = receivablesAwaitingPromise(reconcileShowFees(shows, [], { now }).rows, { now });
    expect(list.count).toBe(1);
    expect(list.rows.map((r) => r.row.show.id)).toEqual(["velho-sem-promessa"]);
    expect(list.totalOutstanding).toBe(100_00);
    expect(list.maxDaysOutstanding).toBe(42);
  });

  it("ordena do atraso mais longo ao mais curto (id desempata)", () => {
    const shows = [
      gig({ id: "b", date: "2026-02-05T00:00:00.000Z" }), // 38 dias
      gig({ id: "a", date: "2026-01-10T00:00:00.000Z" }), // 64 dias
      gig({ id: "c", date: "2026-02-05T00:00:00.000Z" }), // 38 dias, empata com b
    ];
    const list = receivablesAwaitingPromise(reconcileShowFees(shows, [], { now }).rows, { now });
    expect(list.rows.map((r) => r.row.show.id)).toEqual(["a", "b", "c"]);
  });

  it("usa o saldo em aberto (desconta o já recebido) no total", () => {
    const shows = [gig({ id: "g1", fee: 100_00, date: "2026-01-10T00:00:00.000Z" })];
    const txs = [tx({ type: "INCOME", amount: 30_00, received: true, showId: "g1" })];
    const list = receivablesAwaitingPromise(reconcileShowFees(shows, txs, { now }).rows, { now });
    expect(list.totalOutstanding).toBe(70_00);
  });

  it("respeita um limiar customizado de dias", () => {
    const shows = [gig({ id: "g1", date: "2026-03-01T00:00:00.000Z" })]; // 14 dias
    const rows = reconcileShowFees(shows, [], { now }).rows;
    expect(receivablesAwaitingPromise(rows, { now }).count).toBe(0); // padrão 30
    expect(receivablesAwaitingPromise(rows, { now, minDaysOutstanding: 7 }).count).toBe(1);
  });

  it("retorna lista vazia quando todos têm promessa ou estão dentro do limiar", () => {
    const shows = [
      gig({ id: "com-promessa", paymentPromisedAt: "2026-03-20T00:00:00.000Z" }),
      gig({ id: "recente", date: "2026-03-10T00:00:00.000Z" }), // 5 dias
    ];
    const list = receivablesAwaitingPromise(reconcileShowFees(shows, [], { now }).rows, { now });
    expect(list.count).toBe(0);
    expect(list.totalOutstanding).toBe(0);
    expect(list.maxDaysOutstanding).toBe(0);
  });

  it("expõe o limiar padrão de 30 dias", () => {
    expect(AWAITING_PROMISE_MIN_DAYS).toBe(30);
  });
});

describe("awaitingPromiseHeadline", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  function gig(partial: Partial<PromisableShowLike>): PromisableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-02-01T00:00:00.000Z", // 42 dias antes de "now"
      ...partial,
    };
  }

  function headlineFor(shows: PromisableShowLike[]) {
    const report = receivablesAwaitingPromise(
      reconcileShowFees(shows, [], { now }).rows,
      { now },
    );
    return awaitingPromiseHeadline(report);
  }

  it("não dispara quando não há recebível sem promessa além do limiar", () => {
    const head = headlineFor([
      gig({ id: "com-promessa", paymentPromisedAt: "2026-03-20T00:00:00.000Z" }),
      gig({ id: "recente", date: "2026-03-10T00:00:00.000Z" }), // 5 dias
    ]);
    expect(head.show).toBe(false);
    expect(head.critical).toBe(false);
    expect(head.count).toBe(0);
    expect(head.totalOutstanding).toBe(0);
    expect(head.maxDaysOutstanding).toBe(0);
  });

  it("dispara (não crítico) com recebível sem promessa além do limiar mas abaixo de 90 dias", () => {
    const head = headlineFor([
      gig({ id: "velho-sem-promessa", date: "2026-02-01T00:00:00.000Z" }), // 42 dias
    ]);
    expect(head.show).toBe(true);
    expect(head.critical).toBe(false);
    expect(head.count).toBe(1);
    expect(head.totalOutstanding).toBe(100_00);
    expect(head.maxDaysOutstanding).toBe(42);
  });

  it("vira crítico quando o mais antigo já passou de 90 dias", () => {
    const head = headlineFor([
      gig({ id: "gelado", date: "2025-12-01T00:00:00.000Z" }), // 104 dias
    ]);
    expect(head.show).toBe(true);
    expect(head.critical).toBe(true);
    expect(head.maxDaysOutstanding).toBe(104);
  });

  it("soma o total e reporta o maior atraso do grupo", () => {
    const head = headlineFor([
      gig({ id: "a", fee: 100_00, date: "2026-01-10T00:00:00.000Z" }), // 64 dias
      gig({ id: "b", fee: 50_00, date: "2026-02-05T00:00:00.000Z" }), // 38 dias
    ]);
    expect(head.count).toBe(2);
    expect(head.totalOutstanding).toBe(150_00);
    expect(head.maxDaysOutstanding).toBe(64);
    expect(head.critical).toBe(false);
  });

  it("respeita um limiar crítico customizado", () => {
    const report = receivablesAwaitingPromise(
      reconcileShowFees([gig({ id: "g1", date: "2026-02-01T00:00:00.000Z" })], [], { now }).rows,
      { now },
    ); // 42 dias
    expect(awaitingPromiseHeadline(report).critical).toBe(false); // padrão 90
    expect(awaitingPromiseHeadline(report, { criticalDays: 30 }).critical).toBe(true);
  });

  it("expõe o limiar crítico padrão de 90 dias", () => {
    expect(AWAITING_PROMISE_CRITICAL_DAYS).toBe(90);
  });
});

describe("promisesDueSoonHeadline", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");

  function gig(partial: Partial<PromisableShowLike>): PromisableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-02-01T00:00:00.000Z",
      ...partial,
    };
  }

  function headlineFor(
    shows: PromisableShowLike[],
    opts: { withinDays?: number } = {},
  ) {
    const summary = summarizePaymentPromises(
      reconcileShowFees(shows, [], { now }).rows,
      now,
    );
    return promisesDueSoonHeadline(summary, { now, ...opts });
  }

  it("não dispara quando não há promessa no prazo dentro da janela", () => {
    const head = headlineFor([
      gig({ id: "furada", paymentPromisedAt: "2026-03-10T00:00:00.000Z" }), // passou
      gig({ id: "distante", paymentPromisedAt: "2026-04-10T00:00:00.000Z" }), // 26 dias
      gig({ id: "sem-promessa" }), // ignorada
    ]);
    expect(head.show).toBe(false);
    expect(head.count).toBe(0);
    expect(head.totalOutstanding).toBe(0);
    expect(head.nextDays).toBe(0);
    expect(head.maxDays).toBe(0);
  });

  it("conta as promessas no prazo que vencem dentro da janela e soma o saldo em aberto", () => {
    const head = headlineFor([
      gig({ id: "a", fee: 100_00, paymentPromisedAt: "2026-03-17T00:00:00.000Z" }), // 2 dias
      gig({ id: "b", fee: 50_00, paymentPromisedAt: "2026-03-20T00:00:00.000Z" }), // 5 dias
      gig({ id: "fora", paymentPromisedAt: "2026-03-25T00:00:00.000Z" }), // 10 dias → fora
    ]);
    expect(head.show).toBe(true);
    expect(head.count).toBe(2);
    expect(head.totalOutstanding).toBe(150_00);
    expect(head.nextDays).toBe(2);
    expect(head.maxDays).toBe(5);
  });

  it("desconta o já recebido no total (usa o saldo em aberto)", () => {
    const summary = summarizePaymentPromises(
      reconcileShowFees(
        [gig({ id: "a", fee: 100_00, paymentPromisedAt: "2026-03-18T00:00:00.000Z" })],
        [tx({ type: "INCOME", amount: 40_00, received: true, showId: "a" })],
        { now },
      ).rows,
      now,
    );
    const head = promisesDueSoonHeadline(summary, { now });
    expect(head.count).toBe(1);
    expect(head.totalOutstanding).toBe(60_00);
  });

  it("inclui a promessa que vence hoje (nextDays 0) e a que fecha a janela", () => {
    const head = headlineFor([
      gig({ id: "hoje", paymentPromisedAt: "2026-03-15T00:00:00.000Z" }), // 0 dias
      gig({ id: "limite", paymentPromisedAt: "2026-03-22T00:00:00.000Z" }), // 7 dias
    ]);
    expect(head.count).toBe(2);
    expect(head.nextDays).toBe(0);
    expect(head.maxDays).toBe(7);
  });

  it("respeita uma janela customizada", () => {
    const shows = [
      gig({ id: "a", paymentPromisedAt: "2026-03-20T00:00:00.000Z" }), // 5 dias
      gig({ id: "b", paymentPromisedAt: "2026-03-25T00:00:00.000Z" }), // 10 dias
    ];
    expect(headlineFor(shows, { withinDays: 3 }).count).toBe(0);
    expect(headlineFor(shows, { withinDays: 7 }).count).toBe(1);
    expect(headlineFor(shows, { withinDays: 14 }).count).toBe(2);
  });

  it("expõe a janela padrão de 7 dias", () => {
    expect(PROMISE_DUE_SOON_DAYS).toBe(7);
  });
});

describe("awaitingPromiseByContact", () => {
  const now = new Date("2026-04-01T12:00:00.000Z");

  interface Contact {
    id: string;
    name: string;
  }
  type ShowWithPayer = PromisableShowLike & { payer: Contact | null };
  const getPayer = (s: ShowWithPayer) => s.payer;

  function gig(partial: Partial<ShowWithPayer>): ShowWithPayer {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-01T00:00:00.000Z", // 90 dias antes de "now"
      payer: null,
      ...partial,
    };
  }

  const rowsOf = (shows: ShowWithPayer[]) =>
    reconcileShowFees(shows, [], { now }).rows;

  it("retorna vazio quando não há cobrança sem promessa além do limiar", () => {
    const a = { id: "a", name: "Bar A" };
    const shows = [
      gig({ id: "com-promessa", payer: a, paymentPromisedAt: "2026-04-10T00:00:00.000Z" }),
      gig({ id: "recente", payer: a, date: "2026-03-25T00:00:00.000Z" }), // 7 dias → dentro do limiar
    ];
    const r = awaitingPromiseByContact(rowsOf(shows), getPayer, { now });
    expect(r.rows).toEqual([]);
    expect(r.count).toBe(0);
    expect(r.totalOutstanding).toBe(0);
    expect(r.contactCount).toBe(0);
    expect(r.topContact).toBeNull();
  });

  it("agrupa a cobrança sem promessa por contratante, do maior saldo ao menor", () => {
    const a = { id: "a", name: "Bar A" };
    const b = { id: "b", name: "Bar B" };
    const shows = [
      gig({ id: "x", fee: 100_00, payer: b }),
      gig({ id: "y", fee: 300_00, payer: a }),
    ];
    const r = awaitingPromiseByContact(rowsOf(shows), getPayer, { now });
    expect(r.rows.map((row) => row.contact?.id)).toEqual(["a", "b"]);
    expect(r.count).toBe(2);
    expect(r.totalOutstanding).toBe(400_00);
    expect(r.contactCount).toBe(2);
    expect(r.topContact!.contact!.id).toBe("a");
    expect(r.rows[0].totalOutstanding).toBe(300_00);
  });

  it("exclui quem tem promessa e quem está dentro do limiar, usando o saldo em aberto", () => {
    const a = { id: "a", name: "Bar A" };
    const txs = [tx({ type: "INCOME", amount: 40_00, received: true, showId: "sem-promessa" })];
    const shows = [
      gig({ id: "sem-promessa", fee: 100_00, payer: a }), // 90 dias, sem promessa → entra (60,00)
      gig({ id: "com-promessa", fee: 500_00, payer: a, paymentPromisedAt: "2026-04-10T00:00:00.000Z" }),
      gig({ id: "recente", fee: 500_00, payer: a, date: "2026-03-25T00:00:00.000Z" }), // 7 dias → fora
    ];
    const r = awaitingPromiseByContact(reconcileShowFees(shows, txs, { now }).rows, getPayer, { now });
    expect(r.count).toBe(1);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].totalOutstanding).toBe(60_00);
    expect(r.rows[0].rows.map((s) => s.row.show.id)).toEqual(["sem-promessa"]);
  });

  it("guarda o pior atraso e ordena os cachês do grupo do mais longo ao mais curto (id desempata)", () => {
    const a = { id: "a", name: "Bar A" };
    const shows = [
      gig({ id: "recente", fee: 100_00, payer: a, date: "2026-03-01T00:00:00.000Z" }), // 31 dias
      gig({ id: "antigo", fee: 100_00, payer: a, date: "2026-01-10T00:00:00.000Z" }), // 81 dias
      gig({ id: "medio", fee: 100_00, payer: a, date: "2026-02-01T00:00:00.000Z" }), // 59 dias
    ];
    const r = awaitingPromiseByContact(rowsOf(shows), getPayer, { now });
    const row = r.rows[0];
    expect(row.maxDaysOutstanding).toBe(81);
    expect(row.rows.map((s) => s.row.show.id)).toEqual(["antigo", "medio", "recente"]);
  });

  it("joga shows sem contratante para o grupo nulo (sempre por último) e o ignora em contactCount/topContact", () => {
    const dono = { id: "d", name: "Contratante" };
    const shows = [
      // órfão deve mais e está mais atrasado, ainda assim vai por último.
      gig({ id: "orfao", fee: 900_00, payer: null, date: "2026-01-01T00:00:00.000Z" }),
      gig({ id: "comdono", fee: 100_00, payer: dono }),
    ];
    const r = awaitingPromiseByContact(rowsOf(shows), getPayer, { now });
    expect(r.rows.map((row) => row.contact?.id ?? null)).toEqual(["d", null]);
    expect(r.contactCount).toBe(1); // exclui o grupo nulo
    expect(r.topContact!.contact!.id).toBe("d");
    expect(r.count).toBe(2);
    expect(r.totalOutstanding).toBe(1000_00);
  });

  it("desempata pelo atraso mais longo quando o saldo sem promessa é igual", () => {
    const a = { id: "a", name: "Bar A" };
    const b = { id: "b", name: "Bar B" };
    const shows = [
      gig({ id: "x", fee: 200_00, payer: a, date: "2026-02-20T00:00:00.000Z" }), // 40 dias
      gig({ id: "y", fee: 200_00, payer: b, date: "2026-01-05T00:00:00.000Z" }), // 86 dias
    ];
    const r = awaitingPromiseByContact(rowsOf(shows), getPayer, { now });
    // mesmo saldo (200,00); b está mais atrasado, então vem primeiro.
    expect(r.rows.map((row) => row.contact?.id)).toEqual(["b", "a"]);
    expect(r.topContact!.contact!.id).toBe("b");
  });

  it("respeita um limiar customizado de dias", () => {
    const a = { id: "a", name: "Bar A" };
    const shows = [gig({ id: "g1", payer: a, date: "2026-03-18T00:00:00.000Z" })]; // 14 dias
    const rows = rowsOf(shows);
    expect(awaitingPromiseByContact(rows, getPayer, { now }).count).toBe(0); // padrão 30
    expect(
      awaitingPromiseByContact(rows, getPayer, { now, minDaysOutstanding: 7 }).count,
    ).toBe(1);
  });
});

describe("resolvePromiseDate", () => {
  it("retorna null para vazio/ausente/inválido (limpar a promessa)", () => {
    expect(resolvePromiseDate(null)).toBeNull();
    expect(resolvePromiseDate(undefined)).toBeNull();
    expect(resolvePromiseDate("")).toBeNull();
    expect(resolvePromiseDate("31/12/2026")).toBeNull();
  });

  it("converte 'YYYY-MM-DD' para a meia-noite UTC daquele dia", () => {
    const d = resolvePromiseDate("2026-04-10");
    expect(d?.toISOString()).toBe("2026-04-10T00:00:00.000Z");
  });

  it("aceita data no futuro (uma promessa é, por natureza, futura)", () => {
    const d = resolvePromiseDate("2030-01-01");
    expect(d?.toISOString()).toBe("2030-01-01T00:00:00.000Z");
  });
});

describe("bucketReceivablesByAge", () => {
  const now = new Date("2026-04-01T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-15T20:00:00.000Z",
      ...partial,
    };
  }

  it("classifica cada recebível no balde certo pela idade do atraso", () => {
    const shows = [
      gig({ id: "novo", date: "2026-03-20T00:00:00.000Z" }), // 12 dias → d30
      gig({ id: "meio", date: "2026-02-15T00:00:00.000Z" }), // 45 dias → d60
      gig({ id: "tres", date: "2026-01-20T00:00:00.000Z" }), // 71 dias → d90
      gig({ id: "velho", date: "2025-10-01T00:00:00.000Z" }), // 182 dias → older
    ];
    const aging = bucketReceivablesByAge(reconcileShowFees(shows, [], { now }), { now });
    const byKey = Object.fromEntries(aging.buckets.map((b) => [b.key, b]));
    expect(byKey.d30.rows.map((a) => a.row.show.id)).toEqual(["novo"]);
    expect(byKey.d60.rows.map((a) => a.row.show.id)).toEqual(["meio"]);
    expect(byKey.d90.rows.map((a) => a.row.show.id)).toEqual(["tres"]);
    expect(byKey.older.rows.map((a) => a.row.show.id)).toEqual(["velho"]);
    expect(byKey.d30.rows[0].daysOutstanding).toBe(12);
  });

  it("sempre traz os 4 baldes na ordem fixa, mesmo vazios", () => {
    const aging = bucketReceivablesByAge(reconcileShowFees([], [], { now }), { now });
    expect(aging.buckets.map((b) => b.key)).toEqual(RECEIVABLE_AGE_BUCKET_ORDER);
    expect(aging.count).toBe(0);
    expect(aging.totalOutstanding).toBe(0);
    expect(aging.maxDaysOutstanding).toBe(0);
    expect(aging.weightedAvgDays).toBe(0);
    expect(aging.buckets.every((b) => b.share === 0)).toBe(true);
  });

  it("soma totais e participação (share) por balde sobre o total a receber", () => {
    const shows = [
      gig({ id: "a", fee: 100_00, date: "2026-03-25T00:00:00.000Z" }), // d30
      gig({ id: "b", fee: 300_00, date: "2025-12-01T00:00:00.000Z" }), // older
    ];
    const aging = bucketReceivablesByAge(reconcileShowFees(shows, [], { now }), { now });
    const byKey = Object.fromEntries(aging.buckets.map((b) => [b.key, b]));
    expect(aging.totalOutstanding).toBe(400_00);
    expect(byKey.d30.totalOutstanding).toBe(100_00);
    expect(byKey.d30.share).toBeCloseTo(0.25, 5);
    expect(byKey.older.share).toBeCloseTo(0.75, 5);
  });

  it("ordena dentro do balde do atraso mais longo ao mais curto", () => {
    const shows = [
      gig({ id: "menos", date: "2026-01-25T00:00:00.000Z" }), // 66 dias
      gig({ id: "mais", date: "2026-01-05T00:00:00.000Z" }), // 86 dias
    ];
    const aging = bucketReceivablesByAge(reconcileShowFees(shows, [], { now }), { now });
    const d90 = aging.buckets.find((b) => b.key === "d90")!;
    expect(d90.rows.map((a) => a.row.show.id)).toEqual(["mais", "menos"]);
  });

  it("pondera o atraso médio pelo valor em aberto e expõe o pior caso", () => {
    const shows = [
      gig({ id: "pequeno", fee: 100_00, date: "2026-03-22T00:00:00.000Z" }), // 10 dias
      gig({ id: "grande", fee: 300_00, date: "2026-02-20T00:00:00.000Z" }), // 40 dias
    ];
    const aging = bucketReceivablesByAge(reconcileShowFees(shows, [], { now }), { now });
    // (10*100 + 40*300) / 400 = (1000 + 12000)/400 = 32.5 → 33 (arredondado)
    expect(aging.weightedAvgDays).toBe(33);
    expect(aging.maxDaysOutstanding).toBe(40);
  });

  it("nunca produz atraso negativo para um show de hoje", () => {
    const shows = [gig({ id: "hoje", date: "2026-04-01T23:00:00.000Z" })];
    const aging = bucketReceivablesByAge(reconcileShowFees(shows, [], { now }), { now });
    expect(aging.buckets.find((b) => b.key === "d30")!.rows[0].daysOutstanding).toBe(0);
  });
});

describe("receivableAgeBucket", () => {
  it("mapeia as fronteiras dos baldes (30/60/90)", () => {
    expect(receivableAgeBucket(0)).toBe("d30");
    expect(receivableAgeBucket(30)).toBe("d30");
    expect(receivableAgeBucket(31)).toBe("d60");
    expect(receivableAgeBucket(60)).toBe("d60");
    expect(receivableAgeBucket(61)).toBe("d90");
    expect(receivableAgeBucket(90)).toBe("d90");
    expect(receivableAgeBucket(91)).toBe("older");
  });
});

describe("paymentSpeedBucket", () => {
  it("mapeia as fronteiras dos baldes (0/7/30/60)", () => {
    expect(paymentSpeedBucket(-5)).toBe("onTime");
    expect(paymentSpeedBucket(0)).toBe("onTime");
    expect(paymentSpeedBucket(1)).toBe("d7");
    expect(paymentSpeedBucket(7)).toBe("d7");
    expect(paymentSpeedBucket(8)).toBe("d30");
    expect(paymentSpeedBucket(30)).toBe("d30");
    expect(paymentSpeedBucket(31)).toBe("d60");
    expect(paymentSpeedBucket(60)).toBe("d60");
    expect(paymentSpeedBucket(61)).toBe("slow");
  });
});

describe("paymentLag", () => {
  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T20:00:00.000Z",
      ...partial,
    };
  }

  it("retorna vazio sem recebimentos vinculados", () => {
    const r = paymentLag([gig({})], []);
    expect(r.showCount).toBe(0);
    expect(r.paymentCount).toBe(0);
    expect(r.totalReceived).toBe(0);
    expect(r.avgDays).toBe(0);
    expect(r.fastest).toBeNull();
    expect(r.slowest).toBeNull();
    expect(r.buckets.map((b) => b.key)).toEqual(PAYMENT_SPEED_BUCKET_ORDER);
    expect(r.buckets.every((b) => b.count === 0 && b.share === 0)).toBe(true);
  });

  it("calcula o prazo de um show: dias entre o show e o pagamento", () => {
    const shows = [gig({ id: "g1", date: "2026-03-01T20:00:00.000Z" })];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "g1", date: "2026-03-11T09:00:00.000Z" }),
    ];
    const r = paymentLag(shows, txs);
    expect(r.showCount).toBe(1);
    expect(r.paymentCount).toBe(1);
    expect(r.totalReceived).toBe(100_00);
    expect(r.rows[0].avgDays).toBe(10);
    expect(r.rows[0].lastDays).toBe(10);
    expect(r.rows[0].bucket).toBe("d30");
    expect(r.avgDays).toBe(10);
  });

  it("pondera o prazo do show pelo valor de cada recebimento (média ponderada)", () => {
    // 80% pago em 5 dias, 20% pago em 55 dias → média ponderada = 15 dias.
    const shows = [gig({ id: "g1", date: "2026-03-01T00:00:00.000Z" })];
    const txs = [
      tx({ type: "INCOME", amount: 80_00, received: true, showId: "g1", date: "2026-03-06T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 20_00, received: true, showId: "g1", date: "2026-04-25T00:00:00.000Z" }),
    ];
    const r = paymentLag(shows, txs);
    expect(r.rows[0].paymentCount).toBe(2);
    expect(r.rows[0].received).toBe(100_00);
    expect(r.rows[0].avgDays).toBe(15);
    expect(r.rows[0].lastDays).toBe(55);
    expect(r.rows[0].bucket).toBe("d30");
  });

  it("trata pagamento adiantado como prazo negativo (balde 'no dia ou adiantado')", () => {
    const shows = [gig({ id: "g1", date: "2026-03-10T00:00:00.000Z" })];
    const txs = [
      tx({ type: "INCOME", amount: 50_00, received: true, showId: "g1", date: "2026-03-04T00:00:00.000Z" }),
    ];
    const r = paymentLag(shows, txs);
    expect(r.rows[0].avgDays).toBe(-6);
    expect(r.rows[0].bucket).toBe("onTime");
    expect(r.buckets.find((b) => b.key === "onTime")!.count).toBe(1);
  });

  it("ignora pendente, despesa, sem showId e show cancelado", () => {
    const shows = [
      gig({ id: "ok", date: "2026-03-01T00:00:00.000Z" }),
      gig({ id: "cancel", status: "CANCELLED", date: "2026-03-01T00:00:00.000Z" }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "ok", date: "2026-03-06T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: false, showId: "ok", date: "2026-03-06T00:00:00.000Z" }), // pendente
      tx({ type: "EXPENSE", amount: 30_00, received: true, showId: "ok", date: "2026-03-06T00:00:00.000Z" }), // despesa
      tx({ type: "INCOME", amount: 90_00, received: true, showId: null, date: "2026-03-06T00:00:00.000Z" }), // sem show
      tx({ type: "INCOME", amount: 70_00, received: true, showId: "cancel", date: "2026-03-06T00:00:00.000Z" }), // cancelado
    ];
    const r = paymentLag(shows, txs);
    expect(r.showCount).toBe(1);
    expect(r.paymentCount).toBe(1);
    expect(r.totalReceived).toBe(100_00);
    expect(r.rows[0].show.id).toBe("ok");
  });

  it("ordena do mais lento ao mais rápido e expõe fastest/slowest e o DSO global ponderado", () => {
    const shows = [
      gig({ id: "rapido", date: "2026-03-01T00:00:00.000Z" }),
      gig({ id: "lento", date: "2026-03-01T00:00:00.000Z" }),
    ];
    const txs = [
      // rápido: 200,00 em 5 dias; lento: 100,00 em 35 dias.
      tx({ type: "INCOME", amount: 200_00, received: true, showId: "rapido", date: "2026-03-06T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "lento", date: "2026-04-05T00:00:00.000Z" }),
    ];
    const r = paymentLag(shows, txs);
    expect(r.rows.map((x) => x.show.id)).toEqual(["lento", "rapido"]);
    expect(r.slowest!.show.id).toBe("lento");
    expect(r.fastest!.show.id).toBe("rapido");
    // DSO ponderado: (35*100 + 5*200) / 300 = 4500/300 = 15.
    expect(r.avgDays).toBe(15);
    // Participação por valor: rápido 200/300, lento 100/300.
    const slow = r.buckets.find((b) => b.key === "d60")!;
    expect(slow.received).toBe(100_00);
    expect(slow.share).toBeCloseTo(1 / 3, 5);
  });

  it("expõe a mediana ponderada; vazio → 0 e um único show → o próprio prazo", () => {
    expect(paymentLag([gig({})], []).medianDays).toBe(0);
    const shows = [gig({ id: "g1", date: "2026-03-01T00:00:00.000Z" })];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "g1", date: "2026-03-11T00:00:00.000Z" }),
    ];
    expect(paymentLag(shows, txs).medianDays).toBe(10);
  });

  it("mediana resiste a um show muito atrasado que infla a média (DSO)", () => {
    // 3 shows pagos em 10 dias + 1 show pago em 90 dias, todos R$ 100,00.
    const shows = ["a", "b", "c", "d"].map((id) =>
      gig({ id, date: "2026-03-01T00:00:00.000Z" }),
    );
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "c", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "d", date: "2026-05-30T00:00:00.000Z" }), // 90 d
    ];
    const r = paymentLag(shows, txs);
    // Média ponderada = (10+10+10+90)/4 = 30; mediana fica nos 10 dias típicos.
    expect(r.avgDays).toBe(30);
    expect(r.medianDays).toBe(10);
  });

  it("a mediana é ponderada pelo valor: o recebimento grande puxa o ponto médio", () => {
    // R$ 300,00 em 10 dias e R$ 100,00 em 50 dias → metade do valor já entrou aos 10 d.
    const shows = [
      gig({ id: "grande", date: "2026-03-01T00:00:00.000Z" }),
      gig({ id: "pequeno", date: "2026-03-01T00:00:00.000Z" }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 300_00, received: true, showId: "grande", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "pequeno", date: "2026-04-20T00:00:00.000Z" }), // 50 d
    ];
    const r = paymentLag(shows, txs);
    expect(r.avgDays).toBe(20); // (10*300 + 50*100)/400
    expect(r.medianDays).toBe(10);
  });
});

describe("paymentLagYears", () => {
  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T20:00:00.000Z",
      ...partial,
    };
  }

  it("retorna vazio sem recebimentos vinculados", () => {
    expect(paymentLagYears([gig({})], [])).toEqual([]);
  });

  it("lista os anos (UTC, desc) só dos shows que já receberam algo", () => {
    const shows = [
      gig({ id: "a", date: "2024-05-10T20:00:00.000Z" }),
      gig({ id: "b", date: "2025-08-01T20:00:00.000Z" }),
      gig({ id: "sem-pgto", date: "2026-01-01T20:00:00.000Z" }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2024-05-20T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2025-08-05T00:00:00.000Z" }),
    ];
    // 2026 não entra: o show desse ano não recebeu nada (seria opção vazia).
    expect(paymentLagYears(shows, txs)).toEqual([2025, 2024]);
  });

  it("deduplica e usa o ano UTC da data do show (não o do pagamento)", () => {
    const shows = [
      gig({ id: "a", date: "2025-01-01T00:00:00.000Z" }),
      gig({ id: "b", date: "2025-12-31T23:00:00.000Z" }), // UTC ainda 2025
    ];
    const txs = [
      // Pagamento no ano seguinte não muda o ano do seletor (âncora = show).
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-02-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-01-10T00:00:00.000Z" }),
    ];
    expect(paymentLagYears(shows, txs)).toEqual([2025]);
  });

  it("ignora shows cancelados e recebimentos não qualificáveis", () => {
    const shows = [
      gig({ id: "cancelado", status: "CANCELLED", date: "2024-06-01T20:00:00.000Z" }),
      gig({ id: "nao-recebido", date: "2023-06-01T20:00:00.000Z" }),
      gig({ id: "despesa", date: "2022-06-01T20:00:00.000Z" }),
      gig({ id: "ok", date: "2025-06-01T20:00:00.000Z" }),
    ];
    const txs = [
      // recebimento de show cancelado: não conta
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "cancelado", date: "2024-06-10T00:00:00.000Z" }),
      // ainda não recebido (received=false): não conta
      tx({ type: "INCOME", amount: 100_00, received: false, showId: "nao-recebido", date: "2023-06-10T00:00:00.000Z" }),
      // despesa vinculada: não conta
      tx({ type: "EXPENSE", amount: 100_00, received: true, showId: "despesa", date: "2022-06-10T00:00:00.000Z" }),
      // recebimento válido
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "ok", date: "2025-06-10T00:00:00.000Z" }),
    ];
    expect(paymentLagYears(shows, txs)).toEqual([2025]);
  });
});

describe("comparePaymentLag", () => {
  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T00:00:00.000Z",
      ...partial,
    };
  }

  // Constrói um `paymentLag` de um único show pago com prazo `days` (à vista do
  // valor cheio), para montar cenários de comparação por período com facilidade.
  function lagOfDays(days: number): ReturnType<typeof paymentLag> {
    const shows = [gig({ id: `g${days}`, date: "2026-03-01T00:00:00.000Z" })];
    const pay = new Date(Date.UTC(2026, 2, 1 + days)).toISOString();
    return paymentLag(shows, [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: `g${days}`, date: pay }),
    ]);
  }

  it("descer a mediana além do limiar é melhora (o cachê entra mais cedo)", () => {
    // Anterior 40 d → atual 10 d: 30 dias mais rápido.
    const c = comparePaymentLag(lagOfDays(10), lagOfDays(40));
    expect(c.medianDaysDelta).toBe(-30);
    expect(c.avgDaysDelta).toBe(-30);
    expect(c.trend).toBe("improved");
  });

  it("subir a mediana além do limiar é piora (o caixa demora mais)", () => {
    const c = comparePaymentLag(lagOfDays(45), lagOfDays(10));
    expect(c.medianDaysDelta).toBe(35);
    expect(c.trend).toBe("worsened");
  });

  it("variação dentro do limiar é estável (ruído, sem tendência)", () => {
    // Diferença de 5 dias < 7 (o epsilon): nenhuma tendência.
    const c = comparePaymentLag(lagOfDays(15), lagOfDays(20));
    expect(c.medianDaysDelta).toBe(-5);
    expect(c.trend).toBe("stable");
  });

  it("o limiar é inclusivo nas duas pontas (== epsilon já conta como tendência)", () => {
    expect(comparePaymentLag(lagOfDays(3), lagOfDays(3 + PAYMENT_LAG_TREND_EPSILON)).trend).toBe(
      "improved",
    );
    expect(comparePaymentLag(lagOfDays(3 + PAYMENT_LAG_TREND_EPSILON), lagOfDays(3)).trend).toBe(
      "worsened",
    );
  });

  it("preserva as referências aos dois períodos e usa a mediana (não a média) no veredito", () => {
    // Atual: mediana 10 d (resiste ao show atrasado), média inflada; anterior: 10 d cravados.
    const shows = ["a", "b", "c", "slow"].map((id) => gig({ id, date: "2026-03-01T00:00:00.000Z" }));
    const current = paymentLag(shows, [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "c", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "slow", date: "2026-06-09T00:00:00.000Z" }), // 100 d
    ]);
    const previous = lagOfDays(10);
    const c = comparePaymentLag(current, previous);
    expect(c.current).toBe(current);
    expect(c.previous).toBe(previous);
    // Mediana igual (10 vs 10) → estável, ainda que a MÉDIA tenha subido muito.
    expect(c.medianDaysDelta).toBe(0);
    expect(c.avgDaysDelta).toBeGreaterThan(PAYMENT_LAG_TREND_EPSILON);
    expect(c.trend).toBe("stable");
  });
});

describe("paymentLagHeadline", () => {
  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T20:00:00.000Z",
      ...partial,
    };
  }

  it("não mostra sem recebimento algum", () => {
    const h = paymentLagHeadline(paymentLag([gig({})], []));
    expect(h.show).toBe(false);
    expect(h.avgDays).toBe(0);
    expect(h.medianDays).toBe(0);
    expect(h.showCount).toBe(0);
  });

  it("não mostra com um único show pago (amostra insuficiente)", () => {
    const shows = [gig({ id: "g1", date: "2026-03-01T00:00:00.000Z" })];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "g1", date: "2026-03-11T00:00:00.000Z" }),
    ];
    const h = paymentLagHeadline(paymentLag(shows, txs));
    expect(h.show).toBe(false);
    expect(h.showCount).toBe(1);
  });

  it("mostra a partir de dois shows pagos, com DSO médio, mediano e balde", () => {
    const shows = [
      gig({ id: "a", date: "2026-03-01T00:00:00.000Z" }),
      gig({ id: "b", date: "2026-03-01T00:00:00.000Z" }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-11T00:00:00.000Z" }), // 10 d
    ];
    const h = paymentLagHeadline(paymentLag(shows, txs));
    expect(h.show).toBe(true);
    expect(h.avgDays).toBe(10);
    expect(h.medianDays).toBe(10);
    expect(h.bucket).toBe("d30");
    expect(h.showCount).toBe(2);
    expect(h.skewed).toBe(false);
  });

  it("sinaliza assimetria quando um show muito atrasado infla a média", () => {
    // 3 shows em 10 d + 1 em 90 d → média 30, mediana 10 (diferença ≥ 7).
    const shows = ["a", "b", "c", "d"].map((id) =>
      gig({ id, date: "2026-03-01T00:00:00.000Z" }),
    );
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-11T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-11T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "c", date: "2026-03-11T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "d", date: "2026-05-30T00:00:00.000Z" }),
    ];
    const h = paymentLagHeadline(paymentLag(shows, txs));
    expect(h.avgDays).toBe(30);
    expect(h.medianDays).toBe(10);
    expect(h.skewed).toBe(true);
  });

  it("derruba a assimetria quando média e mediana ficam próximas (< 7 dias)", () => {
    const shows = [
      gig({ id: "a", date: "2026-03-01T00:00:00.000Z" }),
      gig({ id: "b", date: "2026-03-01T00:00:00.000Z" }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-11T00:00:00.000Z" }), // 10 d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-13T00:00:00.000Z" }), // 12 d
    ];
    const h = paymentLagHeadline(paymentLag(shows, txs));
    expect(h.skewed).toBe(false);
  });
});

describe("paymentLagByContact", () => {
  interface Contact {
    id: string;
    name: string;
  }
  type ShowWithPayer = ReceivableShowLike & { payer: Contact | null };
  const getPayer = (s: ShowWithPayer) => s.payer;

  function gig(partial: Partial<ShowWithPayer>): ShowWithPayer {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T00:00:00.000Z",
      payer: null,
      ...partial,
    };
  }

  it("retorna vazio sem recebimentos", () => {
    const r = paymentLagByContact([gig({})], [], getPayer);
    expect(r.rows).toEqual([]);
    expect(r.contactCount).toBe(0);
    expect(r.totalReceived).toBe(0);
    expect(r.avgDays).toBe(0);
    expect(r.slowest).toBeNull();
    expect(r.fastest).toBeNull();
  });

  it("agrupa vários shows do mesmo contratante e pondera o prazo pelo valor", () => {
    const ze = { id: "ze", name: "Bar do Zé" };
    const shows = [
      gig({ id: "a", date: "2026-03-01T00:00:00.000Z", payer: ze }),
      gig({ id: "b", date: "2026-03-01T00:00:00.000Z", payer: ze }),
    ];
    const txs = [
      // a: 200,00 em 5 dias; b: 100,00 em 35 dias → ponderado (5*200+35*100)/300 = 15.
      tx({ type: "INCOME", amount: 200_00, received: true, showId: "a", date: "2026-03-06T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-04-05T00:00:00.000Z" }),
    ];
    const r = paymentLagByContact(shows, txs, getPayer);
    expect(r.contactCount).toBe(1);
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0];
    expect(row.contact).toBe(ze);
    expect(row.showCount).toBe(2);
    expect(row.paymentCount).toBe(2);
    expect(row.received).toBe(300_00);
    expect(row.avgDays).toBe(15);
    expect(row.lastDays).toBe(35);
    expect(row.bucket).toBe("d30");
    expect(row.share).toBeCloseTo(1, 5);
  });

  it("ordena os contratantes do mais lento ao mais rápido com slowest/fastest", () => {
    const rapido = { id: "r", name: "Paga Rápido" };
    const lento = { id: "l", name: "Paga Devagar" };
    const shows = [
      gig({ id: "a", date: "2026-03-01T00:00:00.000Z", payer: rapido }),
      gig({ id: "b", date: "2026-03-01T00:00:00.000Z", payer: lento }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-06T00:00:00.000Z" }), // 5d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-04-10T00:00:00.000Z" }), // 40d
    ];
    const r = paymentLagByContact(shows, txs, getPayer);
    expect(r.rows.map((x) => x.contact?.id)).toEqual(["l", "r"]);
    expect(r.slowest!.contact!.id).toBe("l");
    expect(r.fastest!.contact!.id).toBe("r");
    expect(r.rows[0].share).toBeCloseTo(0.5, 5);
  });

  it("joga os shows sem contratante para o grupo nulo, sempre por último", () => {
    const dono = { id: "d", name: "Contratante" };
    const shows = [
      // sem payer, prazo bem mais lento — ainda assim vai por último.
      gig({ id: "orfao", date: "2026-03-01T00:00:00.000Z", payer: null }),
      gig({ id: "comdono", date: "2026-03-01T00:00:00.000Z", payer: dono }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "orfao", date: "2026-06-01T00:00:00.000Z" }), // ~92d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "comdono", date: "2026-03-06T00:00:00.000Z" }), // 5d
    ];
    const r = paymentLagByContact(shows, txs, getPayer);
    expect(r.rows.map((x) => x.contact?.id ?? null)).toEqual(["d", null]);
    expect(r.contactCount).toBe(1); // exclui o grupo nulo
    // slowest/fastest ignoram o grupo nulo.
    expect(r.slowest!.contact!.id).toBe("d");
    expect(r.fastest!.contact!.id).toBe("d");
  });

  it("preserva a ordenação lento→rápido dos shows dentro do grupo", () => {
    const ze = { id: "ze", name: "Bar do Zé" };
    const shows = [
      gig({ id: "rapido", date: "2026-03-01T00:00:00.000Z", payer: ze }),
      gig({ id: "lento", date: "2026-03-01T00:00:00.000Z", payer: ze }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "rapido", date: "2026-03-06T00:00:00.000Z" }), // 5d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "lento", date: "2026-04-10T00:00:00.000Z" }), // 40d
    ];
    const r = paymentLagByContact(shows, txs, getPayer);
    expect(r.rows[0].shows.map((s) => s.show.id)).toEqual(["lento", "rapido"]);
  });

  it("expõe o prazo mediano por contratante, robusto a um show muito atrasado", () => {
    const ze = { id: "ze", name: "Bar do Zé" };
    // Três shows de mesmo valor: 5d, 10d e 90d. A média ponderada (≈35d) é puxada
    // pelo outlier de 90d; a mediana (peso igual) cai no show central = 10d.
    const shows = [
      gig({ id: "a", date: "2026-03-01T00:00:00.000Z", payer: ze }),
      gig({ id: "b", date: "2026-03-01T00:00:00.000Z", payer: ze }),
      gig({ id: "c", date: "2026-03-01T00:00:00.000Z", payer: ze }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-06T00:00:00.000Z" }), // 5d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-11T00:00:00.000Z" }), // 10d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "c", date: "2026-05-30T00:00:00.000Z" }), // 90d
    ];
    const row = paymentLagByContact(shows, txs, getPayer).rows[0];
    expect(row.showCount).toBe(3);
    expect(row.medianDays).toBe(10);
    expect(row.avgDays).toBeGreaterThan(row.medianDays); // outlier infla só a média
  });

  it("media ponderada pelo valor desempata a mediana no nº par de shows", () => {
    const ze = { id: "ze", name: "Bar do Zé" };
    // Dois shows de mesmo valor: 10d e 20d. Mediana ponderada bate exatamente na
    // metade do peso entre os dois → média dos dois centrais = 15d.
    const shows = [
      gig({ id: "a", date: "2026-03-01T00:00:00.000Z", payer: ze }),
      gig({ id: "b", date: "2026-03-01T00:00:00.000Z", payer: ze }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-11T00:00:00.000Z" }), // 10d
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "b", date: "2026-03-21T00:00:00.000Z" }), // 20d
    ];
    expect(paymentLagByContact(shows, txs, getPayer).rows[0].medianDays).toBe(15);
  });

  it("o grupo sem recebimentos não aparece; mediana 0 quando computada sem peso", () => {
    // Um único show pago → mediana = o próprio prazo (a UI gateia por amostra mínima).
    const ze = { id: "ze", name: "Bar do Zé" };
    const shows = [gig({ id: "a", date: "2026-03-01T00:00:00.000Z", payer: ze })];
    const txs = [
      tx({ type: "INCOME", amount: 100_00, received: true, showId: "a", date: "2026-03-08T00:00:00.000Z" }), // 7d
    ];
    const row = paymentLagByContact(shows, txs, getPayer).rows[0];
    expect(row.showCount).toBe(1);
    expect(row.medianDays).toBe(7);
  });
});

describe("comparePaymentLagByContact", () => {
  interface Contact {
    id: string;
    name: string;
  }
  type ShowWithPayer = ReceivableShowLike & { payer: Contact | null };
  const getPayer = (s: ShowWithPayer) => s.payer;

  function gig(partial: Partial<ShowWithPayer>): ShowWithPayer {
    return {
      id: "g",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T00:00:00.000Z",
      payer: null,
      ...partial,
    };
  }

  /** Um par show+recebimento de um contratante, com prazo de `lagDays` dias. */
  function paid(id: string, payer: Contact, year: number, lagDays: number) {
    const show = gig({ id, date: `${year}-03-01T00:00:00.000Z`, payer });
    const paidDate = new Date(Date.UTC(year, 2, 1 + lagDays)).toISOString();
    const t = tx({
      type: "INCOME",
      amount: 100_00,
      received: true,
      showId: id,
      date: paidDate,
    });
    return { show, tx: t };
  }

  const ze = { id: "ze", name: "Bar do Zé" };

  it("casa por id e marca 'improved' quando o contratante passa a pagar mais rápido", () => {
    const prev = paid("p", ze, 2025, 40);
    const cur = paid("c", ze, 2026, 5);
    const c = comparePaymentLagByContact(
      paymentLagByContact([cur.show], [cur.tx], getPayer),
      paymentLagByContact([prev.show], [prev.tx], getPayer),
    );
    expect(c.changes).toHaveLength(1);
    expect(c.changes[0].contact.id).toBe("ze");
    expect(c.changes[0].avgDaysDelta).toBe(-35);
    expect(c.changes[0].trend).toBe("improved");
    expect(c.biggestImprovement?.contact.id).toBe("ze");
    expect(c.biggestWorsening).toBeNull();
    expect(c.newContacts).toEqual([]);
    expect(c.droppedContacts).toEqual([]);
  });

  it("marca 'worsened' quando desacelera e 'stable' dentro do limiar", () => {
    const worse = comparePaymentLagByContact(
      paymentLagByContact([paid("c", ze, 2026, 40).show], [paid("c", ze, 2026, 40).tx], getPayer),
      paymentLagByContact([paid("p", ze, 2025, 5).show], [paid("p", ze, 2025, 5).tx], getPayer),
    );
    expect(worse.changes[0].trend).toBe("worsened");
    expect(worse.biggestWorsening?.contact.id).toBe("ze");
    expect(worse.biggestImprovement).toBeNull();

    // Variação de 3 dias (< PAYMENT_LAG_TREND_EPSILON = 7) → estável.
    const stable = comparePaymentLagByContact(
      paymentLagByContact([paid("c", ze, 2026, 13).show], [paid("c", ze, 2026, 13).tx], getPayer),
      paymentLagByContact([paid("p", ze, 2025, 10).show], [paid("p", ze, 2025, 10).tx], getPayer),
    );
    expect(stable.changes[0].avgDaysDelta).toBe(3);
    expect(stable.changes[0].trend).toBe("stable");
    expect(stable.biggestImprovement).toBeNull();
    expect(stable.biggestWorsening).toBeNull();
  });

  it("particiona novos e sumidos e ignora o grupo sem contratante", () => {
    const antigo = { id: "antigo", name: "Antigo" };
    const novo = { id: "novo", name: "Novo" };
    // Atual: ze (também no anterior) + novo (só no atual) + um show sem payer.
    const curReport = paymentLagByContact(
      [
        paid("c1", ze, 2026, 5).show,
        paid("c2", novo, 2026, 5).show,
        gig({ id: "orfao", date: "2026-03-01T00:00:00.000Z", payer: null }),
      ],
      [
        paid("c1", ze, 2026, 5).tx,
        paid("c2", novo, 2026, 5).tx,
        tx({ type: "INCOME", amount: 100_00, received: true, showId: "orfao", date: "2026-06-01T00:00:00.000Z" }),
      ],
      getPayer,
    );
    // Anterior: ze + antigo (só no anterior).
    const prevReport = paymentLagByContact(
      [paid("p1", ze, 2025, 40).show, paid("p2", antigo, 2025, 20).show],
      [paid("p1", ze, 2025, 40).tx, paid("p2", antigo, 2025, 20).tx],
      getPayer,
    );
    const c = comparePaymentLagByContact(curReport, prevReport);
    expect(c.changes.map((x) => x.contact.id)).toEqual(["ze"]); // só quem está nos dois
    expect(c.newContacts.map((x) => x.contact?.id)).toEqual(["novo"]);
    expect(c.droppedContacts.map((x) => x.contact?.id)).toEqual(["antigo"]);
  });

  it("ordena as variações da maior piora à maior melhora e escolhe os extremos", () => {
    const acelerou = { id: "acel", name: "Acelerou" };
    const desacelerou = { id: "desac", name: "Desacelerou" };
    const cur = paymentLagByContact(
      [paid("a", acelerou, 2026, 5).show, paid("d", desacelerou, 2026, 50).show],
      [paid("a", acelerou, 2026, 5).tx, paid("d", desacelerou, 2026, 50).tx],
      getPayer,
    );
    const prev = paymentLagByContact(
      [paid("pa", acelerou, 2025, 50).show, paid("pd", desacelerou, 2025, 5).show],
      [paid("pa", acelerou, 2025, 50).tx, paid("pd", desacelerou, 2025, 5).tx],
      getPayer,
    );
    const c = comparePaymentLagByContact(cur, prev);
    // Piora (+45) no topo, melhora (−45) embaixo.
    expect(c.changes.map((x) => x.contact.id)).toEqual(["desac", "acel"]);
    expect(c.biggestWorsening?.contact.id).toBe("desac");
    expect(c.biggestImprovement?.contact.id).toBe("acel");
  });
});

describe("contactPaymentLagRiseHeadline", () => {
  interface Contact {
    id: string;
    name: string;
  }
  type ShowWithPayer = ReceivableShowLike & { payer: Contact | null };
  const getPayer = (s: ShowWithPayer) => s.payer;

  /** Um par show+recebimento de um contratante, com prazo de `lagDays` dias. */
  function paid(id: string, payer: Contact, year: number, lagDays: number) {
    const show: ShowWithPayer = {
      id,
      fee: 100_00,
      status: "PLAYED",
      date: `${year}-03-01T00:00:00.000Z`,
      payer,
    };
    const t = tx({
      type: "INCOME",
      amount: 100_00,
      received: true,
      showId: id,
      date: new Date(Date.UTC(year, 2, 1 + lagDays)).toISOString(),
    });
    return { show, tx: t };
  }

  // `n` pares show+recebimento do contratante naquele ano, todos com o mesmo prazo
  // `lagDays` (média estável e amostra confiável quando n >= MIN_MEDIAN_LAG_SAMPLE).
  const many = (id: string, payer: Contact, year: number, lagDays: number, n: number) =>
    Array.from({ length: n }, (_, i) => paid(`${id}-${year}-${i}`, payer, year, lagDays));

  const report = (pairs: ReturnType<typeof paid>[]) =>
    paymentLagByContact<Contact, ShowWithPayer>(
      pairs.map((p) => p.show),
      pairs.map((p) => p.tx),
      getPayer,
    );
  const headline = (cur: ReturnType<typeof paid>[], prev: ReturnType<typeof paid>[]) =>
    contactPaymentLagRiseHeadline(comparePaymentLagByContact(report(cur), report(prev)));

  const ze = { id: "ze", name: "Bar do Zé" };
  const ana = { id: "ana", name: "Ana" };

  it("aponta o contratante que mais desacelerou, com amostra confiável nas duas coortes", () => {
    // Zé: 2025 prazo médio 10 → 2026 prazo médio 45 (+35 dias, crítico); Ana melhora.
    const h = headline(
      [...many("ze", ze, 2026, 45, 3), ...many("ana", ana, 2026, 5, 3)],
      [...many("ze", ze, 2025, 10, 3), ...many("ana", ana, 2025, 40, 3)],
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true); // +35 dias >= 30 crítico
    expect(h.contact?.id).toBe("ze");
    expect(h.riseDays).toBe(35);
    expect(h.currentAvgDays).toBe(45);
    expect(h.previousAvgDays).toBe(10);
    expect(h).toMatchObject({ sample: 3, others: 0 });
  });

  it("ignora pioras de amostra fina e elege a maior piora CONFIÁVEL", () => {
    // Fina: piora 40 dias mas só 1 show em cada coorte → fora do gate.
    // Sólida: 20 → 45 (+25 dias) com 3 shows em cada → é a eleita.
    const fina = { id: "fina", name: "Fina" };
    const sol = { id: "sol", name: "Sólida" };
    const h = headline(
      [paid("fina", fina, 2026, 45), ...many("sol", sol, 2026, 45, 3)],
      [paid("fina", fina, 2025, 5), ...many("sol", sol, 2025, 20, 3)],
    );
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("sol");
    expect(h.riseDays).toBe(25);
    expect(h.others).toBe(0); // a fina não conta (não passa no gate)
  });

  it("conta em `others` os demais contratantes que também desaceleraram no gate", () => {
    const bar = { id: "bar", name: "Bar" };
    const h = headline(
      [
        ...many("ze", ze, 2026, 45, 3), // 5 → 45 (+40)
        ...many("bar", bar, 2026, 40, 3), // 10 → 40 (+30)
        ...many("ana", ana, 2026, 5, 3), // melhora
      ],
      [
        ...many("ze", ze, 2025, 5, 3),
        ...many("bar", bar, 2025, 10, 3),
        ...many("ana", ana, 2025, 40, 3),
      ],
    );
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("ze"); // maior piora no topo
    expect(h.others).toBe(1); // Bar também passou no gate
  });

  it("não dispara quando ninguém tem piora material e confiável", () => {
    const bar = { id: "bar", name: "Bar" };
    const h = headline(
      [...many("ze", ze, 2026, 20, 3), ...many("bar", bar, 2026, 22, 3)],
      [...many("ze", ze, 2025, 50, 3), ...many("bar", bar, 2025, 20, 3)], // Zé melhora, Bar estável (+2)
    );
    expect(h.show).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.riseDays).toBe(0);
    expect(h.others).toBe(0);
  });

  it("uma piora pequena (abaixo do piso de 14 dias) não vira nudge", () => {
    // 20 → 30 = +10 dias < PAYMENT_LAG_RISE_DAYS (14).
    const h = headline(many("ze", ze, 2026, 30, 3), many("ze", ze, 2025, 20, 3));
    expect(h.show).toBe(false);
  });

  it("respeita limiares injetáveis (amostra mínima / piso de dias / crítico)", () => {
    // Zé: 20 → 40 (+20 dias), com só 2 shows em cada coorte.
    const cmp = comparePaymentLagByContact(
      report(many("ze", ze, 2026, 40, 2)),
      report(many("ze", ze, 2025, 20, 2)),
    );
    // amostra mínima 3 não passa (só 2 shows); mínima 2 passa
    expect(contactPaymentLagRiseHeadline(cmp, 3).show).toBe(false);
    expect(contactPaymentLagRiseHeadline(cmp, 2).show).toBe(true);
    // +20 dias não é crítico no padrão (>= 30), mas vira crítico com piso afrouxado
    expect(contactPaymentLagRiseHeadline(cmp, 2).critical).toBe(false);
    expect(contactPaymentLagRiseHeadline(cmp, 2, 14, 15).critical).toBe(true);
  });
});

describe("indexContactPaymentLagChanges", () => {
  interface Contact {
    id: string;
    name: string;
  }
  type ShowWithPayer = ReceivableShowLike & { payer: Contact | null };
  const getPayer = (s: ShowWithPayer) => s.payer;

  function gig(partial: Partial<ShowWithPayer>): ShowWithPayer {
    return {
      id: "g",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T00:00:00.000Z",
      payer: null,
      ...partial,
    };
  }

  function paid(id: string, payer: Contact | null, year: number, lagDays: number) {
    const show = gig({ id, date: `${year}-03-01T00:00:00.000Z`, payer });
    const paidDate = new Date(Date.UTC(year, 2, 1 + lagDays)).toISOString();
    const t = tx({ type: "INCOME", amount: 100_00, received: true, showId: id, date: paidDate });
    return { show, tx: t };
  }

  const ze = { id: "ze", name: "Bar do Zé" };
  const novo = { id: "novo", name: "Novo" };

  it("resolve 'changed' com a variação para quem está nos dois períodos", () => {
    const cur = paymentLagByContact([paid("c", ze, 2026, 5).show], [paid("c", ze, 2026, 5).tx], getPayer);
    const prev = paymentLagByContact([paid("p", ze, 2025, 40).show], [paid("p", ze, 2025, 40).tx], getPayer);
    const lookup = indexContactPaymentLagChanges(comparePaymentLagByContact(cur, prev));
    const status = lookup("ze");
    expect(status.kind).toBe("changed");
    if (status.kind === "changed") {
      expect(status.change.avgDaysDelta).toBe(-35);
      expect(status.change.trend).toBe("improved");
    }
  });

  it("resolve 'new' para quem só existe no período atual e 'none' para o grupo sem contratante", () => {
    const cur = paymentLagByContact(
      [
        paid("c1", ze, 2026, 5).show,
        paid("c2", novo, 2026, 5).show,
        gig({ id: "orfao", date: "2026-03-01T00:00:00.000Z", payer: null }),
      ],
      [
        paid("c1", ze, 2026, 5).tx,
        paid("c2", novo, 2026, 5).tx,
        tx({ type: "INCOME", amount: 100_00, received: true, showId: "orfao", date: "2026-06-01T00:00:00.000Z" }),
      ],
      getPayer,
    );
    const prev = paymentLagByContact([paid("p", ze, 2025, 40).show], [paid("p", ze, 2025, 40).tx], getPayer);
    const lookup = indexContactPaymentLagChanges(comparePaymentLagByContact(cur, prev));
    expect(lookup("novo").kind).toBe("new");
    expect(lookup("ze").kind).toBe("changed");
    // Grupo "sem contratante" (contact null → id ausente) e ids desconhecidos: "none".
    expect(lookup(null).kind).toBe("none");
    expect(lookup(undefined).kind).toBe("none");
    expect(lookup("inexistente").kind).toBe("none");
  });
});

describe("outstandingByContact", () => {
  const now = new Date("2026-04-01T12:00:00.000Z");

  interface Contact {
    id: string;
    name: string;
  }
  type ShowWithPayer = ReceivableShowLike & { payer: Contact | null };
  const getPayer = (s: ShowWithPayer) => s.payer;

  function gig(partial: Partial<ShowWithPayer>): ShowWithPayer {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T00:00:00.000Z",
      payer: null,
      ...partial,
    };
  }

  const receivablesOf = (shows: ShowWithPayer[]) =>
    reconcileShowFees(shows, [], { now });

  it("retorna vazio quando não há nada a receber", () => {
    const r = outstandingByContact(receivablesOf([]), getPayer, { now });
    expect(r.rows).toEqual([]);
    expect(r.contactCount).toBe(0);
    expect(r.count).toBe(0);
    expect(r.totalOutstanding).toBe(0);
    expect(r.topDebtor).toBeNull();
    expect(r.oldestDebtor).toBeNull();
  });

  it("agrupa por contratante e ordena do maior saldo devedor ao menor", () => {
    const a = { id: "a", name: "Bar A" };
    const b = { id: "b", name: "Bar B" };
    const shows = [
      gig({ id: "x", fee: 100_00, payer: b }),
      gig({ id: "y", fee: 300_00, payer: a }),
    ];
    const r = outstandingByContact(receivablesOf(shows), getPayer, { now });
    expect(r.rows.map((row) => row.contact?.id)).toEqual(["a", "b"]);
    expect(r.totalOutstanding).toBe(400_00);
    expect(r.contactCount).toBe(2);
    expect(r.count).toBe(2);
    expect(r.topDebtor!.contact!.id).toBe("a");
    expect(r.rows[0].outstanding).toBe(300_00);
    expect(r.rows[0].share).toBeCloseTo(0.75, 5);
    expect(r.rows[1].share).toBeCloseTo(0.25, 5);
  });

  it("calcula pior atraso, atraso médio ponderado e o balde do mais antigo", () => {
    const a = { id: "a", name: "Bar A" };
    const shows = [
      gig({ id: "recente", fee: 100_00, payer: a, date: "2026-03-22T00:00:00.000Z" }), // 10 dias
      gig({ id: "antigo", fee: 300_00, payer: a, date: "2026-02-10T00:00:00.000Z" }), // 50 dias
    ];
    const r = outstandingByContact(receivablesOf(shows), getPayer, { now });
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0];
    expect(row.showCount).toBe(2);
    expect(row.maxDaysOutstanding).toBe(50);
    // ponderado pelo valor: (10*100 + 50*300)/400 = 40
    expect(row.weightedAvgDays).toBe(40);
    expect(row.oldestBucket).toBe("d60"); // 50 dias → 31–60
    // shows do atraso mais longo ao mais curto
    expect(row.rows.map((s) => s.row.show.id)).toEqual(["antigo", "recente"]);
    expect(r.oldestDebtor!.contact!.id).toBe("a");
  });

  it("joga shows sem contratante para o grupo nulo (sempre por último) e o ignora em top/oldest", () => {
    const dono = { id: "d", name: "Contratante" };
    const shows = [
      // órfão: deve mais e está mais atrasado, ainda assim vai por último.
      gig({ id: "orfao", fee: 900_00, payer: null, date: "2026-01-01T00:00:00.000Z" }),
      gig({ id: "comdono", fee: 100_00, payer: dono, date: "2026-03-25T00:00:00.000Z" }),
    ];
    const r = outstandingByContact(receivablesOf(shows), getPayer, { now });
    expect(r.rows.map((row) => row.contact?.id ?? null)).toEqual(["d", null]);
    expect(r.contactCount).toBe(1); // exclui o grupo nulo
    expect(r.topDebtor!.contact!.id).toBe("d");
    expect(r.oldestDebtor!.contact!.id).toBe("d");
  });

  it("desempata pelo atraso mais longo quando o saldo devedor é igual", () => {
    const a = { id: "a", name: "Bar A" };
    const b = { id: "b", name: "Bar B" };
    const shows = [
      gig({ id: "x", fee: 200_00, payer: a, date: "2026-03-25T00:00:00.000Z" }), // 10 dias
      gig({ id: "y", fee: 200_00, payer: b, date: "2026-02-10T00:00:00.000Z" }), // 50 dias
    ];
    const r = outstandingByContact(receivablesOf(shows), getPayer, { now });
    // mesmo saldo (200,00); b está mais atrasado, então vem primeiro.
    expect(r.rows.map((row) => row.contact?.id)).toEqual(["b", "a"]);
    expect(r.oldestDebtor!.contact!.id).toBe("b");
  });
});

describe("resolveSettlementAmount", () => {
  it("quita o saldo inteiro quando não há valor pedido", () => {
    expect(resolveSettlementAmount(125_00, null)).toBe(125_00);
    expect(resolveSettlementAmount(125_00, undefined)).toBe(125_00);
  });

  it("quita o saldo inteiro quando o valor pedido é inválido (NaN) ou <= 0", () => {
    expect(resolveSettlementAmount(125_00, NaN)).toBe(125_00);
    expect(resolveSettlementAmount(125_00, 0)).toBe(125_00);
    expect(resolveSettlementAmount(125_00, -50_00)).toBe(125_00);
  });

  it("aceita um valor parcial menor que o saldo", () => {
    expect(resolveSettlementAmount(125_00, 50_00)).toBe(50_00);
  });

  it("limita (clamp) o valor pedido ao saldo em aberto", () => {
    expect(resolveSettlementAmount(125_00, 200_00)).toBe(125_00);
  });

  it("retorna 0 quando não há saldo a quitar", () => {
    expect(resolveSettlementAmount(0, 50_00)).toBe(0);
    expect(resolveSettlementAmount(-10_00, null)).toBe(0);
  });

  it("arredonda o valor pedido para centavos inteiros", () => {
    expect(resolveSettlementAmount(125_00, 50_00.4)).toBe(50_00);
    expect(resolveSettlementAmount(125_00, 50_00.6)).toBe(50_01);
  });
});

describe("resolveReceivedDate", () => {
  const now = new Date("2026-06-18T15:30:00Z");

  it("usa `now` quando a data é vazia, nula ou inválida", () => {
    expect(resolveReceivedDate(null, now)).toBe(now);
    expect(resolveReceivedDate(undefined, now)).toBe(now);
    expect(resolveReceivedDate("", now)).toBe(now);
    expect(resolveReceivedDate("18/06/2026", now)).toBe(now);
    expect(resolveReceivedDate("2026-13-40", now)).toBe(now);
  });

  it("converte uma data válida no passado para a meia-noite UTC daquele dia", () => {
    const d = resolveReceivedDate("2026-05-10", now);
    expect(d.toISOString()).toBe("2026-05-10T00:00:00.000Z");
    // cai no mês de maio — alimenta a projeção de caixa / relatório do mês certo
    expect(monthKey(d)).toBe("2026-05");
  });

  it("aceita o próprio dia de hoje (não é futuro)", () => {
    const d = resolveReceivedDate("2026-06-18", now);
    expect(d.toISOString()).toBe("2026-06-18T00:00:00.000Z");
  });

  it("rejeita datas no futuro, caindo para `now`", () => {
    expect(resolveReceivedDate("2026-06-19", now)).toBe(now);
    expect(resolveReceivedDate("2027-01-01", now)).toBe(now);
  });
});

describe("computeDelta", () => {
  it("calcula a diferença absoluta e a variação relativa (subida)", () => {
    const d = computeDelta(125_00, 100_00);
    expect(d.delta).toBe(25_00);
    expect(d.pct).toBeCloseTo(0.25, 10);
    expect(d.direction).toBe("up");
  });

  it("calcula queda (delta e pct negativos)", () => {
    const d = computeDelta(80_00, 100_00);
    expect(d.delta).toBe(-20_00);
    expect(d.pct).toBeCloseTo(-0.2, 10);
    expect(d.direction).toBe("down");
  });

  it("trata valores iguais como estável (flat), pct = 0", () => {
    const d = computeDelta(100_00, 100_00);
    expect(d.delta).toBe(0);
    expect(d.pct).toBe(0);
    expect(d.direction).toBe("flat");
  });

  it("retorna pct null quando a base anterior é zero (sem base de %)", () => {
    const d = computeDelta(50_00, 0);
    expect(d.delta).toBe(50_00);
    expect(d.pct).toBeNull();
    expect(d.direction).toBe("up");
  });

  it("usa o valor absoluto da base anterior negativa no pct", () => {
    // saldo de competência pode ser negativo; % deve refletir a magnitude
    const d = computeDelta(-50_00, -100_00);
    expect(d.delta).toBe(50_00);
    expect(d.pct).toBeCloseTo(0.5, 10); // 50/100, subindo (menos negativo)
    expect(d.direction).toBe("up");
  });

  it("preserva current e previous no resultado", () => {
    const d = computeDelta(7_00, 3_00);
    expect(d.current).toBe(7_00);
    expect(d.previous).toBe(3_00);
  });
});

describe("compareSummaries", () => {
  const tx = (over: Partial<TxLike>): TxLike => ({
    type: "INCOME",
    amount: 0,
    category: "",
    date: "2026-06-01",
    received: true,
    ...over,
  });

  it("compara as quatro métricas principais entre dois meses", () => {
    const current = summarizeFinances([
      tx({ type: "INCOME", amount: 200_00, received: true }),
      tx({ type: "EXPENSE", amount: 50_00, received: true }),
    ]);
    const previous = summarizeFinances([
      tx({ type: "INCOME", amount: 100_00, received: true }),
      tx({ type: "EXPENSE", amount: 40_00, received: true }),
    ]);

    const cmp = compareSummaries(current, previous);

    expect(cmp.totalIncome.delta).toBe(100_00);
    expect(cmp.totalIncome.direction).toBe("up");
    expect(cmp.totalExpense.delta).toBe(10_00);
    expect(cmp.totalExpense.direction).toBe("up");
    // saldo: (200-50)=150 vs (100-40)=60 → +90
    expect(cmp.balance.delta).toBe(90_00);
    // caixa realizado idem (tudo received)
    expect(cmp.cashBalance.delta).toBe(90_00);
  });

  it("usa pct null quando o mês anterior estava zerado", () => {
    const current = summarizeFinances([tx({ type: "INCOME", amount: 100_00 })]);
    const previous = summarizeFinances([]);
    const cmp = compareSummaries(current, previous);
    expect(cmp.totalIncome.pct).toBeNull();
    expect(cmp.totalIncome.current).toBe(100_00);
  });
});

describe("averageSummaries", () => {
  const tx = (over: Partial<TxLike>): TxLike => ({
    type: "INCOME",
    amount: 0,
    category: "",
    date: "2026-06-01",
    received: true,
    ...over,
  });

  it("lista vazia → resumo todo zerado", () => {
    const avg = averageSummaries([]);
    expect(avg).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      receivedIncome: 0,
      paidExpense: 0,
      cashBalance: 0,
      pendingIncome: 0,
      pendingExpense: 0,
    });
  });

  it("um único resumo → igual a ele", () => {
    const only = summarizeFinances([
      tx({ type: "INCOME", amount: 300_00, received: true }),
      tx({ type: "EXPENSE", amount: 100_00, received: false }),
    ]);
    expect(averageSummaries([only])).toEqual(only);
  });

  it("faz a média campo a campo de vários meses", () => {
    const a = summarizeFinances([tx({ type: "INCOME", amount: 200_00, received: true })]);
    const b = summarizeFinances([tx({ type: "INCOME", amount: 100_00, received: true })]);
    const avg = averageSummaries([a, b]);
    expect(avg.totalIncome).toBe(150_00);
    expect(avg.receivedIncome).toBe(150_00);
    expect(avg.cashBalance).toBe(150_00);
  });

  it("arredonda os componentes ao centavo e deriva os saldos deles", () => {
    // Três meses de receita: 100, 100, 101 → média 100,3333 → arredonda p/ 10033 centavos.
    const months = [100_00, 100_00, 101_00].map((amount) =>
      summarizeFinances([tx({ type: "INCOME", amount, received: true })]),
    );
    const avg = averageSummaries(months);
    expect(avg.totalIncome).toBe(Math.round((100_00 + 100_00 + 101_00) / 3));
    // balance derivado de componentes arredondados (= receitas − despesas).
    expect(avg.balance).toBe(avg.totalIncome - avg.totalExpense);
    expect(avg.cashBalance).toBe(avg.receivedIncome - avg.paidExpense);
  });
});

describe("computeBreakEven", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026

  // Custo fixo de R$ 300/mês: "Sala" em 3 meses distintos (abr/mai/jun).
  const fixedCostTxs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 300_00, category: "Sala", date: "2026-04-10T00:00:00.000Z" }),
    tx({ type: "EXPENSE", amount: 300_00, category: "Sala", date: "2026-05-10T00:00:00.000Z" }),
    tx({ type: "EXPENSE", amount: 300_00, category: "Sala", date: "2026-06-10T00:00:00.000Z" }),
  ];

  it("retorna zeros e showsNeeded null quando não há custo fixo nem shows", () => {
    const r = computeBreakEven([], [], { now: NOW });
    expect(r.monthlyFixedCost).toBe(0);
    expect(r.avgNetPerShow).toBe(0);
    expect(r.showsConsidered).toBe(0);
    expect(r.avgShowsPerMonth).toBe(0);
    expect(r.showsNeeded).toBeNull();
    expect(r.covered).toBeNull();
  });

  it("calcula shows/mês necessários a partir do custo fixo e do resultado médio por show", () => {
    // Custo fixo 300; dois shows realizados de cachê 200 cada (net 200) → média 200.
    // ceil(300 / 200) = 2 shows/mês.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-05-05T00:00:00.000Z" },
      { id: "s2", fee: 200_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
    ];
    const r = computeBreakEven(shows, fixedCostTxs, { now: NOW });
    expect(r.monthlyFixedCost).toBe(300_00);
    expect(r.avgNetPerShow).toBe(200_00);
    expect(r.showsConsidered).toBe(2);
    expect(r.showsNeeded).toBe(2);
    // 2 shows em 2 meses (mai, jun) → 1 show/mês; meta 2 → não cobre.
    expect(r.avgShowsPerMonth).toBe(1);
    expect(r.covered).toBe(false);
  });

  it("desconta as despesas vinculadas ao show no resultado médio (P&L)", () => {
    // Cachê 200, despesa vinculada 50 → net 150 por show.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-06-01T00:00:00.000Z" },
    ];
    const txs: TxLike[] = [
      ...fixedCostTxs,
      tx({ type: "EXPENSE", amount: 50_00, category: "Transporte", showId: "s1", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = computeBreakEven(shows, txs, { now: NOW });
    expect(r.avgNetPerShow).toBe(150_00);
    expect(r.showsNeeded).toBe(Math.ceil(300_00 / 150_00)); // 2
  });

  it("só considera shows realizados (PLAYED, ou CONFIRMED com data passada)", () => {
    const shows: BreakEvenShowLike[] = [
      { id: "played", fee: 100_00, status: "PLAYED", date: "2026-05-01T00:00:00.000Z" },
      { id: "confPast", fee: 100_00, status: "CONFIRMED", date: "2026-06-01T00:00:00.000Z" },
      { id: "confFuture", fee: 999_00, status: "CONFIRMED", date: "2026-12-01T00:00:00.000Z" },
      { id: "proposed", fee: 999_00, status: "PROPOSED", date: "2026-05-20T00:00:00.000Z" },
      { id: "cancelled", fee: 999_00, status: "CANCELLED", date: "2026-05-20T00:00:00.000Z" },
    ];
    const r = computeBreakEven(shows, fixedCostTxs, { now: NOW });
    expect(r.showsConsidered).toBe(2); // played + confPast
    expect(r.avgNetPerShow).toBe(100_00); // futuros/propostos/cancelados não inflam
  });

  it("retorna showsNeeded null quando o show médio não deixa resultado positivo", () => {
    // Cachê 100 com despesa vinculada de 150 → net negativo: impossível cobrir custo fixo.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 100_00, status: "PLAYED", date: "2026-06-01T00:00:00.000Z" },
    ];
    const txs: TxLike[] = [
      ...fixedCostTxs,
      tx({ type: "EXPENSE", amount: 150_00, category: "Transporte", showId: "s1", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = computeBreakEven(shows, txs, { now: NOW });
    expect(r.avgNetPerShow).toBeLessThan(0);
    expect(r.showsNeeded).toBeNull();
    expect(r.covered).toBeNull();
  });

  it("retorna showsNeeded null quando não há custo fixo a cobrir", () => {
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-06-01T00:00:00.000Z" },
    ];
    const r = computeBreakEven(shows, [], { now: NOW }); // sem despesas → custo fixo 0
    expect(r.monthlyFixedCost).toBe(0);
    expect(r.showsNeeded).toBeNull();
    expect(r.covered).toBeNull();
  });

  it("marca covered quando o ritmo atual de shows já bate a meta", () => {
    // Custo fixo 300, net médio 400 → ceil(300/400) = 1 show/mês.
    // Dois shows no mesmo mês (jun) → 2 shows/mês ≥ 1 → cobre.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 400_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
      { id: "s2", fee: 400_00, status: "PLAYED", date: "2026-06-20T00:00:00.000Z" },
    ];
    const r = computeBreakEven(shows, fixedCostTxs, { now: NOW });
    expect(r.showsNeeded).toBe(1);
    expect(r.avgShowsPerMonth).toBe(2);
    expect(r.covered).toBe(true);
  });
});

describe("breakEvenHeadline", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026

  const fixedCostTxs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 300_00, category: "Sala", date: "2026-04-10T00:00:00.000Z" }),
    tx({ type: "EXPENSE", amount: 300_00, category: "Sala", date: "2026-05-10T00:00:00.000Z" }),
    tx({ type: "EXPENSE", amount: 300_00, category: "Sala", date: "2026-06-10T00:00:00.000Z" }),
  ];

  it("não aparece quando não há meta a bater (sem custo fixo / sem shows)", () => {
    const h = breakEvenHeadline(computeBreakEven([], [], { now: NOW }));
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.showsNeeded).toBeNull();
  });

  it("não aparece quando o ritmo atual já cobre o custo fixo", () => {
    // net médio 400 → meta ceil(300/400)=1; dois shows em jun → 2/mês ≥ 1 → cobre.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 400_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
      { id: "s2", fee: 400_00, status: "PLAYED", date: "2026-06-20T00:00:00.000Z" },
    ];
    const h = breakEvenHeadline(computeBreakEven(shows, fixedCostTxs, { now: NOW }));
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
  });

  it("aparece (não-crítico) quando o ritmo fica abaixo da meta mas acima da metade", () => {
    // net médio 200 → meta ceil(300/200)=2. Três shows num span de 2 meses (mai,jun)
    // → 1,5/mês; meta 2 → não cobre; 1,5/2 = 0,75 > 0,5 → aparece, mas não é crítico.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-05-05T00:00:00.000Z" },
      { id: "s2", fee: 200_00, status: "PLAYED", date: "2026-05-20T00:00:00.000Z" },
      { id: "s3", fee: 200_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
    ];
    const h = breakEvenHeadline(computeBreakEven(shows, fixedCostTxs, { now: NOW }));
    expect(h.show).toBe(true);
    expect(h.showsNeeded).toBe(2);
    expect(h.avgShowsPerMonth).toBe(1.5);
    // 1,5/2 = 0,75 > BREAK_EVEN_CRITICAL_RATIO (0,5) → não-crítico.
    expect(h.critical).toBe(false);
    expect(1.5 / 2 <= BREAK_EVEN_CRITICAL_RATIO).toBe(false);
  });

  it("marca crítico quando o ritmo cai a ≤ metade da meta de shows/mês", () => {
    // Custo fixo 900 (Sala 900 × 3 meses), net médio 200 → meta ceil(900/200)=5.
    // Um único show em jun → 1/mês; 1/5 = 0,2 ≤ 0,5 → crítico.
    const bigFixed: TxLike[] = [
      tx({ type: "EXPENSE", amount: 900_00, category: "Sala", date: "2026-04-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 900_00, category: "Sala", date: "2026-05-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 900_00, category: "Sala", date: "2026-06-10T00:00:00.000Z" }),
    ];
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
    ];
    const h = breakEvenHeadline(computeBreakEven(shows, bigFixed, { now: NOW }));
    expect(h.show).toBe(true);
    expect(h.showsNeeded).toBe(5);
    expect(h.critical).toBe(true);
    expect(h.monthlyFixedCost).toBe(900_00);
  });
});

describe("cashRunway", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026

  // 3 meses distintos de "Sala de ensaio" a 100,00 → custo fixo típico = 100,00/mês.
  const fixedCostTxs: TxLike[] = [
    tx({ type: "EXPENSE", amount: 100_00, category: "Sala de ensaio", received: true, date: "2026-04-10T00:00:00.000Z" }),
    tx({ type: "EXPENSE", amount: 100_00, category: "Sala de ensaio", received: true, date: "2026-05-10T00:00:00.000Z" }),
    tx({ type: "EXPENSE", amount: 100_00, category: "Sala de ensaio", received: true, date: "2026-06-10T00:00:00.000Z" }),
  ];

  it("retorna no-cost quando não há custo fixo recorrente", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 500_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
    ];
    const r = cashRunway(txs, { now: NOW });
    expect(r.monthlyFixedCost).toBe(0);
    expect(r.runwayMonths).toBeNull();
    expect(r.depletionDate).toBeNull();
    expect(r.verdict).toBe("no-cost");
    expect(r.currentCash).toBe(500_00);
  });

  it("retorna negative quando o caixa atual é <= 0 (apesar de haver custo fixo)", () => {
    // Só despesas pagas (o próprio custo fixo) → caixa = -300,00.
    const r = cashRunway(fixedCostTxs, { now: NOW });
    expect(r.monthlyFixedCost).toBe(100_00);
    expect(r.currentCash).toBe(-300_00);
    expect(r.runwayMonths).toBeNull();
    expect(r.depletionDate).toBeNull();
    expect(r.verdict).toBe("negative");
  });

  it("calcula runwayMonths = caixa / custo fixo mensal", () => {
    const txs: TxLike[] = [
      // Caixa de entrada de 1.200,00 recebido; custo fixo típico 100,00/mês.
      tx({ type: "INCOME", amount: 1200_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ];
    const r = cashRunway(txs, { now: NOW });
    // caixa = 1200,00 − 300,00 (3 aluguéis pagos) = 900,00; runway = 900/100 = 9.
    expect(r.currentCash).toBe(900_00);
    expect(r.monthlyFixedCost).toBe(100_00);
    expect(r.runwayMonths).toBe(9);
    expect(r.verdict).toBe("healthy");
  });

  it("marca verdict crítico quando o fôlego é menor que 3 meses", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 450_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ];
    // caixa = 450 − 300 = 150,00; runway = 1,5 mês → crítico (< 3).
    const r = cashRunway(txs, { now: NOW });
    expect(r.runwayMonths).toBeCloseTo(1.5, 5);
    expect(r.verdict).toBe("critical");
  });

  it("marca verdict tight entre 3 e 6 meses", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 700_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ];
    // caixa = 700 − 300 = 400,00; runway = 4 meses → tight.
    const r = cashRunway(txs, { now: NOW });
    expect(r.runwayMonths).toBe(4);
    expect(r.verdict).toBe("tight");
  });

  it("os limiares são inclusivos no piso (3 → tight, 6 → healthy)", () => {
    const at3: TxLike[] = [
      tx({ type: "INCOME", amount: 600_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ]; // caixa = 300; runway = 3 → tight (não crítico).
    expect(cashRunway(at3, { now: NOW }).verdict).toBe("tight");

    const at6: TxLike[] = [
      tx({ type: "INCOME", amount: 900_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ]; // caixa = 600; runway = 6 → healthy.
    expect(cashRunway(at6, { now: NOW }).verdict).toBe("healthy");
  });

  it("projeta a data de esgotamento a partir de now + runwayMonths meses", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 1200_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ];
    const r = cashRunway(txs, { now: NOW });
    // runway = 9 meses ≈ 9 × 30,4375 dias após 2026-06-15.
    const expected = new Date(
      new Date(NOW).getTime() + 9 * (365.25 / 12) * 86_400_000,
    );
    expect(r.depletionDate?.getTime()).toBe(expected.getTime());
    // Sanidade: cai por volta de março/2027.
    expect(r.depletionDate?.getUTCFullYear()).toBe(2027);
    expect(r.depletionDate?.getUTCMonth()).toBe(2); // março (0-based)
  });

  it("não conta pendências no caixa (só recebido/pago)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 5000_00, received: false, date: "2026-06-01T00:00:00.000Z" }), // a receber: ignorado
      tx({ type: "INCOME", amount: 600_00, received: true, date: "2026-06-01T00:00:00.000Z" }),
      ...fixedCostTxs,
    ];
    const r = cashRunway(txs, { now: NOW });
    // caixa = 600 − 300 = 300,00 (pendência de 5.000 não entra); runway = 3 → tight.
    expect(r.currentCash).toBe(300_00);
    expect(r.runwayMonths).toBe(3);
    expect(r.verdict).toBe("tight");
  });
});

describe("cashBurnRunway", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026 → janela = dez/2025..mai/2026 (6 meses fechados)

  // Renda recebida ANTES da janela (nov/2025): entra no caixa atual, mas não no burn.
  const preWindowIncome = (amount: number): TxLike =>
    tx({ type: "INCOME", amount, received: true, date: "2025-11-15T00:00:00.000Z" });

  // 6 despesas mensais de `each` dentro da janela (dez/2025 → mai/2026).
  const windowExpenses = (each: number): TxLike[] =>
    [
      "2025-12-10",
      "2026-01-10",
      "2026-02-10",
      "2026-03-10",
      "2026-04-10",
      "2026-05-10",
    ].map((d) => tx({ type: "EXPENSE", amount: each, received: true, date: `${d}T00:00:00.000Z` }));

  it("usa a janela padrão de 6 meses fechados", () => {
    const r = cashBurnRunway([preWindowIncome(2000_00), ...windowExpenses(100_00)], { now: NOW });
    expect(r.windowMonths).toBe(DEFAULT_BURN_WINDOW_MONTHS);
    expect(r.windowMonths).toBe(6);
  });

  it("marca surplus quando o caixa cresceu na janela (entrou mais do que saiu)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 1200_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 600_00, received: true, date: "2026-03-15T00:00:00.000Z" }),
    ];
    const r = cashBurnRunway(txs, { now: NOW });
    // (120000 − 60000) / 6 = +100,00/mês → não queima.
    expect(r.avgMonthlyNet).toBe(100_00);
    expect(r.monthlyBurn).toBe(0);
    expect(r.runwayMonths).toBeNull();
    expect(r.depletionDate).toBeNull();
    expect(r.verdict).toBe("surplus");
  });

  it("calcula runwayMonths = caixa / queima mensal média (verdict healthy)", () => {
    const r = cashBurnRunway([preWindowIncome(2000_00), ...windowExpenses(100_00)], { now: NOW });
    // queima = 600,00/6 = 100,00/mês; caixa = 2000 − 600 = 1400,00; runway = 14 → healthy.
    expect(r.monthlyBurn).toBe(100_00);
    expect(r.currentCash).toBe(1400_00);
    expect(r.runwayMonths).toBe(14);
    expect(r.verdict).toBe("healthy");
  });

  it("marca verdict crítico quando o fôlego é menor que 3 meses", () => {
    const r = cashBurnRunway([preWindowIncome(1000_00), ...windowExpenses(150_00)], { now: NOW });
    // queima = 900/6 = 150,00/mês; caixa = 1000 − 900 = 100,00; runway = 0,67 → crítico.
    expect(r.monthlyBurn).toBe(150_00);
    expect(r.currentCash).toBe(100_00);
    expect(r.runwayMonths).toBeCloseTo(100 / 150, 5);
    expect(r.verdict).toBe("critical");
  });

  it("marca negative quando há queima mas o caixa atual é <= 0", () => {
    const r = cashBurnRunway(windowExpenses(100_00), { now: NOW });
    expect(r.monthlyBurn).toBe(100_00);
    expect(r.currentCash).toBe(-600_00);
    expect(r.runwayMonths).toBeNull();
    expect(r.depletionDate).toBeNull();
    expect(r.verdict).toBe("negative");
  });

  it("ignora o mês corrente (parcial) ao medir a queima, mas conta no caixa atual", () => {
    const txs: TxLike[] = [
      preWindowIncome(10000_00),
      ...windowExpenses(100_00),
      // Despesa pesada no mês em curso (junho) — reduz o caixa, mas não infla o burn.
      tx({ type: "EXPENSE", amount: 5000_00, received: true, date: "2026-06-10T00:00:00.000Z" }),
    ];
    const r = cashBurnRunway(txs, { now: NOW });
    expect(r.monthlyBurn).toBe(100_00); // só a janela fechada conta
    expect(r.currentCash).toBe(10000_00 - 600_00 - 5000_00);
    expect(r.verdict).toBe("healthy");
  });

  it("ignora transações anteriores à janela", () => {
    const txs: TxLike[] = [
      preWindowIncome(2000_00),
      // Despesa de jun/2025, bem antes da janela de 6 meses → não conta no burn.
      tx({ type: "EXPENSE", amount: 600_00, received: true, date: "2025-06-10T00:00:00.000Z" }),
    ];
    const r = cashBurnRunway(txs, { now: NOW });
    expect(r.windowPaidExpense).toBe(0);
    expect(r.monthlyBurn).toBe(0);
    expect(r.verdict).toBe("surplus");
  });

  it("ignora pendências (received = false) no cálculo da queima", () => {
    const txs: TxLike[] = [
      preWindowIncome(2000_00),
      tx({ type: "EXPENSE", amount: 600_00, received: false, date: "2026-03-10T00:00:00.000Z" }),
    ];
    const r = cashBurnRunway(txs, { now: NOW });
    expect(r.windowPaidExpense).toBe(0);
    expect(r.monthlyBurn).toBe(0);
    expect(r.verdict).toBe("surplus");
  });

  it("respeita uma janela customizada de meses", () => {
    const txs: TxLike[] = [
      preWindowIncome(2000_00),
      tx({ type: "EXPENSE", amount: 600_00, received: true, date: "2026-01-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 300_00, received: true, date: "2026-04-10T00:00:00.000Z" }),
    ];
    // Janela 6: jan + abr na janela → 900/6 = 150,00/mês.
    const r6 = cashBurnRunway(txs, { now: NOW, months: 6 });
    expect(r6.windowMonths).toBe(6);
    expect(r6.monthlyBurn).toBe(150_00);
    // Janela 3 (mar/abr/mai): só abr na janela → 300/3 = 100,00/mês.
    const r3 = cashBurnRunway(txs, { now: NOW, months: 3 });
    expect(r3.windowMonths).toBe(3);
    expect(r3.monthlyBurn).toBe(100_00);
  });

  it("sanitiza a janela: pisos, tetos, fração e ausência", () => {
    const base = [preWindowIncome(2000_00), ...windowExpenses(100_00)];
    expect(cashBurnRunway(base, { now: NOW, months: 0 }).windowMonths).toBe(1);
    expect(cashBurnRunway(base, { now: NOW, months: 100 }).windowMonths).toBe(24);
    expect(cashBurnRunway(base, { now: NOW, months: 4.9 }).windowMonths).toBe(4);
    expect(cashBurnRunway(base, { now: NOW }).windowMonths).toBe(DEFAULT_BURN_WINDOW_MONTHS);
  });

  it("projeta a data de esgotamento a partir de now + runwayMonths meses", () => {
    const r = cashBurnRunway([preWindowIncome(2000_00), ...windowExpenses(100_00)], { now: NOW });
    // runway = 14 meses ≈ 14 × 30,4375 dias após 2026-06-15.
    const expected = new Date(new Date(NOW).getTime() + 14 * (365.25 / 12) * 86_400_000);
    expect(r.depletionDate?.getTime()).toBe(expected.getTime());
  });
});

describe("cashBurnHeadline", () => {
  const NOW = "2026-06-15T00:00:00.000Z";
  const windowExpenses = (each: number): TxLike[] =>
    [
      "2025-12-10",
      "2026-01-10",
      "2026-02-10",
      "2026-03-10",
      "2026-04-10",
      "2026-05-10",
    ].map((d) => tx({ type: "EXPENSE", amount: each, received: true, date: `${d}T00:00:00.000Z` }));
  const income = (amount: number): TxLike =>
    tx({ type: "INCOME", amount, received: true, date: "2025-11-15T00:00:00.000Z" });

  it("não mostra com fôlego saudável (≥ 6 meses)", () => {
    // queima 100/mês, caixa 1400 → runway 14 meses (healthy).
    const h = cashBurnHeadline(cashBurnRunway([income(2000_00), ...windowExpenses(100_00)], { now: NOW }));
    expect(h.verdict).toBe("healthy");
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
  });

  it("não mostra quando o caixa cresce na janela (surplus)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 1200_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 600_00, received: true, date: "2026-03-15T00:00:00.000Z" }),
    ];
    const h = cashBurnHeadline(cashBurnRunway(txs, { now: NOW }));
    expect(h.verdict).toBe("surplus");
    expect(h.show).toBe(false);
    expect(h.runwayMonths).toBeNull();
    expect(h.monthlyBurn).toBe(0);
  });

  it("não mostra quando o caixa já está zerado/negativo (negative)", () => {
    const h = cashBurnHeadline(cashBurnRunway(windowExpenses(100_00), { now: NOW }));
    expect(h.verdict).toBe("negative");
    expect(h.show).toBe(false);
    expect(h.runwayMonths).toBeNull();
  });

  it("mostra (não-crítico) quando o fôlego é apertado (entre 3 e 6 meses)", () => {
    // queima 200/mês, caixa = 1000 − 1200 = ... ajustamos: caixa 900, queima 200 → 4,5 meses (tight).
    const h = cashBurnHeadline(
      cashBurnRunway([income(2100_00), ...windowExpenses(200_00)], { now: NOW }),
    );
    // queima = 1200/6 = 200/mês; caixa = 2100 − 1200 = 900; runway = 4,5 → tight.
    expect(h.verdict).toBe("tight");
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.runwayMonths).toBeCloseTo(4.5, 5);
    expect(h.monthlyBurn).toBe(200_00);
  });

  it("mostra como crítico quando o fôlego é menor que 3 meses", () => {
    const h = cashBurnHeadline(
      cashBurnRunway([income(1000_00), ...windowExpenses(150_00)], { now: NOW }),
    );
    // queima = 900/6 = 150/mês; caixa = 100; runway ≈ 0,67 → critical.
    expect(h.verdict).toBe("critical");
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.runwayMonths).toBeCloseTo(100 / 150, 5);
  });
});

describe("cashFlowByMonth", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026 → janela = dez/2025..mai/2026 (6 meses)

  it("devolve uma entrada por mês da janela, em ordem cronológica", () => {
    const months = cashFlowByMonth([], { now: NOW });
    expect(months).toHaveLength(6);
    expect(months.map((m) => m.monthKey)).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
    // Mês sem movimento vem zerado.
    expect(months.every((m) => m.received === 0 && m.paid === 0 && m.net === 0)).toBe(true);
  });

  it("agrega receita recebida e despesa paga por mês, calculando o líquido", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 1000_00, received: true, date: "2026-03-05T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 400_00, received: true, date: "2026-03-20T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 250_00, received: true, date: "2026-04-10T00:00:00.000Z" }),
    ];
    const byKey = Object.fromEntries(
      cashFlowByMonth(txs, { now: NOW }).map((m) => [m.monthKey, m]),
    );
    expect(byKey["2026-03"]).toMatchObject({ received: 1000_00, paid: 400_00, net: 600_00 });
    expect(byKey["2026-04"]).toMatchObject({ received: 0, paid: 250_00, net: -250_00 });
    expect(byKey["2026-01"]).toMatchObject({ received: 0, paid: 0, net: 0 });
  });

  it("é consistente com cashBurnRunway: soma dos net / janela = avgMonthlyNet", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 1800_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 300_00, received: true, date: "2026-01-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 300_00, received: true, date: "2026-05-10T00:00:00.000Z" }),
    ];
    const months = cashFlowByMonth(txs, { now: NOW });
    const sumNet = months.reduce((acc, m) => acc + m.net, 0);
    const burn = cashBurnRunway(txs, { now: NOW });
    expect(Math.round(sumNet / burn.windowMonths)).toBe(burn.avgMonthlyNet);
  });

  it("ignora o mês corrente (parcial) e o que está fora da janela", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 999_00, received: true, date: "2026-06-10T00:00:00.000Z" }), // mês em curso
      tx({ type: "EXPENSE", amount: 888_00, received: true, date: "2025-11-10T00:00:00.000Z" }), // antes da janela
      tx({ type: "EXPENSE", amount: 100_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
    ];
    const months = cashFlowByMonth(txs, { now: NOW });
    const total = months.reduce((acc, m) => acc + m.paid, 0);
    expect(total).toBe(100_00); // só fev entra
    expect(months.some((m) => m.monthKey === "2026-06")).toBe(false);
    expect(months.some((m) => m.monthKey === "2025-11")).toBe(false);
  });

  it("ignora pendências (received = false)", () => {
    const txs: TxLike[] = [
      tx({ type: "EXPENSE", amount: 500_00, received: false, date: "2026-03-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 700_00, received: false, date: "2026-03-12T00:00:00.000Z" }),
    ];
    const months = cashFlowByMonth(txs, { now: NOW });
    expect(months.every((m) => m.received === 0 && m.paid === 0)).toBe(true);
  });

  it("respeita uma janela customizada e a saneia", () => {
    expect(cashFlowByMonth([], { now: NOW, months: 3 })).toHaveLength(3);
    expect(cashFlowByMonth([], { now: NOW, months: 3 }).map((m) => m.monthKey)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
    expect(cashFlowByMonth([], { now: NOW, months: 0 })).toHaveLength(1); // piso
    expect(cashFlowByMonth([], { now: NOW, months: 100 })).toHaveLength(24); // teto
    expect(cashFlowByMonth([], { now: NOW })).toHaveLength(DEFAULT_BURN_WINDOW_MONTHS);
  });
});

describe("cashFlowTrend", () => {
  // Constrói uma janela cronológica de meses a partir de uma lista de líquidos (centavos).
  // received/paid não importam para o veredito (só o net é lido), mas mantemos um net válido.
  const monthsFromNets = (nets: number[]) =>
    nets.map((net, i) => ({
      monthKey: `2026-${String(i + 1).padStart(2, "0")}`,
      received: net >= 0 ? net : 0,
      paid: net < 0 ? -net : 0,
      net,
    }));

  it("acusa queima ACELERANDO quando a metade recente piora além do limiar", () => {
    // antiga: +2000/mês em média; recente: −2000/mês → delta muito negativo.
    const t = cashFlowTrend(monthsFromNets([2000_00, 2000_00, -2000_00, -2000_00]));
    expect(t.direction).toBe("accelerating");
    expect(t.olderAvgNet).toBe(2000_00);
    expect(t.recentAvgNet).toBe(-2000_00);
    expect(t.delta).toBe(-4000_00);
    expect(t.recentMonths).toBe(2);
    expect(t.olderMonths).toBe(2);
  });

  it("acusa queima ALIVIANDO quando a metade recente melhora além do limiar", () => {
    const t = cashFlowTrend(monthsFromNets([-2000_00, -2000_00, 1000_00, 1000_00]));
    expect(t.direction).toBe("easing");
    expect(t.delta).toBe(3000_00);
  });

  it("é ESTÁVEL quando a variação fica dentro do limiar relativo", () => {
    // antiga: 1000/mês; recente: 1050/mês → +5%, abaixo de 15%.
    const t = cashFlowTrend(monthsFromNets([1000_00, 1000_00, 1100_00, 1000_00]));
    expect(t.direction).toBe("stable");
  });

  it("usa o piso para não acusar tendência sobre médias quase nulas", () => {
    // antiga: 0; recente: +300/mês. Sem piso a razão seria infinita; com piso (R$500)
    // a razão é 300/500 = 0,6 → ainda passaria. Use uma diferença pequena de verdade:
    const t = cashFlowTrend(monthsFromNets([0, 0, 50_00, 0]));
    // recente média = 2500 centavos; razão = 2500/50000 = 0,05 < 0,15 → estável.
    expect(t.recentAvgNet).toBe(25_00);
    expect(t.olderAvgNet).toBe(0);
    expect(t.direction).toBe("stable");
  });

  it("descarta o mês do meio quando a janela tem nº ímpar de meses", () => {
    // 5 meses: metade = 2; antiga = [0,1], recente = [3,4]; o índice 2 (meio) é ignorado.
    const t = cashFlowTrend(monthsFromNets([2000_00, 2000_00, 9999_00, -1000_00, -1000_00]));
    expect(t.olderMonths).toBe(2);
    expect(t.recentMonths).toBe(2);
    expect(t.olderAvgNet).toBe(2000_00);
    expect(t.recentAvgNet).toBe(-1000_00);
    expect(t.direction).toBe("accelerating");
  });

  it("devolve insufficient quando a janela é curta demais para duas metades", () => {
    expect(cashFlowTrend(monthsFromNets([])).direction).toBe("insufficient");
    expect(cashFlowTrend(monthsFromNets([100_00])).direction).toBe("insufficient");
    expect(cashFlowTrend(monthsFromNets([100_00, -100_00])).direction).toBe("insufficient"); // half=1
    expect(cashFlowTrend(monthsFromNets([1, 2, 3])).direction).toBe("insufficient"); // half=1
  });

  it("integra com cashFlowByMonth: queima recente vira accelerating", () => {
    const NOW = "2026-06-15T00:00:00.000Z"; // janela dez/2025..mai/2026 (6 meses)
    const txs: TxLike[] = [
      // metade antiga (dez,jan,fev): caixa positivo
      tx({ type: "INCOME", amount: 3000_00, received: true, date: "2025-12-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 3000_00, received: true, date: "2026-01-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 3000_00, received: true, date: "2026-02-10T00:00:00.000Z" }),
      // metade recente (mar,abr,mai): só gasto
      tx({ type: "EXPENSE", amount: 2000_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 2000_00, received: true, date: "2026-04-10T00:00:00.000Z" }),
      tx({ type: "EXPENSE", amount: 2000_00, received: true, date: "2026-05-10T00:00:00.000Z" }),
    ];
    const t = cashFlowTrend(cashFlowByMonth(txs, { now: NOW }));
    expect(t.direction).toBe("accelerating");
    expect(t.olderAvgNet).toBeGreaterThan(0);
    expect(t.recentAvgNet).toBeLessThan(0);
  });
});

describe("parseBurnWindow", () => {
  it("usa o default quando ausente, vazio ou só espaços", () => {
    expect(parseBurnWindow(undefined)).toBe(DEFAULT_BURN_WINDOW_MONTHS);
    expect(parseBurnWindow("")).toBe(DEFAULT_BURN_WINDOW_MONTHS);
    expect(parseBurnWindow("   ")).toBe(DEFAULT_BURN_WINDOW_MONTHS);
  });

  it("usa o fallback informado quando ausente", () => {
    expect(parseBurnWindow(undefined, 12)).toBe(12);
    expect(parseBurnWindow("abc", 3)).toBe(3);
  });

  it("lê um valor numérico válido", () => {
    expect(parseBurnWindow("12")).toBe(12);
    expect(parseBurnWindow("3")).toBe(3);
  });

  it("trunca a fração para inteiro", () => {
    expect(parseBurnWindow("4.9")).toBe(4);
    expect(parseBurnWindow("6.01")).toBe(6);
  });

  it("grampeia ao piso e ao teto", () => {
    expect(parseBurnWindow("0")).toBe(BURN_WINDOW_MIN);
    expect(parseBurnWindow("-5")).toBe(BURN_WINDOW_MIN);
    expect(parseBurnWindow("100")).toBe(BURN_WINDOW_MAX);
  });

  it("cai no default para valores não-numéricos", () => {
    expect(parseBurnWindow("abc")).toBe(DEFAULT_BURN_WINDOW_MONTHS);
    expect(parseBurnWindow("NaN")).toBe(DEFAULT_BURN_WINDOW_MONTHS);
  });

  it("usa a primeira ocorrência quando o param vem repetido", () => {
    expect(parseBurnWindow(["12", "3"])).toBe(12);
    expect(parseBurnWindow([])).toBe(DEFAULT_BURN_WINDOW_MONTHS);
  });

  it("todos os presets são janelas válidas (dentro de [min, max])", () => {
    for (const m of BURN_WINDOW_PRESETS) {
      expect(parseBurnWindow(String(m))).toBe(m);
      expect(m).toBeGreaterThanOrEqual(BURN_WINDOW_MIN);
      expect(m).toBeLessThanOrEqual(BURN_WINDOW_MAX);
    }
  });
});

describe("taxReserve", () => {
  it("usa a alíquota padrão quando nenhuma é informada", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 1000_00, received: true, date: "2026-03-10T00:00:00.000Z" }),
    ];
    const r = taxReserve(txs, { year: 2026 });
    expect(r.rate).toBe(DEFAULT_TAX_RATE);
    expect(r.totalReceivedIncome).toBe(1000_00);
    // 6% de 1000,00 = 60,00
    expect(r.totalReserve).toBe(60_00);
    expect(r.months[2].monthIndex).toBe(3);
    expect(r.months[2].receivedIncome).toBe(1000_00);
    expect(r.months[2].reserve).toBe(60_00);
  });

  it("considera apenas receitas recebidas (ignora despesas e pendências)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 500_00, received: true, date: "2026-05-01T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 999_00, received: false, date: "2026-05-02T00:00:00.000Z" }), // a receber
      tx({ type: "EXPENSE", amount: 800_00, received: true, date: "2026-05-03T00:00:00.000Z" }),
    ];
    const r = taxReserve(txs, { year: 2026, rate: 0.1 });
    expect(r.totalReceivedIncome).toBe(500_00);
    expect(r.totalReserve).toBe(50_00); // 10% de 500
  });

  it("filtra pelo ano informado (UTC)", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, received: true, date: "2025-12-31T12:00:00.000Z" }),
      tx({ type: "INCOME", amount: 200_00, received: true, date: "2026-01-01T12:00:00.000Z" }),
    ];
    const r = taxReserve(txs, { year: 2026, rate: 0.06 });
    expect(r.totalReceivedIncome).toBe(200_00);
    expect(r.months[0].monthIndex).toBe(1);
    expect(r.months[0].receivedIncome).toBe(200_00);
  });

  it("retorna 12 meses zerados quando não há receita no ano", () => {
    const r = taxReserve([], { year: 2026 });
    expect(r.months).toHaveLength(12);
    expect(r.totalReceivedIncome).toBe(0);
    expect(r.totalReserve).toBe(0);
    expect(r.months.every((m) => m.reserve === 0)).toBe(true);
  });

  it("arredonda a reserva de cada mês ao centavo (soma das mensais)", () => {
    // 333,33 a 6% = 19,9998 → arredonda para 20,00 por mês.
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 333_33, received: true, date: "2026-01-10T00:00:00.000Z" }),
      tx({ type: "INCOME", amount: 333_33, received: true, date: "2026-02-10T00:00:00.000Z" }),
    ];
    const r = taxReserve(txs, { year: 2026, rate: 0.06 });
    expect(r.months[0].reserve).toBe(20_00);
    expect(r.months[1].reserve).toBe(20_00);
    expect(r.totalReserve).toBe(40_00);
  });

  it("saneia a alíquota para o intervalo [0, 1]", () => {
    const txs: TxLike[] = [
      tx({ type: "INCOME", amount: 100_00, received: true, date: "2026-04-10T00:00:00.000Z" }),
    ];
    expect(taxReserve(txs, { year: 2026, rate: 5 }).rate).toBe(1);
    expect(taxReserve(txs, { year: 2026, rate: -1 }).rate).toBe(0);
    expect(taxReserve(txs, { year: 2026, rate: NaN }).rate).toBe(DEFAULT_TAX_RATE);
  });
});

describe("showPipeline", () => {
  const sh = (id: string, status: string, fee: number): ShowLike => ({ id, status, fee });

  it("retorna funil vazio (mas com as quatro etapas) sem shows", () => {
    const p = showPipeline([]);
    expect(p.total).toBe(0);
    expect(p.stages).toHaveLength(4);
    expect(p.stages.map((s) => s.status)).toEqual([
      "PROPOSED",
      "CONFIRMED",
      "PLAYED",
      "CANCELLED",
    ]);
    expect(p.stages.every((s) => s.count === 0 && s.fee === 0)).toBe(true);
    expect(p.openValue).toBe(0);
    expect(p.conversionRate).toBeNull();
  });

  it("agrega contagem e cachê por etapa", () => {
    const p = showPipeline([
      sh("a", "PROPOSED", 100_00),
      sh("b", "PROPOSED", 200_00),
      sh("c", "CONFIRMED", 300_00),
      sh("d", "PLAYED", 400_00),
      sh("e", "CANCELLED", 500_00),
    ]);
    expect(p.total).toBe(5);
    expect(p.proposedCount).toBe(2);
    expect(p.proposedValue).toBe(300_00);
    expect(p.confirmedCount).toBe(1);
    expect(p.confirmedValue).toBe(300_00);
    expect(p.playedCount).toBe(1);
    expect(p.cancelledCount).toBe(1);
  });

  it("valor em aberto = proposto + confirmado (exclui realizado e cancelado)", () => {
    const p = showPipeline([
      sh("a", "PROPOSED", 100_00),
      sh("b", "CONFIRMED", 250_00),
      sh("c", "PLAYED", 999_00),
      sh("d", "CANCELLED", 999_00),
    ]);
    expect(p.openCount).toBe(2);
    expect(p.openValue).toBe(350_00);
  });

  it("taxa de concretização = realizados / (realizados + cancelados)", () => {
    const p = showPipeline([
      sh("a", "PLAYED", 0),
      sh("b", "PLAYED", 0),
      sh("c", "PLAYED", 0),
      sh("d", "CANCELLED", 0),
      sh("e", "PROPOSED", 0), // não conta como decidido
    ]);
    expect(p.decidedCount).toBe(4);
    expect(p.conversionRate).toBeCloseTo(0.75, 5);
  });

  it("taxa de concretização é null quando nada foi decidido", () => {
    const p = showPipeline([sh("a", "PROPOSED", 100_00), sh("b", "CONFIRMED", 100_00)]);
    expect(p.conversionRate).toBeNull();
  });

  it("ignora status desconhecido (não entra no total)", () => {
    const p = showPipeline([
      sh("a", "PLAYED", 100_00),
      sh("b", "ARCHIVED", 999_00),
      { id: "c", fee: 50_00 }, // sem status
    ]);
    expect(p.total).toBe(1);
    expect(p.playedCount).toBe(1);
  });
});

describe("compareShowPipelines", () => {
  const sh = (id: string, status: string): ShowLike => ({ id, status, fee: 0 });

  it("veredito 'improved' quando a taxa de concretização sobe além do limiar", () => {
    // anterior: 2/4 = 50% · atual: 4/5 = 80% → +30 p.p.
    const previous = showPipeline([
      sh("a", "PLAYED"),
      sh("b", "PLAYED"),
      sh("c", "CANCELLED"),
      sh("d", "CANCELLED"),
    ]);
    const current = showPipeline([
      sh("e", "PLAYED"),
      sh("f", "PLAYED"),
      sh("g", "PLAYED"),
      sh("h", "PLAYED"),
      sh("i", "CANCELLED"),
    ]);
    const c = compareShowPipelines(current, previous);
    expect(c.conversionRateDelta).toBeCloseTo(0.3, 5);
    expect(c.playedCountDelta).toBe(2); // 4 − 2
    expect(c.decidedCountDelta).toBe(1); // 5 − 4
    expect(c.trend).toBe("improved");
  });

  it("veredito 'worsened' quando a taxa cai além do limiar", () => {
    const previous = showPipeline([sh("a", "PLAYED"), sh("b", "PLAYED")]); // 100%
    const current = showPipeline([sh("c", "PLAYED"), sh("d", "CANCELLED")]); // 50%
    const c = compareShowPipelines(current, previous);
    expect(c.conversionRateDelta).toBeCloseTo(-0.5, 5);
    expect(c.trend).toBe("worsened");
  });

  it("veredito 'stable' quando a variação fica dentro do limiar", () => {
    // 2/4 = 50% vs. 5/10 = 50% → 0 p.p. (dentro do epsilon)
    const previous = showPipeline([
      sh("a", "PLAYED"),
      sh("b", "PLAYED"),
      sh("c", "CANCELLED"),
      sh("d", "CANCELLED"),
    ]);
    const current = showPipeline([
      ...["e", "f", "g", "h", "i"].map((id) => sh(id, "PLAYED")),
      ...["j", "k", "l", "m", "n"].map((id) => sh(id, "CANCELLED")),
    ]);
    const c = compareShowPipelines(current, previous);
    expect(c.conversionRateDelta).toBeCloseTo(0, 5);
    expect(Math.abs(c.conversionRateDelta ?? 1)).toBeLessThan(CONVERSION_TREND_EPSILON);
    expect(c.trend).toBe("stable");
  });

  it("propostas/confirmados em aberto não movem a taxa (só decididos contam)", () => {
    // atual tem propostas em aberto, mas a taxa olha só realizados/cancelados
    const previous = showPipeline([sh("a", "PLAYED"), sh("b", "CANCELLED")]); // 50%
    const current = showPipeline([
      sh("c", "PLAYED"),
      sh("d", "PLAYED"),
      sh("e", "CANCELLED"),
      sh("f", "PROPOSED"), // aberto — fora do decidido
      sh("g", "CONFIRMED"), // aberto — fora do decidido
    ]); // 2/3 ≈ 66,7%
    const c = compareShowPipelines(current, previous);
    expect(c.current.decidedCount).toBe(3);
    expect(c.conversionRateDelta).toBeCloseTo(2 / 3 - 0.5, 5);
    expect(c.trend).toBe("improved");
  });

  it("taxa indefinida em algum período → delta null e veredito 'stable'", () => {
    const decided = showPipeline([sh("a", "PLAYED"), sh("b", "CANCELLED")]); // 50%
    const openOnly = showPipeline([sh("c", "PROPOSED"), sh("d", "CONFIRMED")]); // null

    const noBase = compareShowPipelines(decided, openOnly);
    expect(noBase.conversionRateDelta).toBeNull();
    expect(noBase.trend).toBe("stable");

    const noCurrent = compareShowPipelines(openOnly, decided);
    expect(noCurrent.conversionRateDelta).toBeNull();
    expect(noCurrent.trend).toBe("stable");
  });
});

describe("feeTrend", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("sem shows realizados retorna tudo zerado/nulo", () => {
    const t = feeTrend([], { now });
    expect(t.months).toEqual([]);
    expect(t.totalShows).toBe(0);
    expect(t.totalFee).toBe(0);
    expect(t.avgFee).toBe(0);
    expect(t.highestFee).toBe(0);
    expect(t.lowestFee).toBe(0);
    expect(t.bestMonth).toBeNull();
    expect(t.worstMonth).toBeNull();
    expect(t.trend).toBeNull();
  });

  it("agrupa por mês cronológico com média/total/min/max por mês", () => {
    const t = feeTrend(
      [
        gig({ id: "a", date: "2026-01-05T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "b", date: "2026-01-20T20:00:00.000Z", fee: 200_00 }),
        gig({ id: "c", date: "2026-03-02T20:00:00.000Z", fee: 300_00 }),
      ],
      { now },
    );
    expect(t.months.map((m) => m.month)).toEqual(["2026-01", "2026-03"]);
    expect(t.months[0]).toMatchObject({
      count: 2,
      totalFee: 300_00,
      avgFee: 150_00,
      minFee: 100_00,
      maxFee: 200_00,
    });
    expect(t.months[1]).toMatchObject({ count: 1, avgFee: 300_00 });
    expect(t.totalShows).toBe(3);
    expect(t.totalFee).toBe(600_00);
    expect(t.avgFee).toBe(200_00);
    expect(t.highestFee).toBe(300_00);
    expect(t.lowestFee).toBe(100_00);
  });

  it("considera só shows realizados (ignora proposto, cancelado e futuro)", () => {
    const t = feeTrend(
      [
        gig({ id: "played", status: "PLAYED", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "confPast", status: "CONFIRMED", date: "2026-02-10T20:00:00.000Z" }),
        gig({ id: "confFut", status: "CONFIRMED", date: "2026-09-10T20:00:00.000Z" }),
        gig({ id: "prop", status: "PROPOSED", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2026-01-10T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(t.totalShows).toBe(2);
    expect(t.months.map((m) => m.month)).toEqual(["2026-01", "2026-02"]);
  });

  it("ignora shows sem cachê (fee <= 0)", () => {
    const t = feeTrend(
      [
        gig({ id: "a", fee: 0, date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "b", fee: 80_00, date: "2026-02-10T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(t.totalShows).toBe(1);
    expect(t.months.map((m) => m.month)).toEqual(["2026-02"]);
  });

  it("trend compara o cachê médio do mês mais recente com o do primeiro mês", () => {
    const t = feeTrend(
      [
        gig({ id: "a", date: "2026-01-10T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "b", date: "2026-04-10T20:00:00.000Z", fee: 250_00 }),
      ],
      { now },
    );
    expect(t.trend).not.toBeNull();
    expect(t.trend!.current).toBe(250_00);
    expect(t.trend!.previous).toBe(100_00);
    expect(t.trend!.delta).toBe(150_00);
    expect(t.trend!.direction).toBe("up");
    expect(t.trend!.pct).toBeCloseTo(1.5, 5);
  });

  it("trend é null com um único mês ativo", () => {
    const t = feeTrend(
      [
        gig({ id: "a", date: "2026-01-05T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "b", date: "2026-01-25T20:00:00.000Z", fee: 200_00 }),
      ],
      { now },
    );
    expect(t.months).toHaveLength(1);
    expect(t.trend).toBeNull();
  });

  it("melhor mês desempata pelo mais recente; pior pelo mais antigo", () => {
    const t = feeTrend(
      [
        gig({ id: "a", date: "2026-01-10T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "b", date: "2026-02-10T20:00:00.000Z", fee: 200_00 }),
        gig({ id: "c", date: "2026-03-10T20:00:00.000Z", fee: 100_00 }),
      ],
      { now },
    );
    // médias: jan 100, fev 200, mar 100 → melhor=fev; pior empata jan/mar → jan.
    expect(t.bestMonth?.month).toBe("2026-02");
    expect(t.worstMonth?.month).toBe("2026-01");
  });
});

describe("gigCadence", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("sem shows realizados retorna tudo zerado/nulo", () => {
    const c = gigCadence([], { now });
    expect(c.months).toEqual([]);
    expect(c.totalShows).toBe(0);
    expect(c.activeMonths).toBe(0);
    expect(c.spanMonths).toBe(0);
    expect(c.idleMonths).toBe(0);
    expect(c.avgPerActiveMonth).toBe(0);
    expect(c.avgPerMonth).toBe(0);
    expect(c.busiestMonth).toBeNull();
    expect(c.quietestMonth).toBeNull();
    expect(c.trend).toBeNull();
  });

  it("conta shows realizados por mês cronológico", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2026-01-05T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-20T20:00:00.000Z" }),
        gig({ id: "c", date: "2026-03-02T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(c.months).toEqual([
      { month: "2026-01", count: 2 },
      { month: "2026-03", count: 1 },
    ]);
    expect(c.totalShows).toBe(3);
    expect(c.activeMonths).toBe(2);
  });

  it("considera só shows realizados (ignora proposto, cancelado e futuro)", () => {
    const c = gigCadence(
      [
        gig({ id: "played", status: "PLAYED", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "confPast", status: "CONFIRMED", date: "2026-02-10T20:00:00.000Z" }),
        gig({ id: "confFut", status: "CONFIRMED", date: "2026-09-10T20:00:00.000Z" }),
        gig({ id: "prop", status: "PROPOSED", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2026-01-10T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(c.totalShows).toBe(2);
    expect(c.months.map((m) => m.month)).toEqual(["2026-01", "2026-02"]);
  });

  it("conta gigs de cachê 0 (atividade, não preço) — distinto de feeTrend", () => {
    const c = gigCadence(
      [
        gig({ id: "free", fee: 0, date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "paid", fee: 80_00, date: "2026-01-20T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(c.totalShows).toBe(2);
    expect(c.months).toEqual([{ month: "2026-01", count: 2 }]);
  });

  it("span e meses parados medem o intervalo do primeiro ao último gig", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-04-10T20:00:00.000Z" }),
      ],
      { now },
    );
    // jan e abr ativos; janela jan→abr = 4 meses; 2 ativos → 2 parados (fev, mar).
    expect(c.activeMonths).toBe(2);
    expect(c.spanMonths).toBe(4);
    expect(c.idleMonths).toBe(2);
    expect(c.avgPerActiveMonth).toBe(1);
    expect(c.avgPerMonth).toBe(0.5);
  });

  it("span cruza a virada de ano e nunca tem mês parado negativo", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2025-11-10T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-02-10T20:00:00.000Z" }),
      ],
      { now },
    );
    // nov/2025 → fev/2026 = 4 meses de janela.
    expect(c.spanMonths).toBe(4);
    expect(c.idleMonths).toBe(2);
  });

  it("média por mês ativo arredonda a 1 casa decimal", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2026-01-05T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-15T20:00:00.000Z" }),
        gig({ id: "c", date: "2026-02-05T20:00:00.000Z" }),
      ],
      { now },
    );
    // 3 shows / 2 meses ativos = 1.5; janela contígua (jan, fev) → idem.
    expect(c.avgPerActiveMonth).toBe(1.5);
    expect(c.idleMonths).toBe(0);
  });

  it("mais cheio desempata pelo mais recente; mais vazio pelo mais antigo", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "b1", date: "2026-02-05T20:00:00.000Z" }),
        gig({ id: "b2", date: "2026-02-15T20:00:00.000Z" }),
        gig({ id: "c", date: "2026-03-10T20:00:00.000Z" }),
      ],
      { now },
    );
    // contagens: jan 1, fev 2, mar 1 → mais cheio fev; mais vazio empata jan/mar → jan.
    expect(c.busiestMonth?.month).toBe("2026-02");
    expect(c.quietestMonth?.month).toBe("2026-01");
  });

  it("trend compara a contagem do mês mais recente com a do primeiro", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "b1", date: "2026-04-05T20:00:00.000Z" }),
        gig({ id: "b2", date: "2026-04-15T20:00:00.000Z" }),
        gig({ id: "b3", date: "2026-04-25T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(c.trend).not.toBeNull();
    expect(c.trend!.current).toBe(3);
    expect(c.trend!.previous).toBe(1);
    expect(c.trend!.direction).toBe("up");
    expect(c.trend!.pct).toBeCloseTo(2, 5);
  });

  it("trend é null com um único mês ativo", () => {
    const c = gigCadence(
      [
        gig({ id: "a", date: "2026-01-05T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-25T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(c.activeMonths).toBe(1);
    expect(c.spanMonths).toBe(1);
    expect(c.trend).toBeNull();
  });
});

describe("feeBandKeyFor", () => {
  it("classifica pelos limites (min inclusivo, max exclusivo)", () => {
    expect(feeBandKeyFor(0)).toBe("lt500");
    expect(feeBandKeyFor(499_99)).toBe("lt500");
    expect(feeBandKeyFor(500_00)).toBe("500to1k"); // limite cai na faixa de cima
    expect(feeBandKeyFor(999_99)).toBe("500to1k");
    expect(feeBandKeyFor(1_000_00)).toBe("1kto2k");
    expect(feeBandKeyFor(2_000_00)).toBe("2kto3_5k");
    expect(feeBandKeyFor(3_500_00)).toBe("3_5kto5k");
    expect(feeBandKeyFor(5_000_00)).toBe("gte5k");
    expect(feeBandKeyFor(50_000_00)).toBe("gte5k"); // sem teto
  });
});

describe("feeDistribution", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("sem shows realizados retorna tudo zerado/nulo, mas com as 6 faixas", () => {
    const d = feeDistribution([], { now });
    expect(d.bands).toHaveLength(FEE_BANDS.length);
    expect(d.bands.map((b) => b.key)).toEqual(FEE_BANDS.map((b) => b.key));
    expect(d.bands.every((b) => b.count === 0 && b.totalFee === 0)).toBe(true);
    expect(d.totalShows).toBe(0);
    expect(d.totalFee).toBe(0);
    expect(d.avgFee).toBe(0);
    expect(d.medianFee).toBe(0);
    expect(d.modalBand).toBeNull();
    expect(d.topValueBand).toBeNull();
  });

  it("distribui os cachês pelas faixas com count/total e participações", () => {
    const d = feeDistribution(
      [
        gig({ id: "a", fee: 300_00 }), // lt500
        gig({ id: "b", fee: 400_00 }), // lt500
        gig({ id: "c", fee: 800_00 }), // 500to1k
        gig({ id: "d", fee: 1_500_00 }), // 1kto2k
      ],
      { now },
    );
    expect(d.totalShows).toBe(4);
    expect(d.totalFee).toBe(3_000_00);
    const byKey = Object.fromEntries(d.bands.map((b) => [b.key, b]));
    expect(byKey.lt500.count).toBe(2);
    expect(byKey.lt500.totalFee).toBe(700_00);
    expect(byKey.lt500.countShare).toBeCloseTo(0.5, 5);
    expect(byKey.lt500.feeShare).toBeCloseTo(700_00 / 3_000_00, 5);
    expect(byKey["500to1k"].count).toBe(1);
    expect(byKey["1kto2k"].count).toBe(1);
    expect(byKey.gte5k.count).toBe(0);
  });

  it("considera só shows realizados com cachê > 0", () => {
    const d = feeDistribution(
      [
        gig({ id: "played", status: "PLAYED", fee: 300_00 }),
        gig({ id: "confPast", status: "CONFIRMED", date: "2026-02-10T20:00:00.000Z", fee: 400_00 }),
        gig({ id: "confFut", status: "CONFIRMED", date: "2026-09-10T20:00:00.000Z", fee: 400_00 }),
        gig({ id: "prop", status: "PROPOSED", fee: 400_00 }),
        gig({ id: "canc", status: "CANCELLED", fee: 400_00 }),
        gig({ id: "free", status: "PLAYED", fee: 0 }),
      ],
      { now },
    );
    expect(d.totalShows).toBe(2);
    expect(d.totalFee).toBe(700_00);
  });

  it("avgFee e medianFee (ímpar = central; média sensível a outlier)", () => {
    const d = feeDistribution(
      [
        gig({ id: "a", fee: 100_00 }),
        gig({ id: "b", fee: 200_00 }),
        gig({ id: "c", fee: 5_000_00 }), // outlier puxa a média, não a mediana
      ],
      { now },
    );
    expect(d.medianFee).toBe(200_00);
    expect(d.avgFee).toBe(Math.round(5_300_00 / 3));
  });

  it("medianFee com nº par = média arredondada dos dois centrais", () => {
    const d = feeDistribution(
      [
        gig({ id: "a", fee: 100_00 }),
        gig({ id: "b", fee: 201_00 }),
        gig({ id: "c", fee: 400_00 }),
        gig({ id: "d", fee: 900_00 }),
      ],
      { now },
    );
    // centrais: 201_00 e 400_00 → (60100 + 40000)/2 = 30050.5 → 30051? Não:
    // (201_00 + 400_00)/2 = (20100 + 40000)/2 = 30050 → R$ 300,50.
    expect(d.medianFee).toBe(30050);
  });

  it("modalBand é a faixa com mais shows; topValueBand a de maior faturamento", () => {
    const d = feeDistribution(
      [
        gig({ id: "a", fee: 100_00 }), // lt500
        gig({ id: "b", fee: 200_00 }), // lt500
        gig({ id: "c", fee: 300_00 }), // lt500  → 3 shows, R$ 600 total
        gig({ id: "d", fee: 8_000_00 }), // gte5k → 1 show, R$ 8.000 total
      ],
      { now },
    );
    expect(d.modalBand?.key).toBe("lt500"); // 3 shows
    expect(d.topValueBand?.key).toBe("gte5k"); // R$ 8.000 > R$ 600
  });

  it("empate em modalBand prefere a faixa mais alta", () => {
    const d = feeDistribution(
      [
        gig({ id: "a", fee: 300_00 }), // lt500 (1 show)
        gig({ id: "b", fee: 1_500_00 }), // 1kto2k (1 show)
      ],
      { now },
    );
    // ambas com 1 show; desempate → faixa mais alta com maior faturamento.
    expect(d.modalBand?.key).toBe("1kto2k");
  });
});

describe("feeDistributionYears", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 500_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("retorna os anos (UTC, decrescente) só de shows realizados com cachê > 0", () => {
    const years = feeDistributionYears(
      [
        gig({ id: "a", date: "2024-05-10T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "c", date: "2025-03-10T20:00:00.000Z" }),
        gig({ id: "dup", date: "2026-09-10T20:00:00.000Z", status: "PLAYED" }), // mesmo ano 2026
      ],
      { now },
    );
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it("ignora propostos, cancelados, futuros e gigs sem cachê", () => {
    const years = feeDistributionYears(
      [
        gig({ id: "prop", status: "PROPOSED", date: "2023-01-10T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2022-01-10T20:00:00.000Z" }),
        gig({ id: "fut", status: "CONFIRMED", date: "2027-01-10T20:00:00.000Z" }),
        gig({ id: "free", status: "PLAYED", fee: 0, date: "2021-01-10T20:00:00.000Z" }),
        gig({ id: "ok", status: "PLAYED", date: "2025-01-10T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(years).toEqual([2025]);
  });

  it("usa o ano UTC (não o local) na virada do dia", () => {
    // 2025-12-31T23:00:00Z ainda é 2025 em UTC.
    const years = feeDistributionYears(
      [gig({ id: "a", date: "2025-12-31T23:00:00.000Z" })],
      { now },
    );
    expect(years).toEqual([2025]);
  });

  it("sem shows elegíveis retorna lista vazia", () => {
    expect(feeDistributionYears([], { now })).toEqual([]);
  });
});

describe("compareFeeDistribution", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  /** Distribuição de uma lista de cachês (centavos). */
  function distOf(...fees: number[]): FeeDistribution {
    return feeDistribution(
      fees.map((fee, i) => gig({ id: `g${i}`, fee })),
      { now },
    );
  }

  it("mediana subindo além do limiar → up, com deltas e pct", () => {
    const current = distOf(1_000_00, 1_200_00, 1_400_00); // mediana 1.200
    const previous = distOf(800_00, 1_000_00, 1_200_00); // mediana 1.000
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.trend).toBe("up");
    expect(cmp.medianFeeDelta).toBe(200_00);
    expect(cmp.medianFeePct).toBeCloseTo(0.2, 5);
    expect(cmp.avgFeeDelta).toBe(current.avgFee - previous.avgFee);
  });

  it("mediana caindo além do limiar → down (delta negativo)", () => {
    const current = distOf(500_00, 600_00, 700_00); // mediana 600
    const previous = distOf(900_00, 1_000_00, 1_100_00); // mediana 1.000
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.trend).toBe("down");
    expect(cmp.medianFeeDelta).toBe(-400_00);
    expect(cmp.medianFeePct).toBeCloseTo(-0.4, 5);
  });

  it("variação relativa abaixo de 5% → stable mesmo com delta acima do piso", () => {
    // 2.000 → 2.060 = +3% (< 5%), mas +R$ 60 (> R$ 50): ainda estável.
    const current = distOf(2_060_00);
    const previous = distOf(2_000_00);
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.medianFeeDelta).toBe(60_00);
    expect(cmp.trend).toBe("stable");
  });

  it("variação absoluta abaixo do piso → stable mesmo com pct grande", () => {
    // 100 → 140 = +40% (>> 5%), mas só +R$ 40 (< R$ 50): estável (troco).
    const current = distOf(140_00);
    const previous = distOf(100_00);
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.medianFeeDelta).toBe(40_00);
    expect(cmp.trend).toBe("stable");
  });

  it("sem mediana no ano anterior → pct null, mas ainda decide pelo piso", () => {
    const current = distOf(1_000_00);
    const previous = feeDistribution([], { now }); // medianFee 0
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.medianFeePct).toBeNull();
    expect(cmp.trend).toBe("up");
  });

  it("participação premium (faixa 'acima de R$ 5.000') sobe entre os anos", () => {
    // Atual: 1 de 4 shows na faixa premium (25%). Anterior: 0 de 4 (0%).
    const current = distOf(6_000_00, 1_000_00, 1_000_00, 1_000_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00, 1_000_00);
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.premiumShareCurrent).toBeCloseTo(0.25, 5);
    expect(cmp.premiumSharePrevious).toBe(0);
    expect(cmp.premiumShareDelta).toBeCloseTo(0.25, 5);
  });

  it("participação premium capta migração para o topo mesmo com mediana estável", () => {
    // Mediana idêntica (1.000) nos dois anos, mas a cauda de cima engordou:
    // atual tem 2 shows premium, anterior tem 0 — a mediana não vê, o premium sim.
    const current = distOf(1_000_00, 1_000_00, 1_000_00, 8_000_00, 9_000_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00, 900_00, 900_00);
    const cmp = compareFeeDistribution(current, previous);
    expect(current.medianFee).toBe(previous.medianFee); // mesma mediana (1.000)
    expect(cmp.premiumShareCurrent).toBeCloseTo(2 / 5, 5);
    expect(cmp.premiumSharePrevious).toBe(0);
    expect(cmp.premiumShareDelta).toBeGreaterThan(0);
  });

  it("premiumBandShare lê o countShare da faixa premium direto da distribuição", () => {
    const dist = distOf(6_000_00, 6_000_00, 1_000_00, 1_000_00); // 2 de 4 premium
    expect(premiumBandShare(dist)).toBeCloseTo(0.5, 5);
    expect(premiumBandShare(feeDistribution([], { now }))).toBe(0); // vazio → 0
  });

  it("bandChanges traz sempre as 6 faixas na ordem canônica de FEE_BANDS", () => {
    const cmp = compareFeeDistribution(distOf(1_000_00), distOf(6_000_00));
    expect(cmp.bandChanges).toHaveLength(FEE_BANDS.length);
    expect(cmp.bandChanges.map((c) => c.key)).toEqual(FEE_BANDS.map((b) => b.key));
    expect(cmp.bandChanges.map((c) => c.label)).toEqual(FEE_BANDS.map((b) => b.label));
  });

  it("bandChanges capta a migração de faixa (delta da participação por degrau)", () => {
    // Atual: 2 de 4 na faixa premium (50%). Anterior: 0 de 4 (0%) — subiu +50 p.p.
    // no topo; a faixa "R$ 1.000 – 2.000" caiu de 100% para 50% (−50 p.p.).
    const current = distOf(6_000_00, 6_000_00, 1_000_00, 1_000_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00, 1_000_00);
    const cmp = compareFeeDistribution(current, previous);
    const byKey = indexFeeBandShareChanges(cmp);
    const premium = byKey.get("gte5k")!;
    expect(premium.currentCountShare).toBeCloseTo(0.5, 5);
    expect(premium.previousCountShare).toBe(0);
    expect(premium.countShareDelta).toBeCloseTo(0.5, 5);
    expect(premium.currentCount).toBe(2);
    expect(premium.previousCount).toBe(0);
    const mid = byKey.get("1kto2k")!;
    expect(mid.previousCountShare).toBeCloseTo(1, 5);
    expect(mid.currentCountShare).toBeCloseTo(0.5, 5);
    expect(mid.countShareDelta).toBeCloseTo(-0.5, 5);
  });

  it("faixa vazia nos dois anos fica com delta zero (nada a comparar)", () => {
    const cmp = compareFeeDistribution(distOf(1_000_00), distOf(1_000_00));
    const byKey = indexFeeBandShareChanges(cmp);
    const premium = byKey.get("gte5k")!;
    expect(premium.currentCount).toBe(0);
    expect(premium.previousCount).toBe(0);
    expect(premium.countShareDelta).toBe(0);
  });

  it("sem base no ano anterior → cada faixa preenchida do atual vira +participação", () => {
    const cmp = compareFeeDistribution(distOf(1_000_00), feeDistribution([], { now }));
    const byKey = indexFeeBandShareChanges(cmp);
    const mid = byKey.get("1kto2k")!;
    expect(mid.previousCount).toBe(0);
    expect(mid.previousCountShare).toBe(0);
    expect(mid.currentCountShare).toBeCloseTo(1, 5);
    expect(mid.countShareDelta).toBeCloseTo(1, 5);
  });

  it("indexFeeBandShareChanges mapeia cada faixa por chave", () => {
    const cmp = compareFeeDistribution(distOf(6_000_00), distOf(1_000_00));
    const byKey = indexFeeBandShareChanges(cmp);
    expect(byKey.size).toBe(FEE_BANDS.length);
    for (const b of FEE_BANDS) {
      expect(byKey.get(b.key)?.key).toBe(b.key);
    }
  });
});

describe("feeDropHeadline", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  function distOf(...fees: number[]): FeeDistribution {
    return feeDistribution(
      fees.map((fee, i) => gig({ id: `g${i}`, fee })),
      { now },
    );
  }

  it("mediana caindo materialmente com amostra confiável → show, não crítico", () => {
    const current = distOf(800_00, 800_00, 800_00); // mediana 800
    const previous = distOf(1_000_00, 1_000_00, 1_000_00); // mediana 1.000
    const head = feeDropHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(true);
    expect(head.critical).toBe(false); // 800/1000 = 0,8 > 0,75
    expect(head.currentMedian).toBe(800_00);
    expect(head.previousMedian).toBe(1_000_00);
    expect(head.medianFeeDelta).toBe(-200_00);
    expect(head.pct).toBeCloseTo(-0.2, 5);
    expect(head.currentShows).toBe(3);
    expect(head.previousShows).toBe(3);
  });

  it("queda de 25% ou mais → crítico", () => {
    const current = distOf(700_00, 700_00, 700_00); // mediana 700
    const previous = distOf(1_000_00, 1_000_00, 1_000_00); // mediana 1.000
    const head = feeDropHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(true);
    expect(head.critical).toBe(true); // 700/1000 = 0,7 ≤ 0,75
  });

  it("cachê mediano subindo → não vira nudge", () => {
    const current = distOf(1_200_00, 1_200_00, 1_200_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00);
    const head = feeDropHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(false);
    expect(head.critical).toBe(false);
  });

  it("variação dentro do limiar (estável) → não vira nudge", () => {
    const current = distOf(1_020_00, 1_020_00, 1_020_00); // +R$ 20 (< piso R$ 50)
    const previous = distOf(1_000_00, 1_000_00, 1_000_00);
    const head = feeDropHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(false);
  });

  it("amostra fina em um dos anos suprime o nudge mesmo com queda material", () => {
    const current = distOf(600_00, 600_00); // só 2 shows (< FEE_DROP_MIN_SAMPLE)
    const previous = distOf(1_000_00, 1_000_00, 1_000_00);
    const head = feeDropHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(false);
    // Ainda reporta os fatos para quem quiser o detalhe.
    expect(head.currentShows).toBe(2);
    expect(head.previousShows).toBe(3);
  });

  it("limiares parametrizáveis: minSample maior barra o nudge", () => {
    const current = distOf(700_00, 700_00, 700_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00);
    expect(feeDropHeadline(compareFeeDistribution(current, previous), 5).show).toBe(false);
  });
});

describe("feePremiumErosionHeadline", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  function distOf(...fees: number[]): FeeDistribution {
    return feeDistribution(
      fees.map((fee, i) => gig({ id: `g${i}`, fee })),
      { now },
    );
  }

  it("faixa premium esvaziando com mediana firme → show, não crítico", () => {
    // Mediana estável (1.000 nos dois anos), mas o topo secou: anterior 2/5 = 40%
    // premium, atual 0/5 = 0% → −40 p.p. (≥ 15, mas a mediana não caiu).
    const current = distOf(1_000_00, 1_000_00, 1_000_00, 900_00, 900_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00, 6_000_00, 7_000_00);
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.trend).toBe("stable"); // a mediana não é o titular aqui
    const head = feePremiumErosionHeadline(cmp);
    expect(head.show).toBe(true);
    expect(head.critical).toBe(true); // 40 p.p. ≥ 30 → crítico
    expect(head.premiumSharePrevious).toBeCloseTo(0.4, 5);
    expect(head.premiumShareCurrent).toBe(0);
    expect(head.premiumShareDelta).toBeCloseTo(-0.4, 5);
    expect(head.currentShows).toBe(5);
    expect(head.previousShows).toBe(5);
  });

  it("erosão material mas abaixo de 30 p.p. → show, não crítico", () => {
    // Anterior 2/10 = 20% premium; atual 0/10 = 0% → −20 p.p. (≥ 15, < 30).
    const current = distOf(...Array(10).fill(1_000_00));
    const previous = distOf(...Array(8).fill(1_000_00), 6_000_00, 7_000_00);
    const cmp = compareFeeDistribution(current, previous);
    const head = feePremiumErosionHeadline(cmp);
    expect(head.show).toBe(true);
    expect(head.critical).toBe(false);
    expect(head.premiumShareDelta).toBeCloseTo(-0.2, 5);
  });

  it("cede a vez ao feeDropHeadline: mediana em queda suprime o nudge premium", () => {
    // O topo esvaziou E a mediana caiu — o titular é a queda da mediana (D274),
    // não este banner (evita dois avisos de cachê no Painel).
    const current = distOf(600_00, 600_00, 600_00, 600_00, 600_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00, 6_000_00, 7_000_00);
    const cmp = compareFeeDistribution(current, previous);
    expect(cmp.trend).toBe("down");
    expect(cmp.premiumShareDelta).toBeLessThan(0); // o premium também caiu
    expect(feePremiumErosionHeadline(cmp).show).toBe(false);
  });

  it("faixa premium subindo/estável → não vira nudge", () => {
    const current = distOf(1_000_00, 1_000_00, 6_000_00, 7_000_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00, 1_000_00);
    const head = feePremiumErosionHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(false);
    expect(head.premiumShareDelta).toBeGreaterThan(0);
  });

  it("sem base premium no ano anterior → nada a erodir, não dispara", () => {
    // Nunca houve cachê de topo; a participação não pode "cair".
    const current = distOf(1_000_00, 1_000_00, 1_000_00);
    const previous = distOf(1_000_00, 1_000_00, 1_000_00);
    const head = feePremiumErosionHeadline(compareFeeDistribution(current, previous));
    expect(head.premiumSharePrevious).toBe(0);
    expect(head.show).toBe(false);
  });

  it("erosão pequena (abaixo do piso de 15 p.p.) → não dispara", () => {
    // Anterior 1/10 = 10% premium; atual 0/10 = 0% → −10 p.p. (< 15).
    const current = distOf(...Array(10).fill(1_000_00));
    const previous = distOf(...Array(9).fill(1_000_00), 6_000_00);
    const head = feePremiumErosionHeadline(compareFeeDistribution(current, previous));
    expect(head.premiumShareDelta).toBeCloseTo(-0.1, 5);
    expect(head.show).toBe(false);
  });

  it("amostra fina em um dos anos suprime o nudge mesmo com erosão material", () => {
    const current = distOf(1_000_00, 1_000_00); // só 2 shows (< minSample)
    const previous = distOf(6_000_00, 7_000_00, 1_000_00);
    const head = feePremiumErosionHeadline(compareFeeDistribution(current, previous));
    expect(head.show).toBe(false);
    expect(head.currentShows).toBe(2);
  });

  it("limiares parametrizáveis: minPoints maior barra o nudge", () => {
    const current = distOf(...Array(10).fill(1_000_00));
    const previous = distOf(...Array(8).fill(1_000_00), 6_000_00, 7_000_00); // −20 p.p.
    const cmp = compareFeeDistribution(current, previous);
    expect(feePremiumErosionHeadline(cmp).show).toBe(true);
    expect(feePremiumErosionHeadline(cmp, 3, 0.25).show).toBe(false); // exige 25 p.p.
  });
});

describe("weekdayPerformanceYears", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 500_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("retorna os anos (UTC, decrescente) só de shows realizados com cachê > 0", () => {
    const years = weekdayPerformanceYears(
      [
        gig({ id: "a", date: "2024-05-10T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "c", date: "2025-03-10T20:00:00.000Z" }),
        gig({ id: "dup", date: "2026-09-10T20:00:00.000Z" }), // mesmo ano 2026
      ],
      { now },
    );
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it("ignora propostos, cancelados, futuros e gigs sem cachê", () => {
    const years = weekdayPerformanceYears(
      [
        gig({ id: "prop", status: "PROPOSED", date: "2023-01-10T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2022-01-10T20:00:00.000Z" }),
        gig({ id: "fut", status: "CONFIRMED", date: "2027-01-10T20:00:00.000Z" }),
        gig({ id: "free", status: "PLAYED", fee: 0, date: "2021-01-10T20:00:00.000Z" }),
        gig({ id: "ok", status: "PLAYED", date: "2025-01-10T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(years).toEqual([2025]);
  });

  it("usa o ano UTC (não o local) na virada do dia", () => {
    // 2025-12-31T23:00:00Z ainda é 2025 em UTC.
    const years = weekdayPerformanceYears(
      [gig({ id: "a", date: "2025-12-31T23:00:00.000Z" })],
      { now },
    );
    expect(years).toEqual([2025]);
  });

  it("sem shows elegíveis retorna lista vazia", () => {
    expect(weekdayPerformanceYears([], { now })).toEqual([]);
  });

  it("oferece exatamente os anos com dias ativos em weekdayPerformance (gate compartilhado)", () => {
    // Invariante de reuso: o seletor nunca deve oferecer um ano que renderia
    // tabela vazia. Para cada ano retornado, o recorte daquele ano tem
    // totalShows > 0; e nenhum ano elegível fica de fora.
    const dataset = [
      gig({ id: "a", date: "2024-05-10T20:00:00.000Z" }),
      gig({ id: "b", date: "2025-03-12T20:00:00.000Z" }),
      gig({ id: "c", date: "2026-01-10T20:00:00.000Z" }),
      gig({ id: "prop", status: "PROPOSED", date: "2023-01-10T20:00:00.000Z" }),
      gig({ id: "free", fee: 0, date: "2022-01-10T20:00:00.000Z" }),
    ];
    const years = weekdayPerformanceYears(dataset, { now });
    expect(years).toEqual([2026, 2025, 2024]);
    for (const y of years) {
      const slice = filterShowsByYear(
        dataset.map((s) => ({ ...s, date: new Date(s.date) })),
        y,
      );
      expect(weekdayPerformance(slice, { now }).totalShows).toBeGreaterThan(0);
    }
  });
});

describe("weekdayPerformance", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  // Datas-âncora em 2026 (UTC): Jan 1 = quinta.
  // Sexta = Jan 2/9 ; Sábado = Jan 3/10/17 ; Domingo = Jan 4/11 ;
  // Segunda = Jan 5/12 ; Terça = Jan 6.
  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z", // sábado
      ...partial,
    };
  }

  it("sem shows realizados retorna 7 dias zerados e destaques nulos", () => {
    const w = weekdayPerformance([], { now });
    expect(w.days).toHaveLength(7);
    expect(w.days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(w.days.every((d) => d.count === 0 && d.totalFee === 0)).toBe(true);
    expect(w.totalShows).toBe(0);
    expect(w.totalFee).toBe(0);
    expect(w.avgFee).toBe(0);
    expect(w.bestByAvg).toBeNull();
    expect(w.bestByVolume).toBeNull();
    expect(w.busiest).toBeNull();
  });

  it("agrega por dia da semana com média, total e participações", () => {
    const w = weekdayPerformance(
      [
        gig({ id: "sat1", date: "2026-01-03T20:00:00.000Z", fee: 300_00 }),
        gig({ id: "sat2", date: "2026-01-10T20:00:00.000Z", fee: 500_00 }),
        gig({ id: "fri1", date: "2026-01-02T20:00:00.000Z", fee: 200_00 }),
      ],
      { now },
    );
    const sat = w.days[6];
    const fri = w.days[5];
    expect(sat).toMatchObject({ count: 2, totalFee: 800_00, avgFee: 400_00 });
    expect(fri).toMatchObject({ count: 1, totalFee: 200_00, avgFee: 200_00 });
    expect(sat.countShare).toBeCloseTo(2 / 3, 5);
    expect(sat.feeShare).toBeCloseTo(0.8, 5);
    expect(w.totalShows).toBe(3);
    expect(w.totalFee).toBe(1000_00);
    expect(w.avgFee).toBe(Math.round(1000_00 / 3));
    // Dias sem shows seguem zerados.
    expect(w.days[0].count).toBe(0);
  });

  it("considera só shows realizados (ignora proposto, cancelado e futuro)", () => {
    const w = weekdayPerformance(
      [
        gig({ id: "played", status: "PLAYED", date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "confPast", status: "CONFIRMED", date: "2026-01-03T20:00:00.000Z" }),
        gig({ id: "confFut", status: "CONFIRMED", date: "2026-09-12T20:00:00.000Z" }),
        gig({ id: "prop", status: "PROPOSED", date: "2026-01-04T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2026-01-05T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(w.totalShows).toBe(2); // só os dois sábados
    expect(w.days[6].count).toBe(2);
  });

  it("ignora shows sem cachê (fee <= 0)", () => {
    const w = weekdayPerformance(
      [
        gig({ id: "a", fee: 0, date: "2026-01-10T20:00:00.000Z" }),
        gig({ id: "b", fee: 80_00, date: "2026-01-02T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(w.totalShows).toBe(1);
    expect(w.days[5].count).toBe(1); // sexta
    expect(w.days[6].count).toBe(0); // sábado (fee 0 ignorado)
  });

  it("destaca melhor por média, por volume e mais movimentado", () => {
    const w = weekdayPerformance(
      [
        // Domingo: 1 show de 100 → avg 100, total 100
        gig({ id: "sun", date: "2026-01-04T20:00:00.000Z", fee: 100_00 }),
        // Sexta: 2 shows de 150 → avg 150, total 300
        gig({ id: "fri1", date: "2026-01-02T20:00:00.000Z", fee: 150_00 }),
        gig({ id: "fri2", date: "2026-01-09T20:00:00.000Z", fee: 150_00 }),
        // Sábado: 1 show de 600 → avg 600, total 600
        gig({ id: "sat", date: "2026-01-10T20:00:00.000Z", fee: 600_00 }),
      ],
      { now },
    );
    expect(w.bestByAvg?.weekday).toBe(6); // sábado (600)
    expect(w.bestByVolume?.weekday).toBe(6); // sábado (600 total)
    expect(w.busiest?.weekday).toBe(5); // sexta (2 shows)
  });

  it("empate total de destaque resolve pelo dia mais cedo da semana", () => {
    const w = weekdayPerformance(
      [
        gig({ id: "mon", date: "2026-01-05T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "sun", date: "2026-01-04T20:00:00.000Z", fee: 100_00 }),
      ],
      { now },
    );
    // Domingo (0) e segunda (1) idênticos → escolhe domingo.
    expect(w.bestByAvg?.weekday).toBe(0);
    expect(w.bestByVolume?.weekday).toBe(0);
    expect(w.busiest?.weekday).toBe(0);
  });

  it("empate de média desempata pelo dia com mais shows", () => {
    const w = weekdayPerformance(
      [
        // Terça: 2 shows de 100 → avg 100, count 2
        gig({ id: "tue1", date: "2026-01-06T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "tue2", date: "2026-01-13T20:00:00.000Z", fee: 100_00 }),
        // Domingo: 1 show de 100 → avg 100, count 1
        gig({ id: "sun", date: "2026-01-04T20:00:00.000Z", fee: 100_00 }),
      ],
      { now },
    );
    // Mesma média (100), terça tem mais shows → vence o desempate.
    expect(w.bestByAvg?.weekday).toBe(2);
  });
});

describe("weekdaySplit", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  // Âncoras UTC em 2026: sexta = Jan 2/9 ; sábado = Jan 3/10 ; domingo = Jan 4 ;
  // segunda = Jan 5 ; terça = Jan 6 ; quarta = Jan 7 ; quinta = Jan 1/8.
  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z", // sábado
      ...partial,
    };
  }

  it("o fim de semana é sexta, sábado e domingo (5, 6, 0)", () => {
    expect([...WEEKEND_WEEKDAYS].sort()).toEqual([0, 5, 6]);
  });

  it("separa sex/sáb/dom dos dias de semana, com médias e participações", () => {
    const wp = weekdayPerformance(
      [
        gig({ id: "fri", date: "2026-01-02T20:00:00.000Z", fee: 400_00 }), // sexta
        gig({ id: "sat", date: "2026-01-03T20:00:00.000Z", fee: 600_00 }), // sábado
        gig({ id: "sun", date: "2026-01-04T20:00:00.000Z", fee: 500_00 }), // domingo
        gig({ id: "mon", date: "2026-01-05T20:00:00.000Z", fee: 200_00 }), // segunda
        gig({ id: "wed", date: "2026-01-07T20:00:00.000Z", fee: 100_00 }), // quarta
      ],
      { now },
    );
    const split = weekdaySplit(wp);

    // Fim de semana: 3 shows, R$ 1.500, média 500.
    expect(split.weekend.count).toBe(3);
    expect(split.weekend.totalFee).toBe(1_500_00);
    expect(split.weekend.avgFee).toBe(500_00);
    expect(split.weekend.countShare).toBeCloseTo(3 / 5, 5);
    expect(split.weekend.feeShare).toBeCloseTo(1_500_00 / 1_800_00, 5);

    // Dias de semana: 2 shows, R$ 300, média 150.
    expect(split.weekday.count).toBe(2);
    expect(split.weekday.totalFee).toBe(300_00);
    expect(split.weekday.avgFee).toBe(150_00);
    expect(split.weekday.countShare).toBeCloseTo(2 / 5, 5);

    // Os dois blocos cobrem exatamente o total do período.
    expect(split.weekend.count + split.weekday.count).toBe(wp.totalShows);
    expect(split.weekend.totalFee + split.weekday.totalFee).toBe(wp.totalFee);
    expect(split.weekend.feeShare + split.weekday.feeShare).toBeCloseTo(1, 5);
  });

  it("só fim de semana → dias de semana zerados (média 0, sem divisão por zero)", () => {
    const wp = weekdayPerformance(
      [gig({ id: "sat", date: "2026-01-10T20:00:00.000Z", fee: 300_00 })],
      { now },
    );
    const split = weekdaySplit(wp);
    expect(split.weekend.count).toBe(1);
    expect(split.weekend.feeShare).toBe(1);
    expect(split.weekday.count).toBe(0);
    expect(split.weekday.totalFee).toBe(0);
    expect(split.weekday.avgFee).toBe(0);
    expect(split.weekday.countShare).toBe(0);
    expect(split.weekday.feeShare).toBe(0);
  });

  it("sem shows → ambos os blocos zerados", () => {
    const split = weekdaySplit(weekdayPerformance([], { now }));
    for (const bucket of [split.weekend, split.weekday]) {
      expect(bucket).toMatchObject({
        count: 0,
        totalFee: 0,
        avgFee: 0,
        countShare: 0,
        feeShare: 0,
      });
    }
  });
});

describe("gigSeasonalityYears", () => {
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("sem gigs contáveis retorna vazio", () => {
    expect(gigSeasonalityYears([], { now })).toEqual([]);
  });

  it("anos (UTC) distintos em ordem decrescente, só dos gigs que entram", () => {
    const years = gigSeasonalityYears(
      [
        gig({ id: "a", date: "2024-03-10T20:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-05T20:00:00.000Z" }),
        gig({ id: "c", date: "2024-11-20T20:00:00.000Z" }), // mesmo ano de "a"
        // confirmado com data passada também conta (isHappenedGig)
        gig({ id: "d", status: "CONFIRMED", date: "2025-02-01T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it("ignora proposto, cancelado, futuro e cachê zero (mesmo critério de gigSeasonality)", () => {
    const years = gigSeasonalityYears(
      [
        gig({ id: "prop", status: "PROPOSED", date: "2023-04-10T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2022-04-10T20:00:00.000Z" }),
        gig({ id: "fut", status: "CONFIRMED", date: "2028-04-10T20:00:00.000Z" }),
        gig({ id: "free", fee: 0, date: "2021-04-10T20:00:00.000Z" }),
        gig({ id: "ok", date: "2026-04-10T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(years).toEqual([2026]);
  });

  it("consistente com gigSeasonality: cada ano retornado rende uma sazonalidade não-vazia", () => {
    const shows = [
      gig({ id: "a", date: "2024-03-10T20:00:00.000Z" }),
      gig({ id: "b", date: "2026-01-05T20:00:00.000Z" }),
    ];
    for (const y of gigSeasonalityYears(shows, { now })) {
      const filtered = shows.filter((s) => new Date(s.date).getUTCFullYear() === y);
      expect(gigSeasonality(filtered, { now }).totalShows).toBeGreaterThan(0);
    }
  });
});

describe("gigSeasonality", () => {
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-10T20:00:00.000Z", // março
      ...partial,
    };
  }

  it("sem shows realizados retorna 12 meses zerados e destaques nulos", () => {
    const s = gigSeasonality([], { now });
    expect(s.months).toHaveLength(12);
    expect(s.months.map((m) => m.month)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(s.months.every((m) => m.count === 0 && m.totalFee === 0)).toBe(true);
    expect(s.totalShows).toBe(0);
    expect(s.totalFee).toBe(0);
    expect(s.avgFee).toBe(0);
    expect(s.bestByAvg).toBeNull();
    expect(s.bestByVolume).toBeNull();
    expect(s.busiest).toBeNull();
    expect(s.quietest).toBeNull();
  });

  it("colapsa todos os anos no mesmo mês do calendário", () => {
    const s = gigSeasonality(
      [
        gig({ id: "jan23", date: "2023-01-15T20:00:00.000Z", fee: 200_00 }),
        gig({ id: "jan24", date: "2024-01-20T20:00:00.000Z", fee: 400_00 }),
        gig({ id: "mar24", date: "2024-03-05T20:00:00.000Z", fee: 300_00 }),
      ],
      { now },
    );
    const jan = s.months[0];
    const mar = s.months[2];
    expect(jan).toMatchObject({ count: 2, totalFee: 600_00, avgFee: 300_00 });
    expect(mar).toMatchObject({ count: 1, totalFee: 300_00, avgFee: 300_00 });
    expect(jan.countShare).toBeCloseTo(2 / 3, 5);
    expect(jan.feeShare).toBeCloseTo(600_00 / 900_00, 5);
    expect(s.totalShows).toBe(3);
    expect(s.totalFee).toBe(900_00);
    expect(s.avgFee).toBe(300_00);
    // Meses sem shows seguem zerados.
    expect(s.months[5].count).toBe(0);
  });

  it("considera só shows realizados (ignora proposto, cancelado e futuro)", () => {
    const s = gigSeasonality(
      [
        gig({ id: "played", status: "PLAYED", date: "2026-03-10T20:00:00.000Z" }),
        gig({ id: "confPast", status: "CONFIRMED", date: "2026-03-20T20:00:00.000Z" }),
        gig({ id: "confFut", status: "CONFIRMED", date: "2027-09-12T20:00:00.000Z" }),
        gig({ id: "prop", status: "PROPOSED", date: "2026-03-04T20:00:00.000Z" }),
        gig({ id: "canc", status: "CANCELLED", date: "2026-03-05T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(s.totalShows).toBe(2); // só os dois de março já realizados
    expect(s.months[2].count).toBe(2);
  });

  it("ignora shows sem cachê (fee <= 0)", () => {
    const s = gigSeasonality(
      [
        gig({ id: "a", fee: 0, date: "2026-03-10T20:00:00.000Z" }),
        gig({ id: "b", fee: 80_00, date: "2026-04-02T20:00:00.000Z" }),
      ],
      { now },
    );
    expect(s.totalShows).toBe(1);
    expect(s.months[3].count).toBe(1); // abril
    expect(s.months[2].count).toBe(0); // março (fee 0 ignorado)
  });

  it("destaca melhor por média, por volume e mais cheio", () => {
    const s = gigSeasonality(
      [
        // Janeiro: 1 show de 100 → avg 100, total 100
        gig({ id: "jan", date: "2026-01-04T20:00:00.000Z", fee: 100_00 }),
        // Maio: 2 shows de 150 → avg 150, total 300 (mais cheio)
        gig({ id: "mai1", date: "2026-05-02T20:00:00.000Z", fee: 150_00 }),
        gig({ id: "mai2", date: "2026-05-09T20:00:00.000Z", fee: 150_00 }),
        // Dezembro: 1 show de 600 → avg 600, total 600
        gig({ id: "dez", date: "2026-12-10T20:00:00.000Z", fee: 600_00 }),
      ],
      { now },
    );
    expect(s.bestByAvg?.month).toBe(11); // dezembro (600)
    expect(s.bestByVolume?.month).toBe(11); // dezembro (600 total)
    expect(s.busiest?.month).toBe(4); // maio (2 shows)
    // Vale: jan e dez têm 1 show cada; empate no count resolve pelo menor
    // faturamento → janeiro (100 < 600).
    expect(s.quietest?.month).toBe(0);
  });

  it("mês mais fraco é o de menos shows entre os que tiveram algum", () => {
    const s = gigSeasonality(
      [
        // Março: 1 show (o vale)
        gig({ id: "mar", date: "2026-03-10T20:00:00.000Z", fee: 500_00 }),
        // Julho: 3 shows
        gig({ id: "jul1", date: "2026-07-02T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "jul2", date: "2026-07-09T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "jul3", date: "2026-07-16T20:00:00.000Z", fee: 100_00 }),
      ],
      { now },
    );
    // Só março e julho têm shows; março é o mais fraco (1 < 3). Meses zerados
    // (com count 0) não competem por "mais fraco".
    expect(s.quietest?.month).toBe(2); // março
    expect(s.busiest?.month).toBe(6); // julho
  });

  it("empate total de destaque resolve pelo mês mais cedo do ano", () => {
    const s = gigSeasonality(
      [
        gig({ id: "fev", date: "2026-02-05T20:00:00.000Z", fee: 100_00 }),
        gig({ id: "jan", date: "2026-01-04T20:00:00.000Z", fee: 100_00 }),
      ],
      { now },
    );
    // Janeiro (0) e fevereiro (1) idênticos → escolhe janeiro.
    expect(s.bestByAvg?.month).toBe(0);
    expect(s.bestByVolume?.month).toBe(0);
    expect(s.busiest?.month).toBe(0);
    // O vale também resolve empate total pelo mês mais cedo.
    expect(s.quietest?.month).toBe(0);
  });
});

describe("compareGigSeasonality", () => {
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("devolve 12 meses e destaca o mês que mais cresceu e o que mais caiu em shows", () => {
    const current = gigSeasonality(
      [
        // Março 2026: 3 shows
        gig({ id: "c-mar1", date: "2026-03-04T20:00:00.000Z" }),
        gig({ id: "c-mar2", date: "2026-03-11T20:00:00.000Z" }),
        gig({ id: "c-mar3", date: "2026-03-18T20:00:00.000Z" }),
        // Julho 2026: 1 show
        gig({ id: "c-jul1", date: "2026-07-06T20:00:00.000Z" }),
      ],
      { now },
    );
    const previous = gigSeasonality(
      [
        // Março 2025: 1 show → março cresceu +2
        gig({ id: "p-mar1", date: "2025-03-04T20:00:00.000Z" }),
        // Julho 2025: 3 shows → julho caiu −2
        gig({ id: "p-jul1", date: "2025-07-06T20:00:00.000Z" }),
        gig({ id: "p-jul2", date: "2025-07-13T20:00:00.000Z" }),
        gig({ id: "p-jul3", date: "2025-07-20T20:00:00.000Z" }),
      ],
      { now },
    );

    const cmp = compareGigSeasonality(current, previous);
    expect(cmp.months).toHaveLength(12);
    expect(cmp.totalShowsDelta).toBe(0); // 4 vs 4
    expect(cmp.biggestGain?.month).toBe(2); // março
    expect(cmp.biggestGain?.countDelta).toBe(2);
    expect(cmp.biggestDrop?.month).toBe(6); // julho
    expect(cmp.biggestDrop?.countDelta).toBe(-2);

    // A linha de março reflete os dois lados e o delta de faturamento.
    const mar = cmp.months[2];
    expect(mar).toMatchObject({
      currentCount: 3,
      previousCount: 1,
      countDelta: 2,
      feeDelta: 200_00, // 300_00 − 100_00
    });
  });

  it("sem base anterior: todo mês com show conta como ganho, nenhum como queda", () => {
    const current = gigSeasonality(
      [gig({ id: "c-abr", date: "2026-04-02T20:00:00.000Z" })],
      { now },
    );
    const previous = gigSeasonality([], { now });

    const cmp = compareGigSeasonality(current, previous);
    expect(cmp.totalShowsDelta).toBe(1);
    expect(cmp.biggestGain?.month).toBe(3); // abril
    expect(cmp.biggestDrop).toBeNull();
  });

  it("períodos idênticos: sem movers e deltas zerados", () => {
    const shows = [
      gig({ id: "a", date: "2026-05-02T20:00:00.000Z", fee: 150_00 }),
      gig({ id: "b", date: "2026-05-09T20:00:00.000Z", fee: 150_00 }),
    ];
    const previousShows = [
      gig({ id: "pa", date: "2025-05-02T20:00:00.000Z", fee: 150_00 }),
      gig({ id: "pb", date: "2025-05-09T20:00:00.000Z", fee: 150_00 }),
    ];
    const cmp = compareGigSeasonality(
      gigSeasonality(shows, { now }),
      gigSeasonality(previousShows, { now }),
    );
    expect(cmp.totalShowsDelta).toBe(0);
    expect(cmp.totalFeeDelta).toBe(0);
    expect(cmp.biggestGain).toBeNull();
    expect(cmp.biggestDrop).toBeNull();
    expect(cmp.months.every((m) => m.countDelta === 0 && m.feeDelta === 0)).toBe(true);
  });

  it("empate no nº de shows é desempatado pelo maior/menor delta de faturamento", () => {
    // Fevereiro e abril crescem +1 show; fevereiro troca por um cachê maior.
    const current = gigSeasonality(
      [
        gig({ id: "c-fev", date: "2026-02-10T20:00:00.000Z", fee: 500_00 }),
        gig({ id: "c-abr", date: "2026-04-10T20:00:00.000Z", fee: 120_00 }),
      ],
      { now },
    );
    const previous = gigSeasonality([], { now });

    const cmp = compareGigSeasonality(current, previous);
    // Ambos +1 show; fevereiro (feeDelta 500) vence o ganho, abril (feeDelta 120) fica.
    expect(cmp.biggestGain?.month).toBe(1); // fevereiro
    expect(cmp.biggestGain?.feeDelta).toBe(500_00);
  });
});

describe("classifyGigSeasonalityMonthChange", () => {
  function change(
    partial: Partial<GigSeasonalityMonthChange>,
  ): GigSeasonalityMonthChange {
    return {
      month: 0,
      label: "Janeiro",
      currentCount: 0,
      previousCount: 0,
      countDelta: 0,
      currentTotalFee: 0,
      previousTotalFee: 0,
      feeDelta: 0,
      ...partial,
    };
  }

  it("ancora no nº de shows: mais shows → up, menos → down", () => {
    expect(classifyGigSeasonalityMonthChange(change({ countDelta: 2 }))).toBe("up");
    expect(classifyGigSeasonalityMonthChange(change({ countDelta: -1 }))).toBe(
      "down",
    );
  });

  it("com contagem empatada, o faturamento desempata", () => {
    expect(
      classifyGigSeasonalityMonthChange(change({ countDelta: 0, feeDelta: 50_00 })),
    ).toBe("up");
    expect(
      classifyGigSeasonalityMonthChange(change({ countDelta: 0, feeDelta: -50_00 })),
    ).toBe("down");
  });

  it("só é flat quando os dois deltas são zero", () => {
    expect(
      classifyGigSeasonalityMonthChange(change({ countDelta: 0, feeDelta: 0 })),
    ).toBe("flat");
  });

  it("a contagem tem prioridade sobre o faturamento", () => {
    // Menos shows mas faturou mais (trocou volume por cachê): a contagem manda → down.
    expect(
      classifyGigSeasonalityMonthChange(change({ countDelta: -1, feeDelta: 300_00 })),
    ).toBe("down");
  });
});

describe("compareWeekdayPerformance", () => {
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      // 2026-03-06 é uma sexta-feira (weekday 5).
      date: "2026-03-06T20:00:00.000Z",
      ...partial,
    };
  }

  it("devolve 7 dias e destaca o dia que mais cresceu e o que mais caiu em shows", () => {
    const current = weekdayPerformance(
      [
        // Sextas 2026: 3 shows (weekday 5)
        gig({ id: "c-sex1", date: "2026-03-06T20:00:00.000Z" }),
        gig({ id: "c-sex2", date: "2026-03-13T20:00:00.000Z" }),
        gig({ id: "c-sex3", date: "2026-03-20T20:00:00.000Z" }),
        // Domingo 2026: 1 show (weekday 0) — 2026-03-01 é domingo
        gig({ id: "c-dom1", date: "2026-03-01T20:00:00.000Z" }),
      ],
      { now },
    );
    const previous = weekdayPerformance(
      [
        // Sexta 2025: 1 show → sexta cresceu +2 (2025-03-07 é sexta)
        gig({ id: "p-sex1", date: "2025-03-07T20:00:00.000Z" }),
        // Domingos 2025: 3 shows → domingo caiu −2 (2025-03-02 é domingo)
        gig({ id: "p-dom1", date: "2025-03-02T20:00:00.000Z" }),
        gig({ id: "p-dom2", date: "2025-03-09T20:00:00.000Z" }),
        gig({ id: "p-dom3", date: "2025-03-16T20:00:00.000Z" }),
      ],
      { now },
    );

    const cmp = compareWeekdayPerformance(current, previous);
    expect(cmp.days).toHaveLength(7);
    expect(cmp.totalShowsDelta).toBe(0); // 4 vs 4
    expect(cmp.biggestGain?.weekday).toBe(5); // sexta
    expect(cmp.biggestGain?.countDelta).toBe(2);
    expect(cmp.biggestDrop?.weekday).toBe(0); // domingo
    expect(cmp.biggestDrop?.countDelta).toBe(-2);

    // A linha da sexta reflete os dois lados e o delta de faturamento.
    const sex = cmp.days[5];
    expect(sex).toMatchObject({
      currentCount: 3,
      previousCount: 1,
      countDelta: 2,
      feeDelta: 200_00, // 300_00 − 100_00
    });
  });

  it("sem base anterior: todo dia com show conta como ganho, nenhum como queda", () => {
    const current = weekdayPerformance(
      // 2026-03-07 é sábado (weekday 6)
      [gig({ id: "c-sab", date: "2026-03-07T20:00:00.000Z" })],
      { now },
    );
    const previous = weekdayPerformance([], { now });

    const cmp = compareWeekdayPerformance(current, previous);
    expect(cmp.totalShowsDelta).toBe(1);
    expect(cmp.biggestGain?.weekday).toBe(6); // sábado
    expect(cmp.biggestDrop).toBeNull();
  });

  it("períodos idênticos: sem movers e deltas zerados", () => {
    const shows = [
      gig({ id: "a", date: "2026-03-06T20:00:00.000Z", fee: 150_00 }),
      gig({ id: "b", date: "2026-03-13T20:00:00.000Z", fee: 150_00 }),
    ];
    const previousShows = [
      gig({ id: "pa", date: "2025-03-07T20:00:00.000Z", fee: 150_00 }),
      gig({ id: "pb", date: "2025-03-14T20:00:00.000Z", fee: 150_00 }),
    ];
    const cmp = compareWeekdayPerformance(
      weekdayPerformance(shows, { now }),
      weekdayPerformance(previousShows, { now }),
    );
    expect(cmp.totalShowsDelta).toBe(0);
    expect(cmp.totalFeeDelta).toBe(0);
    expect(cmp.biggestGain).toBeNull();
    expect(cmp.biggestDrop).toBeNull();
    expect(cmp.days.every((d) => d.countDelta === 0 && d.feeDelta === 0)).toBe(true);
  });

  it("empate no nº de shows é desempatado pelo maior/menor delta de faturamento", () => {
    // Terça e quinta crescem +1 show; terça troca por um cachê maior.
    // 2026-03-03 = terça (2), 2026-03-05 = quinta (4).
    const current = weekdayPerformance(
      [
        gig({ id: "c-ter", date: "2026-03-03T20:00:00.000Z", fee: 500_00 }),
        gig({ id: "c-qui", date: "2026-03-05T20:00:00.000Z", fee: 120_00 }),
      ],
      { now },
    );
    const previous = weekdayPerformance([], { now });

    const cmp = compareWeekdayPerformance(current, previous);
    // Ambos +1 show; terça (feeDelta 500) vence o ganho, quinta (feeDelta 120) fica.
    expect(cmp.biggestGain?.weekday).toBe(2); // terça
    expect(cmp.biggestGain?.feeDelta).toBe(500_00);
  });
});

describe("classifyWeekdayPerformanceDayChange", () => {
  function change(
    partial: Partial<WeekdayPerformanceDayChange>,
  ): WeekdayPerformanceDayChange {
    return {
      weekday: 0,
      label: "Domingo",
      currentCount: 0,
      previousCount: 0,
      countDelta: 0,
      currentTotalFee: 0,
      previousTotalFee: 0,
      feeDelta: 0,
      ...partial,
    };
  }

  it("ancora no nº de shows: mais shows → up, menos → down", () => {
    expect(classifyWeekdayPerformanceDayChange(change({ countDelta: 2 }))).toBe("up");
    expect(classifyWeekdayPerformanceDayChange(change({ countDelta: -1 }))).toBe(
      "down",
    );
  });

  it("com contagem empatada, o faturamento desempata", () => {
    expect(
      classifyWeekdayPerformanceDayChange(change({ countDelta: 0, feeDelta: 50_00 })),
    ).toBe("up");
    expect(
      classifyWeekdayPerformanceDayChange(change({ countDelta: 0, feeDelta: -50_00 })),
    ).toBe("down");
  });

  it("só é flat quando os dois deltas são zero", () => {
    expect(
      classifyWeekdayPerformanceDayChange(change({ countDelta: 0, feeDelta: 0 })),
    ).toBe("flat");
  });

  it("a contagem tem prioridade sobre o faturamento", () => {
    expect(
      classifyWeekdayPerformanceDayChange(change({ countDelta: -1, feeDelta: 300_00 })),
    ).toBe("down");
  });
});

describe("gigSeasonalityHeadline", () => {
  // "now" em junho de 2027 → janela à frente cobre jul(6), ago(7), set(8), out(9).
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  // Constrói uma amostra com cachê concentrado num mês forte à frente, mais
  // shows de "enchimento" espalhados para passar do mínimo amostral sem
  // empurrar o feeShare daquele mês abaixo do limiar.
  function sampleWithPeak(peakMonthIso: string, peakFee: number, filler: number) {
    const shows: ReceivableShowLike[] = [
      gig({ id: "peak", date: peakMonthIso, fee: peakFee }),
    ];
    for (let i = 0; i < filler; i++) {
      // Todos em fevereiro (mês 1, fora da janela jul→out) com cachê baixo.
      shows.push(
        gig({ id: `f${i}`, date: "2026-02-05T20:00:00.000Z", fee: 10_00 }),
      );
    }
    return shows;
  }

  it("não aparece sem amostra mínima de shows", () => {
    // Um único show forte em agosto, mas totalShows (1) < mínimo.
    const s = gigSeasonality(
      [gig({ id: "ago", date: "2026-08-10T20:00:00.000Z", fee: 500_00 })],
      { now },
    );
    expect(s.totalShows).toBeLessThan(STRONG_MONTH_MIN_SHOWS);
    const h = gigSeasonalityHeadline(s, { now });
    expect(h.show).toBe(false);
    expect(h.month).toBeNull();
    expect(h.monthsAhead).toBe(0);
    expect(h.lift).toBe(0);
  });

  it("aponta o próximo mês forte à frente com lift acima da média", () => {
    // Agosto (mês 7, 2 à frente de junho) carrega a maioria do faturamento;
    // fevereiro só enche a amostra.
    const s = gigSeasonality(
      sampleWithPeak("2026-08-10T20:00:00.000Z", 500_00, 6),
      { now },
    );
    expect(s.totalShows).toBeGreaterThanOrEqual(STRONG_MONTH_MIN_SHOWS);
    const h = gigSeasonalityHeadline(s, { now });
    expect(h.show).toBe(true);
    expect(h.month?.month).toBe(7); // agosto
    expect(h.monthsAhead).toBe(2); // junho → agosto
    expect(h.lift).toBeGreaterThan(1.25);
  });

  it("escolhe o mês forte MAIS CEDO na janela, não o maior", () => {
    // Julho (1 à frente) e setembro (3 à frente) ambos fortes; vence julho.
    const s = gigSeasonality(
      [
        gig({ id: "jul", date: "2026-07-10T20:00:00.000Z", fee: 300_00 }),
        gig({ id: "set", date: "2026-09-10T20:00:00.000Z", fee: 600_00 }),
        ...Array.from({ length: 6 }, (_, i) =>
          gig({ id: `f${i}`, date: "2026-02-05T20:00:00.000Z", fee: 10_00 }),
        ),
      ],
      { now },
    );
    const h = gigSeasonalityHeadline(s, { now });
    expect(h.show).toBe(true);
    expect(h.month?.month).toBe(6); // julho, ainda que setembro renda mais
    expect(h.monthsAhead).toBe(1);
  });

  it("ignora meses fortes fora da janela (atrás ou além do horizonte)", () => {
    // Janeiro (mês 0) é o pico, mas está atrás de junho; nada à frente qualifica.
    const s = gigSeasonality(
      [
        gig({ id: "jan", date: "2026-01-10T20:00:00.000Z", fee: 500_00 }),
        ...Array.from({ length: 6 }, (_, i) =>
          // Espalhados na janela à frente, todos fracos (abaixo do limiar).
          gig({ id: `f${i}`, date: "2026-07-05T20:00:00.000Z", fee: 5_00 }),
        ),
      ],
      { now },
    );
    const h = gigSeasonalityHeadline(s, { now });
    expect(h.show).toBe(false);
  });

  it("não aparece quando nenhum mês à frente supera o limiar (temporada plana)", () => {
    // 12 shows iguais, um por mês → todo feeShare = 1/12, ninguém forte.
    const shows = Array.from({ length: 12 }, (_, m) =>
      gig({
        id: `m${m}`,
        date: `2026-${String(m + 1).padStart(2, "0")}-10T20:00:00.000Z`,
        fee: 100_00,
      }),
    );
    const s = gigSeasonality(shows, { now });
    const h = gigSeasonalityHeadline(s, { now });
    expect(h.show).toBe(false);
  });
});

describe("gigSeasonalityLull", () => {
  // "now" em junho de 2027 → janela à frente cobre jul(6), ago(7), set(8), out(9).
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 100_00,
      status: "PLAYED",
      date: "2026-01-10T20:00:00.000Z",
      ...partial,
    };
  }

  it("não aparece sem amostra mínima de shows", () => {
    // Um único show fraco em agosto, mas totalShows (1) < mínimo.
    const s = gigSeasonality(
      [gig({ id: "ago", date: "2026-08-10T20:00:00.000Z", fee: 5_00 })],
      { now },
    );
    expect(s.totalShows).toBeLessThan(STRONG_MONTH_MIN_SHOWS);
    const l = gigSeasonalityLull(s, { now });
    expect(l.show).toBe(false);
    expect(l.month).toBeNull();
    expect(l.monthsAhead).toBe(0);
    expect(l.shortfall).toBe(0);
  });

  it("aponta o próximo mês fraco à frente com shortfall abaixo da média", () => {
    // Agosto (mês 7, 2 à frente) é um vale: 1 show baixinho; o grosso do
    // faturamento concentra-se em fevereiro (fora da janela), empurrando o
    // feeShare de agosto bem abaixo de 1/12.
    const s = gigSeasonality(
      [
        gig({ id: "ago", date: "2026-08-10T20:00:00.000Z", fee: 5_00 }),
        ...Array.from({ length: 6 }, (_, i) =>
          gig({ id: `f${i}`, date: "2026-02-05T20:00:00.000Z", fee: 200_00 }),
        ),
      ],
      { now },
    );
    expect(s.totalShows).toBeGreaterThanOrEqual(STRONG_MONTH_MIN_SHOWS);
    const l = gigSeasonalityLull(s, { now });
    expect(l.show).toBe(true);
    expect(l.month?.month).toBe(7); // agosto
    expect(l.monthsAhead).toBe(2); // junho → agosto
    expect(l.shortfall).toBeGreaterThan(0.25);
  });

  it("escolhe o mês fraco MAIS CEDO na janela, não o mais fundo", () => {
    // Julho (1 à frente) e setembro (3 à frente) ambos fracos; vence julho,
    // ainda que setembro seja o fundo do vale.
    const s = gigSeasonality(
      [
        gig({ id: "jul", date: "2026-07-10T20:00:00.000Z", fee: 8_00 }),
        gig({ id: "set", date: "2026-09-10T20:00:00.000Z", fee: 2_00 }),
        ...Array.from({ length: 6 }, (_, i) =>
          gig({ id: `f${i}`, date: "2026-02-05T20:00:00.000Z", fee: 200_00 }),
        ),
      ],
      { now },
    );
    const l = gigSeasonalityLull(s, { now });
    expect(l.show).toBe(true);
    expect(l.month?.month).toBe(6); // julho, ainda que setembro renda menos
    expect(l.monthsAhead).toBe(1);
  });

  it("exige count > 0: mês sem história não vira vale (ausência ≠ sazonalidade)", () => {
    // Toda a história está em fevereiro; jul→out estão zerados. Nenhum mês à
    // frente teve shows, então não há sinal de SAZONALIDADE de vale.
    const s = gigSeasonality(
      Array.from({ length: 6 }, (_, i) =>
        gig({ id: `f${i}`, date: "2026-02-05T20:00:00.000Z", fee: 200_00 }),
      ),
      { now },
    );
    const l = gigSeasonalityLull(s, { now });
    expect(l.show).toBe(false);
  });

  it("não aparece quando nenhum mês à frente fica abaixo do limiar (temporada plana)", () => {
    // 12 shows iguais, um por mês → todo feeShare = 1/12, ninguém fraco.
    const shows = Array.from({ length: 12 }, (_, m) =>
      gig({
        id: `m${m}`,
        date: `2026-${String(m + 1).padStart(2, "0")}-10T20:00:00.000Z`,
        fee: 100_00,
      }),
    );
    const s = gigSeasonality(shows, { now });
    const l = gigSeasonalityLull(s, { now });
    expect(l.show).toBe(false);
  });
});

describe("computeGoalProgress", () => {
  const base = { goal: 100_000_00, realized: 0, projected: 0, year: 2026 };

  it("calcula razões, restante e onTrackToHit", () => {
    const p = computeGoalProgress(
      { ...base, realized: 40_000_00, projected: 90_000_00 },
      { now: "2026-07-02T12:00:00Z" }, // ~meio do ano
    );
    expect(p.goal).toBe(100_000_00);
    expect(p.realized).toBe(40_000_00);
    expect(p.remaining).toBe(60_000_00);
    expect(p.realizedRatio).toBeCloseTo(0.4, 5);
    expect(p.projectedRatio).toBeCloseTo(0.9, 5);
    expect(p.onTrackToHit).toBe(false); // projeção < meta
  });

  it("onTrackToHit verdadeiro quando a projeção alcança a meta", () => {
    const p = computeGoalProgress(
      { ...base, realized: 50_000_00, projected: 100_000_00 },
      { now: "2026-07-02T12:00:00Z" },
    );
    expect(p.onTrackToHit).toBe(true);
  });

  it("ritmo: adiantado quando recebido supera o esperado linear em >5%", () => {
    // Metade do ano (1/jul/2026 ~ 0.4986) → esperado ~49.863. Recebido 70k > +5%.
    const p = computeGoalProgress(
      { ...base, realized: 70_000_00 },
      { now: "2026-07-01T00:00:00Z" },
    );
    expect(p.isCurrentYear).toBe(true);
    expect(p.pace).toBe("ahead");
    expect(p.paceDelta).toBeGreaterThan(0);
  });

  it("ritmo: atrasado quando recebido fica >5% abaixo do esperado linear", () => {
    const p = computeGoalProgress(
      { ...base, realized: 10_000_00 },
      { now: "2026-07-01T00:00:00Z" },
    );
    expect(p.pace).toBe("behind");
    expect(p.paceDelta).toBeLessThan(0);
  });

  it("ritmo: no ritmo dentro da faixa de ±5%", () => {
    // Esperado ~49.863 em 1/jul; receber exatamente isso → on-track.
    const elapsed = computeGoalProgress(base, { now: "2026-07-01T00:00:00Z" }).expectedByNow;
    const p = computeGoalProgress(
      { ...base, realized: elapsed },
      { now: "2026-07-01T00:00:00Z" },
    );
    expect(p.pace).toBe("on-track");
  });

  it("ano futuro: sem ritmo, ano decorrido zero", () => {
    const p = computeGoalProgress(
      { ...base, realized: 0, projected: 30_000_00 },
      { now: "2025-06-01T00:00:00Z" },
    );
    expect(p.isCurrentYear).toBe(false);
    expect(p.isPastYear).toBe(false);
    expect(p.yearElapsed).toBe(0);
    expect(p.expectedByNow).toBe(0);
    expect(p.pace).toBeNull();
  });

  it("ano passado: ano decorrido 100%, sem ritmo", () => {
    const p = computeGoalProgress(
      { ...base, realized: 80_000_00, projected: 80_000_00 },
      { now: "2027-03-01T00:00:00Z" },
    );
    expect(p.isPastYear).toBe(true);
    expect(p.yearElapsed).toBe(1);
    expect(p.expectedByNow).toBe(p.goal);
    expect(p.pace).toBeNull();
  });

  it("saneia entradas inválidas e meta zero/negativa", () => {
    const p = computeGoalProgress(
      { goal: -5, realized: Number.NaN, projected: Infinity, year: 2026 },
      { now: "2026-06-01T00:00:00Z" },
    );
    expect(p.goal).toBe(0);
    expect(p.realized).toBe(0);
    expect(p.projected).toBe(0);
    expect(p.realizedRatio).toBe(0);
    expect(p.projectedRatio).toBe(0);
    expect(p.onTrackToHit).toBe(false);
    expect(p.pace).toBeNull(); // meta zero → não julga ritmo
  });
});

describe("compareGoalScenarios", () => {
  const base = { goal: 100_000_00, realized: 40_000_00, year: 2026 };
  const now = { now: "2026-07-02T12:00:00Z" };

  it("bate a meta só no otimista: em risco quando os cenários divergem", () => {
    const c = compareGoalScenarios(
      { ...base, projectedOptimistic: 110_000_00, projectedConservative: 85_000_00 },
      now,
    );
    expect(c.diverges).toBe(true);
    expect(c.tentativeGap).toBe(25_000_00);
    expect(c.optimistic.onTrackToHit).toBe(true);
    expect(c.conservative.onTrackToHit).toBe(false);
    expect(c.hitsOnlyWithTentative).toBe(true);
    expect(c.hitsEvenConservatively).toBe(false);
  });

  it("bate a meta mesmo no conservador: folga real", () => {
    const c = compareGoalScenarios(
      { ...base, projectedOptimistic: 130_000_00, projectedConservative: 105_000_00 },
      now,
    );
    expect(c.diverges).toBe(true);
    expect(c.hitsEvenConservatively).toBe(true);
    expect(c.hitsOnlyWithTentative).toBe(false);
  });

  it("sem cachê a confirmar: cenários coincidem (não diverge)", () => {
    const c = compareGoalScenarios(
      { ...base, projectedOptimistic: 90_000_00, projectedConservative: 90_000_00 },
      now,
    );
    expect(c.diverges).toBe(false);
    expect(c.tentativeGap).toBe(0);
    expect(c.hitsOnlyWithTentative).toBe(false);
    expect(c.conservative.projected).toBe(c.optimistic.projected);
  });

  it("tentativeGap nunca é negativo e saneia entradas inválidas", () => {
    const c = compareGoalScenarios(
      { ...base, projectedOptimistic: Number.NaN, projectedConservative: 50_000_00 },
      now,
    );
    expect(c.tentativeGap).toBe(0); // otimista saneado a 0 < conservador
    expect(c.diverges).toBe(false);
  });
});

describe("goalRunRate", () => {
  const now = { now: "2026-07-01T00:00:00Z" }; // jul = índice 6 → 6 meses restantes
  const mkProgress = (over: { goal: number; realized: number }) =>
    computeGoalProgress(
      { goal: over.goal, realized: over.realized, projected: 0, year: 2026 },
      now,
    );

  it("calcula required/current por mês e verdict no ano corrente", () => {
    // Meta 120k, recebido 60k em ~meio ano → falta 60k em 6 meses = 10k/mês.
    // Ritmo atual ~60k / ~6 meses decorridos ≈ 10k/mês → effortRatio ≈ 1.
    const r = goalRunRate(mkProgress({ goal: 120_000_00, realized: 60_000_00 }), now);
    expect(r.applicable).toBe(true);
    expect(r.monthsRemaining).toBe(6); // jul..dez, mês corrente incluso
    expect(r.remaining).toBe(60_000_00);
    expect(r.requiredPerMonth).toBe(10_000_00);
    expect(r.currentPerMonth).toBeGreaterThan(9_000_00);
    expect(r.currentPerMonth).toBeLessThan(11_000_00);
    expect(r.effortRatio).toBeCloseTo(1, 1);
    expect(r.verdict).toBe("on-pace");
  });

  it("verdict 'hard' quando o necessário supera muito o ritmo atual", () => {
    // Recebido baixo (5k) → ritmo ~10k/ano... falta 95k em 6 meses ≈ 15.834/mês,
    // muito acima do ritmo atual → ratio > 1,25.
    const r = goalRunRate(mkProgress({ goal: 100_000_00, realized: 5_000_00 }), now);
    expect(r.verdict).toBe("hard");
    expect(r.effortRatio).not.toBeNull();
    expect(r.effortRatio!).toBeGreaterThan(1.25);
    expect(r.gapPerMonth).toBeGreaterThan(0);
  });

  it("verdict 'stretch' para aceleração moderada (1 < ratio ≤ 1,25)", () => {
    // Ritmo atual ~10k/mês (60k em meio ano); precisa de ~11k/mês.
    // falta = required*6. Para required ≈ 11.5k: remaining ≈ 69k → realized 51k? Ajuste:
    const p = computeGoalProgress(
      { goal: 120_000_00, realized: 54_000_00, projected: 0, year: 2026 },
      now,
    );
    const r = goalRunRate(p, now);
    // remaining 66k / 6 = 11k/mês; ritmo ~54k/~6m ≈ 9k → ratio ≈ 1,22.
    expect(r.requiredPerMonth).toBe(11_000_00);
    expect(r.effortRatio!).toBeGreaterThan(1);
    expect(r.effortRatio!).toBeLessThanOrEqual(1.25);
    expect(r.verdict).toBe("stretch");
  });

  it("verdict 'hit' quando a meta já foi batida", () => {
    const r = goalRunRate(mkProgress({ goal: 100_000_00, realized: 120_000_00 }), now);
    expect(r.remaining).toBe(0);
    expect(r.requiredPerMonth).toBe(0);
    expect(r.effortRatio).toBeNull();
    expect(r.verdict).toBe("hit");
  });

  it("verdict 'unknown' sem base de ritmo (nada recebido)", () => {
    const r = goalRunRate(mkProgress({ goal: 100_000_00, realized: 0 }), now);
    expect(r.currentPerMonth).toBe(0);
    expect(r.effortRatio).toBeNull();
    expect(r.verdict).toBe("unknown");
    expect(r.requiredPerMonth).toBeGreaterThan(0); // ainda mostra o alvo
  });

  it("mês corrente sempre conta: dezembro deixa 1 mês restante", () => {
    const dec = { now: "2026-12-15T00:00:00Z" };
    const p = computeGoalProgress(
      { goal: 120_000_00, realized: 60_000_00, projected: 0, year: 2026 },
      dec,
    );
    const r = goalRunRate(p, dec);
    expect(r.monthsRemaining).toBe(1);
    expect(r.requiredPerMonth).toBe(60_000_00); // tudo que falta neste mês
  });

  it("não acionável fora do ano corrente (futuro)", () => {
    const future = { now: "2025-06-01T00:00:00Z" };
    const p = computeGoalProgress(
      { goal: 100_000_00, realized: 0, projected: 0, year: 2026 },
      future,
    );
    const r = goalRunRate(p, future);
    expect(r.applicable).toBe(false);
    expect(r.verdict).toBe("unknown");
    expect(r.monthsRemaining).toBe(12);
  });

  it("não acionável em ano passado", () => {
    const past = { now: "2027-03-01T00:00:00Z" };
    const p = computeGoalProgress(
      { goal: 100_000_00, realized: 80_000_00, projected: 80_000_00, year: 2026 },
      past,
    );
    const r = goalRunRate(p, past);
    expect(r.applicable).toBe(false);
    expect(r.monthsRemaining).toBe(0);
    expect(r.verdict).toBe("unknown");
  });

  it("meta zero não é acionável", () => {
    const r = goalRunRate(mkProgress({ goal: 0, realized: 0 }), now);
    expect(r.applicable).toBe(false);
    expect(r.verdict).toBe("unknown");
  });
});

describe("quarterlyGoalProgress", () => {
  it("divide a meta em 4 alvos que somam exatamente a meta", () => {
    // 100.001 centavos → base 25.000, resto 1 distribuído ao 1º trimestre.
    const q = quarterlyGoalProgress([], 2026, 100_001, { now: "2026-12-31T12:00:00Z" });
    const targets = q.quarters.map((x) => x.target);
    expect(targets).toEqual([25_001, 25_000, 25_000, 25_000]);
    expect(targets.reduce((a, b) => a + b, 0)).toBe(100_001);
  });

  it("conta só receitas recebidas no ano e as agrupa por trimestre", () => {
    const txs = [
      tx({ type: "INCOME", amount: 10_000_00, received: true, date: "2026-02-10" }), // Q1
      tx({ type: "INCOME", amount: 5_000_00, received: false, date: "2026-02-15" }), // a receber → ignora
      tx({ type: "INCOME", amount: 8_000_00, received: true, date: "2026-05-01" }), // Q2
      tx({ type: "INCOME", amount: 3_000_00, received: true, date: "2026-09-20" }), // Q3
      tx({ type: "EXPENSE", amount: 9_999_00, received: true, date: "2026-02-01" }), // despesa → ignora
      tx({ type: "INCOME", amount: 1_000_00, received: true, date: "2025-12-31" }), // outro ano → ignora
    ];
    const q = quarterlyGoalProgress(txs, 2026, 40_000_00, { now: "2026-12-31T12:00:00Z" });
    expect(q.quarters.map((x) => x.realized)).toEqual([10_000_00, 8_000_00, 3_000_00, 0]);
    expect(q.realized).toBe(21_000_00);
  });

  it("marca hit/missed por trimestre num ano já encerrado", () => {
    const txs = [
      tx({ type: "INCOME", amount: 30_000_00, received: true, date: "2025-03-01" }), // Q1 ≥ 25k
      tx({ type: "INCOME", amount: 10_000_00, received: true, date: "2025-06-01" }), // Q2 < 25k
    ];
    const q = quarterlyGoalProgress(txs, 2025, 100_000_00, { now: "2026-06-01T12:00:00Z" });
    expect(q.isCurrentYear).toBe(false);
    expect(q.currentQuarter).toBeNull();
    expect(q.quarters.map((x) => x.status)).toEqual(["hit", "missed", "missed", "missed"]);
    expect(q.hitCount).toBe(1);
    expect(q.quarters[1].remaining).toBe(15_000_00);
  });

  it("no ano corrente: passado=missed/hit, atual=in-progress, futuro=upcoming", () => {
    // now em maio (Q2). Q1 abaixo do alvo, Q2 em andamento.
    const txs = [
      tx({ type: "INCOME", amount: 5_000_00, received: true, date: "2026-02-01" }), // Q1 < 25k
      tx({ type: "INCOME", amount: 1_000_00, received: true, date: "2026-05-01" }), // Q2 parcial
    ];
    const q = quarterlyGoalProgress(txs, 2026, 100_000_00, { now: "2026-05-15T12:00:00Z" });
    expect(q.currentQuarter).toBe(2);
    expect(q.quarters.map((x) => x.status)).toEqual([
      "missed",
      "in-progress",
      "upcoming",
      "upcoming",
    ]);
  });

  it("um trimestre que já bateu o alvo fica hit mesmo sendo o corrente", () => {
    const txs = [tx({ type: "INCOME", amount: 30_000_00, received: true, date: "2026-05-01" })];
    const q = quarterlyGoalProgress(txs, 2026, 100_000_00, { now: "2026-05-15T12:00:00Z" });
    expect(q.quarters[1].status).toBe("hit");
    expect(q.quarters[1].ratio).toBeCloseTo(30_000_00 / 25_000_00);
  });

  it("ano futuro: todos os trimestres upcoming, nada recebido", () => {
    const q = quarterlyGoalProgress([], 2030, 100_000_00, { now: "2026-06-01T12:00:00Z" });
    expect(q.quarters.every((x) => x.status === "upcoming")).toBe(true);
    expect(q.hitCount).toBe(0);
  });

  it("saneia meta negativa/não-finita para zero (sem hit)", () => {
    const txs = [tx({ type: "INCOME", amount: 1_000_00, received: true, date: "2026-02-01" })];
    const q = quarterlyGoalProgress(txs, 2026, -50_000_00, { now: "2026-12-31T12:00:00Z" });
    expect(q.goal).toBe(0);
    expect(q.quarters.every((x) => x.target === 0)).toBe(true);
    expect(q.hitCount).toBe(0);
  });
});

describe("monthlyGoalProgress", () => {
  it("divide a meta em 12 alvos que somam exatamente a meta", () => {
    // 120.007 centavos → base 10.000, resto 7 distribuído aos 7 primeiros meses.
    const m = monthlyGoalProgress([], 2026, 120_007, { now: "2026-12-31T12:00:00Z" });
    const targets = m.months.map((x) => x.target);
    expect(targets).toEqual([
      10_001, 10_001, 10_001, 10_001, 10_001, 10_001, 10_001,
      10_000, 10_000, 10_000, 10_000, 10_000,
    ]);
    expect(targets.reduce((a, b) => a + b, 0)).toBe(120_007);
    expect(m.months).toHaveLength(12);
  });

  it("conta só receitas recebidas no ano e as agrupa por mês", () => {
    const txs = [
      tx({ type: "INCOME", amount: 10_000_00, received: true, date: "2026-02-10" }), // fev
      tx({ type: "INCOME", amount: 5_000_00, received: false, date: "2026-02-15" }), // a receber → ignora
      tx({ type: "INCOME", amount: 8_000_00, received: true, date: "2026-05-01" }), // mai
      tx({ type: "EXPENSE", amount: 9_999_00, received: true, date: "2026-02-01" }), // despesa → ignora
      tx({ type: "INCOME", amount: 1_000_00, received: true, date: "2025-12-31" }), // outro ano → ignora
    ];
    const m = monthlyGoalProgress(txs, 2026, 120_000_00, { now: "2026-12-31T12:00:00Z" });
    expect(m.months[1].realized).toBe(10_000_00); // fev
    expect(m.months[4].realized).toBe(8_000_00); // mai
    expect(m.realized).toBe(18_000_00);
  });

  it("marca hit/missed por mês num ano já encerrado", () => {
    // meta 120k → alvo 10k/mês.
    const txs = [
      tx({ type: "INCOME", amount: 12_000_00, received: true, date: "2025-01-15" }), // jan ≥ 10k → hit
      tx({ type: "INCOME", amount: 3_000_00, received: true, date: "2025-06-01" }), // jun < 10k → missed
    ];
    const m = monthlyGoalProgress(txs, 2025, 120_000_00, { now: "2026-06-01T12:00:00Z" });
    expect(m.isCurrentYear).toBe(false);
    expect(m.currentMonth).toBeNull();
    expect(m.months[0].status).toBe("hit");
    expect(m.months[5].status).toBe("missed");
    expect(m.months.every((x) => x.status === "hit" || x.status === "missed")).toBe(true);
    expect(m.hitCount).toBe(1);
    expect(m.months[5].remaining).toBe(7_000_00);
  });

  it("no ano corrente: passado=missed/hit, atual=in-progress, futuro=upcoming", () => {
    // now em maio (mês 5, idx 4). jan abaixo do alvo, mai em andamento.
    const txs = [
      tx({ type: "INCOME", amount: 2_000_00, received: true, date: "2026-01-10" }), // jan < 10k
      tx({ type: "INCOME", amount: 1_000_00, received: true, date: "2026-05-02" }), // mai parcial
    ];
    const m = monthlyGoalProgress(txs, 2026, 120_000_00, { now: "2026-05-15T12:00:00Z" });
    expect(m.currentMonth).toBe(5);
    expect(m.months[0].status).toBe("missed"); // jan
    expect(m.months[4].status).toBe("in-progress"); // mai
    expect(m.months[5].status).toBe("upcoming"); // jun
    expect(m.months[11].status).toBe("upcoming"); // dez
  });

  it("um mês que já bateu o alvo fica hit mesmo sendo o corrente", () => {
    const txs = [tx({ type: "INCOME", amount: 15_000_00, received: true, date: "2026-05-01" })];
    const m = monthlyGoalProgress(txs, 2026, 120_000_00, { now: "2026-05-15T12:00:00Z" });
    expect(m.months[4].status).toBe("hit");
    expect(m.months[4].ratio).toBeCloseTo(15_000_00 / 10_000_00);
  });

  it("ano futuro: todos os meses upcoming, nada recebido", () => {
    const m = monthlyGoalProgress([], 2030, 120_000_00, { now: "2026-06-01T12:00:00Z" });
    expect(m.months.every((x) => x.status === "upcoming")).toBe(true);
    expect(m.hitCount).toBe(0);
  });

  it("saneia meta negativa/não-finita para zero (sem hit)", () => {
    const txs = [tx({ type: "INCOME", amount: 1_000_00, received: true, date: "2026-02-01" })];
    const m = monthlyGoalProgress(txs, 2026, -50_000_00, { now: "2026-12-31T12:00:00Z" });
    expect(m.goal).toBe(0);
    expect(m.months.every((x) => x.target === 0)).toBe(true);
    expect(m.hitCount).toBe(0);
  });
});

describe("currentMonthPace", () => {
  // 15/jun/2026: metade do mês (junho tem 30 dias) → elapsed = 15/30 = 0.5.
  // Janela default = 6 meses fechados (dez/2025 → mai/2026).
  const NOW = "2026-06-15T00:00:00.000Z";

  const monthTx = (date: string, amount: number, type: TxLike["type"] = "INCOME"): TxLike =>
    tx({ type, amount, date: `${date}T00:00:00.000Z` });

  // 6 meses fechados, cada um com 1000_00 de receita → mês típico = 1000_00.
  const baseline1000 = (): TxLike[] =>
    ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"].map((mk) =>
      monthTx(`${mk}-10`, 1000_00),
    );

  it("agrega o mês corrente (competência) e calcula elapsed/projeção pro-rata", () => {
    const pace = currentMonthPace([monthTx("2026-06-05", 300_00), monthTx("2026-06-12", 200_00)], {
      now: NOW,
    });
    expect(pace.month).toBe("2026-06");
    expect(pace.dayOfMonth).toBe(15);
    expect(pace.daysInMonth).toBe(30);
    expect(pace.elapsed).toBeCloseTo(0.5);
    expect(pace.income).toBe(500_00);
    // metade do mês decorrida → projeção = 500_00 / 0.5 = 1000_00.
    expect(pace.projectedIncome).toBe(1000_00);
  });

  it("ignora transações fora do mês corrente na parte de cima", () => {
    const pace = currentMonthPace(
      [
        monthTx("2026-06-10", 400_00),
        monthTx("2026-05-31", 999_00), // mês anterior
        monthTx("2026-07-01", 999_00), // mês seguinte
      ],
      { now: NOW },
    );
    expect(pace.income).toBe(400_00);
  });

  it("monta o mês típico só com meses completos COM movimento na janela", () => {
    const pace = currentMonthPace([...baseline1000(), monthTx("2026-06-10", 500_00)], { now: NOW });
    expect(pace.windowMonths).toBe(6);
    expect(pace.baselineMonths).toBe(6);
    expect(pace.baselineIncome).toBe(1000_00);
    // esperado a esta altura (metade do mês) = baseline × elapsed = 500_00.
    expect(pace.expectedIncomeByNow).toBe(500_00);
  });

  it("classifica 'onPace' quando a projeção bate o mês típico", () => {
    // 500_00 na metade do mês → projeção 1000_00 = baseline 1000_00.
    const pace = currentMonthPace([...baseline1000(), monthTx("2026-06-10", 500_00)], { now: NOW });
    expect(pace.projectedIncome).toBe(1000_00);
    expect(pace.verdict).toBe("onPace");
  });

  it("classifica 'ahead' acima da folga e 'behind' abaixo dela", () => {
    // ahead: 700_00 → projeção 1400_00 (+40% > +10%).
    const ahead = currentMonthPace([...baseline1000(), monthTx("2026-06-10", 700_00)], { now: NOW });
    expect(ahead.verdict).toBe("ahead");
    // behind: 300_00 → projeção 600_00 (−40% < −10%).
    const behind = currentMonthPace([...baseline1000(), monthTx("2026-06-10", 300_00)], { now: NOW });
    expect(behind.verdict).toBe("behind");
  });

  it("respeita o limiar MONTH_PACE_EPSILON na fronteira", () => {
    // projeção exatamente no teto da folga (1000_00 × (1+ε)) → ainda 'ahead' (>=).
    const atCeil = Math.round((1000_00 * (1 + MONTH_PACE_EPSILON)) / 2); // metade do mês
    const pace = currentMonthPace([...baseline1000(), monthTx("2026-06-10", atCeil)], { now: NOW });
    expect(pace.verdict).toBe("ahead");
  });

  it("veredito 'insufficient' sem histórico de receita na janela", () => {
    const pace = currentMonthPace([monthTx("2026-06-10", 500_00)], { now: NOW });
    expect(pace.baselineMonths).toBe(0);
    expect(pace.baselineIncome).toBe(0);
    expect(pace.verdict).toBe("insufficient");
    expect(pace.expectedIncomeByNow).toBe(0);
  });

  it("a janela é parametrizável e exclui meses fora dela", () => {
    // janela de 3 meses (mar/abr/mai 2026); dez/2025 fica de fora.
    const pace = currentMonthPace(baseline1000(), { now: NOW, months: 3 });
    expect(pace.windowMonths).toBe(3);
    expect(pace.baselineMonths).toBe(3);
  });

  it("a baseline ignora o mês corrente (parcial) e meses parados", () => {
    const txs = [
      monthTx("2026-04-10", 800_00),
      monthTx("2026-05-10", 1200_00),
      monthTx("2026-06-10", 5000_00), // mês corrente: não entra na baseline
      // mar/2026 só com despesa de R$0 não conta; jan/fev sem movimento não contam
    ];
    const pace = currentMonthPace(txs, { now: NOW });
    expect(pace.baselineMonths).toBe(2);
    expect(pace.baselineIncome).toBe(1000_00); // (800 + 1200) / 2
  });

  it("projeta despesas e o líquido por pro-rata também", () => {
    const pace = currentMonthPace(
      [...baseline1000(), monthTx("2026-06-10", 600_00), monthTx("2026-06-11", 200_00, "EXPENSE")],
      { now: NOW },
    );
    expect(pace.expense).toBe(200_00);
    expect(pace.projectedExpense).toBe(400_00); // 200 / 0.5
    expect(pace.projectedNet).toBe(pace.projectedIncome - pace.projectedExpense);
    expect(pace.net).toBe(400_00);
  });
});

describe("monthYoYPace", () => {
  // 15/jun/2026: metade do mês → projeção = receita até agora ÷ 0.5.
  const NOW = "2026-06-15T00:00:00.000Z";

  const monthTx = (date: string, amount: number, type: TxLike["type"] = "INCOME"): TxLike =>
    tx({ type, amount, date: `${date}T00:00:00.000Z` });

  it("compara a projeção do mês com o MESMO mês do ano anterior (mês inteiro)", () => {
    const pace = monthYoYPace(
      [
        monthTx("2026-06-10", 500_00), // mês corrente: 500_00 na metade → projeção 1000_00
        monthTx("2025-06-05", 600_00), // jun/2025 inteiro
        monthTx("2025-06-20", 400_00), // jun/2025 inteiro → total 1000_00
      ],
      { now: NOW },
    );
    expect(pace.month).toBe("2026-06");
    expect(pace.lastYearMonth).toBe("2025-06");
    expect(pace.projectedIncome).toBe(1000_00);
    expect(pace.lastYearIncome).toBe(1000_00);
    expect(pace.lastYearHasMovement).toBe(true);
    expect(pace.incomeVsLastYear.current).toBe(1000_00);
    expect(pace.incomeVsLastYear.previous).toBe(1000_00);
    expect(pace.verdict).toBe("onPace");
  });

  it("usa só o mesmo mês do ano anterior — ignora outros meses de 2025", () => {
    const pace = monthYoYPace(
      [
        monthTx("2026-06-10", 500_00),
        monthTx("2025-06-15", 800_00), // referência
        monthTx("2025-05-15", 999_00), // mês vizinho do ano anterior: fora
        monthTx("2025-07-15", 999_00), // mês vizinho do ano anterior: fora
        monthTx("2024-06-15", 999_00), // dois anos atrás: fora
      ],
      { now: NOW },
    );
    expect(pace.lastYearIncome).toBe(800_00);
  });

  it("classifica 'ahead' acima da folga e 'behind' abaixo dela", () => {
    // projeção 1000_00 (500_00 na metade do mês) contra jun/2025 de referência.
    const ahead = monthYoYPace(
      [monthTx("2026-06-10", 500_00), monthTx("2025-06-10", 700_00)],
      { now: NOW },
    );
    expect(ahead.verdict).toBe("ahead"); // 1000 vs 700 → +43%
    const behind = monthYoYPace(
      [monthTx("2026-06-10", 500_00), monthTx("2025-06-10", 1400_00)],
      { now: NOW },
    );
    expect(behind.verdict).toBe("behind"); // 1000 vs 1400 → −29%
  });

  it("veredito 'insufficient' quando o mesmo mês do ano anterior não teve receita", () => {
    const pace = monthYoYPace([monthTx("2026-06-10", 500_00)], { now: NOW });
    expect(pace.lastYearIncome).toBe(0);
    expect(pace.lastYearHasMovement).toBe(false);
    expect(pace.verdict).toBe("insufficient");
    expect(pace.incomeVsLastYear.pct).toBeNull();
  });

  it("projeta despesas e líquido e os compara ao mesmo mês do ano anterior", () => {
    const pace = monthYoYPace(
      [
        monthTx("2026-06-10", 600_00),
        monthTx("2026-06-11", 200_00, "EXPENSE"), // projeção despesa 400_00
        monthTx("2025-06-10", 1000_00),
        monthTx("2025-06-12", 300_00, "EXPENSE"),
      ],
      { now: NOW },
    );
    expect(pace.projectedExpense).toBe(400_00); // 200 / 0.5
    expect(pace.lastYearExpense).toBe(300_00);
    expect(pace.lastYearNet).toBe(700_00); // 1000 − 300
    expect(pace.netVsLastYear.current).toBe(pace.projectedNet);
    expect(pace.netVsLastYear.previous).toBe(700_00);
  });

  it("recorta o ano anterior 'até o mesmo dia do mês' (maçã-com-maçã, sem projeção)", () => {
    const pace = monthYoYPace(
      [
        monthTx("2026-06-10", 500_00), // lançado até agora (dia 15)
        monthTx("2025-06-08", 400_00), // dia 8 <= 15 → entra no 'até a data'
        monthTx("2025-06-25", 600_00), // dia 25 > 15 → só no total fechado
      ],
      { now: NOW },
    );
    expect(pace.lastYearIncome).toBe(1000_00); // mês inteiro
    expect(pace.lastYearIncomeToDate).toBe(400_00); // só até o dia 15
    // comparação até-a-data usa o LANÇADO (não a projeção): 500 vs 400.
    expect(pace.incomeToDateVsLastYear.current).toBe(500_00);
    expect(pace.incomeToDateVsLastYear.previous).toBe(400_00);
  });

  it("computa o líquido 'até a data' do ano anterior e o compara ao lançado", () => {
    const pace = monthYoYPace(
      [
        monthTx("2026-06-10", 600_00),
        monthTx("2026-06-11", 200_00, "EXPENSE"), // líquido lançado = 400_00
        monthTx("2025-06-08", 500_00),
        monthTx("2025-06-09", 100_00, "EXPENSE"),
        monthTx("2025-06-28", 900_00), // depois do dia 15 → fora do 'até a data'
      ],
      { now: NOW },
    );
    expect(pace.lastYearIncomeToDate).toBe(500_00); // 900 do dia 28 fica de fora
    expect(pace.lastYearExpenseToDate).toBe(100_00);
    expect(pace.lastYearNetToDate).toBe(400_00); // 500 − 100
    expect(pace.netToDateVsLastYear.current).toBe(400_00); // 600 − 200 lançado
    expect(pace.netToDateVsLastYear.previous).toBe(400_00);
  });

  it("tolera fevereiro (mês mais curto no ano anterior) no recorte 'até a data'", () => {
    // 30/mar/2026 (dia 30). Mar/2025 tem 31 dias; nenhuma transação passa do dia 30.
    const pace = monthYoYPace(
      [monthTx("2026-03-20", 400_00), monthTx("2025-03-27", 800_00)],
      { now: "2026-03-30T00:00:00.000Z" },
    );
    expect(pace.lastYearMonth).toBe("2025-03");
    expect(pace.lastYearIncome).toBe(800_00);
    expect(pace.lastYearIncomeToDate).toBe(800_00); // dia 27 <= 30
  });
});

describe("yearToDatePace", () => {
  // 15/jun/2026: meio do ano. 2026 não é bissexto → dia do ano = 166, total 365.
  const NOW = "2026-06-15T00:00:00.000Z";

  const ytx = (date: string, amount: number, type: TxLike["type"] = "INCOME"): TxLike =>
    tx({ type, amount, date: `${date}T00:00:00.000Z` });

  it("acumula o ano corrente até o corte e calcula dayOfYear/elapsed (UTC)", () => {
    const pace = yearToDatePace(
      [
        ytx("2026-01-10", 300_00),
        ytx("2026-06-15", 200_00), // dia do corte: entra (dia inteiro)
        ytx("2026-06-16", 999_00), // depois do corte: fora
        ytx("2026-12-31", 999_00), // depois do corte: fora
      ],
      { now: NOW },
    );
    expect(pace.year).toBe(2026);
    expect(pace.lastYear).toBe(2025);
    expect(pace.dayOfYear).toBe(166); // 31+28+31+30+31+15
    expect(pace.daysInYear).toBe(365);
    expect(pace.elapsed).toBeCloseTo(166 / 365);
    expect(pace.income).toBe(500_00);
  });

  it("compara com o MESMO período do ano anterior (1º jan → mesmo mês/dia)", () => {
    const pace = yearToDatePace(
      [
        ytx("2026-03-01", 400_00),
        ytx("2026-05-01", 600_00), // ano corrente até jun: 1000_00
        ytx("2025-02-10", 500_00),
        ytx("2025-06-15", 300_00), // ano anterior até 15/jun: 800_00
        ytx("2025-06-16", 999_00), // ano anterior depois do corte: fora
        ytx("2025-11-01", 999_00), // ano anterior depois do corte: fora
      ],
      { now: NOW },
    );
    expect(pace.income).toBe(1000_00);
    expect(pace.lastYearIncome).toBe(800_00);
    expect(pace.lastYearHasMovement).toBe(true);
    expect(pace.incomeVsLastYear.current).toBe(1000_00);
    expect(pace.incomeVsLastYear.previous).toBe(800_00);
    expect(pace.verdict).toBe("ahead"); // 1000 vs 800 → +25%
  });

  it("classifica 'onPace' na folga e 'behind' abaixo dela", () => {
    const onPace = yearToDatePace(
      [ytx("2026-03-01", 1000_00), ytx("2025-03-01", 1000_00)],
      { now: NOW },
    );
    expect(onPace.verdict).toBe("onPace");
    const behind = yearToDatePace(
      [ytx("2026-03-01", 700_00), ytx("2025-03-01", 1000_00)],
      { now: NOW },
    );
    expect(behind.verdict).toBe("behind"); // −30%
  });

  it("veredito 'insufficient' quando o mesmo período do ano anterior não teve receita", () => {
    const pace = yearToDatePace([ytx("2026-03-01", 500_00)], { now: NOW });
    expect(pace.lastYearIncome).toBe(0);
    expect(pace.lastYearHasMovement).toBe(false);
    expect(pace.verdict).toBe("insufficient");
    expect(pace.incomeVsLastYear.pct).toBeNull();
  });

  it("acumula despesa e líquido e os compara ao mesmo período do ano anterior", () => {
    const pace = yearToDatePace(
      [
        ytx("2026-02-01", 1000_00),
        ytx("2026-04-01", 200_00, "EXPENSE"),
        ytx("2025-02-01", 900_00),
        ytx("2025-04-01", 300_00, "EXPENSE"),
      ],
      { now: NOW },
    );
    expect(pace.expense).toBe(200_00);
    expect(pace.net).toBe(800_00); // 1000 − 200
    expect(pace.lastYearExpense).toBe(300_00);
    expect(pace.lastYearNet).toBe(600_00); // 900 − 300
    expect(pace.netVsLastYear.current).toBe(800_00);
    expect(pace.netVsLastYear.previous).toBe(600_00);
  });

  it("alinha o ano bissexto: 29/fev cai para 28/fev no ano anterior", () => {
    // now = 29/fev/2024 (bissexto); 2023 não tem 29/fev → corte vira 28/fev/2023.
    const pace = yearToDatePace(
      [
        ytx("2024-02-29", 100_00), // dia do corte no ano corrente: entra
        ytx("2023-02-28", 700_00), // 28/fev/2023: entra (último dia do mês)
        ytx("2023-03-01", 999_00), // 1º/mar/2023: fora do período
      ],
      { now: "2024-02-29T00:00:00.000Z" },
    );
    expect(pace.daysInYear).toBe(366); // 2024 é bissexto
    expect(pace.cutoffMonth).toBe(1); // fevereiro
    expect(pace.cutoffDay).toBe(29);
    expect(pace.income).toBe(100_00);
    expect(pace.lastYearIncome).toBe(700_00);
  });
});

describe("yearToDatePaceHeadline", () => {
  const NOW = "2026-06-15T00:00:00.000Z";
  const ytx = (date: string, amount: number, type: TxLike["type"] = "INCOME"): TxLike =>
    tx({ type, amount, date: `${date}T00:00:00.000Z` });

  it("mostra (não-crítico) quando o ano está atrás, mas acima de 75% do ano passado", () => {
    // 800 vs 1000 → −20% (behind, mas ratio 0,8 > 0,75 → não crítico).
    const h = yearToDatePaceHeadline(
      yearToDatePace([ytx("2026-03-01", 800_00), ytx("2025-03-01", 1000_00)], { now: NOW }),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.verdict).toBe("behind");
    expect(h.income).toBe(800_00);
    expect(h.lastYearIncome).toBe(1000_00);
    expect(h.pct).toBeCloseTo(-0.2);
    expect(h.year).toBe(2026);
    expect(h.lastYear).toBe(2025);
  });

  it("vira crítico quando a receita YTD cai a 75% ou menos da do ano passado", () => {
    // 700 vs 1000 → ratio 0,7 ≤ 0,75 → crítico.
    const h = yearToDatePaceHeadline(
      yearToDatePace([ytx("2026-03-01", 700_00), ytx("2025-03-01", 1000_00)], { now: NOW }),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
  });

  it("não mostra quando está à frente ou em linha com o ano passado", () => {
    const ahead = yearToDatePaceHeadline(
      yearToDatePace([ytx("2026-03-01", 1300_00), ytx("2025-03-01", 1000_00)], { now: NOW }),
    );
    expect(ahead.show).toBe(false);
    expect(ahead.critical).toBe(false);
    const onPace = yearToDatePaceHeadline(
      yearToDatePace([ytx("2026-03-01", 1000_00), ytx("2025-03-01", 1000_00)], { now: NOW }),
    );
    expect(onPace.show).toBe(false);
  });

  it("não mostra quando não há base de comparação (insufficient)", () => {
    const h = yearToDatePaceHeadline(yearToDatePace([ytx("2026-03-01", 500_00)], { now: NOW }));
    expect(h.verdict).toBe("insufficient");
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.pct).toBeNull();
  });
});

describe("findCitiesToReengage", () => {
  // NOW = 17/jun/2026. "Fria" = último show há >= staleDays (padrão 90) dias.
  const NOW = new Date("2026-06-17T12:00:00Z");
  function s(over: Partial<CityReengageShowLike> = {}): CityReengageShowLike {
    return { status: "CONFIRMED", city: "São Paulo", date: "2026-01-01T20:00:00Z", fee: 100_00, ...over };
  }

  it("trata lista vazia", () => {
    const r = findCitiesToReengage([], { now: NOW });
    expect(r.rows).toEqual([]);
    expect(r.count).toBe(0);
    expect(r.staleDays).toBe(CITY_REENGAGE_STALE_DAYS);
  });

  it("inclui só praças frias: com passado, sem futuro e há >= staleDays dias", () => {
    const r = findCitiesToReengage(
      [
        // fria: último show há ~5 meses, nada agendado
        s({ city: "Curitiba", date: "2026-01-10T20:00:00Z" }),
        // tem show futuro na cidade → excluída
        s({ city: "Recife", date: "2026-01-10T20:00:00Z" }),
        s({ city: "Recife", date: "2026-08-01T20:00:00Z" }),
        // último show há poucos dias (< 90) → ainda quente
        s({ city: "Belém", date: "2026-05-10T20:00:00Z" }),
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.key)).toEqual(["curitiba"]);
    expect(r.rows[0].name).toBe("Curitiba");
    expect(r.rows[0].pastShows).toBe(1);
  });

  it("ignora shows sem cidade (não há praça a revisitar)", () => {
    const r = findCitiesToReengage(
      [
        s({ city: null, date: "2026-01-10T20:00:00Z" }),
        s({ city: "   ", date: "2026-01-10T20:00:00Z" }),
      ],
      { now: NOW },
    );
    expect(r.rows).toEqual([]);
  });

  it("agrupa por cidade normalizada (acento/caixa) e usa a grafia mais frequente", () => {
    const r = findCitiesToReengage(
      [
        s({ city: "São Paulo", date: "2026-01-01T20:00:00Z" }),
        s({ city: "sao paulo", date: "2026-01-05T20:00:00Z" }),
        s({ city: "São Paulo", date: "2026-01-08T20:00:00Z" }),
      ],
      { now: NOW },
    );
    expect(r.count).toBe(1);
    expect(r.rows[0].key).toBe("sao paulo");
    expect(r.rows[0].name).toBe("São Paulo"); // grafia mais frequente (2x)
    expect(r.rows[0].pastShows).toBe(3);
    expect(r.rows[0].totalFee).toBe(300_00);
  });

  it("ignora cancelados (não contam como passado, futuro nem cachê)", () => {
    const r = findCitiesToReengage(
      [
        // só cancelado → sem passado real → excluída
        s({ city: "Natal", date: "2026-01-10T20:00:00Z", status: "CANCELLED" }),
        // futuro cancelado não bloqueia; passado real a torna fria
        s({ city: "Salvador", date: "2026-01-10T20:00:00Z" }),
        s({ city: "Salvador", date: "2026-09-01T20:00:00Z", status: "CANCELLED" }),
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.key)).toEqual(["salvador"]);
    expect(r.rows[0].totalFee).toBe(100_00); // o cancelado não soma
  });

  it("calcula daysSinceLastShow pelo show não cancelado mais recente (dias UTC)", () => {
    const r = findCitiesToReengage(
      [
        s({ city: "Fortaleza", date: "2026-02-01T20:00:00Z" }),
        s({ city: "Fortaleza", date: "2026-01-10T23:00:00Z" }),
      ],
      { now: NOW },
    );
    // mais recente = 01/fev; de 01/fev a 17/jun = 27(fev)+31+30+31+17 = 136 dias
    expect(r.rows[0].lastShowDate.toISOString()).toBe("2026-02-01T20:00:00.000Z");
    expect(r.rows[0].daysSinceLastShow).toBe(136);
  });

  it("ordena pelas mais esquecidas, desempatando por cachê acumulado", () => {
    const r = findCitiesToReengage(
      [
        s({ city: "A", date: "2026-03-01T20:00:00Z", fee: 100_00 }), // menos antiga
        s({ city: "B", date: "2026-01-01T20:00:00Z", fee: 50_00 }), // mais antiga
        s({ city: "C", date: "2026-01-01T20:00:00Z", fee: 999_00 }), // empata em dias → cachê maior
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.key)).toEqual(["c", "b", "a"]);
  });

  it("respeita staleDays customizado", () => {
    const shows = [s({ city: "Manaus", date: "2026-05-20T20:00:00Z" })]; // ~28 dias
    expect(findCitiesToReengage(shows, { now: NOW }).count).toBe(0); // < 90
    expect(findCitiesToReengage(shows, { now: NOW, staleDays: 14 }).count).toBe(1);
  });
});

describe("citiesToReengageHeadline", () => {
  const NOW = new Date("2026-06-17T12:00:00Z");
  function s(over: Partial<CityReengageShowLike> = {}): CityReengageShowLike {
    return { status: "CONFIRMED", city: "São Paulo", date: "2026-01-01T20:00:00Z", fee: 100_00, ...over };
  }

  it("não aparece com lista vazia", () => {
    const h = citiesToReengageHeadline(findCitiesToReengage([], { now: NOW }));
    expect(h.show).toBe(false);
    expect(h.city).toBeNull();
    expect(h.total).toBe(0);
    expect(h.staleDays).toBe(CITY_REENGAGE_STALE_DAYS);
  });

  it("não aparece quando a única praça fria tem só um show passado (evento avulso)", () => {
    // Curitiba: 1 show há ~5 meses → fria na lista, mas sem lastro (pastShows=1).
    const list = findCitiesToReengage(
      [s({ city: "Curitiba", date: "2026-01-10T20:00:00Z" })],
      { now: NOW },
    );
    expect(list.count).toBe(1); // está na lista
    const h = citiesToReengageHeadline(list);
    expect(h.show).toBe(false); // mas não vira nudge
    expect(h.city).toBeNull();
    expect(h.total).toBe(1);
  });

  it("aparece com a praça mais esquecida que tenha lastro (>= 2 shows passados)", () => {
    const list = findCitiesToReengage(
      [
        // Belo Horizonte: 2 shows, o mais recente há ~5 meses → fria com lastro
        s({ city: "Belo Horizonte", date: "2026-01-05T20:00:00Z", fee: 200_00 }),
        s({ city: "Belo Horizonte", date: "2026-01-20T20:00:00Z", fee: 300_00 }),
      ],
      { now: NOW },
    );
    const h = citiesToReengageHeadline(list);
    expect(h.show).toBe(true);
    expect(h.city?.key).toBe("belo horizonte");
    expect(h.city?.pastShows).toBe(2);
    expect(h.total).toBe(1);
  });

  it("pula praças sem lastro e escolhe a mais esquecida entre as qualificadas", () => {
    const list = findCitiesToReengage(
      [
        // Recife: mais esquecida (jan) mas 1 show só → não qualifica
        s({ city: "Recife", date: "2026-01-01T20:00:00Z" }),
        // Salvador: menos esquecida (fev) mas 2 shows → qualifica e vence
        s({ city: "Salvador", date: "2026-02-01T20:00:00Z" }),
        s({ city: "Salvador", date: "2026-02-10T20:00:00Z" }),
      ],
      { now: NOW },
    );
    // A lista põe Recife primeiro (mais dias), mas o nudge pula para Salvador.
    expect(list.rows[0].key).toBe("recife");
    const h = citiesToReengageHeadline(list);
    expect(h.show).toBe(true);
    expect(h.city?.key).toBe("salvador");
    expect(h.total).toBe(2); // ambas continuam frias na lista
  });

  it("respeita o mínimo padrão exportado", () => {
    expect(REENGAGE_HEADLINE_MIN_PAST_SHOWS).toBe(2);
  });

  it("aceita minPastShows customizado (satura em 1 para valores < 1)", () => {
    const list = findCitiesToReengage(
      [s({ city: "Curitiba", date: "2026-01-10T20:00:00Z" })], // 1 show passado
      { now: NOW },
    );
    // limiar 1 (ou 0, saturado a 1) → uma praça de show único já qualifica
    expect(citiesToReengageHeadline(list, 1).show).toBe(true);
    expect(citiesToReengageHeadline(list, 0).show).toBe(true);
    // limiar 3 → nem duas passagens bastam
    expect(citiesToReengageHeadline(list, 3).show).toBe(false);
  });
});

describe("findVenuesToReengage", () => {
  // Espelho de findCitiesToReengage, mas por casa/venue. NOW = 17/jun/2026.
  const NOW = new Date("2026-06-17T12:00:00Z");
  function s(over: Partial<VenueReengageShowLike> = {}): VenueReengageShowLike {
    return { status: "CONFIRMED", venue: "Bar do Zé", date: "2026-01-01T20:00:00Z", fee: 100_00, ...over };
  }

  it("trata lista vazia", () => {
    const r = findVenuesToReengage([], { now: NOW });
    expect(r.rows).toEqual([]);
    expect(r.count).toBe(0);
    expect(r.staleDays).toBe(VENUE_REENGAGE_STALE_DAYS);
  });

  it("inclui só casas frias: com passado, sem futuro e há >= staleDays dias", () => {
    const r = findVenuesToReengage(
      [
        // fria: último show há ~5 meses, nada agendado
        s({ venue: "Teatro Guaíra", date: "2026-01-10T20:00:00Z" }),
        // tem show futuro na casa → excluída
        s({ venue: "Circo Voador", date: "2026-01-10T20:00:00Z" }),
        s({ venue: "Circo Voador", date: "2026-08-01T20:00:00Z" }),
        // último show há poucos dias (< 90) → ainda quente
        s({ venue: "Blue Note", date: "2026-05-10T20:00:00Z" }),
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.key)).toEqual(["teatro guaira"]);
    expect(r.rows[0].name).toBe("Teatro Guaíra");
    expect(r.rows[0].pastShows).toBe(1);
  });

  it("ignora shows sem local (não há casa a revisitar)", () => {
    const r = findVenuesToReengage(
      [
        s({ venue: null, date: "2026-01-10T20:00:00Z" }),
        s({ venue: "   ", date: "2026-01-10T20:00:00Z" }),
      ],
      { now: NOW },
    );
    expect(r.rows).toEqual([]);
  });

  it("agrupa por casa normalizada (acento/caixa) e usa a grafia mais frequente", () => {
    const r = findVenuesToReengage(
      [
        s({ venue: "Bar do Zé", date: "2026-01-01T20:00:00Z" }),
        s({ venue: "bar do ze", date: "2026-01-05T20:00:00Z" }),
        s({ venue: "Bar do Zé", date: "2026-01-08T20:00:00Z" }),
      ],
      { now: NOW },
    );
    expect(r.count).toBe(1);
    expect(r.rows[0].key).toBe("bar do ze");
    expect(r.rows[0].name).toBe("Bar do Zé"); // grafia mais frequente (2x)
    expect(r.rows[0].pastShows).toBe(3);
    expect(r.rows[0].totalFee).toBe(300_00);
  });

  it("ignora cancelados e ordena pelas mais esquecidas, desempatando por cachê", () => {
    const r = findVenuesToReengage(
      [
        // só cancelado → sem passado real → excluída
        s({ venue: "Studio SP", date: "2026-01-10T20:00:00Z", status: "CANCELLED" }),
        s({ venue: "A", date: "2026-03-01T20:00:00Z", fee: 100_00 }), // menos antiga
        s({ venue: "B", date: "2026-01-01T20:00:00Z", fee: 50_00 }), // mais antiga
        s({ venue: "C", date: "2026-01-01T20:00:00Z", fee: 999_00 }), // empata dias → cachê maior
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.key)).toEqual(["c", "b", "a"]);
  });

  it("respeita staleDays customizado", () => {
    const shows = [s({ venue: "Sesc Pompeia", date: "2026-05-20T20:00:00Z" })]; // ~28 dias
    expect(findVenuesToReengage(shows, { now: NOW }).count).toBe(0); // < 90
    expect(findVenuesToReengage(shows, { now: NOW, staleDays: 14 }).count).toBe(1);
  });
});

describe("parseReengageWindow", () => {
  it("cai no default quando o parâmetro está ausente", () => {
    expect(parseReengageWindow(undefined)).toBe(REENGAGE_WINDOW_DEFAULT);
  });

  it("cai no default em string vazia ou só espaços", () => {
    expect(parseReengageWindow("")).toBe(REENGAGE_WINDOW_DEFAULT);
    expect(parseReengageWindow("   ")).toBe(REENGAGE_WINDOW_DEFAULT);
  });

  it("cai no default quando não é numérico", () => {
    expect(parseReengageWindow("abc")).toBe(REENGAGE_WINDOW_DEFAULT);
    expect(parseReengageWindow("NaN")).toBe(REENGAGE_WINDOW_DEFAULT);
  });

  it("aceita um inteiro válido dentro da faixa", () => {
    expect(parseReengageWindow("60")).toBe(60);
    expect(parseReengageWindow("180")).toBe(180);
    expect(parseReengageWindow("365")).toBe(365);
  });

  it("trunca a parte fracionária", () => {
    expect(parseReengageWindow("90.9")).toBe(90);
  });

  it("grampeia abaixo do mínimo e acima do máximo", () => {
    expect(parseReengageWindow("0")).toBe(REENGAGE_WINDOW_MIN);
    expect(parseReengageWindow("-5")).toBe(REENGAGE_WINDOW_MIN);
    expect(parseReengageWindow("99999")).toBe(REENGAGE_WINDOW_MAX);
  });

  it("usa o primeiro valor quando o parâmetro vem repetido (array)", () => {
    expect(parseReengageWindow(["60", "365"])).toBe(60);
  });

  it("aceita um fallback customizado", () => {
    expect(parseReengageWindow(undefined, 30)).toBe(30);
    expect(parseReengageWindow("lixo", 30)).toBe(30);
  });

  it("alimenta findCitiesToReengage com um limiar coerente", () => {
    // ~28 dias sem tocar: fora da janela padrão (90), dentro de uma janela curta.
    const now = new Date("2026-06-17T12:00:00Z");
    const shows: CityReengageShowLike[] = [
      { status: "CONFIRMED", city: "Curitiba", date: "2026-05-20T20:00:00Z", fee: 100_00 },
    ];
    const wide = findCitiesToReengage(shows, { now, staleDays: parseReengageWindow("90") });
    const narrow = findCitiesToReengage(shows, { now, staleDays: parseReengageWindow("14") });
    expect(wide.count).toBe(0);
    expect(narrow.count).toBe(1);
  });
});
