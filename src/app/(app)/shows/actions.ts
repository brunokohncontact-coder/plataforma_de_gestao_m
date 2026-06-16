"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { showSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parse(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    status: formData.get("status"),
    fee: formData.get("fee"),
    notes: formData.get("notes"),
  });
}

export async function createShowAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.show.create({
    data: {
      userId: user.id,
      title: d.title,
      date: new Date(d.date),
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      fee: d.fee,
      notes: d.notes || null,
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
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // garante que o show pertence ao usuário
  const existing = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Show não encontrado." };

  const d = parsed.data;
  await prisma.show.update({
    where: { id },
    data: {
      title: d.title,
      date: new Date(d.date),
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      fee: d.fee,
      notes: d.notes || null,
    },
  });

  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/shows/${id}`);
}

export async function linkContactToShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const showId = String(formData.get("showId"));
  const contactId = String(formData.get("contactId"));
  if (!contactId) return;

  // garante que ambos pertencem ao usuário
  const [show, contact] = await Promise.all([
    prisma.show.findFirst({ where: { id: showId, userId: user.id } }),
    prisma.contact.findFirst({ where: { id: contactId, userId: user.id } }),
  ]);
  if (!show || !contact) return;

  // upsert idempotente no join (ignora se já vinculado)
  await prisma.contactsOnShows.upsert({
    where: { contactId_showId: { contactId, showId } },
    create: { contactId, showId },
    update: {},
  });

  revalidatePath(`/shows/${showId}`);
}

export async function unlinkContactFromShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const showId = String(formData.get("showId"));
  const contactId = String(formData.get("contactId"));

  // confirma posse do show antes de remover o vínculo
  const show = await prisma.show.findFirst({ where: { id: showId, userId: user.id } });
  if (!show) return;

  await prisma.contactsOnShows.deleteMany({ where: { contactId, showId } });
  revalidatePath(`/shows/${showId}`);
}

export async function deleteShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}
