import { describe, it, expect } from "vitest";
import {
  showProfitability,
  financialSummary,
  monthlyBreakdown,
  monthKey,
  round2,
} from "./finance";
import type { Show, Transaction } from "./domain";

function tx(partial: Partial<Transaction> & Pick<Transaction, "type" | "amount">): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    category: "Geral",
    date: new Date("2026-01-15T00:00:00Z"),
    status: "PENDING",
    showId: null,
    description: null,
    ...partial,
  };
}

function show(partial: Partial<Show> & Pick<Show, "id">): Show {
  return {
    title: "Show",
    date: new Date("2026-01-15T00:00:00Z"),
    venue: null,
    city: null,
    status: "CONFIRMED",
    fee: 0,
    feeStatus: "PENDING",
    notes: null,
    contactId: null,
    ...partial,
  };
}

describe("round2", () => {
  it("arredonda para 2 casas sem erro de ponto flutuante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });
});

describe("showProfitability", () => {
  it("calcula cachê − despesas vinculadas (diferencial do produto)", () => {
    const s = show({ id: "s1", fee: 2000 });
    const txs = [
      tx({ type: "EXPENSE", amount: 300, category: "Transporte", showId: "s1" }),
      tx({ type: "EXPENSE", amount: 200, category: "Hospedagem", showId: "s1" }),
    ];
    const p = showProfitability(s, txs);
    expect(p.fee).toBe(2000);
    expect(p.linkedExpense).toBe(500);
    expect(p.net).toBe(1500);
  });

  it("soma receitas extras vinculadas (ex.: merch) ao resultado", () => {
    const s = show({ id: "s1", fee: 1000 });
    const txs = [
      tx({ type: "INCOME", amount: 400, category: "Merch", showId: "s1" }),
      tx({ type: "EXPENSE", amount: 150, category: "Transporte", showId: "s1" }),
    ];
    const p = showProfitability(s, txs);
    expect(p.linkedIncome).toBe(400);
    expect(p.net).toBe(1250); // 1000 + 400 - 150
    expect(p.margin).toBe(round2(1250 / 1400));
  });

  it("ignora transações de outros shows e não vinculadas", () => {
    const s = show({ id: "s1", fee: 1000 });
    const txs = [
      tx({ type: "EXPENSE", amount: 999, category: "X", showId: "s2" }),
      tx({ type: "EXPENSE", amount: 999, category: "Y", showId: null }),
    ];
    const p = showProfitability(s, txs);
    expect(p.linkedExpense).toBe(0);
    expect(p.net).toBe(1000);
  });

  it("realizedNet conta apenas itens liquidados (caixa)", () => {
    const s = show({ id: "s1", fee: 2000, feeStatus: "PENDING" });
    const txs = [
      tx({ type: "EXPENSE", amount: 300, showId: "s1", status: "SETTLED" }),
      tx({ type: "EXPENSE", amount: 200, showId: "s1", status: "PENDING" }),
    ];
    const p = showProfitability(s, txs);
    expect(p.net).toBe(1500); // previsto
    expect(p.realizedNet).toBe(-300); // cachê ainda não recebido, só despesa paga
  });

  it("margem é 0 quando não há receita bruta", () => {
    const s = show({ id: "s1", fee: 0 });
    const p = showProfitability(s, [
      tx({ type: "EXPENSE", amount: 100, showId: "s1" }),
    ]);
    expect(p.margin).toBe(0);
    expect(p.net).toBe(-100);
  });
});

describe("financialSummary", () => {
  it("agrega cachês de shows como receita e respeita liquidação", () => {
    const shows = [
      show({ id: "s1", fee: 2000, feeStatus: "SETTLED" }),
      show({ id: "s2", fee: 1000, feeStatus: "PENDING" }),
    ];
    const txs = [
      tx({ type: "INCOME", amount: 500, category: "Merch", status: "SETTLED" }),
      tx({ type: "EXPENSE", amount: 800, category: "Transporte", status: "SETTLED" }),
      tx({ type: "EXPENSE", amount: 200, category: "Marketing", status: "PENDING" }),
    ];
    const sum = financialSummary(txs, shows);

    expect(sum.totalIncome).toBe(3500); // 2000 + 1000 + 500
    expect(sum.totalExpense).toBe(1000); // 800 + 200
    expect(sum.balance).toBe(2500);

    expect(sum.receivedIncome).toBe(2500); // 2000 (settled fee) + 500 (settled merch)
    expect(sum.paidExpense).toBe(800);
    expect(sum.realizedBalance).toBe(1700);

    expect(sum.pendingIncome).toBe(1000); // s2 fee pendente
    expect(sum.pendingExpense).toBe(200);
  });

  it("ignora shows cancelados no resumo", () => {
    const shows = [
      show({ id: "s1", fee: 5000, feeStatus: "PENDING", status: "CANCELLED" }),
    ];
    const sum = financialSummary([], shows);
    expect(sum.totalIncome).toBe(0);
  });

  it("agrupa por categoria ordenado por valor, incluindo Cachê", () => {
    const shows = [show({ id: "s1", fee: 3000, feeStatus: "PENDING" })];
    const txs = [
      tx({ type: "INCOME", amount: 500, category: "Merch" }),
      tx({ type: "EXPENSE", amount: 800, category: "Transporte" }),
      tx({ type: "EXPENSE", amount: 1200, category: "Equipe" }),
    ];
    const sum = financialSummary(txs, shows);

    expect(sum.incomeByCategory[0]).toEqual({ category: "Cachê", total: 3000 });
    expect(sum.incomeByCategory[1]).toEqual({ category: "Merch", total: 500 });
    expect(sum.expenseByCategory[0]).toEqual({ category: "Equipe", total: 1200 });
    expect(sum.expenseByCategory[1]).toEqual({ category: "Transporte", total: 800 });
  });

  it("funciona sem shows (só transações)", () => {
    const sum = financialSummary([tx({ type: "INCOME", amount: 100 })]);
    expect(sum.totalIncome).toBe(100);
    expect(sum.incomeByCategory).toEqual([{ category: "Geral", total: 100 }]);
  });
});

describe("monthlyBreakdown", () => {
  it("agrupa por mês e ordena cronologicamente", () => {
    const shows = [
      show({ id: "s1", fee: 1000, date: new Date("2026-01-10T00:00:00Z") }),
      show({ id: "s2", fee: 2000, date: new Date("2026-03-05T00:00:00Z") }),
    ];
    const txs = [
      tx({ type: "EXPENSE", amount: 300, date: new Date("2026-01-20T00:00:00Z") }),
      tx({ type: "INCOME", amount: 150, date: new Date("2026-02-01T00:00:00Z") }),
    ];
    const months = monthlyBreakdown(txs, shows);

    expect(months.map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(months[0]).toEqual({ month: "2026-01", income: 1000, expense: 300, balance: 700 });
    expect(months[1]).toEqual({ month: "2026-02", income: 150, expense: 0, balance: 150 });
    expect(months[2]).toEqual({ month: "2026-03", income: 2000, expense: 0, balance: 2000 });
  });

  it("exclui shows cancelados", () => {
    const shows = [
      show({ id: "s1", fee: 9999, status: "CANCELLED", date: new Date("2026-01-10T00:00:00Z") }),
    ];
    expect(monthlyBreakdown([], shows)).toEqual([]);
  });
});

describe("monthKey", () => {
  it("formata YYYY-MM em UTC", () => {
    expect(monthKey(new Date("2026-06-15T23:30:00Z"))).toBe("2026-06");
    expect(monthKey(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });
});
