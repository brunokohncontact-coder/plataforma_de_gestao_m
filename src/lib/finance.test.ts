import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  rankShowsByProfit,
  rankVenuesByProfit,
  rankCitiesByProfit,
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
  computeDelta,
  compareSummaries,
  averageSummaries,
  recurringExpenses,
  pendingFixedCosts,
  computeBreakEven,
  cashRunway,
  cashBurnRunway,
  parseBurnWindow,
  DEFAULT_BURN_WINDOW_MONTHS,
  BURN_WINDOW_MIN,
  BURN_WINDOW_MAX,
  BURN_WINDOW_PRESETS,
  taxReserve,
  DEFAULT_TAX_RATE,
  showPipeline,
  feeTrend,
  gigCadence,
  feeDistribution,
  feeBandKeyFor,
  FEE_BANDS,
  weekdayPerformance,
  incomeMix,
  expenseMix,
  paymentLag,
  paymentLagHeadline,
  paymentLagByContact,
  paymentSpeedBucket,
  PAYMENT_SPEED_BUCKET_ORDER,
  computeGoalProgress,
  compareGoalScenarios,
  goalRunRate,
  quarterlyGoalProgress,
  monthlyGoalProgress,
  type TxLike,
  type ShowLike,
  type VenueShowLike,
  type ReceivableShowLike,
  type BreakEvenShowLike,
  type PromisableShowLike,
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
