"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { revenueGoalSchema } from "@/lib/validation";

export interface GoalFormState {
  error?: string;
  success?: string;
}

/**
 * Define (cria ou atualiza) a meta de faturamento de um ano para o usuário
 * logado. Uma meta por ano (chave única userId+year) — daí o upsert.
 */
export async function setRevenueGoalAction(
  _prev: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const user = await requireUser();
  const parsed = revenueGoalSchema.safeParse({
    year: formData.get("year"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const { year, amount } = parsed.data;
  await prisma.revenueGoal.upsert({
    where: { userId_year: { userId: user.id, year } },
    create: { userId: user.id, year, amount },
    update: { amount },
  });

  revalidatePath("/financas/metas");
  revalidatePath("/dashboard");
  return { success: "Meta salva." };
}

/**
 * Remove a meta de faturamento de um ano. Só apaga a do próprio usuário
 * (`deleteMany` com `userId` no filtro é idempotente e seguro contra IDs
 * de outros usuários).
 */
export async function deleteRevenueGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  // O ano vem no campo `id` (convenção do DeleteButton) ou em `year`.
  const raw = formData.get("id") ?? formData.get("year");
  const year = Number(raw);
  if (!Number.isInteger(year)) return;

  await prisma.revenueGoal.deleteMany({ where: { userId: user.id, year } });

  revalidatePath("/financas/metas");
  revalidatePath("/dashboard");
}
