"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { transactionSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parseTx(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    date: formData.get("date"),
    received: formData.get("received") === "on" || formData.get("received") === "true",
    note: formData.get("note"),
    showId: formData.get("showId"),
  });
}

async function validShowId(userId: string, showId: string | null): Promise<string | null> {
  if (!showId) return null;
  const s = await prisma.show.findFirst({
    where: { id: showId, userId },
    select: { id: true },
  });
  return s ? s.id : null;
}

function revalidate(showId?: string | null) {
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  if (showId) revalidatePath(`/shows/${showId}`);
}

export async function createTransactionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const showId = await validShowId(user.id, d.showId);
  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: d.type,
      amount: d.amount,
      category: d.category,
      date: d.date,
      received: d.received,
      note: d.note,
      showId,
    },
  });
  revalidate(showId);
  return {};
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    select: { showId: true },
  });
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidate(tx?.showId);
}

// Alterna o status recebido/pago de uma transação.
export async function toggleReceivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    select: { received: true, showId: true },
  });
  if (!tx) return;
  await prisma.transaction.update({
    where: { id },
    data: { received: !tx.received },
  });
  revalidate(tx.showId);
}
