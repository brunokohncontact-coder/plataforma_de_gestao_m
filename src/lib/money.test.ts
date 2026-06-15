import { describe, it, expect } from "vitest";
import { centsToUnits, unitsToCents, parseMoneyToCents, formatMoney } from "./money";

describe("centsToUnits / unitsToCents", () => {
  it("converte ida e volta sem perda em valores inteiros de centavos", () => {
    expect(centsToUnits(12_345)).toBe(123.45);
    expect(unitsToCents(123.45)).toBe(12_345);
  });

  it("arredonda corretamente ao converter para centavos", () => {
    expect(unitsToCents(0.1 + 0.2)).toBe(30); // evita 0.30000000000000004
  });
});

describe("parseMoneyToCents", () => {
  it("aceita formato pt-BR com vírgula decimal", () => {
    expect(parseMoneyToCents("1.234,56")).toBe(123_456);
    expect(parseMoneyToCents("99,90")).toBe(9_990);
  });

  it("aceita formato en com ponto decimal", () => {
    expect(parseMoneyToCents("1,234.56")).toBe(123_456);
    expect(parseMoneyToCents("1234.56")).toBe(123_456);
  });

  it("aceita inteiros e símbolo de moeda", () => {
    expect(parseMoneyToCents("R$ 500")).toBe(50_000);
    expect(parseMoneyToCents("500")).toBe(50_000);
  });

  it("retorna null para entradas inválidas", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formata centavos como BRL", () => {
    // Usa espaço não-quebrável; normalizamos para comparar.
    const out = formatMoney(123_456).replace(/ /g, " ");
    expect(out).toBe("R$ 1.234,56");
  });
});
