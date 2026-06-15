"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { transactionSchema } from "@/lib/validation";
import { toCents } from "@/lib/money";

export type FormState = { error?: string };

export async function createTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  let amountCents: number;
  try {
    amountCents = toCents(d.amount);
  } catch {
    return { error: "Valor inválido." };
  }
  if (amountCents <= 0) return { error: "O valor deve ser maior que zero." };

  await prisma.transaction.create({
    data: {
      userId,
      type: d.type,
      amountCents,
      category: d.category,
      description: d.description || null,
      date: new Date(d.date),
      paid: d.paid === "on" || d.paid === "true",
      showId: d.showId || null,
    },
  });

  revalidatePath("/app/finances");
  revalidatePath("/app");
  if (d.showId) {
    revalidatePath(`/app/shows/${d.showId}`);
    redirect(`/app/shows/${d.showId}`);
  }
  redirect("/app/finances");
}

export async function togglePaid(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({ where: { id, userId }, select: { paid: true, showId: true } });
  if (!tx) return;
  await prisma.transaction.updateMany({ where: { id, userId }, data: { paid: !tx.paid } });
  revalidatePath("/app/finances");
  revalidatePath("/app");
  if (tx.showId) revalidatePath(`/app/shows/${tx.showId}`);
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({ where: { id, userId }, select: { showId: true } });
  await prisma.transaction.deleteMany({ where: { id, userId } });
  revalidatePath("/app/finances");
  revalidatePath("/app");
  if (tx?.showId) revalidatePath(`/app/shows/${tx.showId}`);
}
