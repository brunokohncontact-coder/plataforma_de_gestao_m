"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { contactSchema } from "@/lib/validation";

export type FormState = { error?: string; ok?: boolean };

export async function createContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.contact.create({
    data: {
      userId,
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });

  revalidatePath("/app/contacts");
  return { ok: true };
}

export async function deleteContact(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id"));
  await prisma.contact.deleteMany({ where: { id, userId } });
  revalidatePath("/app/contacts");
}
