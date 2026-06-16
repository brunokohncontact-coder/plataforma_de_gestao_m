// Integração de autenticação server-side (cookies + Prisma).
// Primitivas criptográficas puras vivem em ./auth-crypto (testáveis).
// Ver DECISIONS.md D5 para a escolha de auth própria no MVP.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { signSession, verifySession } from "./auth-crypto";

const SESSION_COOKIE = "palco_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export { hashPassword, verifyPassword } from "./auth-crypto";

export function setSessionCookie(userId: string): void {
  cookies().set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Retorna o userId da sessão atual, ou null. */
export function getSessionUserId(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Carrega o usuário logado (ou null). */
export async function getCurrentUser() {
  const userId = getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Exige autenticação; redireciona para /login se não houver sessão. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
