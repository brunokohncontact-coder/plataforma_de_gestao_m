// Assinatura/verificação de tokens de sessão (HMAC) — funções puras, testáveis.
// Token = base64url(payloadJSON) + "." + base64url(HMAC-SHA256(payload, secret)).
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  userId: string;
  /** Emitido em (epoch ms). */
  iat: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function hmac(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(body, secret)}`;
}

/**
 * Verifica o token e retorna o payload, ou null se inválido/adulterado.
 * Opcionalmente rejeita tokens mais antigos que `maxAgeMs`.
 */
export function verifySession(
  token: string | undefined | null,
  secret: string,
  maxAgeMs?: number,
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = hmac(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.userId !== "string") return null;
    if (maxAgeMs && typeof payload.iat === "number" && Date.now() - payload.iat > maxAgeMs) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
