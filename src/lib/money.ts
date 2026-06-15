/**
 * Utilidades monetárias. Todo valor é manipulado em CENTAVOS (inteiros) para
 * evitar erros de ponto flutuante (ver DECISIONS.md D4). A conversão para
 * exibição/entrada acontece apenas nas bordas (UI).
 */

/** Converte um valor em reais (ex.: "1.234,56", "1234.56", 1234.56) para centavos. */
export function toCents(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Valor numérico inválido");
    return Math.round(value * 100);
  }

  const trimmed = value.trim();
  if (trimmed === "") throw new Error("Valor vazio");

  // Normaliza formatos pt-BR ("1.234,56") e en ("1,234.56" / "1234.56").
  let normalized = trimmed.replace(/[^\d.,-]/g, "");
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

  if (!/\d/.test(normalized)) throw new Error(`Valor monetário inválido: ${value}`);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`Valor monetário inválido: ${value}`);
  return Math.round(parsed * 100);
}

/** Formata centavos como moeda. Default BRL/pt-BR. */
export function formatMoney(
  cents: number,
  opts: { currency?: string; locale?: string } = {},
): string {
  const { currency = "BRL", locale = "pt-BR" } = opts;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
