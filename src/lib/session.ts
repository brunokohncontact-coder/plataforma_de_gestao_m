// Helpers de sessão do lado do servidor — leem/escrevem o cookie de sessão.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAuthSecret,
  verifySessionToken,
} from "./auth";

/** Grava o cookie de sessão para o usuário (chamar em Server Action / Route Handler). */
export async function setSessionCookie(userId: string): Promise<void> {
  const token = createSessionToken(userId, getAuthSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Retorna o usuário logado ou `null`. */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const userId = verifySessionToken(token, getAuthSecret());
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, artistName: true },
  });
  return user;
}

/** Exige um usuário logado; redireciona para /login se não houver. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
