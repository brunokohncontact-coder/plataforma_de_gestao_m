// Autenticação leve e autossuficiente para o MVP: hash de senha (bcrypt) +
// sessão em cookie httpOnly com JWT assinado (jose). Ver DECISIONS.md (D4).
// Não depende de provedores externos/OAuth — adequado às execuções remotas.
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "insecure-dev-secret-change-me",
);
const ISSUER = "palco";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface SessionPayload {
  userId: string;
}

/** Cria um JWT de sessão assinado contendo o id do usuário. */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(SECRET);
}

/** Verifica e decodifica um token de sessão. Retorna null se inválido/expirado. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: ISSUER });
    if (typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "palco_session";
export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
