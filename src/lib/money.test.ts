import { describe, it, expect } from "vitest";
import { maskMoneyInput, toCents, toReais, formatMoney } from "./money";
import { parseMoneyToCents } from "./validation";

describe("toCents / toReais", () => {
  it("converte reais para centavos (arredondando)", () => {
    expect(toCents(1234.56)).toBe(123456);
    expect(toCents(0)).toBe(0);
    expect(toCents(0.1 + 0.2)).toBe(30); // sem erro de ponto flutuante
  });

  it("converte centavos para reais", () => {
    expect(toReais(123456)).toBe(1234.56);
    expect(toReais(0)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formata centavos como BRL pt-BR", () => {
    // usa NBSP entre o símbolo e o número; comparamos por conteúdo normalizado
    expect(formatMoney(123456).replace(/ /g, " ")).toBe("R$ 1.234,56");
    expect(formatMoney(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });
});

describe("maskMoneyInput", () => {
  it("trata dígitos como centavos, completando à esquerda", () => {
    expect(maskMoneyInput("1")).toBe("0,01");
    expect(maskMoneyInput("12")).toBe("0,12");
    expect(maskMoneyInput("123")).toBe("1,23");
    expect(maskMoneyInput("12345")).toBe("123,45");
  });

  it("adiciona separador de milhar", () => {
    expect(maskMoneyInput("1234567")).toBe("12.345,67");
    expect(maskMoneyInput("123456789")).toBe("1.234.567,89");
  });

  it("ignora caracteres não numéricos (digitação livre)", () => {
    expect(maskMoneyInput("R$ 1.234,56")).toBe("1.234,56");
    expect(maskMoneyInput("abc12def34")).toBe("12,34");
  });

  it("retorna vazio quando não há dígitos", () => {
    expect(maskMoneyInput("")).toBe("");
    expect(maskMoneyInput("R$")).toBe("");
    expect(maskMoneyInput("   ")).toBe("");
  });

  it("remove zeros à esquerda mantendo os centavos", () => {
    expect(maskMoneyInput("007")).toBe("0,07");
    expect(maskMoneyInput("0012345")).toBe("123,45");
    expect(maskMoneyInput("000")).toBe("0,00");
  });

  it("é idempotente e estável ao reformatar a própria saída", () => {
    const once = maskMoneyInput("12345");
    expect(maskMoneyInput(once)).toBe(once);
  });

  it("preserva precisão em valores grandes (sem float)", () => {
    expect(maskMoneyInput("999999999999999")).toBe("9.999.999.999.999,99");
  });

  it("produz string compatível com parseMoneyToCents", () => {
    expect(parseMoneyToCents(maskMoneyInput("12345"))).toBe(12345);
    expect(parseMoneyToCents(maskMoneyInput("1234567"))).toBe(1234567);
    expect(parseMoneyToCents(maskMoneyInput("1"))).toBe(1);
  });
});
