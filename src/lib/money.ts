// Utilidades monetárias. Convenção: todo valor é armazenado em CENTAVOS (inteiro)
// para evitar erros de ponto flutuante em cálculos financeiros.

/** Converte um valor em reais (ex.: 1234.56) para centavos inteiros (123456). */
export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Converte centavos inteiros para reais (número). */
export function toReais(cents: number): number {
  return cents / 100;
}

/**
 * Máscara de moeda pt-BR para input "ao digitar". Trata todos os dígitos
 * informados como centavos e formata com separador de milhar (ponto) e
 * decimal (vírgula). Trabalha sobre strings (sem aritmética de ponto
 * flutuante) para suportar valores grandes sem perda de precisão.
 *
 * Ex.: "12345" -> "123,45"; "1" -> "0,01"; "1234567" -> "12.345,67".
 * Entrada sem dígitos (vazia, "R$", etc.) -> "".
 *
 * A saída é compatível com `parseMoneyToCents` (formato pt-BR).
 */
export function maskMoneyInput(input: string): string {
  // mantém só dígitos e remove zeros à esquerda (preservando o último)
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") return "";
  // garante ao menos 1 dígito de reais + 2 de centavos
  const padded = digits.padStart(3, "0");
  const centPart = padded.slice(-2);
  const reaisDigits = padded.slice(0, -2);
  // separador de milhar a cada 3 dígitos
  const reaisStr = reaisDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${reaisStr},${centPart}`;
}

/**
 * Formata centavos como moeda. Padrão: BRL/pt-BR.
 * Ex.: 123456 -> "R$ 1.234,56".
 */
export function formatMoney(
  cents: number,
  locale = "pt-BR",
  currency = "BRL",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
