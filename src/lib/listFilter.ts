/**
 * Persistência do último filtro usado nas listas (Finanças, Shows, Contatos).
 *
 * As listas filtram via query string (GET). Como cookies não podem ser gravados
 * durante o render de um Server Component, a persistência é decidida no
 * middleware. Este módulo concentra a LÓGICA PURA dessa decisão (testável sem
 * Next), genérica sobre o conjunto de chaves de filtro de cada lista; o
 * middleware apenas executa o resultado.
 *
 * Comportamento (idêntico para todas as listas):
 * - Submissão de filtro (`<rota>?...` com alguma chave conhecida) → persiste o
 *   recorte canônico no cookie (ou apaga, se o recorte ficou vazio).
 * - Visita sem nenhuma chave de filtro (`<rota>`, ex.: clique no menu) e com
 *   cookie salvo → redireciona para `<rota>?<filtro salvo>` (restaura).
 * - `<rota>?reset=1` (link "Limpar") → apaga o cookie e volta para `<rota>`.
 */

/** Parâmetro que sinaliza "esquecer o filtro salvo" (link "Limpar"). */
export const FILTER_RESET_PARAM = "reset";

/**
 * Marcador acrescentado à URL quando o middleware RESTAURA um filtro salvo (vs.
 * uma submissão explícita do usuário). Não é chave de filtro — `canonicalQuery`
 * o ignora, então nunca entra no cookie — serve só para a página avisar "este
 * recorte veio da sua última visita".
 */
export const FILTER_RESTORED_PARAM = "lembrado";

/** Acrescenta o marcador de "filtro restaurado" à query de restauração. */
export function withRestoredFlag(query: string): string {
  const params = new URLSearchParams(query);
  params.set(FILTER_RESTORED_PARAM, "1");
  return params.toString();
}

/** A requisição atual chegou de uma restauração de filtro (tem o marcador)? */
export function wasFilterRestored(params: URLSearchParams): boolean {
  return params.get(FILTER_RESTORED_PARAM) === "1";
}

/**
 * Serializa apenas as chaves de filtro conhecidas e não-vazias, em ordem estável
 * (a ordem de `keys`). Garante que o cookie nunca guarde lixo (ex.: `reset`,
 * parâmetros desconhecidos).
 */
export function canonicalQuery(
  params: URLSearchParams,
  keys: readonly string[],
): string {
  const out = new URLSearchParams();
  for (const key of keys) {
    const raw = params.get(key);
    if (raw == null) continue;
    const value = raw.trim();
    if (value) out.set(key, value);
  }
  return out.toString();
}

/** Há ao menos uma chave de filtro presente na URL (mesmo que vazia)? */
export function hasAnyFilterParam(
  params: URLSearchParams,
  keys: readonly string[],
): boolean {
  return keys.some((key) => params.has(key));
}

export type ListFilterDecision =
  | { kind: "reset" }
  | { kind: "persist"; cookie: string | null }
  | { kind: "restore"; query: string }
  | { kind: "pass" };

/**
 * Decide o que fazer com a requisição a uma lista, dado o estado da URL e o
 * cookie salvo. Função pura — o middleware traduz a decisão em resposta HTTP.
 */
export function decideListFilter(
  params: URLSearchParams,
  savedCookie: string | null | undefined,
  keys: readonly string[],
): ListFilterDecision {
  // "Limpar" explícito: esquece o filtro salvo.
  if (params.has(FILTER_RESET_PARAM)) return { kind: "reset" };

  // Submissão explícita de filtro: persiste o recorte (ou apaga, se vazio).
  if (hasAnyFilterParam(params, keys)) {
    const canonical = canonicalQuery(params, keys);
    return { kind: "persist", cookie: canonical || null };
  }

  // Visita "limpa": restaura o último filtro, se houver um válido salvo.
  const saved = (savedCookie ?? "").trim();
  if (saved) {
    const sanitized = canonicalQuery(new URLSearchParams(saved), keys);
    if (sanitized) return { kind: "restore", query: sanitized };
  }

  return { kind: "pass" };
}

/** Configuração de persistência de filtro de uma lista. */
export type ListFilterConfig = {
  /** Rota exata da lista (também a chave do matcher do middleware). */
  path: string;
  /** Nome do cookie que guarda o recorte. */
  cookie: string;
  /** Chaves de filtro reconhecidas, na ordem canônica de serialização. */
  keys: readonly string[];
};

/**
 * Registro de todas as listas com filtro persistido. O middleware casa a rota
 * exata da requisição contra `path`. Manter `matcher` do middleware em sincronia
 * com os `path` daqui.
 */
export const LIST_FILTER_CONFIGS: readonly ListFilterConfig[] = [
  {
    path: "/financas",
    cookie: "financas_filtro",
    keys: ["q", "mes", "tipo", "categoria", "show", "status", "de", "ate"],
  },
  {
    path: "/shows",
    cookie: "shows_filtro",
    keys: ["q", "status", "de", "ate"],
  },
  {
    path: "/contatos",
    cookie: "contatos_filtro",
    keys: ["q", "papel"],
  },
] as const;
