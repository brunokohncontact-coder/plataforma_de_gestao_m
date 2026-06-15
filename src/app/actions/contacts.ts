"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { contactSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parseContact(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

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
  revalidatePath("/app/contatos");
  redirect("/app/contatos");
}

export async function updateContactAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const existing = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Contato não encontrado." };

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
  revalidatePath("/app/contatos");
  redirect("/app/contatos");
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.contact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app/contatos");
  redirect("/app/contatos");
}
