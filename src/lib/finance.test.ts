import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  summarize,
  totalsByCategory,
  totalsByMonth,
  type TxInput,
} from "./finance";

const tx = (over: Partial<TxInput> = {}): TxInput => ({
  type: "expense",
  amountCents: 0,
  category: "Outros",
  date: new Date("2026-01-15T12:00:00Z"),
  paid: true,
  showId: null,
  ...over,
});

describe("computeShowPnL", () => {
  it("resultado = cachê + receitas vinculadas - despesas vinculadas", () => {
    const pnl = computeShowPnL(80000, [
      tx({ type: "expense", amountCents: 15000, category: "Transporte" }),
      tx({ type: "expense", amountCents: 5000, category: "Alimentação" }),
      tx({ type: "income", amountCents: 20000, category: "Venda de merch" }),
    ]);
    expect(pnl.feeCents).toBe(80000);
    expect(pnl.incomeCents).toBe(100000); // 80000 cachê + 20000 merch
    expect(pnl.expenseCents).toBe(20000);
    expect(pnl.resultCents).toBe(80000);
  });

  it("show sem transações: resultado = cachê", () => {
    const pnl = computeShowPnL(50000, []);
    expect(pnl.resultCents).toBe(50000);
  });

  it("resultado pode ser negativo (prejuízo)", () => {
    const pnl = computeShowPnL(10000, [
      tx({ type: "expense", amountCents: 30000, category: "Equipamento" }),
    ]);
    expect(pnl.resultCents).toBe(-20000);
  });
});

describe("summarize", () => {
  const data: TxInput[] = [
    tx({ type: "income", amountCents: 80000, paid: true }),
    tx({ type: "income", amountCents: 20000, paid: false }), // a receber
    tx({ type: "expense", amountCents: 15000, paid: true }),
    tx({ type: "expense", amountCents: 5000, paid: false }), // a pagar
  ];

  it("calcula totais e líquido", () => {
    const s = summarize(data);
    expect(s.incomeCents).toBe(100000);
    expect(s.expenseCents).toBe(20000);
    expect(s.netCents).toBe(80000);
  });

  it("separa a receber e a pagar (status pendente)", () => {
    const s = summarize(data);
    expect(s.receivableCents).toBe(20000);
    expect(s.payableCents).toBe(5000);
  });

  it("conjunto vazio zera tudo", () => {
    expect(summarize([])).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      receivableCents: 0,
      payableCents: 0,
    });
  });
});

describe("totalsByCategory", () => {
  it("agrupa por tipo+categoria e ordena desc", () => {
    const rows = totalsByCategory([
      tx({ type: "expense", amountCents: 5000, category: "Transporte" }),
      tx({ type: "expense", amountCents: 10000, category: "Transporte" }),
      tx({ type: "expense", amountCents: 8000, category: "Equipamento" }),
      tx({ type: "income", amountCents: 8000, category: "Cachê" }),
    ]);
    expect(rows[0]).toEqual({ category: "Transporte", type: "expense", totalCents: 15000 });
    expect(rows.find((r) => r.category === "Equipamento")?.totalCents).toBe(8000);
    // Mesma categoria com tipos diferentes não se mistura.
    expect(rows).toHaveLength(3);
  });
});

describe("totalsByMonth", () => {
  it("agrupa por mês UTC em ordem cronológica", () => {
    const rows = totalsByMonth([
      tx({ type: "income", amountCents: 30000, date: new Date("2026-02-10T00:00:00Z") }),
      tx({ type: "expense", amountCents: 10000, date: new Date("2026-01-20T00:00:00Z") }),
      tx({ type: "income", amountCents: 50000, date: new Date("2026-01-05T00:00:00Z") }),
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2026-01", "2026-02"]);
    expect(rows[0]).toEqual({
      month: "2026-01",
      incomeCents: 50000,
      expenseCents: 10000,
      netCents: 40000,
    });
    expect(rows[1].netCents).toBe(30000);
  });
});
