import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  summarizeFinances,
  totalsByCategory,
  totalsByMonth,
  monthKey,
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
