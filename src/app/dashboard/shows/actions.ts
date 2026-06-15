"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { showSchema } from "@/lib/validation";

export interface FormResult {
  error?: string;
}

function parseShow(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    status: formData.get("status"),
    feeAgreed: formData.get("feeAgreed"),
    contactId: formData.get("contactId"),
    notes: formData.get("notes"),
  });
}

export async function createShow(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  await prisma.show.create({
    data: {
      workspaceId: user.workspaceId,
      title: d.title,
      date: d.date,
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      feeAgreed: d.feeAgreed,
      contactId: d.contactId || null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/dashboard/shows");
  revalidatePath("/dashboard");
  redirect("/dashboard/shows");
}

export async function updateShow(
  id: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseShow(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;

  // Garante que o show pertence ao workspace do usuário.
  const owned = await prisma.show.findFirst({
    where: { id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!owned) return { error: "Show não encontrado." };

  await prisma.show.update({
    where: { id },
    data: {
      title: d.title,
      date: d.date,
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      feeAgreed: d.feeAgreed,
      contactId: d.contactId || null,
      notes: d.notes || null,
    },
  });
  revalidatePath("/dashboard/shows");
  revalidatePath(`/dashboard/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/shows/${id}`);
}

export async function deleteShow(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.show.deleteMany({ where: { id, workspaceId: user.workspaceId } });
  revalidatePath("/dashboard/shows");
  revalidatePath("/dashboard");
  redirect("/dashboard/shows");
}
