import { describe, it, expect } from "vitest";
import {
  calcShowProfitability,
  summarize,
  summarizeByMonth,
  summarizeByCategory,
  monthKey,
} from "./finance";
import type { TransactionLike } from "./domain";

function tx(partial: Partial<TransactionLike>): TransactionLike {
  return {
    id: Math.random().toString(36).slice(2),
    type: "expense",
    category: "geral",
    amountCents: 0,
    date: new Date("2026-01-15T12:00:00Z"),
    status: "received",
    showId: null,
    ...partial,
  };
}

describe("calcShowProfitability", () => {
  it("resultado = cachê quando não há transações vinculadas", () => {
    const result = calcShowProfitability({ feeCents: 200_00 }, []);
    expect(result.feeCents).toBe(200_00);
    expect(result.extraIncomeCents).toBe(0);
    expect(result.expensesCents).toBe(0);
    expect(result.netCents).toBe(200_00);
    expect(result.margin).toBe(1);
  });

  it("subtrai despesas vinculadas do cachê", () => {
    const result = calcShowProfitability({ feeCents: 1000_00 }, [
      tx({ type: "expense", amountCents: 150_00, category: "transporte" }),
      tx({ type: "expense", amountCents: 100_00, category: "alimentação" }),
    ]);
    expect(result.expensesCents).toBe(250_00);
    expect(result.netCents).toBe(750_00);
    expect(result.margin).toBeCloseTo(0.75, 5);
  });

  it("soma receitas extras vinculadas (ex.: merch) ao cachê", () => {
    const result = calcShowProfitability({ feeCents: 500_00 }, [
      tx({ type: "income", amountCents: 200_00, category: "merch" }),
      tx({ type: "expense", amountCents: 100_00, category: "transporte" }),
    ]);
    expect(result.extraIncomeCents).toBe(200_00);
    expect(result.expensesCents).toBe(100_00);
    // 500 + 200 - 100 = 600
    expect(result.netCents).toBe(600_00);
    // gross = 700; net = 600
    expect(result.margin).toBeCloseTo(600 / 700, 5);
  });

  it("resultado pode ser negativo (prejuízo)", () => {
    const result = calcShowProfitability({ feeCents: 100_00 }, [
      tx({ type: "expense", amountCents: 400_00, category: "produção" }),
    ]);
    expect(result.netCents).toBe(-300_00);
    expect(result.margin).toBeCloseTo(-3, 5);
  });

  it("margem é 0 quando não há receita bruta", () => {
    const result = calcShowProfitability({ feeCents: 0 }, [
      tx({ type: "expense", amountCents: 50_00 }),
    ]);
    expect(result.netCents).toBe(-50_00);
    expect(result.margin).toBe(0);
  });
});

describe("summarize", () => {
  it("agrega receitas, despesas e líquido", () => {
    const s = summarize([
      tx({ type: "income", amountCents: 1000_00, status: "received" }),
      tx({ type: "income", amountCents: 500_00, status: "pending" }),
      tx({ type: "expense", amountCents: 300_00 }),
    ]);
    expect(s.incomeCents).toBe(1500_00);
    expect(s.expenseCents).toBe(300_00);
    expect(s.netCents).toBe(1200_00);
  });

  it("separa recebido de pendente (contas a receber)", () => {
    const s = summarize([
      tx({ type: "income", amountCents: 800_00, status: "received" }),
      tx({ type: "income", amountCents: 200_00, status: "pending" }),
      tx({ type: "expense", amountCents: 100_00, status: "received" }),
    ]);
    expect(s.receivedCents).toBe(800_00);
    expect(s.pendingCents).toBe(200_00);
  });

  it("conjunto vazio retorna zeros", () => {
    const s = summarize([]);
    expect(s).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      receivedCents: 0,
      pendingCents: 0,
    });
  });
});

describe("summarizeByMonth", () => {
  it("agrupa por mês em ordem cronológica", () => {
    const buckets = summarizeByMonth([
      tx({ type: "income", amountCents: 100_00, date: new Date("2026-02-10T00:00:00Z") }),
      tx({ type: "income", amountCents: 200_00, date: new Date("2026-01-05T00:00:00Z") }),
      tx({ type: "expense", amountCents: 50_00, date: new Date("2026-01-20T00:00:00Z") }),
    ]);
    expect(buckets.map((b) => b.month)).toEqual(["2026-01", "2026-02"]);
    expect(buckets[0].incomeCents).toBe(200_00);
    expect(buckets[0].expenseCents).toBe(50_00);
    expect(buckets[0].netCents).toBe(150_00);
    expect(buckets[1].incomeCents).toBe(100_00);
  });
});

describe("summarizeByCategory", () => {
  it("agrupa por categoria e tipo, ordenado por maior total", () => {
    const buckets = summarizeByCategory([
      tx({ type: "expense", amountCents: 100_00, category: "transporte" }),
      tx({ type: "expense", amountCents: 300_00, category: "produção" }),
      tx({ type: "expense", amountCents: 50_00, category: "transporte" }),
      tx({ type: "income", amountCents: 300_00, category: "cachê" }),
    ]);
    expect(buckets[0]).toMatchObject({ category: "produção", totalCents: 300_00 });
    const transporte = buckets.find((b) => b.category === "transporte");
    expect(transporte?.totalCents).toBe(150_00);
    expect(transporte?.count).toBe(2);
  });
});

describe("monthKey", () => {
  it("formata YYYY-MM em UTC", () => {
    expect(monthKey(new Date("2026-12-31T23:00:00Z"))).toBe("2026-12");
    expect(monthKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });
});
