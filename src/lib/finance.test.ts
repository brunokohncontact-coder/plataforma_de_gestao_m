import { describe, it, expect } from "vitest";
import {
  computeShowProfitability,
  summarize,
  totalsByCategory,
  totalsByMonth,
  profitByShow,
  type TransactionLike,
  type ShowLike,
} from "./finance";

const tx = (over: Partial<TransactionLike>): TransactionLike => ({
  type: "EXPENSE",
  amountCents: 0,
  category: "Outro",
  date: "2026-01-15T00:00:00.000Z",
  settled: true,
  showId: null,
  ...over,
});

describe("computeShowProfitability (F4)", () => {
  const show: ShowLike = { id: "s1", feeCents: 200_00 };

  it("cachê sem transações = resultado igual ao cachê, margem 100%", () => {
    const p = computeShowProfitability(show, []);
    expect(p.grossCents).toBe(200_00);
    expect(p.expensesCents).toBe(0);
    expect(p.netCents).toBe(200_00);
    expect(p.margin).toBe(1);
  });

  it("subtrai despesas vinculadas do cachê", () => {
    const p = computeShowProfitability(show, [
      tx({ type: "EXPENSE", amountCents: 50_00, showId: "s1" }),
      tx({ type: "EXPENSE", amountCents: 30_00, showId: "s1" }),
    ]);
    expect(p.expensesCents).toBe(80_00);
    expect(p.netCents).toBe(120_00);
    expect(p.margin).toBeCloseTo(0.6, 5);
  });

  it("soma receitas extras vinculadas (ex.: merch) ao cachê", () => {
    const p = computeShowProfitability(show, [
      tx({ type: "INCOME", amountCents: 100_00, showId: "s1" }),
      tx({ type: "EXPENSE", amountCents: 50_00, showId: "s1" }),
    ]);
    expect(p.extraIncomeCents).toBe(100_00);
    expect(p.grossCents).toBe(300_00);
    expect(p.netCents).toBe(250_00);
  });

  it("resultado pode ser negativo (prejuízo)", () => {
    const cheap: ShowLike = { id: "s2", feeCents: 50_00 };
    const p = computeShowProfitability(cheap, [
      tx({ type: "EXPENSE", amountCents: 200_00, showId: "s2" }),
    ]);
    expect(p.netCents).toBe(-150_00);
    expect(p.margin).toBeCloseTo(-3, 5);
  });

  it("margem é null quando não há receita alguma", () => {
    const free: ShowLike = { id: "s3", feeCents: 0 };
    const p = computeShowProfitability(free, [
      tx({ type: "EXPENSE", amountCents: 10_00, showId: "s3" }),
    ]);
    expect(p.grossCents).toBe(0);
    expect(p.margin).toBeNull();
    expect(p.netCents).toBe(-10_00);
  });
});

describe("summarize (F3)", () => {
  it("soma receitas, despesas e saldo", () => {
    const s = summarize([
      tx({ type: "INCOME", amountCents: 300_00 }),
      tx({ type: "INCOME", amountCents: 100_00 }),
      tx({ type: "EXPENSE", amountCents: 120_00 }),
    ]);
    expect(s.incomeCents).toBe(400_00);
    expect(s.expenseCents).toBe(120_00);
    expect(s.balanceCents).toBe(280_00);
  });

  it("rastreia pendências (contas a receber e a pagar)", () => {
    const s = summarize([
      tx({ type: "INCOME", amountCents: 300_00, settled: false }),
      tx({ type: "INCOME", amountCents: 100_00, settled: true }),
      tx({ type: "EXPENSE", amountCents: 80_00, settled: false }),
      tx({ type: "EXPENSE", amountCents: 20_00, settled: true }),
    ]);
    expect(s.pendingIncomeCents).toBe(300_00);
    expect(s.pendingExpenseCents).toBe(80_00);
  });

  it("lista vazia retorna tudo zero", () => {
    expect(summarize([])).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      pendingIncomeCents: 0,
      pendingExpenseCents: 0,
    });
  });
});

describe("totalsByCategory (F3)", () => {
  it("agrupa por categoria + tipo, ordenado desc", () => {
    const totals = totalsByCategory([
      tx({ type: "EXPENSE", amountCents: 50_00, category: "Transporte" }),
      tx({ type: "EXPENSE", amountCents: 30_00, category: "Transporte" }),
      tx({ type: "EXPENSE", amountCents: 100_00, category: "Equipamento" }),
      tx({ type: "INCOME", amountCents: 200_00, category: "Cachê" }),
    ]);
    expect(totals[0]).toEqual({
      category: "Cachê",
      type: "INCOME",
      totalCents: 200_00,
    });
    expect(totals.find((t) => t.category === "Transporte")?.totalCents).toBe(
      80_00,
    );
  });

  it("mesma categoria em tipos diferentes não se mistura", () => {
    const totals = totalsByCategory([
      tx({ type: "INCOME", amountCents: 100_00, category: "Outro" }),
      tx({ type: "EXPENSE", amountCents: 40_00, category: "Outro" }),
    ]);
    expect(totals).toHaveLength(2);
  });
});

describe("totalsByMonth (F3)", () => {
  it("agrega por mês em ordem cronológica", () => {
    const months = totalsByMonth([
      tx({ type: "INCOME", amountCents: 100_00, date: "2026-02-10T00:00:00Z" }),
      tx({ type: "EXPENSE", amountCents: 40_00, date: "2026-02-20T00:00:00Z" }),
      tx({ type: "INCOME", amountCents: 200_00, date: "2026-01-05T00:00:00Z" }),
    ]);
    expect(months.map((m) => m.month)).toEqual(["2026-01", "2026-02"]);
    expect(months[0]).toMatchObject({ incomeCents: 200_00, balanceCents: 200_00 });
    expect(months[1]).toMatchObject({
      incomeCents: 100_00,
      expenseCents: 40_00,
      balanceCents: 60_00,
    });
  });
});

describe("profitByShow (F4 agregado)", () => {
  it("calcula lucro por show e ordena por resultado desc", () => {
    const shows: ShowLike[] = [
      { id: "a", feeCents: 100_00 },
      { id: "b", feeCents: 300_00 },
    ];
    const txs: TransactionLike[] = [
      tx({ type: "EXPENSE", amountCents: 90_00, showId: "a" }),
      tx({ type: "EXPENSE", amountCents: 50_00, showId: "b" }),
      // transação não vinculada deve ser ignorada
      tx({ type: "EXPENSE", amountCents: 999_00, showId: null }),
    ];
    const result = profitByShow(shows, txs);
    expect(result.map((r) => r.showId)).toEqual(["b", "a"]);
    expect(result[0].netCents).toBe(250_00);
    expect(result[1].netCents).toBe(10_00);
  });
});
