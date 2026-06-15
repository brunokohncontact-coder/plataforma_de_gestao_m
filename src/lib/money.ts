// Utilitários monetários. Regra: armazenamos e calculamos sempre em CENTAVOS (inteiros)
// para evitar erros de ponto flutuante. Formatação só na borda (UI).

/**
 * Converte uma string digitada pelo usuário (ex.: "1.234,56", "1234.56", "R$ 80")
 * em centavos inteiros. Aceita vírgula ou ponto como separador decimal.
 * Retorna null se a entrada não for um número válido.
 */
export function parseAmountToCents(input: string): number | null {
  if (input == null) return null;
  let s = String(input).trim();
  if (s === "") return null;

  // Remove símbolos de moeda e espaços.
  s = s.replace(/[R$\s ]/gi, "");

  // Detecta o separador decimal. Produto pt-BR-first (ver DECISIONS.md D4):
  //  - Se houver ',' e '.', o ÚLTIMO a aparecer é o decimal (ex.: "1.234,56", "1,234.56").
  //  - Só ',': vírgula é decimal ("80,50" -> 80.5).
  //  - Só '.': ambíguo. Tratamos como separador de milhar quando seguido de exatamente
  //    3 dígitos ("1.500" -> 1500, padrão pt-BR); caso contrário como decimal
  //    ("80.50" -> 80.5, tolerância a entrada estilo en).
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = s.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    normalized = s.split(".").join("").replace(",", ".");
  } else if (lastDot !== -1) {
    const onlyDot = s.indexOf(".") === lastDot; // um único ponto
    const trailing = s.length - lastDot - 1;
    if (onlyDot && trailing === 3) {
      normalized = s.replace(".", ""); // milhar: "1.500" -> "1500"
    } else {
      normalized = s.split(",").join(""); // decimal: "80.50" -> "80.50"
    }
  } else {
    normalized = s;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(value * 100);
}

/** Formata centavos como moeda. Default pt-BR / BRL. */
export function formatCents(
  cents: number,
  opts: { locale?: string; currency?: string } = {},
): string {
  const { locale = "pt-BR", currency = "BRL" } = opts;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
