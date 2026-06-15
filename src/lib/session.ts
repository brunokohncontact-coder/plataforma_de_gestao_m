// Sessão assinada (stateless) via cookie HMAC-SHA256. Sem dependência externa de
// auth, adequado ao MVP e a execuções remotas efêmeras. As funções de assinatura/
// verificação são PURAS (testáveis); a integração com cookies vive em auth.ts.
//
// Formato do token: base64url(payloadJSON) + "." + base64url(hmac)
import crypto from "node:crypto";

export interface SessionPayload {
  userId: string;
  /** epoch ms de expiração */
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(data: string, secret: string): Buffer {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

/** Assina um payload de sessão, retornando o token. */
export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(hmac(body, secret));
  return `${body}.${sig}`;
}

/**
 * Verifica um token. Retorna o payload se válido e não expirado; senão null.
 * Usa comparação de tempo constante para a assinatura.
 */
export function verifySession(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = b64url(hmac(body, secret));
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.userId !== "string" || typeof payload.exp !== "number") {
    return null;
  }
  if (payload.exp <= now) return null;
  return payload;
}

export const SESSION_COOKIE = "palco_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
