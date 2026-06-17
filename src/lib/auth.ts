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
  /** Momento de emissão do token (`iat`), em segundos UNIX. */
  issuedAt?: number;
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
      return {
        userId: payload.userId,
        issuedAt: typeof payload.iat === "number" ? payload.iat : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decide se um token ainda é válido frente à última troca de senha do usuário.
 * Regra: um token emitido (`iat`) antes de `passwordChangedAt` é considerado
 * inválido — assim, trocar a senha desloga sessões antigas (ver DECISIONS.md D10).
 *
 * - Sem `passwordChangedAt` (registros legados antes da migração) → válido,
 *   para não deslogar todo mundo na introdução do campo.
 * - Token sem `iat` → inválido (não dá para comparar; rejeita por segurança).
 *
 * A comparação é feita em segundos UNIX (mesma granularidade do `iat` do JWT),
 * tolerando o arredondamento entre a gravação de `passwordChangedAt` e a emissão
 * do novo token na mesma operação de troca.
 */
export function isSessionFresh(
  issuedAtSeconds: number | undefined,
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt) return true;
  if (typeof issuedAtSeconds !== "number") return false;
  const changedAtSeconds = Math.floor(passwordChangedAt.getTime() / 1000);
  return issuedAtSeconds >= changedAtSeconds;
}

export const SESSION_COOKIE = "palco_session";
export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
