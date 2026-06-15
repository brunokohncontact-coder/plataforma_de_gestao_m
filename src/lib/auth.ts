// Integração de autenticação com cookies e Prisma (server-only).
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  signSession,
  verifySession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "./session";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado. Defina no .env.");
  }
  return secret;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Cria a sessão (cookie httpOnly) para um usuário. */
export async function createSession(userId: string): Promise<void> {
  const exp = Date.now() + SESSION_TTL_MS;
  const token = signSession({ userId, exp }, getSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Retorna o usuário logado (com workspace) ou null. */
export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token, getSecret());
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    include: { workspace: true },
  });
}

/** Igual a getCurrentUser, mas redireciona para /login se não autenticado. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
