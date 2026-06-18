/**
 * Persistência do último filtro usado nas Finanças.
 *
 * A página `/financas` filtra via query string (GET). Como cookies não podem ser
 * gravados durante o render de um Server Component, a persistência é decidida no
 * middleware. Este módulo concentra a LÓGICA PURA dessa decisão (testável sem
 * Next), e o middleware apenas executa o resultado.
 *
 * Comportamento:
 * - Submissão de filtro (`/financas?...` com alguma chave conhecida) → persiste o
 *   recorte canônico no cookie (ou apaga, se o recorte ficou vazio).
 * - Visita sem nenhuma chave de filtro (`/financas`, ex.: clique no menu) e com
 *   cookie salvo → redireciona para `/financas?<filtro salvo>` (restaura).
 * - `/financas?reset=1` (link "Limpar") → apaga o cookie e volta para `/financas`.
 */

export const FINANCAS_FILTER_COOKIE = "financas_filtro";

/** Chaves de filtro reconhecidas, na ordem canônica de serialização. */
export const FINANCAS_FILTER_KEYS = [
  "q",
  "mes",
  "tipo",
  "categoria",
  "show",
  "status",
  "de",
  "ate",
] as const;

/**
 * Serializa apenas as chaves de filtro conhecidas e não-vazias, em ordem estável.
 * Garante que o cookie nunca guarde lixo (ex.: `reset`, parâmetros desconhecidos).
 */
export function canonicalFilterQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of FINANCAS_FILTER_KEYS) {
    const raw = params.get(key);
    if (raw == null) continue;
    const value = raw.trim();
    if (value) out.set(key, value);
  }
  return out.toString();
}

/** Há ao menos uma chave de filtro presente na URL (mesmo que vazia)? */
export function hasAnyFilterParam(params: URLSearchParams): boolean {
  return FINANCAS_FILTER_KEYS.some((key) => params.has(key));
}

export type FinancasFilterDecision =
  | { kind: "reset" }
  | { kind: "persist"; cookie: string | null }
  | { kind: "restore"; query: string }
  | { kind: "pass" };

/**
 * Decide o que fazer com a requisição a `/financas`, dado o estado da URL e o
 * cookie salvo. Função pura — o middleware traduz a decisão em resposta HTTP.
 */
export function decideFinancasFilter(
  params: URLSearchParams,
  savedCookie: string | null | undefined,
): FinancasFilterDecision {
  // "Limpar" explícito: esquece o filtro salvo.
  if (params.has("reset")) return { kind: "reset" };

  // Submissão explícita de filtro: persiste o recorte (ou apaga, se vazio).
  if (hasAnyFilterParam(params)) {
    const canonical = canonicalFilterQuery(params);
    return { kind: "persist", cookie: canonical || null };
  }

  // Visita "limpa": restaura o último filtro, se houver um válido salvo.
  const saved = (savedCookie ?? "").trim();
  if (saved) {
    const sanitized = canonicalFilterQuery(new URLSearchParams(saved));
    if (sanitized) return { kind: "restore", query: sanitized };
  }

  return { kind: "pass" };
}
