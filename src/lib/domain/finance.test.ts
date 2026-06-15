import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  summarizeTransactions,
  groupByMonth,
  groupByCategory,
  monthKey,
  type TxLike,
} from "./finance";

function tx(partial: Partial<TxLike>): TxLike {
  return {
    type: "EXPENSE",
    amount: 0,
    category: "Outro",
    date: new Date("2026-01-15T00:00:00Z"),
    received: true,
    showId: null,
    ...partial,
  };
}

describe("computeShowPnL", () => {
  it("usa o cachê como receita e subtrai despesas vinculadas", () => {
    const pnl = computeShowPnL(
      { id: "s1", fee: 1000, feePaid: false },
      [
        tx({ type: "EXPENSE", amount: 200, category: "Transporte" }),
        tx({ type: "EXPENSE", amount: 150, category: "Alimentação" }),
      ],
    );
    expect(pnl.fee).toBe(1000);
    expect(pnl.extraIncome).toBe(0);
    expect(pnl.grossRevenue).toBe(1000);
    expect(pnl.totalExpenses).toBe(350);
    expect(pnl.netResult).toBe(650);
    expect(pnl.margin).toBeCloseTo(0.65, 5);
  });

  it("soma receitas adicionais vinculadas (ex.: merch) ao cachê", () => {
    const pnl = computeShowPnL(
      { id: "s1", fee: 800, feePaid: true },
      [
        tx({ type: "INCOME", amount: 300, category: "Venda de merch" }),
        tx({ type: "EXPENSE", amount: 100, category: "Transporte" }),
      ],
    );
    expect(pnl.extraIncome).toBe(300);
    expect(pnl.grossRevenue).toBe(1100);
    expect(pnl.totalExpenses).toBe(100);
    expect(pnl.netResult).toBe(1000);
  });

  it("resulta em prejuízo quando despesas superam a receita", () => {
    const pnl = computeShowPnL({ id: "s1", fee: 300, feePaid: false }, [
      tx({ type: "EXPENSE", amount: 500, category: "Equipamento" }),
    ]);
    expect(pnl.netResult).toBe(-200);
    expect(pnl.margin).toBeCloseTo(-200 / 300, 5);
  });

  it("margin é null quando não há receita", () => {
    const pnl = computeShowPnL({ id: "s1", fee: 0, feePaid: false }, [
      tx({ type: "EXPENSE", amount: 50, category: "Outro" }),
    ]);
    expect(pnl.grossRevenue).toBe(0);
    expect(pnl.margin).toBeNull();
    expect(pnl.netResult).toBe(-50);
  });

  it("evita erro de ponto flutuante em somas (0.1 + 0.2)", () => {
    const pnl = computeShowPnL({ id: "s1", fee: 0, feePaid: false }, [
      tx({ type: "INCOME", amount: 0.1 }),
      tx({ type: "INCOME", amount: 0.2 }),
    ]);
    expect(pnl.extraIncome).toBe(0.3);
    expect(pnl.grossRevenue).toBe(0.3);
  });
});

describe("summarizeTransactions", () => {
  const data: TxLike[] = [
    tx({ type: "INCOME", amount: 1000, received: true }),
    tx({ type: "INCOME", amount: 500, received: false }), // pendente
    tx({ type: "EXPENSE", amount: 300, received: true }),
  ];

  it("calcula totais, saldo e recebido/pendente", () => {
    const s = summarizeTransactions(data);
    expect(s.totalIncome).toBe(1500);
    expect(s.totalExpense).toBe(300);
    expect(s.balance).toBe(1200);
    expect(s.receivedIncome).toBe(1000);
    expect(s.pendingIncome).toBe(500);
  });

  it("lida com lista vazia", () => {
    const s = summarizeTransactions([]);
    expect(s).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      receivedIncome: 0,
      pendingIncome: 0,
    });
  });
});

describe("groupByMonth", () => {
  it("agrupa por mês e ordena cronologicamente", () => {
    const data: TxLike[] = [
      tx({ type: "INCOME", amount: 100, date: new Date("2026-03-10T00:00:00Z") }),
      tx({ type: "EXPENSE", amount: 40, date: new Date("2026-03-20T00:00:00Z") }),
      tx({ type: "INCOME", amount: 200, date: new Date("2026-01-05T00:00:00Z") }),
    ];
    const buckets = groupByMonth(data);
    expect(buckets.map((b) => b.month)).toEqual(["2026-01", "2026-03"]);
    expect(buckets[0]).toEqual({ month: "2026-01", income: 200, expense: 0, net: 200 });
    expect(buckets[1]).toEqual({ month: "2026-03", income: 100, expense: 40, net: 60 });
  });
});

describe("groupByCategory", () => {
  it("agrega despesas por categoria, da maior para a menor", () => {
    const data: TxLike[] = [
      tx({ type: "EXPENSE", amount: 100, category: "Transporte" }),
      tx({ type: "EXPENSE", amount: 50, category: "Transporte" }),
      tx({ type: "EXPENSE", amount: 400, category: "Equipamento" }),
      tx({ type: "INCOME", amount: 999, category: "Cachê" }), // ignorado
    ];
    const cats = groupByCategory(data, "EXPENSE");
    expect(cats).toEqual([
      { category: "Equipamento", total: 400 },
      { category: "Transporte", total: 150 },
    ]);
  });
});

describe("monthKey", () => {
  it("formata YYYY-MM em UTC", () => {
    expect(monthKey(new Date("2026-06-15T23:30:00Z"))).toBe("2026-06");
    expect(monthKey(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });
});
