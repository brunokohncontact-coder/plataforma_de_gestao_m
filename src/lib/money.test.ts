import { describe, it, expect } from "vitest";
import {
  centsToReais,
  reaisToCents,
  formatBRL,
  parseCurrencyToCents,
} from "./money";

describe("money", () => {
  it("converte centavos <-> reais", () => {
    expect(centsToReais(123456)).toBe(1234.56);
    expect(reaisToCents(1234.56)).toBe(123456);
  });

  it("arredonda corretamente ao converter reais para centavos", () => {
    expect(reaisToCents(0.1 + 0.2)).toBe(30); // evita 0.30000000000000004
    expect(reaisToCents(19.999)).toBe(2000);
  });

  it("formata BRL", () => {
    // Usa espaço não-quebrável; normalizamos para comparar.
    expect(formatBRL(123456).replace(/ /g, " ")).toBe("R$ 1.234,56");
    expect(formatBRL(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });

  describe("parseCurrencyToCents", () => {
    it("aceita formato pt-BR com milhar e decimal", () => {
      expect(parseCurrencyToCents("1.234,56")).toBe(123456);
      expect(parseCurrencyToCents("R$ 1.234,56")).toBe(123456);
    });
    it("aceita só vírgula como decimal", () => {
      expect(parseCurrencyToCents("1234,5")).toBe(123450);
    });
    it("aceita formato com ponto decimal", () => {
      expect(parseCurrencyToCents("1234.56")).toBe(123456);
      expect(parseCurrencyToCents("100")).toBe(10000);
    });
    it("rejeita entradas inválidas", () => {
      expect(parseCurrencyToCents("")).toBeNull();
      expect(parseCurrencyToCents("abc")).toBeNull();
    });
  });
});
