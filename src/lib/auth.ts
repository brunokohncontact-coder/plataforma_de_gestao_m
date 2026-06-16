/**
 * Integração de autenticação com o Next (cookies + Prisma).
 * A lógica criptográfica pura está em session.ts (testada à parte).
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_MAX_AGE_MS,
} from "./session";

const COOKIE_NAME = "palco_session";

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
}

export async function createSession(userId: string): Promise<void> {
  const token = createSessionToken(userId, getSecret());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function destroySession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  artistName: string | null;
};

/** Retorna o usuário autenticado, ou null. Não redireciona. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token, getSecret());
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, artistName: true },
  });
  return user;
}

/** Exige autenticação; redireciona para /login se ausente. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
