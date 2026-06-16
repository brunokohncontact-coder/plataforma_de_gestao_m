// Utilitários monetários. Toda persistência usa centavos (inteiros) para evitar
// erros de ponto flutuante; a conversão para/de reais acontece só na borda (UI/IO).

/** Converte um valor em reais (number) para centavos inteiros, arredondando. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("Valor monetário inválido");
  }
  return Math.round(amount * 100);
}

/** Converte centavos inteiros para reais (number). */
export function toReais(cents: number): number {
  return cents / 100;
}

/**
 * Faz parse de uma string digitada pelo usuário (ex.: "1.234,56", "R$ 1234.56",
 * "1234,5") para centavos. Aceita vírgula ou ponto como separador decimal.
 */
export function parseAmountToCents(input: string): number {
  const cleaned = input
    .replace(/[R$\s]/g, "")
    .trim();
  if (cleaned === "") return 0;

  let normalized = cleaned;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    // O último separador é o decimal; o outro é separador de milhar.
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`Valor monetário inválido: "${input}"`);
  }
  return Math.round(value * 100);
}

/** Formata centavos como moeda BRL para exibição (ex.: "R$ 1.234,56"). */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
