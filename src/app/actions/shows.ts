"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { showSchema } from "@/lib/validation";

export interface ActionState {
  error?: string;
}

function parseShow(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    status: formData.get("status") || "PROPOSED",
    feeCents: formData.get("fee") ?? "0",
    notes: formData.get("notes"),
  });
}

export async function createShowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await prisma.show.create({ data: { ...parsed.data, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

export async function updateShowAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  // Garante posse: só atualiza shows do próprio usuário.
  const result = await prisma.show.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return { error: "Show não encontrado." };
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

/** Vincula/desvincula um contato a um show (F5). */
export async function linkContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const showId = String(formData.get("showId"));
  const contactId = String(formData.get("contactId"));
  const action = String(formData.get("op"));

  // Confirma posse do show e do contato.
  const show = await prisma.show.findFirst({ where: { id: showId, userId: user.id } });
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: user.id },
  });
  if (!show || !contact) return;

  if (action === "unlink") {
    await prisma.showContact.deleteMany({ where: { showId, contactId } });
  } else {
    await prisma.showContact.upsert({
      where: { showId_contactId: { showId, contactId } },
      create: { showId, contactId },
      update: {},
    });
  }
  revalidatePath(`/shows/${showId}`);
}
