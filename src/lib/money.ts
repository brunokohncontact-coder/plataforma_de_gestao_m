/**
 * Utilitários monetários. Tudo é armazenado e calculado em **centavos** (inteiros)
 * para evitar erros de ponto flutuante na lógica financeira.
 */

/** Converte um valor em centavos para reais (número). Ex.: 12345 -> 123.45 */
export function centsToUnits(cents: number): number {
  return cents / 100;
}

/** Converte reais (número) para centavos inteiros, arredondando. Ex.: 123.45 -> 12345 */
export function unitsToCents(units: number): number {
  return Math.round(units * 100);
}

/**
 * Faz parse de uma string monetária digitada pelo usuário para centavos.
 * Aceita formatos pt-BR ("1.234,56") e en ("1,234.56" / "1234.56").
 * Retorna `null` se não for um número válido.
 */
export function parseMoneyToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  let normalized = trimmed.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(normalized)) return null;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // O último separador é o decimal; o outro é separador de milhar.
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Vírgula como decimal (pt-BR).
    normalized = normalized.replace(",", ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Formata centavos como moeda. Default BRL/pt-BR. */
export function formatMoney(cents: number, currency = "BRL", locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
