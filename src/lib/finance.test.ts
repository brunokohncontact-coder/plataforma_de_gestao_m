import { describe, it, expect } from "vitest";
import {
  computeTotals,
  summarizeByCategory,
  summarizeByMonth,
  computeShowPnL,
  totalProfit,
  monthKey,
  type TxLike,
  type ShowLike,
} from "./finance";

function tx(partial: Partial<TxLike>): TxLike {
  return {
    type: "INCOME",
    amountCents: 10000,
    category: "Show",
    date: new Date("2026-01-15T12:00:00Z"),
    status: "SETTLED",
    showId: null,
    ...partial,
  };
}

describe("computeTotals", () => {
  it("soma receitas e despesas e calcula saldo", () => {
    const totals = computeTotals([
      tx({ type: "INCOME", amountCents: 50000 }),
      tx({ type: "INCOME", amountCents: 30000 }),
      tx({ type: "EXPENSE", amountCents: 20000 }),
    ]);
    expect(totals.incomeCents).toBe(80000);
    expect(totals.expenseCents).toBe(20000);
    expect(totals.balanceCents).toBe(60000);
  });

  it("separa valores pendentes de efetivados", () => {
    const totals = computeTotals([
      tx({ type: "INCOME", amountCents: 50000, status: "SETTLED" }),
      tx({ type: "INCOME", amountCents: 30000, status: "PENDING" }),
      tx({ type: "EXPENSE", amountCents: 20000, status: "PENDING" }),
      tx({ type: "EXPENSE", amountCents: 5000, status: "SETTLED" }),
    ]);
    expect(totals.settledIncomeCents).toBe(50000);
    expect(totals.pendingIncomeCents).toBe(30000);
    expect(totals.settledExpenseCents).toBe(5000);
    expect(totals.pendingExpenseCents).toBe(20000);
  });

  it("usa valor absoluto (defensivo contra valores negativos)", () => {
    const totals = computeTotals([tx({ type: "EXPENSE", amountCents: -3000 })]);
    expect(totals.expenseCents).toBe(3000);
  });

  it("retorna zeros para lista vazia", () => {
    const totals = computeTotals([]);
    expect(totals.balanceCents).toBe(0);
  });
});

describe("summarizeByCategory", () => {
  it("agrupa por categoria e tipo, ordenado por total desc", () => {
    const result = summarizeByCategory([
      tx({ type: "EXPENSE", category: "Transporte", amountCents: 5000 }),
      tx({ type: "EXPENSE", category: "Transporte", amountCents: 3000 }),
      tx({ type: "EXPENSE", category: "Equipamento", amountCents: 10000 }),
      tx({ type: "INCOME", category: "Show", amountCents: 50000 }),
    ]);
    expect(result[0]).toMatchObject({ category: "Show", totalCents: 50000 });
    const transporte = result.find(
      (r) => r.category === "Transporte" && r.type === "EXPENSE"
    );
    expect(transporte).toMatchObject({ totalCents: 8000, count: 2 });
  });

  it("não mistura receita e despesa de mesma categoria", () => {
    const result = summarizeByCategory([
      tx({ type: "INCOME", category: "Cachê", amountCents: 10000 }),
      tx({ type: "EXPENSE", category: "Cachê", amountCents: 4000 }),
    ]);
    expect(result).toHaveLength(2);
  });
});

describe("summarizeByMonth / monthKey", () => {
  it("gera chave YYYY-MM em UTC", () => {
    expect(monthKey(new Date("2026-03-09T23:30:00Z"))).toBe("2026-03");
  });

  it("agrupa por mês e ordena ascendente", () => {
    const result = summarizeByMonth([
      tx({ date: new Date("2026-02-01T00:00:00Z"), type: "INCOME", amountCents: 20000 }),
      tx({ date: new Date("2026-01-10T00:00:00Z"), type: "INCOME", amountCents: 10000 }),
      tx({ date: new Date("2026-01-20T00:00:00Z"), type: "EXPENSE", amountCents: 4000 }),
    ]);
    expect(result.map((r) => r.month)).toEqual(["2026-01", "2026-02"]);
    expect(result[0]).toMatchObject({ incomeCents: 10000, expenseCents: 4000, balanceCents: 6000 });
    expect(result[1]).toMatchObject({ incomeCents: 20000, balanceCents: 20000 });
  });
});

describe("computeShowPnL", () => {
  const show: ShowLike = { id: "show1", feeCents: 100000, status: "CONFIRMED" };

  it("calcula lucro = cachê + receitas vinculadas − despesas vinculadas", () => {
    const pnl = computeShowPnL(show, [
      tx({ showId: "show1", type: "EXPENSE", amountCents: 20000, category: "Transporte" }),
      tx({ showId: "show1", type: "EXPENSE", amountCents: 15000, category: "Hospedagem" }),
      tx({ showId: "show1", type: "INCOME", amountCents: 5000, category: "Venda de merch" }),
    ]);
    expect(pnl.feeCents).toBe(100000);
    expect(pnl.linkedIncomeCents).toBe(5000);
    expect(pnl.linkedExpenseCents).toBe(35000);
    expect(pnl.totalIncomeCents).toBe(105000);
    expect(pnl.profitCents).toBe(70000);
  });

  it("ignora transações de outros shows", () => {
    const pnl = computeShowPnL(show, [
      tx({ showId: "outro", type: "EXPENSE", amountCents: 99999 }),
      tx({ showId: "show1", type: "EXPENSE", amountCents: 10000 }),
    ]);
    expect(pnl.linkedExpenseCents).toBe(10000);
    expect(pnl.profitCents).toBe(90000);
  });

  it("não conta o cachê de show cancelado, mas mantém despesas", () => {
    const canceled: ShowLike = { id: "s2", feeCents: 80000, status: "CANCELED" };
    const pnl = computeShowPnL(canceled, [
      tx({ showId: "s2", type: "EXPENSE", amountCents: 12000, category: "Sinal não reembolsável" }),
    ]);
    expect(pnl.feeCents).toBe(0);
    expect(pnl.totalIncomeCents).toBe(0);
    expect(pnl.profitCents).toBe(-12000);
  });

  it("sem transações vinculadas, lucro = cachê", () => {
    const pnl = computeShowPnL(show, []);
    expect(pnl.profitCents).toBe(100000);
  });
});

describe("totalProfit", () => {
  it("soma o lucro de vários shows", () => {
    const a = computeShowPnL({ id: "a", feeCents: 50000, status: "COMPLETED" }, []);
    const b = computeShowPnL({ id: "b", feeCents: 30000, status: "CONFIRMED" }, [
      tx({ showId: "b", type: "EXPENSE", amountCents: 10000 }),
    ]);
    expect(totalProfit([a, b])).toBe(70000);
  });
});
