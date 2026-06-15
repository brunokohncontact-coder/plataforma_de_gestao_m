// Autenticação leve própria: bcrypt para senha + cookie de sessão assinado
// com HMAC (sem dependência externa). Decisão registrada em DECISIONS.md (D4).
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "palco_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secret(): string {
  return (
    process.env.AUTH_SECRET ??
    // fallback só para dev/CI; em produção AUTH_SECRET é obrigatório.
    "dev-insecure-secret-change-me"
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/** Token = "<userId>.<assinatura>". Verificação em tempo constante. */
function makeToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function verifyToken(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setSession(userId: string): void {
  cookies().set(COOKIE_NAME, makeToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}

/** Retorna o userId da sessão válida, ou null. */
export function getSessionUserId(): string | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  artistName: string | null;
}

/** Carrega o usuário da sessão (ou null se não autenticado/inexistente). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, artistName: true },
  });
  return user;
}

/** Igual a getCurrentUser, mas lança se não autenticado (uso em páginas privadas). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
