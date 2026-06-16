"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { showInputSchema } from "@/lib/domain/validation";

export interface FormState {
  error?: string;
  ok?: boolean;
}

function parseShow(formData: FormData) {
  return showInputSchema.safeParse({
    title: formData.get("title"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    date: formData.get("date"),
    status: formData.get("status"),
    feeAgreed: Number(formData.get("feeAgreed") ?? 0),
    notes: formData.get("notes"),
  });
}

export async function createShow(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  await prisma.show.create({
    data: {
      userId: user.id,
      title: d.title,
      venue: d.venue || null,
      city: d.city || null,
      date: d.date,
      status: d.status,
      feeAgreed: d.feeAgreed,
      notes: d.notes || null,
    },
  });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateShow(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  // garante posse antes de atualizar
  const owned = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!owned) return { error: "Show não encontrado" };

  await prisma.show.update({
    where: { id },
    data: {
      title: d.title,
      venue: d.venue || null,
      city: d.city || null,
      date: d.date,
      status: d.status,
      feeAgreed: d.feeAgreed,
      notes: d.notes || null,
    },
  });
  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteShow(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
}
