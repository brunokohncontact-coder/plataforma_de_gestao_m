/**
 * Utilidades monetárias. Internamente trabalhamos sempre com centavos (inteiros)
 * para evitar erros de ponto flutuante em somas financeiras.
 */

/** Converte uma string/numero em reais (ex.: "1.234,56", "1234.56", 1234.56) para centavos. */
export function toCents(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (trimmed === "") return 0;

  // Normaliza separadores: remove separador de milhar e usa ponto decimal.
  let normalized = trimmed.replace(/\s/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // O último separador é o decimal.
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/** Formata centavos em string de moeda (pt-BR por padrão). */
export function formatCents(cents: number, currency = "BRL", locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
