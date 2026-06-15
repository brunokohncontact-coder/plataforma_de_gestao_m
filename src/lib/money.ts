// Utilidades de dinheiro. Todos os valores monetários no sistema são armazenados
// em CENTAVOS (inteiros) para evitar erros de ponto flutuante. A formatação para
// exibição acontece apenas na borda (UI).

/** Converte um valor em centavos para reais (número decimal). */
export function centsToReais(cents: number): number {
  return cents / 100;
}

/** Converte reais (decimal, ex.: 1234.56) para centavos inteiros, arredondando. */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Formata um valor em centavos como moeda BRL (ex.: 123456 -> "R$ 1.234,56").
 * Locale fixo pt-BR; o produto nasce focado em LATAM (ver business-plan.md).
 */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centsToReais(cents));
}

/**
 * Faz o parse de uma string monetária digitada pelo usuário (ex.: "1.234,56",
 * "1234.56", "R$ 1.234,56") para centavos. Retorna null se inválida.
 */
export function parseCurrencyToCents(input: string): number | null {
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/[R$\s]/g, "");
  if (s === "") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Assume formato pt-BR: ponto = milhar, vírgula = decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Só vírgula -> decimal.
    s = s.replace(",", ".");
  }
  // Só ponto (ou nenhum): já é formato com ponto decimal.

  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return reaisToCents(value);
}
