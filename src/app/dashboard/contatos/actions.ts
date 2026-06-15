"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { contactSchema } from "@/lib/validation";

export interface FormResult {
  error?: string;
}

function parseContact(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
}

export async function createContact(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  await prisma.contact.create({
    data: {
      workspaceId: user.workspaceId,
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone || null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/dashboard/contatos");
  redirect("/dashboard/contatos");
}

export async function updateContact(
  id: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseContact(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  const owned = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!owned) return { error: "Contato não encontrado." };

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
  revalidatePath("/dashboard/contatos");
  redirect("/dashboard/contatos");
}

export async function deleteContact(id: string): Promise<void> {
  const user = await requireUser();
  // onDelete: SetNull no schema desvincula shows automaticamente.
  await prisma.contact.deleteMany({ where: { id, workspaceId: user.workspaceId } });
  revalidatePath("/dashboard/contatos");
  redirect("/dashboard/contatos");
}
