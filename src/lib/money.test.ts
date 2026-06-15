import { describe, it, expect } from "vitest";
import { toCents, formatMoney } from "./money";

describe("toCents", () => {
  it("converte número decimal para centavos", () => {
    expect(toCents(1234.56)).toBe(123456);
    expect(toCents(10)).toBe(1000);
    expect(toCents(0)).toBe(0);
  });

  it("arredonda corretamente", () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // evita 0.30000000000004
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.005)).toBe(1); // meio centavo arredonda para cima
  });

  it("interpreta formato pt-BR (1.234,56)", () => {
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("R$ 1.234,56")).toBe(123456);
    expect(toCents("99,90")).toBe(9990);
  });

  it("interpreta formato en (1,234.56 / 1234.56)", () => {
    expect(toCents("1,234.56")).toBe(123456);
    expect(toCents("1234.56")).toBe(123456);
  });

  it("rejeita valores inválidos", () => {
    expect(() => toCents("")).toThrow();
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents(Number.NaN)).toThrow();
  });
});

describe("formatMoney", () => {
  it("formata centavos como BRL", () => {
    const s = formatMoney(123456);
    expect(s).toContain("1.234,56");
    expect(s).toContain("R$");
  });

  it("formata zero e negativos", () => {
    expect(formatMoney(0)).toContain("0,00");
    expect(formatMoney(-5000)).toContain("50,00");
  });
});
