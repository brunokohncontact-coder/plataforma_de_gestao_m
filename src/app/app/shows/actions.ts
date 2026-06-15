"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { showSchema } from "@/lib/validation";
import { toCents } from "@/lib/money";

export type FormState = { error?: string };

function parseFee(fee?: string): number {
  if (!fee || fee.trim() === "") return 0;
  return toCents(fee);
}

export async function createShow(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = showSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  let feeCents = 0;
  try {
    feeCents = parseFee(d.fee);
  } catch {
    return { error: "Cachê inválido." };
  }

  const show = await prisma.show.create({
    data: {
      userId,
      title: d.title,
      venue: d.venue || null,
      city: d.city || null,
      date: new Date(d.date),
      status: d.status,
      feeCents,
      contactId: d.contactId || null,
      notes: d.notes || null,
    },
  });

  revalidatePath("/app/shows");
  revalidatePath("/app");
  redirect(`/app/shows/${show.id}`);
}

export async function updateShowStatus(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "PROPOSED" | "CONFIRMED" | "DONE" | "CANCELLED";
  await prisma.show.updateMany({ where: { id, userId }, data: { status } });
  revalidatePath(`/app/shows/${id}`);
  revalidatePath("/app/shows");
  revalidatePath("/app");
}

export async function deleteShow(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  // Desvincula transações antes de remover (preserva o histórico financeiro).
  await prisma.transaction.updateMany({ where: { showId: id, userId }, data: { showId: null } });
  await prisma.show.deleteMany({ where: { id, userId } });
  revalidatePath("/app/shows");
  revalidatePath("/app");
  redirect("/app/shows");
}
