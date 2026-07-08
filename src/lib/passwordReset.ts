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
