import { describe, it, expect } from "vitest";
import {
  round2,
  monthKey,
  showProfit,
  summarize,
  monthlyTotals,
  totalsByCategory,
  type FinanceTransaction,
} from "./finance";

const tx = (over: Partial<FinanceTransaction>): FinanceTransaction => ({
  type: "income",
  amount: 100,
  date: "2026-01-15T12:00:00",
  status: "received",
  category: "Cachê",
  showId: null,
  ...over,
});

describe("round2", () => {
  it("corrige artefatos de ponto flutuante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2999.999)).toBe(3000);
    expect(round2(10)).toBe(10);
    expect(round2(1234.567)).toBe(1234.57);
  });
});

describe("monthKey", () => {
  it("formata YYYY-MM a partir de string ou Date", () => {
    expect(monthKey("2026-03-09T00:00:00")).toBe("2026-03");
    expect(monthKey(new Date(2026, 10, 1))).toBe("2026-11"); // mês 10 = novembro
  });
});

describe("showProfit", () => {
  it("calcula cachê − despesas vinculadas", () => {
    const transactions: FinanceTransaction[] = [
      tx({ type: "expense", amount: 200, category: "Transporte", showId: "s1" }),
      tx({ type: "expense", amount: 150, category: "Equipe", showId: "s1" }),
      tx({ type: "expense", amount: 999, category: "Outro", showId: "s2" }), // outro show
      tx({ type: "income", amount: 500, category: "Merch", showId: "s1" }), // ignorada no P&L
    ];
    const pnl = showProfit({ id: "s1", fee: 1000 }, transactions);
    expect(pnl.revenue).toBe(1000);
    expect(pnl.expenses).toBe(350);
    expect(pnl.result).toBe(650);
    expect(pnl.margin).toBe(0.65);
  });

  it("lida com show sem despesas e margem com fee zero", () => {
    expect(showProfit({ id: "s1", fee: 800 }, [])).toMatchObject({
      revenue: 800,
      expenses: 0,
      result: 800,
      margin: 1,
    });
    expect(showProfit({ id: "s1", fee: 0 }, []).margin).toBe(0);
  });

  it("pode resultar em prejuízo (resultado negativo)", () => {
    const transactions = [tx({ type: "expense", amount: 1200, showId: "s1" })];
    expect(showProfit({ id: "s1", fee: 1000 }, transactions).result).toBe(-200);
  });
});

describe("summarize", () => {
  it("separa receitas/despesas, recebido e a receber", () => {
    const transactions: FinanceTransaction[] = [
      tx({ type: "income", amount: 1000, status: "received" }),
      tx({ type: "income", amount: 500, status: "pending" }),
      tx({ type: "expense", amount: 300, status: "received" }),
    ];
    const s = summarize(transactions);
    expect(s.income).toBe(1500);
    expect(s.expense).toBe(300);
    expect(s.net).toBe(1200);
    expect(s.received).toBe(1000);
    expect(s.pendingReceivable).toBe(500);
  });

  it("retorna zeros para lista vazia", () => {
    expect(summarize([])).toEqual({
      income: 0,
      expense: 0,
      net: 0,
      received: 0,
      pendingReceivable: 0,
    });
  });
});

describe("monthlyTotals", () => {
  it("agrega por mês e ordena cronologicamente", () => {
    const transactions: FinanceTransaction[] = [
      tx({ type: "income", amount: 100, date: "2026-02-10T00:00:00" }),
      tx({ type: "expense", amount: 40, date: "2026-02-20T00:00:00" }),
      tx({ type: "income", amount: 200, date: "2026-01-05T00:00:00" }),
    ];
    const result = monthlyTotals(transactions);
    expect(result).toEqual([
      { month: "2026-01", income: 200, expense: 0, net: 200 },
      { month: "2026-02", income: 100, expense: 40, net: 60 },
    ]);
  });
});

describe("totalsByCategory", () => {
  it("soma por categoria e ordena do maior para o menor", () => {
    const transactions: FinanceTransaction[] = [
      tx({ type: "expense", amount: 100, category: "Transporte" }),
      tx({ type: "expense", amount: 250, category: "Equipamento" }),
      tx({ type: "expense", amount: 50, category: "Transporte" }),
      tx({ type: "income", amount: 999, category: "Cachê" }), // tipo diferente, ignorado
    ];
    expect(totalsByCategory(transactions, "expense")).toEqual([
      { category: "Equipamento", total: 250 },
      { category: "Transporte", total: 150 },
    ]);
  });
});
