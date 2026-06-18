/**
 * Persistência do último filtro usado nas Finanças.
 *
 * Hoje é um caso particular da lógica genérica de `@/lib/listFilter` (ver Sessão
 * que generalizou o padrão para Shows e Contatos). Este módulo mantém a API
 * específica das Finanças (nome do cookie, chaves, helpers) delegando ao módulo
 * genérico, para preservar os pontos de uso e os testes existentes.
 */

import {
  canonicalQuery,
  decideListFilter,
  hasAnyFilterParam as hasAnyFilterParamGeneric,
  LIST_FILTER_CONFIGS,
  type ListFilterDecision,
} from "./listFilter";

const FINANCAS_CONFIG = LIST_FILTER_CONFIGS.find((c) => c.path === "/financas")!;

export const FINANCAS_FILTER_COOKIE = FINANCAS_CONFIG.cookie;

/** Chaves de filtro reconhecidas, na ordem canônica de serialização. */
export const FINANCAS_FILTER_KEYS = FINANCAS_CONFIG.keys;

/**
 * Serializa apenas as chaves de filtro conhecidas e não-vazias, em ordem estável.
 * Garante que o cookie nunca guarde lixo (ex.: `reset`, parâmetros desconhecidos).
 */
export function canonicalFilterQuery(params: URLSearchParams): string {
  return canonicalQuery(params, FINANCAS_FILTER_KEYS);
}

/** Há ao menos uma chave de filtro presente na URL (mesmo que vazia)? */
export function hasAnyFilterParam(params: URLSearchParams): boolean {
  return hasAnyFilterParamGeneric(params, FINANCAS_FILTER_KEYS);
}

export type FinancasFilterDecision = ListFilterDecision;

/**
 * Decide o que fazer com a requisição a `/financas`, dado o estado da URL e o
 * cookie salvo. Função pura — o middleware traduz a decisão em resposta HTTP.
 */
export function decideFinancasFilter(
  params: URLSearchParams,
  savedCookie: string | null | undefined,
): FinancasFilterDecision {
  return decideListFilter(params, savedCookie, FINANCAS_FILTER_KEYS);
}
