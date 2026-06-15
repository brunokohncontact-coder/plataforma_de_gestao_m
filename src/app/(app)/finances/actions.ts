"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toCents } from "@/lib/money";
import { transactionSchema } from "@/lib/validation";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function parseForm(formData: FormData) {
  return transactionSchema.safeParse({
    type: String(formData.get("type") ?? "expense"),
    amountCents: toCents(String(formData.get("amount") ?? "0")),
    category: String(formData.get("category") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    description: emptyToNull(formData.get("description")),
    received: formData.get("received") === "on" || formData.get("received") === "true",
    showId: emptyToNull(formData.get("showId")),
  });
}

/** Confirma posse do show (evita vincular a show de outro usuário). */
async function validShowId(userId: string, showId: string | null | undefined) {
  if (!showId) return null;
  const s = await prisma.show.findFirst({
    where: { id: showId, userId },
    select: { id: true },
  });
  return s?.id ?? null;
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);
  const d = parsed.data;

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: d.type,
      amountCents: d.amountCents,
      category: d.category,
      date: new Date(d.date),
      description: d.description,
      // Despesas são consideradas pagas; "received" só faz sentido para receita.
      received: d.type === "income" ? d.received : true,
      showId: await validShowId(user.id, d.showId),
    },
  });
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  const target = d.showId ? `/shows/${d.showId}` : "/finances";
  redirect(target);
}

export async function updateTransaction(id: string, formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);
  const d = parsed.data;

  const owned = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) redirect("/finances");

  await prisma.transaction.update({
    where: { id },
    data: {
      type: d.type,
      amountCents: d.amountCents,
      category: d.category,
      date: new Date(d.date),
      description: d.description,
      received: d.type === "income" ? d.received : true,
      showId: await validShowId(user.id, d.showId),
    },
  });
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances");
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  redirect("/finances");
}

/** Alterna o status recebido/pendente de uma receita. */
export async function toggleReceived(id: string) {
  const user = await requireUser();
  const t = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  });
  if (!t || t.type !== "income") return;
  await prisma.transaction.update({
    where: { id },
    data: { received: !t.received },
  });
  revalidatePath("/finances");
  revalidatePath("/dashboard");
}
