import { describe, it, expect } from "vitest";
import {
  sumByType,
  showProfitability,
  financeSummary,
  monthKey,
  monthlyTotals,
  totalsByCategory,
  type TransactionLike,
} from "./finance";

describe("sumByType", () => {
  it("soma apenas o tipo pedido e arredonda para centavos", () => {
    const txs: TransactionLike[] = [
      { type: "INCOME", amount: 100.1 },
      { type: "INCOME", amount: 0.2 },
      { type: "EXPENSE", amount: 50 },
    ];
    expect(sumByType(txs, "INCOME")).toBe(100.3);
    expect(sumByType(txs, "EXPENSE")).toBe(50);
  });

  it("retorna 0 para lista vazia", () => {
    expect(sumByType([], "INCOME")).toBe(0);
  });
});

describe("showProfitability (F4)", () => {
  it("resultado = cachê − despesas vinculadas", () => {
    const p = showProfitability({ fee: 2000 }, [
      { type: "EXPENSE", amount: 300, category: "Transporte" },
      { type: "EXPENSE", amount: 200, category: "Equipamento" },
    ]);
    expect(p.revenue).toBe(2000);
    expect(p.expenses).toBe(500);
    expect(p.result).toBe(1500);
    expect(p.expenseCount).toBe(2);
    expect(p.margin).toBe(0.75);
  });

  it("soma receita extra (merch) por cima do cachê, sem double-count", () => {
    const p = showProfitability({ fee: 1000 }, [
      { type: "INCOME", amount: 400, category: "Merch" },
      { type: "EXPENSE", amount: 150, category: "Transporte" },
    ]);
    expect(p.fee).toBe(1000);
    expect(p.extraIncome).toBe(400);
    expect(p.revenue).toBe(1400);
    expect(p.expenses).toBe(150);
    expect(p.result).toBe(1250);
  });

  it("resultado negativo quando despesas superam a receita", () => {
    const p = showProfitability({ fee: 500 }, [
      { type: "EXPENSE", amount: 800, category: "Produção" },
    ]);
    expect(p.result).toBe(-300);
    expect(p.margin).toBe(-0.6);
  });

  it("margem 0 quando não há receita", () => {
    const p = showProfitability({ fee: 0 }, [
      { type: "EXPENSE", amount: 100 },
    ]);
    expect(p.revenue).toBe(0);
    expect(p.result).toBe(-100);
    expect(p.margin).toBe(0);
  });

  it("show sem fee definido conta como 0", () => {
    const p = showProfitability({}, []);
    expect(p.revenue).toBe(0);
    expect(p.result).toBe(0);
  });
});

describe("financeSummary (F3)", () => {
  const txs: TransactionLike[] = [
    { type: "INCOME", amount: 2000, settled: true },
    { type: "INCOME", amount: 500, settled: false }, // a receber
    { type: "EXPENSE", amount: 300, settled: true },
    { type: "EXPENSE", amount: 100, settled: false }, // a pagar
  ];

  it("totaliza receitas, despesas e saldo (todas as transações)", () => {
    const s = financeSummary(txs);
    expect(s.income).toBe(2500);
    expect(s.expenses).toBe(400);
    expect(s.net).toBe(2100);
  });

  it("settledOnly considera apenas liquidadas no net", () => {
    const s = financeSummary(txs, { settledOnly: true });
    expect(s.income).toBe(2000);
    expect(s.expenses).toBe(300);
    expect(s.net).toBe(1700);
  });

  it("calcula contas a receber e a pagar a partir das não liquidadas", () => {
    const s = financeSummary(txs);
    expect(s.receivable).toBe(500);
    expect(s.payable).toBe(100);
  });

  it("trata transações sem settled como liquidadas", () => {
    const s = financeSummary([{ type: "INCOME", amount: 10 }]);
    expect(s.income).toBe(10);
    expect(s.receivable).toBe(0);
  });
});

describe("monthKey", () => {
  it("formata como YYYY-MM em UTC", () => {
    expect(monthKey("2026-03-15T10:00:00Z")).toBe("2026-03");
    expect(monthKey(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
  });
});

describe("monthlyTotals", () => {
  it("agrega por mês e ordena cronologicamente", () => {
    const txs: TransactionLike[] = [
      { type: "INCOME", amount: 1000, date: "2026-02-10T00:00:00Z" },
      { type: "EXPENSE", amount: 200, date: "2026-02-20T00:00:00Z" },
      { type: "INCOME", amount: 500, date: "2026-01-05T00:00:00Z" },
    ];
    const result = monthlyTotals(txs);
    expect(result).toEqual([
      { month: "2026-01", income: 500, expenses: 0, net: 500 },
      { month: "2026-02", income: 1000, expenses: 200, net: 800 },
    ]);
  });

  it("ignora transações sem data", () => {
    const result = monthlyTotals([{ type: "INCOME", amount: 100 }]);
    expect(result).toEqual([]);
  });
});

describe("totalsByCategory", () => {
  it("agrupa por categoria e tipo, ordenado por maior total", () => {
    const txs: TransactionLike[] = [
      { type: "EXPENSE", amount: 300, category: "Transporte" },
      { type: "EXPENSE", amount: 100, category: "Transporte" },
      { type: "INCOME", amount: 2000, category: "Cachê" },
    ];
    const result = totalsByCategory(txs);
    expect(result[0]).toEqual({
      category: "Cachê",
      type: "INCOME",
      total: 2000,
      count: 1,
    });
    expect(result[1]).toEqual({
      category: "Transporte",
      type: "EXPENSE",
      total: 400,
      count: 2,
    });
  });

  it("usa 'Sem categoria' quando ausente ou vazia", () => {
    const result = totalsByCategory([
      { type: "EXPENSE", amount: 50, category: "  " },
      { type: "EXPENSE", amount: 50 },
    ]);
    expect(result[0].category).toBe("Sem categoria");
    expect(result[0].count).toBe(2);
  });
});
