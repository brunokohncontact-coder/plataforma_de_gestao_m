import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  summarize,
  totalsByCategory,
  totalsByMonth,
  pnlByShow,
  monthKey,
  type TxLike,
  type ShowLike,
} from "./finance";

function tx(p: Partial<TxLike>): TxLike {
  return {
    type: "EXPENSE",
    amountCents: 0,
    category: "geral",
    date: new Date("2026-01-15T00:00:00Z"),
    settled: false,
    showId: null,
    ...p,
  };
}

describe("computeShowPnL", () => {
  const show: ShowLike = { id: "s1", feeCents: 100_000 };

  it("usa o cachê quando não há receita lançada e subtrai despesas vinculadas", () => {
    const txs = [
      tx({ type: "EXPENSE", amountCents: 30_000, showId: "s1" }),
      tx({ type: "EXPENSE", amountCents: 10_000, showId: "s1" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.grossRevenueCents).toBe(100_000);
    expect(pnl.expenseCents).toBe(40_000);
    expect(pnl.netResultCents).toBe(60_000);
  });

  it("usa a receita lançada quando ela supera o cachê acordado", () => {
    const txs = [
      tx({ type: "INCOME", amountCents: 120_000, showId: "s1" }),
      tx({ type: "EXPENSE", amountCents: 20_000, showId: "s1" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.incomeCents).toBe(120_000);
    expect(pnl.grossRevenueCents).toBe(120_000);
    expect(pnl.netResultCents).toBe(100_000);
  });

  it("ignora transações de outros shows e as não vinculadas", () => {
    const txs = [
      tx({ type: "EXPENSE", amountCents: 50_000, showId: "outro" }),
      tx({ type: "EXPENSE", amountCents: 50_000, showId: null }),
      tx({ type: "EXPENSE", amountCents: 25_000, showId: "s1" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.expenseCents).toBe(25_000);
    expect(pnl.netResultCents).toBe(75_000);
  });

  it("pode resultar em prejuízo (negativo)", () => {
    const cheap: ShowLike = { id: "s2", feeCents: 20_000 };
    const txs = [tx({ type: "EXPENSE", amountCents: 50_000, showId: "s2" })];
    const pnl = computeShowPnL(cheap, txs);
    expect(pnl.netResultCents).toBe(-30_000);
  });
});

describe("summarize", () => {
  it("calcula receita, despesa, saldo e pendências", () => {
    const txs = [
      tx({ type: "INCOME", amountCents: 100_000, settled: true }),
      tx({ type: "INCOME", amountCents: 50_000, settled: false }),
      tx({ type: "EXPENSE", amountCents: 30_000, settled: true }),
      tx({ type: "EXPENSE", amountCents: 20_000, settled: false }),
    ];
    const s = summarize(txs);
    expect(s.incomeCents).toBe(150_000);
    expect(s.expenseCents).toBe(50_000);
    expect(s.balanceCents).toBe(100_000);
    expect(s.pendingIncomeCents).toBe(50_000);
    expect(s.pendingExpenseCents).toBe(20_000);
  });

  it("retorna zeros para lista vazia", () => {
    const s = summarize([]);
    expect(s).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      pendingIncomeCents: 0,
      pendingExpenseCents: 0,
    });
  });
});

describe("totalsByCategory", () => {
  it("agrupa por categoria+tipo e ordena por total decrescente", () => {
    const txs = [
      tx({ type: "EXPENSE", amountCents: 10_000, category: "transporte" }),
      tx({ type: "EXPENSE", amountCents: 40_000, category: "equipe" }),
      tx({ type: "EXPENSE", amountCents: 5_000, category: "transporte" }),
      tx({ type: "INCOME", amountCents: 90_000, category: "cachê" }),
    ];
    const result = totalsByCategory(txs);
    expect(result[0]).toMatchObject({ category: "cachê", type: "INCOME", totalCents: 90_000, count: 1 });
    expect(result[1]).toMatchObject({ category: "equipe", totalCents: 40_000 });
    expect(result[2]).toMatchObject({ category: "transporte", totalCents: 15_000, count: 2 });
  });

  it("separa mesma categoria com tipos diferentes", () => {
    const txs = [
      tx({ type: "INCOME", amountCents: 1_000, category: "ajuste" }),
      tx({ type: "EXPENSE", amountCents: 2_000, category: "ajuste" }),
    ];
    const result = totalsByCategory(txs);
    expect(result).toHaveLength(2);
  });
});

describe("totalsByMonth", () => {
  it("agrupa por mês em ordem cronológica e calcula saldo", () => {
    const txs = [
      tx({ type: "INCOME", amountCents: 100_000, date: new Date("2026-03-10T00:00:00Z") }),
      tx({ type: "EXPENSE", amountCents: 40_000, date: new Date("2026-03-20T00:00:00Z") }),
      tx({ type: "INCOME", amountCents: 80_000, date: new Date("2026-01-05T00:00:00Z") }),
    ];
    const result = totalsByMonth(txs);
    expect(result.map((r) => r.month)).toEqual(["2026-01", "2026-03"]);
    expect(result[0]).toMatchObject({ incomeCents: 80_000, expenseCents: 0, balanceCents: 80_000 });
    expect(result[1]).toMatchObject({ incomeCents: 100_000, expenseCents: 40_000, balanceCents: 60_000 });
  });
});

describe("pnlByShow", () => {
  it("ordena shows do mais lucrativo ao menos lucrativo", () => {
    const shows: ShowLike[] = [
      { id: "a", feeCents: 50_000 },
      { id: "b", feeCents: 200_000 },
    ];
    const txs = [tx({ type: "EXPENSE", amountCents: 10_000, showId: "b" })];
    const result = pnlByShow(shows, txs);
    expect(result[0].showId).toBe("b");
    expect(result[0].netResultCents).toBe(190_000);
    expect(result[1].showId).toBe("a");
  });
});

describe("monthKey", () => {
  it("formata como YYYY-MM em UTC", () => {
    expect(monthKey(new Date("2026-12-31T23:00:00Z"))).toBe("2026-12");
    expect(monthKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });
});
