"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toCents } from "@/lib/money";
import { showSchema } from "@/lib/validation";

function parseShowForm(formData: FormData) {
  return showSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    venue: emptyToNull(formData.get("venue")),
    city: emptyToNull(formData.get("city")),
    status: String(formData.get("status") ?? "proposed"),
    feeCents: toCents(String(formData.get("fee") ?? "0")),
    notes: emptyToNull(formData.get("notes")),
    contactId: emptyToNull(formData.get("contactId")),
  });
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createShow(formData: FormData) {
  const user = await requireUser();
  const parsed = parseShowForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);
  const d = parsed.data;

  await prisma.show.create({
    data: {
      userId: user.id,
      title: d.title,
      date: new Date(d.date),
      venue: d.venue,
      city: d.city,
      status: d.status,
      feeCents: d.feeCents,
      notes: d.notes,
      contactId: await validContactId(user.id, d.contactId),
    },
  });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

export async function updateShow(id: string, formData: FormData) {
  const user = await requireUser();
  const parsed = parseShowForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);
  const d = parsed.data;

  // Garante posse antes de atualizar.
  const owned = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!owned) redirect("/shows");

  await prisma.show.update({
    where: { id },
    data: {
      title: d.title,
      date: new Date(d.date),
      venue: d.venue,
      city: d.city,
      status: d.status,
      feeCents: d.feeCents,
      notes: d.notes,
      contactId: await validContactId(user.id, d.contactId),
    },
  });
  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/shows/${id}`);
}

export async function deleteShow(id: string) {
  const user = await requireUser();
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

/** Confirma que o contato pertence ao usuário (evita IDOR); retorna null se inválido. */
async function validContactId(
  userId: string,
  contactId: string | null | undefined,
): Promise<string | null> {
  if (!contactId) return null;
  const c = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });
  return c?.id ?? null;
}
