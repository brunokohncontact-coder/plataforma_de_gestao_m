"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { transactionSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parseTx(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    amount: formData.get("amount"),
    date: formData.get("date"),
    status: formData.get("status"),
    showId: formData.get("showId") ?? "",
  });
}

async function resolveShowId(
  showId: string | undefined,
  userId: string,
): Promise<string | null> {
  if (!showId) return null;
  const show = await prisma.show.findFirst({ where: { id: showId, userId } });
  return show ? show.id : null;
}

export async function createTransactionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: d.type,
      category: d.category,
      description: d.description || null,
      amount: d.amount,
      date: d.date,
      status: d.status,
      showId: await resolveShowId(d.showId || undefined, user.id),
    },
  });
  revalidatePath("/app/financas");
  revalidatePath("/app");
  redirect("/app/financas");
}

export async function updateTransactionAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseTx(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Transação não encontrada." };

  const d = parsed.data;
  await prisma.transaction.update({
    where: { id },
    data: {
      type: d.type,
      category: d.category,
      description: d.description || null,
      amount: d.amount,
      date: d.date,
      status: d.status,
      showId: await resolveShowId(d.showId || undefined, user.id),
    },
  });
  revalidatePath("/app/financas");
  revalidatePath("/app");
  redirect("/app/financas");
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app/financas");
  revalidatePath("/app");
  redirect("/app/financas");
}

/** Alterna rapidamente o status de recebimento/pagamento de uma transação. */
export async function toggleTransactionStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const tx = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
  if (!tx) return;

  let next: string;
  if (tx.type === "income") next = tx.status === "received" ? "pending" : "received";
  else next = tx.status === "paid" ? "pending" : "paid";

  await prisma.transaction.update({ where: { id }, data: { status: next } });
  revalidatePath("/app/financas");
  revalidatePath("/app");
}
