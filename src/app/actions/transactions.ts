"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { transactionSchema } from "@/lib/validation";
import { parseCurrencyToCents } from "@/lib/money";

export interface TransactionActionState {
  error?: string;
}

function parseTxForm(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    status: formData.get("status"),
    showId: formData.get("showId") || undefined,
  });
}

async function resolveShowId(
  userId: string,
  showId?: string
): Promise<string | null> {
  if (!showId) return null;
  const show = await db.show.findFirst({
    where: { id: showId, userId },
    select: { id: true },
  });
  return show?.id ?? null;
}

export async function createTransactionAction(
  _prev: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const user = await requireUser();
  const parsed = parseTxForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const amountCents = parseCurrencyToCents(d.amount);
  if (amountCents === null || amountCents <= 0) {
    return { error: "Valor inválido." };
  }

  await db.transaction.create({
    data: {
      userId: user.id,
      type: d.type,
      amountCents,
      category: d.category,
      description: d.description,
      date: new Date(d.date),
      status: d.status,
      showId: await resolveShowId(user.id, d.showId),
    },
  });
  revalidatePath("/app/financas");
  revalidatePath("/app");
  if (d.showId) revalidatePath(`/app/shows/${d.showId}`);
  redirect("/app/financas");
}

export async function updateTransactionAction(
  txId: string,
  _prev: TransactionActionState,
  formData: FormData
): Promise<TransactionActionState> {
  const user = await requireUser();
  const existing = await db.transaction.findFirst({
    where: { id: txId, userId: user.id },
  });
  if (!existing) return { error: "Transação não encontrada." };

  const parsed = parseTxForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const amountCents = parseCurrencyToCents(d.amount);
  if (amountCents === null || amountCents <= 0) {
    return { error: "Valor inválido." };
  }

  await db.transaction.update({
    where: { id: txId },
    data: {
      type: d.type,
      amountCents,
      category: d.category,
      description: d.description,
      date: new Date(d.date),
      status: d.status,
      showId: await resolveShowId(user.id, d.showId),
    },
  });
  revalidatePath("/app/financas");
  revalidatePath("/app");
  redirect("/app/financas");
}

export async function deleteTransactionAction(txId: string): Promise<void> {
  const user = await requireUser();
  await db.transaction.deleteMany({ where: { id: txId, userId: user.id } });
  revalidatePath("/app/financas");
  revalidatePath("/app");
}

/** Alterna rapidamente o status de recebimento/pagamento (pendente <-> efetivado). */
export async function toggleTransactionStatusAction(
  txId: string
): Promise<void> {
  const user = await requireUser();
  const tx = await db.transaction.findFirst({
    where: { id: txId, userId: user.id },
    select: { status: true, showId: true },
  });
  if (!tx) return;
  await db.transaction.update({
    where: { id: txId },
    data: { status: tx.status === "PENDING" ? "SETTLED" : "PENDING" },
  });
  revalidatePath("/app/financas");
  revalidatePath("/app");
  if (tx.showId) revalidatePath(`/app/shows/${tx.showId}`);
}
