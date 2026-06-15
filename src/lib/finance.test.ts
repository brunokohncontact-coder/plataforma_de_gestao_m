import { describe, it, expect } from "vitest";
import {
  computeShowPnL,
  summarize,
  aggregateByMonth,
  aggregateByCategory,
  type TxLike,
  type ShowLike,
} from "./finance";

const show: ShowLike = { id: "show1", feeCents: 200_00, status: "CONFIRMED" };

const txs: TxLike[] = [
  // Vinculadas ao show1
  { type: "INCOME", amountCents: 200_00, category: "Cachê", date: "2026-03-10", paid: true, showId: "show1" },
  { type: "EXPENSE", amountCents: 50_00, category: "Transporte", date: "2026-03-10", paid: true, showId: "show1" },
  { type: "EXPENSE", amountCents: 30_00, category: "Equipamento", date: "2026-03-10", paid: false, showId: "show1" },
  // Não vinculadas
  { type: "INCOME", amountCents: 100_00, category: "Aula", date: "2026-02-15", paid: false, showId: null },
  { type: "EXPENSE", amountCents: 20_00, category: "Software", date: "2026-02-20", paid: true },
];

describe("computeShowPnL", () => {
  it("considera apenas transações vinculadas ao show", () => {
    const pnl = computeShowPnL(show, txs);
    expect(pnl.feeCents).toBe(200_00);
    expect(pnl.incomeReceivedCents).toBe(200_00);
    expect(pnl.incomePendingCents).toBe(0);
    expect(pnl.expensesCents).toBe(80_00); // 50 + 30
  });

  it("rentabilidade projetada = cachê − despesas vinculadas", () => {
    const pnl = computeShowPnL(show, txs);
    expect(pnl.projectedProfitCents).toBe(200_00 - 80_00); // 120,00
  });

  it("rentabilidade realizada = recebido − despesas pagas", () => {
    const pnl = computeShowPnL(show, txs);
    // recebido 200; despesas pagas só a de 50 (a de 30 está a pagar)
    expect(pnl.realizedProfitCents).toBe(200_00 - 50_00); // 150,00
  });

  it("show sem transações: projetado = cachê, realizado = 0", () => {
    const pnl = computeShowPnL({ id: "vazio", feeCents: 500_00, status: "PROPOSED" }, txs);
    expect(pnl.projectedProfitCents).toBe(500_00);
    expect(pnl.realizedProfitCents).toBe(0);
    expect(pnl.expensesCents).toBe(0);
  });

  it("pode dar prejuízo (despesas > cachê)", () => {
    const caro: TxLike[] = [
      { type: "EXPENSE", amountCents: 300_00, category: "Banda", date: "2026-03-10", paid: true, showId: "x" },
    ];
    const pnl = computeShowPnL({ id: "x", feeCents: 200_00, status: "DONE" }, caro);
    expect(pnl.projectedProfitCents).toBe(-100_00);
  });
});

describe("summarize", () => {
  it("totaliza receitas e despesas separando pago/pendente", () => {
    const s = summarize(txs);
    expect(s.incomeTotalCents).toBe(300_00); // 200 + 100
    expect(s.incomeReceivedCents).toBe(200_00);
    expect(s.incomePendingCents).toBe(100_00); // contas a receber
    expect(s.expenseTotalCents).toBe(100_00); // 50 + 30 + 20
    expect(s.expensePaidCents).toBe(70_00); // 50 + 20
    expect(s.expensePendingCents).toBe(30_00);
  });

  it("saldo total e saldo realizado", () => {
    const s = summarize(txs);
    expect(s.netCents).toBe(300_00 - 100_00); // 200,00
    expect(s.realizedNetCents).toBe(200_00 - 70_00); // 130,00
  });

  it("lista vazia retorna zeros", () => {
    const s = summarize([]);
    expect(s.netCents).toBe(0);
    expect(s.incomeTotalCents).toBe(0);
  });
});

describe("aggregateByMonth", () => {
  it("agrupa por AAAA-MM e ordena cronologicamente", () => {
    const buckets = aggregateByMonth(txs);
    expect(buckets.map((b) => b.month)).toEqual(["2026-02", "2026-03"]);
    const fev = buckets[0];
    expect(fev.incomeCents).toBe(100_00);
    expect(fev.expenseCents).toBe(20_00);
    expect(fev.netCents).toBe(80_00);
    const mar = buckets[1];
    expect(mar.incomeCents).toBe(200_00);
    expect(mar.expenseCents).toBe(80_00); // 50 + 30
    expect(mar.netCents).toBe(120_00);
  });

  it("usa UTC de forma estável independentemente do fuso", () => {
    const buckets = aggregateByMonth([
      { type: "INCOME", amountCents: 100, category: "x", date: new Date("2026-01-31T23:00:00Z"), paid: true },
    ]);
    expect(buckets[0].month).toBe("2026-01");
  });
});

describe("aggregateByCategory", () => {
  it("agrupa despesas por categoria ordenando por total desc", () => {
    const cats = aggregateByCategory(txs, "EXPENSE");
    expect(cats[0].category).toBe("Transporte"); // 50,00 é o maior
    expect(cats[0].totalCents).toBe(50_00);
    expect(cats.find((c) => c.category === "Equipamento")?.totalCents).toBe(30_00);
    expect(cats.find((c) => c.category === "Software")?.count).toBe(1);
  });

  it("filtra por tipo (receitas)", () => {
    const cats = aggregateByCategory(txs, "INCOME");
    const total = cats.reduce((acc, c) => acc + c.totalCents, 0);
    expect(total).toBe(300_00);
    expect(cats.every((c) => c.category !== "Transporte")).toBe(true);
  });
});
