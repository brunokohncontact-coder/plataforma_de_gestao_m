// Utilitários de dinheiro. Internamente tudo é em centavos (inteiro) para
// evitar erros de ponto flutuante; formatação só na borda (UI).

/** Converte um valor em reais (ex.: "1.234,56" ou "1234.56" ou número) para centavos. */
export function toCents(value: string | number): number {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }
  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    // remove separador de milhar e normaliza vírgula decimal
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  if (Number.isNaN(num)) {
    throw new Error(`Valor monetário inválido: "${value}"`);
  }
  return Math.round(num * 100);
}

/** Formata centavos como moeda BRL (ex.: 123456 -> "R$ 1.234,56"). */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Centavos -> número em reais (para inputs do tipo number). */
export function centsToReais(cents: number): number {
  return cents / 100;
}
