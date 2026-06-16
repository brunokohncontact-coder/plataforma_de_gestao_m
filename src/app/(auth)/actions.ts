"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/auth";
import { registerSchema, loginSchema, fieldErrors } from "@/lib/validation";

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export type AuthState = { errors?: Record<string, string>; message?: string };

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    artistName: formData.get("artistName"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { name, email, password, artistName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: "Já existe uma conta com este e-mail" } };
  }

  const user = await prisma.user.create({
    data: { name, email, artistName, passwordHash: hashPassword(password) },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { message: "E-mail ou senha incorretos" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}
