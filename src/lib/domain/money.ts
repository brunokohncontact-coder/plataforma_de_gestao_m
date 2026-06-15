// Utilidades de dinheiro. Valores são guardados como Float (reais), mas somas de
// floats acumulam erro; arredondamos para centavos em toda agregação.

/** Arredonda para 2 casas (centavos), evitando drift de ponto flutuante. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Soma uma lista de valores arredondando para centavos. */
export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((acc, v) => acc + v, 0));
}

/** Formata em Real brasileiro (R$). */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(roundMoney(value));
}
