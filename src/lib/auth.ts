// Camada de autenticação: hashing de senha (bcrypt), cookie de sessão e
// recuperação do usuário atual. Usado por server actions e páginas protegidas.
import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { signSession, verifySession } from "./session";

const COOKIE_NAME = "palco_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET ausente ou muito curto. Defina-o no .env.");
  }
  return s;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Cria o cookie de sessão para um usuário. */
export function createSession(userId: string): void {
  const token = signSession({ userId, iat: Date.now() }, secret());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  });
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/** Lê o cookie, valida e retorna o usuário atual (ou null). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const payload = verifySession(token, secret(), MAX_AGE_MS);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true },
  });
  return user;
}

/** Retorna o usuário atual ou lança — para uso em rotas protegidas. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
