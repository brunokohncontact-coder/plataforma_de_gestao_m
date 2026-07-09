// Recuperação de senha — lógica pura e determinística do ciclo de vida do token.
// A regra sensível (gerar um segredo forte, guardar só o hash, expirar e ser de
// uso único) vive aqui, isolada de I/O, para ser testável. Ver DECISIONS.md (D259).
import { createHash, randomBytes } from "node:crypto";

/** Janela de validade do link de redefinição, em minutos. */
export const RESET_TOKEN_TTL_MINUTES = 60;

/** Bytes de entropia do token cru (256 bits). */
const RESET_TOKEN_BYTES = 32;

/**
 * Gera um token de redefinição cru, URL-safe (base64url, sem padding). É o
 * segredo que vai no link enviado ao usuário; o banco guarda apenas o seu hash
 * (`hashResetToken`). Não determinístico por design (usa CSPRNG).
 */
export function generateResetToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString("base64url");
}

/**
 * Hash (SHA-256 hex) do token cru — a chave de busca guardada no banco. Guardar
 * o hash em vez do token cru garante que um vazamento do banco não entregue
 * tokens utilizáveis. Determinístico: o mesmo token sempre gera o mesmo hash,
 * permitindo o lookup por `tokenHash`.
 */
export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Momento de expiração de um token criado agora (`now` + TTL). */
export function resetTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}

/** Estado mínimo de um token persistido, para as checagens de validade. */
export interface ResetTokenState {
  expiresAt: Date;
  usedAt: Date | null;
}

/**
 * Um token só é utilizável se ainda não foi consumido (`usedAt == null`) e não
 * expirou (`now < expiresAt`). Puro; `now` injetável para testes. A comparação
 * de expiração é estrita: no instante exato de `expiresAt` o token já não vale.
 */
export function isResetTokenUsable(token: ResetTokenState, now: Date): boolean {
  if (token.usedAt != null) return false;
  return now.getTime() < token.expiresAt.getTime();
}

/**
 * Máximo de pedidos de redefinição aceitos por conta dentro da janela
 * deslizante. Acima disso os pedidos seguintes são silenciosamente ignorados
 * (nenhum token novo é criado), para conter abuso/spam de links. É uma
 * heurística — ver DECISIONS.md (D260), marcada para validação.
 */
export const RESET_REQUEST_MAX_PER_WINDOW = 3;

/** Janela deslizante do rate-limit de pedidos de redefinição, em minutos. */
export const RESET_REQUEST_WINDOW_MINUTES = 60;

/**
 * Início da janela deslizante de rate-limit para um pedido feito em `now`:
 * pedidos anteriores a este instante já não contam. Puro; `now` injetável. Serve
 * de limite inferior para contar os pedidos recentes da conta (`createdAt >=`).
 */
export function resetRequestWindowStart(now: Date): Date {
  return new Date(now.getTime() - RESET_REQUEST_WINDOW_MINUTES * 60 * 1000);
}

/**
 * Rate-limit anti-abuso: dado o número de pedidos de redefinição já feitos pela
 * conta dentro da janela corrente (ver `resetRequestWindowStart`), retorna true
 * quando o próximo pedido deve ser barrado (já atingiu `RESET_REQUEST_MAX_PER_WINDOW`).
 * Puro e determinístico. Barrar mantém a resposta genérica (anti-enumeração): o
 * usuário vê a mesma mensagem, apenas nenhum link novo é gerado.
 */
export function isPasswordResetRateLimited(recentRequestCount: number): boolean {
  return recentRequestCount >= RESET_REQUEST_MAX_PER_WINDOW;
}

/** Estado mínimo de um token persistido para decidir se já pode ser apagado. */
export interface PrunableResetTokenState extends ResetTokenState {
  createdAt: Date;
}

/**
 * Um token de redefinição é "podável" (seguro de apagar do banco) quando não
 * pode mais servir a nada: (1) já não é utilizável — consumido (`usedAt != null`)
 * ou expirado (`now >= expiresAt`) — E (2) já saiu da janela do rate-limit
 * (`createdAt` anterior a `resetRequestWindowStart(now)`), de modo que removê-lo
 * não altera a contagem anti-abuso de pedidos recentes (ver
 * `isPasswordResetRateLimited`). Puro; `now` injetável. Base para a limpeza
 * oportunista de tokens mortos no pedido de um novo link. Ver DECISIONS.md (D266).
 */
export function isResetTokenPrunable(
  token: PrunableResetTokenState,
  now: Date,
): boolean {
  const stillCountsForRateLimit =
    token.createdAt.getTime() >= resetRequestWindowStart(now).getTime();
  if (stillCountsForRateLimit) return false;
  return !isResetTokenUsable(token, now);
}
