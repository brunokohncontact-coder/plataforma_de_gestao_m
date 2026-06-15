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
    title: formData.get("title") ?? "",
    date: formData.get("date"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    status: formData.get("status"),
    fee: formData.get("fee") ?? 0,
    notes: formData.get("notes") ?? "",
  });
}

export async function createShowAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.show.create({
    data: {
      userId: user.id,
      title: d.title || null,
      date: d.date,
      venue: d.venue,
      city: d.city,
      status: d.status,
      fee: d.fee,
      notes: d.notes || null,
    },
  });
  revalidatePath("/app/shows");
  revalidatePath("/app");
  redirect("/app/shows");
}

export async function updateShowAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const existing = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Show não encontrado." };

  const d = parsed.data;
  await prisma.show.update({
    where: { id },
    data: {
      title: d.title || null,
      date: d.date,
      venue: d.venue,
      city: d.city,
      status: d.status,
      fee: d.fee,
      notes: d.notes || null,
    },
  });
  revalidatePath("/app/shows");
  revalidatePath(`/app/shows/${id}`);
  revalidatePath("/app");
  redirect(`/app/shows/${id}`);
}

export async function deleteShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app/shows");
  revalidatePath("/app");
  redirect("/app/shows");
}

/** Vincula/desvincula contatos a um show (substitui o conjunto atual). */
export async function setShowContactsAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const showId = String(formData.get("showId"));
  const show = await prisma.show.findFirst({ where: { id: showId, userId: user.id } });
  if (!show) redirect("/app/shows");

  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);
  // Garante que os contatos pertencem ao usuário.
  const owned = await prisma.contact.findMany({
    where: { id: { in: contactIds }, userId: user.id },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.showContact.deleteMany({ where: { showId } }),
    prisma.showContact.createMany({
      data: owned.map((c) => ({ showId, contactId: c.id })),
    }),
  ]);
  revalidatePath(`/app/shows/${showId}`);
}
