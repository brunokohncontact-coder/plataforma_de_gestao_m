import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  computeFinancialSummary,
  computeCategoryBreakdown,
  computeMonthlyTimeline,
  round2,
  formatBRL,
  type TransactionLike,
} from "./finance";

const show = { id: "show1", feeAgreed: 1000 };

function tx(partial: Partial<TransactionLike>): TransactionLike {
  return {
    type: "despesa",
    amount: 100,
    category: "transporte",
    date: "2026-01-15",
    received: true,
    showId: "show1",
    ...partial,
  };
}

describe("round2", () => {
  it("corrige erros de ponto flutuante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1000 - 199.99)).toBe(800.01);
  });
});

describe("computeShowPnL", () => {
  it("calcula resultado planejado = cachê − despesas vinculadas", () => {
    const txs = [
      tx({ type: "despesa", amount: 200, category: "transporte" }),
      tx({ type: "despesa", amount: 150, category: "alimentacao" }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.expensesTotal).toBe(350);
    expect(pnl.plannedResult).toBe(650); // 1000 - 350
  });

  it("separa despesas pagas de pendentes", () => {
    const txs = [
      tx({ type: "despesa", amount: 200, received: true }),
      tx({ type: "despesa", amount: 100, received: false }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.expensesPaid).toBe(200);
    expect(pnl.expensesPending).toBe(100);
    expect(pnl.expensesTotal).toBe(300);
    expect(pnl.plannedResult).toBe(700);
  });

  it("calcula resultado realizado a partir de receitas lançadas", () => {
    const txs = [
      tx({ type: "receita", amount: 1000, received: true, category: "cache" }),
      tx({ type: "receita", amount: 300, received: false, category: "cache" }),
      tx({ type: "despesa", amount: 250 }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.revenueReceived).toBe(1000);
    expect(pnl.revenuePending).toBe(300);
    expect(pnl.actualResult).toBe(1050); // (1000 + 300) - 250
    expect(pnl.plannedResult).toBe(750); // 1000 - 250
  });

  it("ignora transações de outros shows", () => {
    const txs = [
      tx({ type: "despesa", amount: 200, showId: "show1" }),
      tx({ type: "despesa", amount: 999, showId: "show2" }),
      tx({ type: "despesa", amount: 50, showId: null }),
    ];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.expensesTotal).toBe(200);
  });

  it("show sem transações: resultado planejado = cachê", () => {
    const pnl = computeShowPnL(show, []);
    expect(pnl.expensesTotal).toBe(0);
    expect(pnl.plannedResult).toBe(1000);
    expect(pnl.actualResult).toBe(0);
  });

  it("resultado pode ser negativo (prejuízo)", () => {
    const txs = [tx({ type: "despesa", amount: 1500 })];
    const pnl = computeShowPnL(show, txs);
    expect(pnl.plannedResult).toBe(-500);
  });
});

describe("computeFinancialSummary", () => {
  const txs: TransactionLike[] = [
    tx({ type: "receita", amount: 1000, received: true }),
    tx({ type: "receita", amount: 500, received: false }),
    tx({ type: "despesa", amount: 300, received: true }),
    tx({ type: "despesa", amount: 200, received: false }),
  ];

  it("separa recebido/pago de pendente", () => {
    const s = computeFinancialSummary(txs);
    expect(s.totalRevenue).toBe(1000);
    expect(s.pendingRevenue).toBe(500);
    expect(s.totalExpenses).toBe(300);
    expect(s.pendingExpenses).toBe(200);
  });

  it("netResult = recebido − pago", () => {
    expect(computeFinancialSummary(txs).netResult).toBe(700);
  });

  it("balanceProjected inclui pendências", () => {
    // (1000+500) - (300+200) = 1000
    expect(computeFinancialSummary(txs).balanceProjected).toBe(1000);
  });

  it("conjunto vazio retorna zeros", () => {
    const s = computeFinancialSummary([]);
    expect(s.totalRevenue).toBe(0);
    expect(s.netResult).toBe(0);
    expect(s.balanceProjected).toBe(0);
  });
});

describe("computeCategoryBreakdown", () => {
  const txs: TransactionLike[] = [
    tx({ type: "despesa", amount: 100, category: "transporte" }),
    tx({ type: "despesa", amount: 50, category: "transporte" }),
    tx({ type: "despesa", amount: 200, category: "equipamento" }),
    tx({ type: "receita", amount: 1000, category: "cache" }),
    tx({ type: "despesa", amount: 999, category: "outro", received: false }),
  ];

  it("agrupa por categoria e tipo, ignorando pendentes por padrão", () => {
    const b = computeCategoryBreakdown(txs);
    const transporte = b.find(
      (x) => x.category === "transporte" && x.type === "despesa",
    );
    expect(transporte?.total).toBe(150);
    // pendente não entra
    expect(b.find((x) => x.category === "outro")).toBeUndefined();
  });

  it("ordena do maior para o menor total", () => {
    const b = computeCategoryBreakdown(txs);
    expect(b[0].total).toBe(1000); // cache
  });

  it("includePending soma pendentes", () => {
    const b = computeCategoryBreakdown(txs, { includePending: true });
    expect(b.find((x) => x.category === "outro")?.total).toBe(999);
  });
});

describe("computeMonthlyTimeline", () => {
  const txs: TransactionLike[] = [
    tx({ type: "receita", amount: 1000, date: "2026-01-10" }),
    tx({ type: "despesa", amount: 300, date: "2026-01-20" }),
    tx({ type: "receita", amount: 2000, date: "2026-02-05" }),
    tx({ type: "despesa", amount: 500, date: "2026-02-15" }),
  ];

  it("agrega por mês e calcula net", () => {
    const t = computeMonthlyTimeline(txs);
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({ month: "2026-01", revenue: 1000, expenses: 300, net: 700 });
    expect(t[1]).toMatchObject({ month: "2026-02", revenue: 2000, expenses: 500, net: 1500 });
  });

  it("ordena por mês crescente", () => {
    const t = computeMonthlyTimeline([
      tx({ type: "receita", amount: 1, date: "2026-03-01" }),
      tx({ type: "receita", amount: 1, date: "2026-01-01" }),
    ]);
    expect(t.map((p) => p.month)).toEqual(["2026-01", "2026-03"]);
  });
});

describe("formatBRL", () => {
  it("formata em reais", () => {
    expect(formatBRL(1234.5)).toContain("1.234,50");
    expect(formatBRL(1234.5)).toContain("R$");
  });
});
