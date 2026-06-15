"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { showSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parseForm(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    venue: formData.get("venue") || undefined,
    city: formData.get("city") || undefined,
    status: formData.get("status") || undefined,
    fee: formData.get("fee") || 0,
    feeStatus: formData.get("feeStatus") || undefined,
    notes: formData.get("notes") || undefined,
    contactId: formData.get("contactId") || undefined,
  });
}

export async function createShow(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  await prisma.show.create({
    data: {
      userId: user.id,
      title: d.title,
      date: d.date,
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      fee: d.fee,
      feeStatus: d.feeStatus,
      notes: d.notes || null,
      contactId: d.contactId || null,
    },
  });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

export async function updateShow(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  // updateMany com filtro de userId garante que o usuário só edita o que é seu.
  const res = await prisma.show.updateMany({
    where: { id, userId: user.id },
    data: {
      title: d.title,
      date: d.date,
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      fee: d.fee,
      feeStatus: d.feeStatus,
      notes: d.notes || null,
      contactId: d.contactId || null,
    },
  });
  if (res.count === 0) return { error: "Show não encontrado." };
  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/shows/${id}`);
}

export async function deleteShow(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}
