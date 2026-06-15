"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { contactSchema } from "@/lib/validation";

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function parseForm(formData: FormData) {
  return contactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "other"),
    email: String(formData.get("email") ?? "").trim(),
    phone: emptyToNull(formData.get("phone")),
    notes: emptyToNull(formData.get("notes")),
  });
}

export async function createContact(formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);
  const d = parsed.data;

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone,
      notes: d.notes,
    },
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function updateContact(id: string, formData: FormData) {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message);
  const d = parsed.data;

  const owned = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!owned) redirect("/contacts");

  await prisma.contact.update({
    where: { id },
    data: {
      name: d.name,
      role: d.role,
      email: d.email || null,
      phone: d.phone,
      notes: d.notes,
    },
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContact(id: string) {
  const user = await requireUser();
  await prisma.contact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/contacts");
  redirect("/contacts");
}
