"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, setSessionCookie } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { updateProfileSchema, changePasswordSchema, changeEmailSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
  success?: string;
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    artistName: formData.get("artistName"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: { name: d.name, artistName: d.artistName || null },
  });

  revalidatePath("/conta");
  // O cabeçalho exibe o nome/nome artístico — revalida o layout do app.
  revalidatePath("/", "layout");
  return { success: "Perfil atualizado." };
}

export async function changeEmailAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = changeEmailSchema.safeParse({
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { email, currentPassword } = parsed.data;

  // O e-mail é a credencial de login — confirma a senha atual antes de trocar.
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return { error: "Senha atual incorreta." };

  if (email === user.email) {
    return { error: "O novo e-mail é igual ao atual." };
  }

  // Unicidade: o schema garante `@unique`, mas conferimos antes para devolver
  // uma mensagem clara em vez de estourar a constraint do banco.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Este e-mail já está em uso." };

  await prisma.user.update({ where: { id: user.id }, data: { email } });

  revalidatePath("/conta");
  return { success: "E-mail de acesso atualizado." };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  const ok = await verifyPassword(d.currentPassword, user.passwordHash);
  if (!ok) return { error: "Senha atual incorreta." };

  // Grava o novo hash e marca o momento da troca: isso invalida quaisquer
  // sessões (JWT) emitidas antes de agora (ver DECISIONS.md D10).
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(d.newPassword), passwordChangedAt: new Date() },
  });

  // Reemite o cookie deste dispositivo para que quem trocou a senha continue
  // logado aqui (o token novo tem `iat` >= passwordChangedAt); os demais
  // dispositivos com tokens antigos passam a ser rejeitados em getCurrentUser.
  await setSessionCookie(user.id);

  return { success: "Senha alterada com sucesso. As outras sessões foram encerradas." };
}
