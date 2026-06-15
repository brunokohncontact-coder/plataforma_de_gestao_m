"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { contactSchema } from "@/lib/validation";

export interface ContactActionState {
  error?: string;
}

function parseContactForm(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createContactAction(
  _prev: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const user = await requireUser();
  const parsed = parseContactForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  await db.contact.create({
    data: {
      userId: user.id,
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone,
      notes: d.notes,
    },
  });
  revalidatePath("/app/contatos");
  redirect("/app/contatos");
}

export async function updateContactAction(
  contactId: string,
  _prev: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const user = await requireUser();
  const existing = await db.contact.findFirst({
    where: { id: contactId, userId: user.id },
  });
  if (!existing) return { error: "Contato não encontrado." };

  const parsed = parseContactForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  await db.contact.update({
    where: { id: contactId },
    data: {
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone,
      notes: d.notes,
    },
  });
  revalidatePath("/app/contatos");
  redirect("/app/contatos");
}

export async function deleteContactAction(contactId: string): Promise<void> {
  const user = await requireUser();
  await db.contact.deleteMany({ where: { id: contactId, userId: user.id } });
  revalidatePath("/app/contatos");
  redirect("/app/contatos");
}
