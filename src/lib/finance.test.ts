import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  rankShowsByProfit,
  rankVenuesByProfit,
  summarizeFinances,
  totalsByCategory,
  categoryReport,
  totalsByMonth,
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
  annualSummary,
  availableYears,
  type TxLike,
  type ShowLike,
  type VenueShowLike,
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
