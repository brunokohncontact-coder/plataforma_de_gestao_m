import { describe, it, expect } from "vitest";
import {
  showProfitAndLoss,
  financialSummary,
  monthlySummary,
  monthKey,
  categoryBreakdown,
  accountsReceivable,
  type TransactionLike,
} from "./finance";

// Helper para montar transações compactas nos testes.
function tx(p: Partial<TransactionLike>): TransactionLike {
  return {
    type: "income",
    amountCents: 0,
    date: new Date("2026-01-15T12:00:00Z"),
    status: "received",
    category: "geral",
    showId: null,
    ...p,
  };
}

describe("showProfitAndLoss (F4 — rentabilidade por show)", () => {
  const show = { id: "show1", feeCents: 200_000 }; // R$ 2.000

  it("resultado = cachê − despesas vinculadas", () => {
    const txs = [
      tx({ type: "expense", amountCents: 50_000, showId: "show1", category: "transporte" }),
      tx({ type: "expense", amountCents: 30_000, showId: "show1", category: "hospedagem" }),
    ];
    const pnl = showProfitAndLoss(show, txs);
    expect(pnl.feeCents).toBe(200_000);
    expect(pnl.linkedExpenseCents).toBe(80_000);
    expect(pnl.resultCents).toBe(120_000); // 2000 - 800 = 1200
  });

  it("ignora transações de outros shows e sem vínculo", () => {
    const txs = [
      tx({ type: "expense", amountCents: 99_999, showId: "outro", category: "x" }),
      tx({ type: "expense", amountCents: 12_345, showId: null, category: "y" }),
      tx({ type: "expense", amountCents: 10_000, showId: "show1", category: "z" }),
    ];
    const pnl = showProfitAndLoss(show, txs);
    expect(pnl.linkedExpenseCents).toBe(10_000);
    expect(pnl.resultCents).toBe(190_000);
  });

  it("computa receita vinculada e resultado realizado", () => {
    const txs = [
      tx({ type: "income", amountCents: 200_000, showId: "show1", category: "cache" }),
      tx({ type: "income", amountCents: 15_000, showId: "show1", category: "merch" }),
      tx({ type: "expense", amountCents: 40_000, showId: "show1", category: "transporte" }),
    ];
    const pnl = showProfitAndLoss(show, txs);
    expect(pnl.linkedIncomeCents).toBe(215_000);
    expect(pnl.linkedExpenseCents).toBe(40_000);
    expect(pnl.realizedResultCents).toBe(175_000); // 2150 - 400
    // headline continua baseado no cachê acordado
    expect(pnl.resultCents).toBe(160_000); // 2000 - 400
  });

  it("show sem transações: resultado = cachê", () => {
    const pnl = showProfitAndLoss(show, []);
    expect(pnl.resultCents).toBe(200_000);
    expect(pnl.realizedResultCents).toBe(0);
  });

  it("resultado pode ser negativo (prejuízo)", () => {
    const txs = [tx({ type: "expense", amountCents: 250_000, showId: "show1", category: "x" })];
    const pnl = showProfitAndLoss(show, txs);
    expect(pnl.resultCents).toBe(-50_000);
  });
});

describe("financialSummary (F3 — totais)", () => {
  const txs: TransactionLike[] = [
    tx({ type: "income", amountCents: 100_000, status: "received", category: "show" }),
    tx({ type: "income", amountCents: 50_000, status: "pending", category: "show" }),
    tx({ type: "expense", amountCents: 30_000, status: "received", category: "transporte" }),
    tx({ type: "expense", amountCents: 20_000, status: "pending", category: "equipamento" }),
  ];

  it("visão de competência (default): considera tudo", () => {
    const s = financialSummary(txs);
    expect(s.incomeCents).toBe(150_000);
    expect(s.expenseCents).toBe(50_000);
    expect(s.balanceCents).toBe(100_000);
    expect(s.receivedIncomeCents).toBe(100_000);
    expect(s.pendingIncomeCents).toBe(50_000);
  });

  it("visão de caixa (onlyReceived): só received", () => {
    const s = financialSummary(txs, { onlyReceived: true });
    expect(s.incomeCents).toBe(100_000);
    expect(s.expenseCents).toBe(30_000);
    expect(s.balanceCents).toBe(70_000);
    // os campos de recebido/pendente são informativos e independem do filtro
    expect(s.pendingIncomeCents).toBe(50_000);
  });

  it("lista vazia retorna zeros", () => {
    const s = financialSummary([]);
    expect(s).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      receivedIncomeCents: 0,
      pendingIncomeCents: 0,
    });
  });
});

describe("monthKey / monthlySummary (F3 — mensal)", () => {
  it("monthKey formata YYYY-MM em UTC", () => {
    expect(monthKey(new Date("2026-03-09T23:59:59Z"))).toBe("2026-03");
    expect(monthKey(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });

  it("agrega por mês e ordena cronologicamente", () => {
    const txs = [
      tx({ type: "income", amountCents: 100_000, date: new Date("2026-02-10T12:00:00Z") }),
      tx({ type: "expense", amountCents: 40_000, date: new Date("2026-02-20T12:00:00Z") }),
      tx({ type: "income", amountCents: 80_000, date: new Date("2026-01-05T12:00:00Z") }),
    ];
    const result = monthlySummary(txs);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      month: "2026-01",
      incomeCents: 80_000,
      expenseCents: 0,
      balanceCents: 80_000,
    });
    expect(result[1]).toEqual({
      month: "2026-02",
      incomeCents: 100_000,
      expenseCents: 40_000,
      balanceCents: 60_000,
    });
  });
});

describe("categoryBreakdown (F3 — por categoria)", () => {
  const txs: TransactionLike[] = [
    tx({ type: "expense", amountCents: 60_000, category: "transporte" }),
    tx({ type: "expense", amountCents: 20_000, category: "hospedagem" }),
    tx({ type: "expense", amountCents: 20_000, category: "transporte" }),
    tx({ type: "income", amountCents: 999_999, category: "show" }),
  ];

  it("soma por categoria do tipo, ordena desc e calcula share", () => {
    const result = categoryBreakdown(txs, "expense");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ category: "transporte", totalCents: 80_000 });
    expect(result[1]).toMatchObject({ category: "hospedagem", totalCents: 20_000 });
    expect(result[0].share).toBeCloseTo(0.8, 5);
    expect(result[1].share).toBeCloseTo(0.2, 5);
  });

  it("tipo sem transações retorna lista vazia", () => {
    expect(categoryBreakdown([], "income")).toEqual([]);
  });
});

describe("accountsReceivable (F3 — contas a receber)", () => {
  it("soma apenas receitas pendentes", () => {
    const txs = [
      tx({ type: "income", amountCents: 100_000, status: "pending" }),
      tx({ type: "income", amountCents: 50_000, status: "pending" }),
      tx({ type: "income", amountCents: 70_000, status: "received" }),
      tx({ type: "expense", amountCents: 30_000, status: "pending" }),
    ];
    const ar = accountsReceivable(txs);
    expect(ar.totalPendingCents).toBe(150_000);
    expect(ar.count).toBe(2);
  });

  it("nada pendente retorna zeros", () => {
    const txs = [tx({ type: "income", amountCents: 100_000, status: "received" })];
    expect(accountsReceivable(txs)).toEqual({ totalPendingCents: 0, count: 0 });
  });
});
