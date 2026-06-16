import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  summarizeFinances,
  totalsByCategory,
  totalsByMonth,
  monthKey,
  dayKey,
  filterTransactions,
  availableMonths,
  availableCategories,
  isValidMonthKey,
  isValidDateKey,
  hasActiveFilter,
  type TxLike,
  type ShowLike,
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
