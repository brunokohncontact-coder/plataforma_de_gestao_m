import { describe, it, expect } from "vitest";
import {
  round2,
  signedTotal,
  showProfitAndLoss,
  monthKey,
  monthlyFinancialSummary,
  categoryBreakdown,
  receivablesSummary,
  overallTotals,
  type TxInput,
} from "./finance";

const d = (s: string) => new Date(s);

function tx(partial: Partial<TxInput> & Pick<TxInput, "type" | "amount" | "date">): TxInput {
  return {
    category: "geral",
    status: "received",
    showId: null,
    ...partial,
  };
}

describe("round2", () => {
  it("arredonda para 2 casas e elimina ruído de ponto flutuante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01); // a correção de EPSILON arredonda corretamente
    expect(round2(2.555)).toBe(2.56);
  });
});

describe("signedTotal", () => {
  it("soma receitas positivas e despesas negativas", () => {
    const txs = [
      tx({ type: "income", amount: 1000, date: d("2026-01-10") }),
      tx({ type: "expense", amount: 300, date: d("2026-01-11") }),
      tx({ type: "expense", amount: 150.5, date: d("2026-01-12") }),
    ];
    expect(signedTotal(txs)).toBe(549.5);
  });

  it("retorna 0 para lista vazia", () => {
    expect(signedTotal([])).toBe(0);
  });
});

describe("showProfitAndLoss", () => {
  it("calcula cachê − despesas vinculadas", () => {
    const show = { id: "s1", feeAgreed: 2000 };
    const txs = [
      tx({ type: "expense", amount: 500, date: d("2026-02-01"), showId: "s1", category: "transporte" }),
      tx({ type: "expense", amount: 200, date: d("2026-02-01"), showId: "s1", category: "hospedagem" }),
      tx({ type: "expense", amount: 999, date: d("2026-02-01"), showId: "OUTRO", category: "x" }),
    ];
    const pnl = showProfitAndLoss(show, txs);
    expect(pnl.fee).toBe(2000);
    expect(pnl.expenses).toBe(700);
    expect(pnl.linkedIncome).toBe(0);
    expect(pnl.net).toBe(1300);
  });

  it("soma receitas vinculadas (ex.: merch) ao cachê", () => {
    const show = { id: "s1", feeAgreed: 1000 };
    const txs = [
      tx({ type: "income", amount: 350, date: d("2026-02-01"), showId: "s1", category: "merch" }),
      tx({ type: "expense", amount: 100, date: d("2026-02-01"), showId: "s1" }),
    ];
    const pnl = showProfitAndLoss(show, txs);
    expect(pnl.linkedIncome).toBe(350);
    expect(pnl.net).toBe(1250);
  });

  it("ignora transações de outros shows e sem vínculo", () => {
    const show = { id: "s1", feeAgreed: 500 };
    const txs = [
      tx({ type: "expense", amount: 100, date: d("2026-02-01"), showId: null }),
      tx({ type: "expense", amount: 100, date: d("2026-02-01"), showId: "s2" }),
    ];
    expect(showProfitAndLoss(show, txs).net).toBe(500);
  });

  it("resultado pode ser negativo (show deu prejuízo)", () => {
    const show = { id: "s1", feeAgreed: 300 };
    const txs = [tx({ type: "expense", amount: 800, date: d("2026-02-01"), showId: "s1" })];
    expect(showProfitAndLoss(show, txs).net).toBe(-500);
  });
});

describe("monthKey", () => {
  it("formata YYYY-MM com zero à esquerda", () => {
    expect(monthKey(d("2026-03-05T12:00:00"))).toBe("2026-03");
    expect(monthKey(d("2026-11-30T12:00:00"))).toBe("2026-11");
  });
});

describe("monthlyFinancialSummary", () => {
  it("agrega por mês e ordena cronologicamente", () => {
    const txs = [
      tx({ type: "income", amount: 1000, date: d("2026-01-15T12:00:00") }),
      tx({ type: "expense", amount: 400, date: d("2026-01-20T12:00:00") }),
      tx({ type: "income", amount: 2000, date: d("2026-02-10T12:00:00") }),
    ];
    const out = monthlyFinancialSummary(txs);
    expect(out).toEqual([
      { month: "2026-01", income: 1000, expense: 400, net: 600 },
      { month: "2026-02", income: 2000, expense: 0, net: 2000 },
    ]);
  });

  it("retorna lista vazia sem transações", () => {
    expect(monthlyFinancialSummary([])).toEqual([]);
  });
});

describe("categoryBreakdown", () => {
  it("agrupa por categoria e tipo, ordenado do maior para o menor", () => {
    const txs = [
      tx({ type: "expense", amount: 300, date: d("2026-01-01"), category: "transporte" }),
      tx({ type: "expense", amount: 200, date: d("2026-01-02"), category: "transporte" }),
      tx({ type: "expense", amount: 100, date: d("2026-01-03"), category: "hospedagem" }),
      tx({ type: "income", amount: 1000, date: d("2026-01-04"), category: "cachê" }),
    ];
    const out = categoryBreakdown(txs);
    expect(out[0]).toEqual({ category: "cachê", type: "income", total: 1000 });
    expect(out).toContainEqual({ category: "transporte", type: "expense", total: 500 });
    expect(out).toContainEqual({ category: "hospedagem", type: "expense", total: 100 });
  });
});

describe("receivablesSummary", () => {
  it("separa recebido, a receber e a pagar", () => {
    const txs = [
      tx({ type: "income", amount: 1000, date: d("2026-01-01"), status: "received" }),
      tx({ type: "income", amount: 500, date: d("2026-01-02"), status: "pending" }),
      tx({ type: "expense", amount: 200, date: d("2026-01-03"), status: "pending" }),
      tx({ type: "expense", amount: 100, date: d("2026-01-04"), status: "received" }),
    ];
    expect(receivablesSummary(txs)).toEqual({
      received: 1000,
      pendingIncome: 500,
      pendingExpense: 200,
    });
  });
});

describe("overallTotals", () => {
  it("calcula receita, despesa e líquido", () => {
    const txs = [
      tx({ type: "income", amount: 1500, date: d("2026-01-01") }),
      tx({ type: "expense", amount: 600, date: d("2026-01-02") }),
    ];
    expect(overallTotals(txs)).toEqual({ income: 1500, expense: 600, net: 900 });
  });
});
