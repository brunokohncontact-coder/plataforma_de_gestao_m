"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { contactInputSchema } from "@/lib/domain/validation";

export interface FormState {
  error?: string;
  ok?: boolean;
}

function parseContact(formData: FormData) {
  return contactInputSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
}

export async function createContact(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  await prisma.contact.create({
    data: {
      userId: user.id,
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/contatos");
  return { ok: true };
}

export async function updateContact(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }
  const owned = await prisma.contact.findFirst({
    where: { id, userId: user.id },
  });
  if (!owned) return { error: "Contato não encontrado" };

  const d = parsed.data;
  await prisma.contact.update({
    where: { id },
    data: {
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/contatos");
  return { ok: true };
}

export async function deleteContact(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.contact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/contatos");
}
