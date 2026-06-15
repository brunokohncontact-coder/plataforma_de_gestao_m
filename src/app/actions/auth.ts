"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  setSession,
  clearSession,
} from "@/lib/auth";
import { signupSchema, loginSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    artistName: formData.get("artistName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      artistName: parsed.data.artistName,
    },
  });

  setSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  // Mensagem genérica para não revelar se o e-mail existe.
  const genericError = { error: "E-mail ou senha incorretos." };
  if (!user) return genericError;

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return genericError;

  setSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  clearSession();
  redirect("/login");
}
