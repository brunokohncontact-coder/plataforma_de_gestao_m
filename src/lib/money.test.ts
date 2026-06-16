import { describe, it, expect } from "vitest";
import { toCents, toReais, parseAmountToCents, formatBRL } from "./money";

describe("toCents / toReais", () => {
  it("converte reais para centavos com arredondamento", () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(10.99)).toBe(1099);
    expect(toCents(0.1)).toBe(10);
  });

  it("ida e volta preserva o valor", () => {
    expect(toReais(toCents(1234.56))).toBeCloseTo(1234.56, 2);
  });

  it("lança em valor inválido", () => {
    expect(() => toCents(NaN)).toThrow();
    expect(() => toCents(Infinity)).toThrow();
  });
});

describe("parseAmountToCents", () => {
  it("aceita formato brasileiro com milhar e decimal", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("R$ 1.234,56")).toBe(123456);
  });

  it("aceita vírgula como decimal", () => {
    expect(parseAmountToCents("1234,5")).toBe(123450);
  });

  it("aceita ponto como decimal (formato US)", () => {
    expect(parseAmountToCents("1234.56")).toBe(123456);
    expect(parseAmountToCents("1,234.56")).toBe(123456);
  });

  it("string vazia vira 0", () => {
    expect(parseAmountToCents("")).toBe(0);
    expect(parseAmountToCents("  ")).toBe(0);
  });

  it("lança em entrada não numérica", () => {
    expect(() => parseAmountToCents("abc")).toThrow();
  });
});

describe("formatBRL", () => {
  it("formata centavos como BRL", () => {
    // Usa espaço não-quebrável; normalizamos para comparar.
    const formatted = formatBRL(123456).replace(/ /g, " ");
    expect(formatted).toBe("R$ 1.234,56");
  });
});
