import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  formatMoney,
  showInputSchema,
  transactionInputSchema,
  contactInputSchema,
} from "./domain";

describe("dinheiro (centavos)", () => {
  it("toCents arredonda corretamente", () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(12.34)).toBe(1234);
    expect(toCents(1999.99)).toBe(199999);
    // evita erro clássico de ponto flutuante (0.1 + 0.2)
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("toCents rejeita valores não-finitos", () => {
    expect(() => toCents(Infinity)).toThrow();
    expect(() => toCents(NaN)).toThrow();
  });

  it("fromCents é o inverso de toCents", () => {
    expect(fromCents(1234)).toBeCloseTo(12.34, 5);
    expect(fromCents(toCents(87.65))).toBeCloseTo(87.65, 5);
  });

  it("formatMoney formata em BRL por padrão", () => {
    //   é o espaço não-quebrável usado pelo Intl em pt-BR
    expect(formatMoney(199999)).toBe("R$ 1.999,99");
    expect(formatMoney(0)).toBe("R$ 0,00");
  });
});

describe("validação de Show", () => {
  it("aceita entrada válida e aplica defaults", () => {
    const parsed = showInputSchema.parse({
      title: "Show no bar X",
      date: "2026-07-01T20:00:00Z",
    });
    expect(parsed.status).toBe("proposto");
    expect(parsed.feeCents).toBe(0);
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it("rejeita título vazio e status inválido", () => {
    expect(showInputSchema.safeParse({ title: "", date: "2026-07-01" }).success).toBe(false);
    expect(
      showInputSchema.safeParse({ title: "ok", date: "2026-07-01", status: "rascunho" }).success,
    ).toBe(false);
  });

  it("rejeita cachê negativo", () => {
    const r = showInputSchema.safeParse({ title: "ok", date: "2026-07-01", feeCents: -100 });
    expect(r.success).toBe(false);
  });
});

describe("validação de Transaction", () => {
  it("aceita entrada válida", () => {
    const parsed = transactionInputSchema.parse({
      type: "expense",
      category: "transporte",
      amountCents: 5000,
      date: "2026-07-01",
    });
    expect(parsed.status).toBe("received");
    expect(parsed.type).toBe("expense");
  });

  it("rejeita valor zero ou negativo", () => {
    expect(
      transactionInputSchema.safeParse({
        type: "income",
        category: "x",
        amountCents: 0,
        date: "2026-07-01",
      }).success,
    ).toBe(false);
  });

  it("rejeita tipo inválido", () => {
    expect(
      transactionInputSchema.safeParse({
        type: "refund",
        category: "x",
        amountCents: 100,
        date: "2026-07-01",
      }).success,
    ).toBe(false);
  });
});

describe("validação de Contact", () => {
  it("aceita entrada válida com defaults", () => {
    const parsed = contactInputSchema.parse({ name: "Maria Promoter" });
    expect(parsed.role).toBe("outro");
  });

  it("rejeita e-mail inválido", () => {
    expect(contactInputSchema.safeParse({ name: "X", email: "nao-eh-email" }).success).toBe(false);
  });

  it("aceita e-mail vazio (campo opcional)", () => {
    expect(contactInputSchema.safeParse({ name: "X", email: "" }).success).toBe(true);
  });
});
