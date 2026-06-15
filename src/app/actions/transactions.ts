"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { transactionSchema } from "@/lib/validation";

export interface ActionState {
  error?: string;
}

function parseTx(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    amountCents: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description"),
    date: formData.get("date"),
    settled: formData.get("settled") === "on" || formData.get("settled") === "true",
    showId: formData.get("showId"),
  });
}

async function assertShowOwnership(
  userId: string,
  showId: string | undefined,
): Promise<boolean> {
  if (!showId) return true;
  const show = await prisma.show.findFirst({ where: { id: showId, userId } });
  return Boolean(show);
}

export async function createTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  if (!(await assertShowOwnership(user.id, parsed.data.showId))) {
    return { error: "Show inválido." };
  }
  await prisma.transaction.create({
    data: { ...parsed.data, showId: parsed.data.showId ?? null, userId: user.id },
  });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
  if (parsed.data.showId) revalidatePath(`/shows/${parsed.data.showId}`);
  redirect(formData.get("returnTo")?.toString() || "/financas");
}

export async function updateTransactionAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  if (!(await assertShowOwnership(user.id, parsed.data.showId))) {
    return { error: "Show inválido." };
  }
  const result = await prisma.transaction.updateMany({
    where: { id, userId: user.id },
    data: { ...parsed.data, showId: parsed.data.showId ?? null },
  });
  if (result.count === 0) return { error: "Transação não encontrada." };
  revalidatePath("/financas");
  revalidatePath("/dashboard");
  redirect("/financas");
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
  if (tx?.showId) revalidatePath(`/shows/${tx.showId}`);
  const returnTo = formData.get("returnTo")?.toString();
  if (returnTo) redirect(returnTo);
  redirect("/financas");
}

/** Alterna o status recebido/pago (settled) de uma transação. */
export async function toggleSettledAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!tx) return;
  await prisma.transaction.update({
    where: { id },
    data: { settled: !tx.settled },
  });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
}
