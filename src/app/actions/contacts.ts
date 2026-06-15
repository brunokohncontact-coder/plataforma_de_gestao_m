"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { contactSchema } from "@/lib/validation";

export interface ActionState {
  error?: string;
}

function parseContact(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role") || "OTHER",
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
}

export async function createContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await prisma.contact.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      userId: user.id,
    },
  });
  revalidatePath("/contatos");
  redirect("/contatos");
}

export async function updateContactAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const result = await prisma.contact.updateMany({
    where: { id, userId: user.id },
    data: { ...parsed.data, email: parsed.data.email || null },
  });
  if (result.count === 0) return { error: "Contato não encontrado." };
  revalidatePath("/contatos");
  redirect("/contatos");
}

export async function deleteContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.contact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/contatos");
  redirect("/contatos");
}
