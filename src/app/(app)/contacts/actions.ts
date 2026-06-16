"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { contactSchema, fieldErrors } from "@/lib/validation";

export type ContactFormState = { errors?: Record<string, string> };

export async function createContact(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await prisma.contact.create({ data: { ...parsed.data, userId: user.id } });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.contact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/contacts");
}
