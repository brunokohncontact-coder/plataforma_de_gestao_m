/**
 * Utilitários monetários. Trabalhamos com números em reais (float) mas
 * arredondamos para centavos em pontos de agregação para evitar erros de
 * ponto flutuante acumulados (ex.: 0.1 + 0.2). A lógica financeira nunca
 * confia em comparação direta de floats sem passar por `roundCents`.
 */

/** Arredonda um valor para 2 casas decimais (centavos). */
export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Soma uma lista de valores com arredondamento final para centavos. */
export function sumCents(values: number[]): number {
  return roundCents(values.reduce((acc, v) => acc + v, 0));
}

/** Formata um valor em Real brasileiro (R$ 1.234,56). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(roundCents(value));
}
