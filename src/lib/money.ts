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
