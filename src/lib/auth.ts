// Autenticação: hash de senha (bcrypt) e sessão stateless em cookie assinado (HMAC).
// Decisão registrada em DECISIONS.md (D4).
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface SessionPayload {
  userId: string;
  /** Expiração em segundos epoch. */
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string, secret: string): string {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

/**
 * Cria um token de sessão assinado: `payload.assinatura`.
 * Funções puras (recebem o segredo) para facilitar os testes.
 */
export function createSessionToken(
  userId: string,
  secret: string,
  now: number = Date.now(),
): string {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Verifica um token de sessão. Retorna o `userId` se válido e não expirado, senão `null`.
 * Usa comparação em tempo constante para evitar timing attacks na assinatura.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  const expected = sign(encoded, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 < now) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "palco_session";
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não definido. Configure no .env.");
  }
  return secret;
}
