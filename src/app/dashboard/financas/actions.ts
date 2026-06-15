"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { transactionSchema } from "@/lib/validation";

export interface FormResult {
  error?: string;
}

function parseTx(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    status: formData.get("status"),
    showId: formData.get("showId"),
  });
}

/** Valida que o showId (se informado) pertence ao workspace. */
async function resolveShowId(workspaceId: string, showId: string): Promise<string | null> {
  if (!showId) return null;
  const show = await prisma.show.findFirst({
    where: { id: showId, workspaceId },
    select: { id: true },
  });
  return show?.id ?? null;
}

export async function createTransaction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  await prisma.transaction.create({
    data: {
      workspaceId: user.workspaceId,
      type: d.type,
      category: d.category,
      description: d.description || null,
      amount: d.amount,
      date: d.date,
      status: d.status,
      showId: await resolveShowId(user.workspaceId, d.showId ?? ""),
    },
  });
  revalidatePath("/dashboard/financas");
  revalidatePath("/dashboard");
  redirect("/dashboard/financas");
}

export async function updateTransaction(
  id: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  const owned = await prisma.transaction.findFirst({
    where: { id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!owned) return { error: "Transação não encontrada." };

  await prisma.transaction.update({
    where: { id },
    data: {
      type: d.type,
      category: d.category,
      description: d.description || null,
      amount: d.amount,
      date: d.date,
      status: d.status,
      showId: await resolveShowId(user.workspaceId, d.showId ?? ""),
    },
  });
  revalidatePath("/dashboard/financas");
  revalidatePath("/dashboard");
  redirect("/dashboard/financas");
}

export async function deleteTransaction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.transaction.deleteMany({ where: { id, workspaceId: user.workspaceId } });
  revalidatePath("/dashboard/financas");
  revalidatePath("/dashboard");
  redirect("/dashboard/financas");
}
