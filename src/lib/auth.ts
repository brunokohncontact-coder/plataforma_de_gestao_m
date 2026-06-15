// Autenticação simples e auto-contida (sem dependência externa de serviço):
// - senha com bcrypt (hash + verify)
// - sessão por cookie HttpOnly assinado com HMAC (AUTH_SECRET)
// Suficiente para o MVP; ao escalar, migrar para Auth.js (ver DECISIONS D5).
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "palco_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Token = "<userId>.<hmac(userId)>". Assinado para impedir adulteração.
function sign(userId: string): string {
  const sig = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}

export function createSession(userId: string): void {
  cookies().set(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = verifyToken(cookies().get(COOKIE_NAME)?.value);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  return user;
}

// Exige usuário autenticado; redireciona para /login caso contrário.
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
