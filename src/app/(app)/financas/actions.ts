"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { transactionInputSchema } from "@/lib/domain/validation";

export interface FormState {
  error?: string;
  ok?: boolean;
}

function parseTx(formData: FormData) {
  const rawShowId = formData.get("showId");
  return transactionInputSchema.safeParse({
    type: formData.get("type"),
    amount: Number(formData.get("amount") ?? 0),
    category: formData.get("category"),
    description: formData.get("description"),
    date: formData.get("date"),
    received: formData.get("received") === "on" || formData.get("received") === "true",
    showId: rawShowId ? String(rawShowId) : null,
  });
}

/** Garante que o show (se informado) pertence ao usuário; senão descarta o vínculo. */
async function safeShowId(
  userId: string,
  showId: string | null | undefined,
): Promise<string | null> {
  if (!showId) return null;
  const owned = await prisma.show.findFirst({
    where: { id: showId, userId },
    select: { id: true },
  });
  return owned ? owned.id : null;
}

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: d.type,
      amount: d.amount,
      category: d.category,
      description: d.description || null,
      date: d.date,
      received: d.received,
      showId: await safeShowId(user.id, d.showId),
    },
  });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const owned = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) return { error: "Transação não encontrada" };

  const d = parsed.data;
  await prisma.transaction.update({
    where: { id },
    data: {
      type: d.type,
      amount: d.amount,
      category: d.category,
      description: d.description || null,
      date: d.date,
      received: d.received,
      showId: await safeShowId(user.id, d.showId),
    },
  });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
}

/** Alterna rapidamente o status recebido/pendente. */
export async function toggleReceived(id: string): Promise<void> {
  const user = await requireUser();
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!tx) return;
  await prisma.transaction.update({
    where: { id },
    data: { received: !tx.received },
  });
  revalidatePath("/financas");
  revalidatePath("/dashboard");
}
