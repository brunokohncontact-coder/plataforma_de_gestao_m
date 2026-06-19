import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  rankShowsByProfit,
  rankVenuesByProfit,
  summarizeFinances,
  totalsByCategory,
  categoryReport,
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
  compareAnnualSummaries,
  annualCategoryReport,
  availableYears,
  forecastBookedRevenue,
  reconcileShowFees,
  bucketReceivablesByAge,
  receivableAgeBucket,
  RECEIVABLE_AGE_BUCKET_ORDER,
  resolveSettlementAmount,
  resolveReceivedDate,
  computeDelta,
  compareSummaries,
  averageSummaries,
  recurringExpenses,
  computeBreakEven,
  taxReserve,
  DEFAULT_TAX_RATE,
  type TxLike,
  type ShowLike,
  type VenueShowLike,
  type ReceivableShowLike,
  type BreakEvenShowLike,
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
