"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { transactionSchema, fieldErrors } from "@/lib/validation";

export type TransactionFormState = { errors?: Record<string, string> };

export async function createTransaction(
  _prev: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description"),
    date: formData.get("date"),
    settled: formData.get("settled") === "on" || formData.get("settled") === "true",
    showId: formData.get("showId"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { showId, ...rest } = parsed.data;

  // Garante que o show (se informado) pertence ao usuário.
  let validShowId: string | null = null;
  if (showId) {
    const show = await prisma.show.findFirst({
      where: { id: showId, userId: user.id },
      select: { id: true },
    });
    validShowId = show?.id ?? null;
  }

  await prisma.transaction.create({
    data: { ...rest, showId: validShowId, userId: user.id },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  if (validShowId) {
    revalidatePath(`/shows/${validShowId}`);
    redirect(`/shows/${validShowId}`);
  }
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    select: { showId: true },
  });
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  if (tx?.showId) revalidatePath(`/shows/${tx.showId}`);
}

export async function toggleSettled(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    select: { settled: true },
  });
  if (!tx) return;
  await prisma.transaction.updateMany({
    where: { id, userId: user.id },
    data: { settled: !tx.settled },
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
