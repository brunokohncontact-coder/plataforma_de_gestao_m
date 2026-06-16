import { describe, it, expect } from "vitest";
import { parseMoneyToCents, transactionSchema, showSchema } from "./validation";

describe("parseMoneyToCents", () => {
  it("interpreta formato pt-BR (vírgula decimal, ponto milhar)", () => {
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("1.000,00")).toBe(100000);
    expect(parseMoneyToCents("50,00")).toBe(5000);
  });

  it("interpreta formato com ponto decimal", () => {
    expect(parseMoneyToCents("1234.56")).toBe(123456);
    expect(parseMoneyToCents("50")).toBe(5000);
  });

  it("ignora prefixo R$ e espaços", () => {
    expect(parseMoneyToCents(" R$ 1.500,00 ")).toBe(150000);
    expect(parseMoneyToCents("R$50,50")).toBe(5050);
  });

  it("retorna NaN para entrada inválida", () => {
    expect(Number.isNaN(parseMoneyToCents("abc"))).toBe(true);
  });
});

describe("transactionSchema", () => {
  it("valida e converte uma transação válida", () => {
    const result = transactionSchema.safeParse({
      type: "EXPENSE",
      description: "Gasolina",
      category: "Transporte",
      amount: "120,00",
      date: "2026-03-10T20:00",
      received: "true",
      showId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(12000);
      expect(result.data.showId).toBeNull();
      expect(result.data.received).toBe(true);
    }
  });

  it("rejeita descrição vazia", () => {
    const result = transactionSchema.safeParse({
      type: "INCOME",
      description: "",
      category: "Cachê",
      amount: "100",
      date: "2026-03-10T20:00",
      received: "true",
    });
    expect(result.success).toBe(false);
  });
});

describe("showSchema", () => {
  it("aceita cachê vazio como 0", () => {
    const result = showSchema.safeParse({
      title: "Show no bar",
      date: "2026-03-10T20:00",
      status: "CONFIRMED",
      fee: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fee).toBe(0);
  });

  it("rejeita status inválido", () => {
    const result = showSchema.safeParse({
      title: "X",
      date: "2026-03-10T20:00",
      status: "INVALID",
      fee: "0",
    });
    expect(result.success).toBe(false);
  });
});
