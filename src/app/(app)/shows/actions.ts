"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { showSchema, fieldErrors } from "@/lib/validation";

export type ShowFormState = { errors?: Record<string, string> };

function parseShow(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    date: formData.get("date"),
    status: formData.get("status") || undefined,
    fee: formData.get("fee") || 0,
    notes: formData.get("notes"),
    contactId: formData.get("contactId"),
  });
}

async function assertContactOwnership(
  userId: string,
  contactId: string | null
): Promise<string | null> {
  if (!contactId) return null;
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });
  return contact ? contact.id : null;
}

export async function createShow(
  _prev: ShowFormState,
  formData: FormData
): Promise<ShowFormState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { contactId, ...rest } = parsed.data;
  await prisma.show.create({
    data: {
      ...rest,
      contactId: await assertContactOwnership(user.id, contactId),
      userId: user.id,
    },
  });

  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

export async function updateShow(
  id: string,
  _prev: ShowFormState,
  formData: FormData
): Promise<ShowFormState> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const owned = await prisma.show.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) redirect("/shows");

  const { contactId, ...rest } = parsed.data;
  await prisma.show.update({
    where: { id },
    data: { ...rest, contactId: await assertContactOwnership(user.id, contactId) },
  });

  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/shows/${id}`);
}

export async function deleteShow(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}
