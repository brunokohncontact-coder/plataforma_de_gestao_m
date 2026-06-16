/**
 * Token de sessão assinado (HMAC-SHA256), sem dependências externas.
 * Formato: "<payloadBase64url>.<assinaturaBase64url>", onde payload é JSON
 * com { uid, exp }. Funções puras e testáveis; a integração com cookies do
 * Next fica em auth.ts.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  uid: string;
  /** Expiração em epoch ms. */
  exp: number;
}

export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(payloadB64: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payloadB64).digest());
}

export function createSessionToken(
  uid: string,
  secret: string,
  maxAgeMs: number = SESSION_MAX_AGE_MS,
  now: number = Date.now()
): string {
  const payload: SessionPayload = { uid, exp: now + maxAgeMs };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/** Verifica assinatura e expiração. Retorna o payload ou null. */
export function verifySessionToken(
  token: string,
  secret: string,
  now: number = Date.now()
): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payloadB64, secret);
  const a = fromBase64url(signature);
  const b = fromBase64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromBase64url(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.uid !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp < now
  ) {
    return null;
  }

  return payload;
}
