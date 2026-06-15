import { describe, it, expect } from "vitest";
import {
  calcShowProfitability,
  summarize,
  aggregateByMonth,
  aggregateByCategory,
  monthKey,
  type TransactionLike,
  type ShowLike,
} from "./finance";

const tx = (over: Partial<TransactionLike>): TransactionLike => ({
  type: "income",
  amountCents: 0,
  category: "geral",
  date: "2026-01-15T00:00:00.000Z",
  received: true,
  showId: null,
  ...over,
});

describe("calcShowProfitability", () => {
  const show: ShowLike = { id: "s1", feeCents: 200000, status: "confirmed" };

  it("retorna o cachê quando não há transações vinculadas", () => {
    const r = calcShowProfitability(show, []);
    expect(r.feeCents).toBe(200000);
    expect(r.grossCents).toBe(200000);
    expect(r.netCents).toBe(200000);
  });

  it("subtrai despesas vinculadas ao show", () => {
    const txs = [
      tx({ type: "expense", amountCents: 50000, showId: "s1", category: "transporte" }),
      tx({ type: "expense", amountCents: 30000, showId: "s1", category: "equipamento" }),
    ];
    const r = calcShowProfitability(show, txs);
    expect(r.linkedExpenseCents).toBe(80000);
    expect(r.netCents).toBe(120000); // 200000 - 80000
  });

  it("soma receitas vinculadas além do cachê (ex.: merch)", () => {
    const txs = [
      tx({ type: "income", amountCents: 25000, showId: "s1", category: "merch" }),
      tx({ type: "expense", amountCents: 40000, showId: "s1", category: "transporte" }),
    ];
    const r = calcShowProfitability(show, txs);
    expect(r.linkedIncomeCents).toBe(25000);
    expect(r.grossCents).toBe(225000); // 200000 + 25000
    expect(r.netCents).toBe(185000); // 225000 - 40000
  });

  it("ignora transações de outros shows", () => {
    const txs = [
      tx({ type: "expense", amountCents: 99999, showId: "outro", category: "x" }),
      tx({ type: "expense", amountCents: 10000, showId: null, category: "y" }),
    ];
    const r = calcShowProfitability(show, txs);
    expect(r.linkedExpenseCents).toBe(0);
    expect(r.netCents).toBe(200000);
  });

  it("pode resultar em prejuízo (net negativo)", () => {
    const small: ShowLike = { id: "s2", feeCents: 10000, status: "confirmed" };
    const txs = [tx({ type: "expense", amountCents: 30000, showId: "s2", category: "viagem" })];
    const r = calcShowProfitability(small, txs);
    expect(r.netCents).toBe(-20000);
  });
});

describe("summarize", () => {
  it("calcula receita, despesa e saldo", () => {
    const txs = [
      tx({ type: "income", amountCents: 100000 }),
      tx({ type: "income", amountCents: 50000 }),
      tx({ type: "expense", amountCents: 30000 }),
    ];
    const s = summarize(txs);
    expect(s.incomeCents).toBe(150000);
    expect(s.expenseCents).toBe(30000);
    expect(s.balanceCents).toBe(120000);
  });

  it("separa receitas recebidas de pendentes (contas a receber)", () => {
    const txs = [
      tx({ type: "income", amountCents: 100000, received: true }),
      tx({ type: "income", amountCents: 40000, received: false }),
      tx({ type: "expense", amountCents: 10000, received: true }),
    ];
    const s = summarize(txs);
    expect(s.receivedIncomeCents).toBe(100000);
    expect(s.pendingIncomeCents).toBe(40000);
  });

  it("lida com lista vazia", () => {
    const s = summarize([]);
    expect(s.incomeCents).toBe(0);
    expect(s.balanceCents).toBe(0);
  });
});

describe("monthKey", () => {
  it("formata YYYY-MM em UTC", () => {
    expect(monthKey("2026-03-09T12:00:00.000Z")).toBe("2026-03");
    expect(monthKey(new Date(Date.UTC(2025, 11, 31)))).toBe("2025-12");
  });
});

describe("aggregateByMonth", () => {
  it("agrupa e ordena cronologicamente", () => {
    const txs = [
      tx({ type: "income", amountCents: 100000, date: "2026-02-10T00:00:00.000Z" }),
      tx({ type: "expense", amountCents: 20000, date: "2026-01-05T00:00:00.000Z" }),
      tx({ type: "income", amountCents: 30000, date: "2026-01-20T00:00:00.000Z" }),
    ];
    const buckets = aggregateByMonth(txs);
    expect(buckets.map((b) => b.month)).toEqual(["2026-01", "2026-02"]);
    expect(buckets[0].balanceCents).toBe(10000); // 30000 - 20000
    expect(buckets[1].incomeCents).toBe(100000);
  });
});

describe("aggregateByCategory", () => {
  it("agrupa por categoria+tipo e ordena por total desc", () => {
    const txs = [
      tx({ type: "expense", amountCents: 50000, category: "transporte" }),
      tx({ type: "expense", amountCents: 20000, category: "transporte" }),
      tx({ type: "expense", amountCents: 90000, category: "equipamento" }),
      tx({ type: "income", amountCents: 50000, category: "transporte" }),
    ];
    const buckets = aggregateByCategory(txs);
    expect(buckets[0]).toMatchObject({ category: "equipamento", totalCents: 90000 });
    const transp = buckets.find((b) => b.category === "transporte" && b.type === "expense");
    expect(transp?.totalCents).toBe(70000);
    expect(transp?.count).toBe(2);
    // income e expense de mesma categoria são buckets distintos
    expect(buckets.filter((b) => b.category === "transporte")).toHaveLength(2);
  });
});
