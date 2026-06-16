"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { transactionSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

export async function createTransactionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    received: formData.get("received") === "on" || formData.get("received") === "true",
    showId: formData.get("showId"),
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  // valida que o show vinculado (se houver) pertence ao usuário
  if (d.showId) {
    const owns = await prisma.show.findFirst({ where: { id: d.showId, userId: user.id } });
    if (!owns) return { error: "Show inválido." };
  }

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: d.type,
      description: d.description,
      category: d.category,
      amount: d.amount,
      date: new Date(d.date),
      received: d.received,
      showId: d.showId,
    },
  });

  revalidatePath("/financas");
  revalidatePath("/dashboard");
  if (d.showId) revalidatePath(`/shows/${d.showId}`);
  redirect(d.showId ? `/shows/${d.showId}` : "/financas");
}

export async function updateTransactionAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Transação não encontrada." };

  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    received: formData.get("received") === "on" || formData.get("received") === "true",
    showId: formData.get("showId"),
  });

  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  if (d.showId) {
    const owns = await prisma.show.findFirst({ where: { id: d.showId, userId: user.id } });
    if (!owns) return { error: "Show inválido." };
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      type: d.type,
      description: d.description,
      category: d.category,
      amount: d.amount,
      date: new Date(d.date),
      received: d.received,
      showId: d.showId,
    },
  });

  revalidatePath("/financas");
  revalidatePath("/dashboard");
  // revalida o show novo e o antigo (caso o vínculo tenha mudado)
  if (d.showId) revalidatePath(`/shows/${d.showId}`);
  if (existing.showId && existing.showId !== d.showId) revalidatePath(`/shows/${existing.showId}`);
  redirect("/financas");
}

export async function toggleReceivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (tx) {
    await prisma.transaction.update({ where: { id }, data: { received: !tx.received } });
    revalidatePath("/financas");
    revalidatePath("/dashboard");
  }
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
}
