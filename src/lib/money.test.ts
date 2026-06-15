import { describe, it, expect } from "vitest";
import { parseAmountToCents, formatCents } from "./money";

describe("parseAmountToCents", () => {
  it("interpreta decimal com vírgula (pt-BR)", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123456);
    expect(parseAmountToCents("80,50")).toBe(8050);
  });

  it("interpreta decimal com ponto (en)", () => {
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("1234.56")).toBe(123456);
  });

  it("interpreta inteiros sem separador decimal", () => {
    expect(parseAmountToCents("80")).toBe(8000);
    expect(parseAmountToCents("1000")).toBe(100000);
  });

  it("remove símbolo de moeda e espaços", () => {
    expect(parseAmountToCents("R$ 80,00")).toBe(8000);
    expect(parseAmountToCents(" R$1.500 ")).toBe(150000);
  });

  it("arredonda corretamente para o centavo", () => {
    expect(parseAmountToCents("0,1")).toBe(10);
    expect(parseAmountToCents("0,015")).toBe(2); // 1.5 -> arredonda para 2
  });

  it("retorna null para entradas inválidas", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("12,3,4")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formata em BRL por padrão", () => {
    //   = espaço não separável usado pelo Intl
    expect(formatCents(8000).replace(/ /g, " ")).toBe("R$ 80,00");
    expect(formatCents(123456).replace(/ /g, " ")).toBe("R$ 1.234,56");
  });
});
