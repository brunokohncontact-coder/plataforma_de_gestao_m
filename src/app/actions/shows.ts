"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { showSchema } from "@/lib/validation";
import { parseCurrencyToCents } from "@/lib/money";

export interface ShowActionState {
  error?: string;
}

function parseShowForm(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    venue: formData.get("venue") || undefined,
    city: formData.get("city") || undefined,
    status: formData.get("status"),
    fee: formData.get("fee") || undefined,
    notes: formData.get("notes") || undefined,
    contactIds: formData.getAll("contactIds").map(String),
  });
}

async function syncShowContacts(
  showId: string,
  userId: string,
  contactIds: string[]
) {
  // Mantém apenas contatos que pertencem ao usuário.
  const valid = await db.contact.findMany({
    where: { id: { in: contactIds }, userId },
    select: { id: true },
  });
  await db.showContact.deleteMany({ where: { showId } });
  if (valid.length > 0) {
    await db.showContact.createMany({
      data: valid.map((c) => ({ showId, contactId: c.id })),
    });
  }
}

export async function createShowAction(
  _prev: ShowActionState,
  formData: FormData
): Promise<ShowActionState> {
  const user = await requireUser();
  const parsed = parseShowForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const feeCents = d.fee ? parseCurrencyToCents(d.fee) ?? 0 : 0;

  const show = await db.show.create({
    data: {
      userId: user.id,
      title: d.title,
      date: new Date(d.date),
      venue: d.venue,
      city: d.city,
      status: d.status,
      feeCents,
      notes: d.notes,
    },
  });
  if (d.contactIds?.length) {
    await syncShowContacts(show.id, user.id, d.contactIds);
  }
  revalidatePath("/app/shows");
  revalidatePath("/app");
  redirect(`/app/shows/${show.id}`);
}

export async function updateShowAction(
  showId: string,
  _prev: ShowActionState,
  formData: FormData
): Promise<ShowActionState> {
  const user = await requireUser();
  const existing = await db.show.findFirst({
    where: { id: showId, userId: user.id },
  });
  if (!existing) return { error: "Show não encontrado." };

  const parsed = parseShowForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const feeCents = d.fee ? parseCurrencyToCents(d.fee) ?? 0 : 0;

  await db.show.update({
    where: { id: showId },
    data: {
      title: d.title,
      date: new Date(d.date),
      venue: d.venue,
      city: d.city,
      status: d.status,
      feeCents,
      notes: d.notes,
    },
  });
  await syncShowContacts(showId, user.id, d.contactIds ?? []);
  revalidatePath("/app/shows");
  revalidatePath(`/app/shows/${showId}`);
  revalidatePath("/app");
  redirect(`/app/shows/${showId}`);
}

export async function deleteShowAction(showId: string): Promise<void> {
  const user = await requireUser();
  await db.show.deleteMany({ where: { id: showId, userId: user.id } });
  revalidatePath("/app/shows");
  revalidatePath("/app");
  redirect("/app/shows");
}
