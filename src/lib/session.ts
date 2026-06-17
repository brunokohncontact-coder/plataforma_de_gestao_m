// Helpers de sessão do lado do servidor (App Router). Lê/escreve o cookie de
// sessão e resolve o usuário atual a partir do banco.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isSessionFresh,
  verifySessionToken,
} from "./auth";

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Usuário atual ou null. Não redireciona. */
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;
  // Invalida tokens emitidos antes da última troca de senha (ver D10).
  if (!isSessionFresh(payload.issuedAt, user.passwordChangedAt)) return null;
  return user;
}

/** Exige usuário autenticado; redireciona para /login caso contrário. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
