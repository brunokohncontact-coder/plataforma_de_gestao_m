import { describe, it, expect } from "vitest";
import { toCents, formatCents } from "./money";

describe("toCents", () => {
  it("converte número decimal em centavos", () => {
    expect(toCents(1234.56)).toBe(123456);
    expect(toCents(0)).toBe(0);
    expect(toCents(10)).toBe(1000);
  });

  it("converte string com vírgula decimal (pt-BR)", () => {
    expect(toCents("1234,56")).toBe(123456);
    expect(toCents("0,99")).toBe(99);
  });

  it("converte string com ponto decimal", () => {
    expect(toCents("1234.56")).toBe(123456);
  });

  it("trata separador de milhar pt-BR (1.234,56)", () => {
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("1.000.000,00")).toBe(100000000);
  });

  it("trata separador de milhar en-US (1,234.56)", () => {
    expect(toCents("1,234.56")).toBe(123456);
  });

  it("arredonda corretamente (sem erro de float)", () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 -> 30
    expect(toCents("19,99")).toBe(1999);
  });

  it("retorna 0 para entradas inválidas/vazias", () => {
    expect(toCents("")).toBe(0);
    expect(toCents("abc")).toBe(0);
    expect(toCents(Infinity)).toBe(0);
  });
});

describe("formatCents", () => {
  it("formata em BRL por padrão", () => {
    // usa NBSP entre símbolo e valor em pt-BR; normalizamos para checagem
    const out = formatCents(123456).replace(/ /g, " ");
    expect(out).toBe("R$ 1.234,56");
  });

  it("formata zero", () => {
    const out = formatCents(0).replace(/ /g, " ");
    expect(out).toBe("R$ 0,00");
  });
});
