import { describe, it, expect } from "vitest";
import { toCents, formatCents, centsToReais } from "./money";

describe("toCents", () => {
  it("converte número em reais para centavos", () => {
    expect(toCents(12.34)).toBe(1234);
    expect(toCents(1000)).toBe(100000);
    expect(toCents(0)).toBe(0);
  });

  it("arredonda corretamente (sem erro de ponto flutuante)", () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
    expect(toCents(19.99)).toBe(1999);
  });

  it("interpreta vírgula decimal pt-BR", () => {
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("99,90")).toBe(9990);
  });

  it("interpreta ponto decimal", () => {
    expect(toCents("1234.56")).toBe(123456);
  });

  it("remove R$ e espaços", () => {
    expect(toCents("R$ 1.000,00")).toBe(100000);
  });

  it("lança erro para valor inválido", () => {
    expect(() => toCents("abc")).toThrow();
  });
});

describe("formatCents", () => {
  it("formata como BRL", () => {
    const out = formatCents(123456);
    expect(out).toContain("1.234,56");
    expect(out).toContain("R$");
  });

  it("formata zero", () => {
    expect(formatCents(0)).toContain("0,00");
  });
});

describe("centsToReais", () => {
  it("divide por 100", () => {
    expect(centsToReais(1234)).toBe(12.34);
  });
});
