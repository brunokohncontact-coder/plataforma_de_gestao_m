"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { showSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parseShow(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    date: formData.get("date"),
    status: formData.get("status"),
    fee: formData.get("fee") ?? "0",
    feePaid: formData.get("feePaid") === "on" || formData.get("feePaid") === "true",
    notes: formData.get("notes"),
    contactId: formData.get("contactId"),
  });
}

// Garante que o contato (se informado) pertence ao usuário.
async function validContactId(
  userId: string,
  contactId: string | null,
): Promise<string | null> {
  if (!contactId) return null;
  const c = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });
  return c ? c.id : null;
}

export async function createShowAction(
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
      venue: d.venue,
      city: d.city,
      date: d.date,
      status: d.status,
      fee: d.fee,
      feePaid: d.feePaid,
      notes: d.notes,
      contactId: await validContactId(user.id, d.contactId),
    },
  });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

export async function updateShowAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const existing = await prisma.show.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { error: "Show não encontrado." };

  const parsed = parseShow(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  await prisma.show.update({
    where: { id },
    data: {
      title: d.title,
      venue: d.venue,
      city: d.city,
      date: d.date,
      status: d.status,
      fee: d.fee,
      feePaid: d.feePaid,
      notes: d.notes,
      contactId: await validContactId(user.id, d.contactId),
    },
  });
  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/shows/${id}`);
}

export async function deleteShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}
