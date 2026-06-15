import { describe, it, expect } from "vitest";
import {
  calcShowPnL,
  summarize,
  aggregateByMonth,
  aggregateByCategory,
  roundMoney,
  monthKey,
  type TxLike,
} from "./finance";

const d = (s: string) => new Date(s);

describe("roundMoney", () => {
  it("arredonda para 2 casas evitando ruído de float", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1500.005)).toBe(1500.01);
    expect(roundMoney(100)).toBe(100);
  });
});

describe("monthKey", () => {
  it("gera chave YYYY-MM", () => {
    expect(monthKey(d("2026-06-15T12:00:00"))).toBe("2026-06");
    expect(monthKey(d("2026-01-01T00:00:00"))).toBe("2026-01");
  });
});

describe("calcShowPnL", () => {
  const show = { id: "show1", fee: 2000 };

  it("calcula resultado = cachê − despesas vinculadas", () => {
    const txs: TxLike[] = [
      { type: "expense", amount: 300, date: d("2026-06-01"), showId: "show1" },
      { type: "expense", amount: 200, date: d("2026-06-02"), showId: "show1" },
      // despesa de outro show — não deve contar
      { type: "expense", amount: 999, date: d("2026-06-02"), showId: "other" },
    ];
    const pnl = calcShowPnL(show, txs);
    expect(pnl.expenses).toBe(500);
    expect(pnl.result).toBe(1500); // 2000 - 500
    expect(pnl.agreedFee).toBe(2000);
  });

  it("calcula receita realizada e netRealized a partir de receitas vinculadas", () => {
    const txs: TxLike[] = [
      { type: "income", amount: 2000, date: d("2026-06-10"), showId: "show1", status: "received" },
      { type: "income", amount: 150, date: d("2026-06-10"), showId: "show1", status: "received" }, // merch
      { type: "expense", amount: 500, date: d("2026-06-01"), showId: "show1" },
    ];
    const pnl = calcShowPnL(show, txs);
    expect(pnl.realizedIncome).toBe(2150);
    expect(pnl.expenses).toBe(500);
    expect(pnl.netRealized).toBe(1650); // 2150 - 500
    expect(pnl.result).toBe(1500); // headline usa cachê acordado
  });

  it("calcula a margem sobre o cachê acordado", () => {
    const pnl = calcShowPnL({ id: "s", fee: 1000 }, [
      { type: "expense", amount: 250, date: d("2026-06-01"), showId: "s" },
    ]);
    expect(pnl.result).toBe(750);
    expect(pnl.margin).toBe(0.75);
  });

  it("margem = 0 quando o cachê é zero (evita divisão por zero)", () => {
    const pnl = calcShowPnL({ id: "s", fee: 0 }, [
      { type: "expense", amount: 100, date: d("2026-06-01"), showId: "s" },
    ]);
    expect(pnl.margin).toBe(0);
    expect(pnl.result).toBe(-100);
  });

  it("ignora transações sem vínculo ou de outros shows", () => {
    const pnl = calcShowPnL(show, [
      { type: "expense", amount: 100, date: d("2026-06-01"), showId: null },
      { type: "expense", amount: 100, date: d("2026-06-01") },
    ]);
    expect(pnl.expenses).toBe(0);
    expect(pnl.result).toBe(2000);
  });
});

describe("summarize", () => {
  const txs: TxLike[] = [
    { type: "income", amount: 2000, date: d("2026-06-10"), status: "received" },
    { type: "income", amount: 500, date: d("2026-06-20"), status: "pending" },
    { type: "expense", amount: 300, date: d("2026-06-05"), status: "paid" },
    { type: "expense", amount: 200, date: d("2026-06-08"), status: "pending" },
  ];

  it("soma receitas, despesas e líquido", () => {
    const s = summarize(txs);
    expect(s.totalIncome).toBe(2500);
    expect(s.totalExpense).toBe(500);
    expect(s.net).toBe(2000);
    expect(s.count).toBe(4);
  });

  it("separa recebido/pendente e despesa pendente", () => {
    const s = summarize(txs);
    expect(s.receivedIncome).toBe(2000);
    expect(s.pendingIncome).toBe(500);
    expect(s.pendingExpense).toBe(200);
  });

  it("retorna zeros para lista vazia", () => {
    const s = summarize([]);
    expect(s).toMatchObject({ totalIncome: 0, totalExpense: 0, net: 0, count: 0 });
  });
});

describe("aggregateByMonth", () => {
  it("agrupa por mês e ordena cronologicamente", () => {
    const txs: TxLike[] = [
      { type: "income", amount: 1000, date: d("2026-05-10") },
      { type: "expense", amount: 200, date: d("2026-05-15") },
      { type: "income", amount: 3000, date: d("2026-06-01") },
      { type: "expense", amount: 500, date: d("2026-06-20") },
    ];
    const months = aggregateByMonth(txs);
    expect(months).toEqual([
      { month: "2026-05", income: 1000, expense: 200, net: 800 },
      { month: "2026-06", income: 3000, expense: 500, net: 2500 },
    ]);
  });
});

describe("aggregateByCategory", () => {
  const txs: TxLike[] = [
    { type: "expense", amount: 300, date: d("2026-06-01"), category: "Transporte" },
    { type: "expense", amount: 150, date: d("2026-06-02"), category: "Transporte" },
    { type: "expense", amount: 500, date: d("2026-06-03"), category: "Equipamento" },
    { type: "income", amount: 2000, date: d("2026-06-04"), category: "Cachê" },
  ];

  it("agrega despesas por categoria, ordenado por total desc", () => {
    const cats = aggregateByCategory(txs, "expense");
    expect(cats).toEqual([
      { category: "Equipamento", total: 500, count: 1 },
      { category: "Transporte", total: 450, count: 2 },
    ]);
  });

  it("filtra pelo tipo informado", () => {
    const cats = aggregateByCategory(txs, "income");
    expect(cats).toEqual([{ category: "Cachê", total: 2000, count: 1 }]);
  });

  it("usa 'Sem categoria' quando ausente", () => {
    const cats = aggregateByCategory(
      [{ type: "expense", amount: 100, date: d("2026-06-01"), category: "" }],
      "expense",
    );
    expect(cats[0].category).toBe("Sem categoria");
  });
});
