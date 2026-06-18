"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { resolveSettlementAmount } from "@/lib/finance";
import { parseMoneyToCents, showSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

function parse(formData: FormData) {
  return showSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    venue: formData.get("venue"),
    city: formData.get("city"),
    status: formData.get("status"),
    fee: formData.get("fee"),
    notes: formData.get("notes"),
  });
}

export async function createShowAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const d = parsed.data;
  await prisma.show.create({
    data: {
      userId: user.id,
      title: d.title,
      date: new Date(d.date),
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      fee: d.fee,
      notes: d.notes || null,
    },
  });

  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}

export async function updateShowAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  // garante que o show pertence ao usuário
  const existing = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Show não encontrado." };

  const d = parsed.data;
  await prisma.show.update({
    where: { id },
    data: {
      title: d.title,
      date: new Date(d.date),
      venue: d.venue || null,
      city: d.city || null,
      status: d.status,
      fee: d.fee,
      notes: d.notes || null,
    },
  });

  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
  redirect(`/shows/${id}`);
}

export async function linkContactToShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const showId = String(formData.get("showId"));
  const contactId = String(formData.get("contactId"));
  if (!contactId) return;

  // garante que ambos pertencem ao usuário
  const [show, contact] = await Promise.all([
    prisma.show.findFirst({ where: { id: showId, userId: user.id } }),
    prisma.contact.findFirst({ where: { id: contactId, userId: user.id } }),
  ]);
  if (!show || !contact) return;

  // upsert idempotente no join (ignora se já vinculado)
  await prisma.contactsOnShows.upsert({
    where: { contactId_showId: { contactId, showId } },
    create: { contactId, showId },
    update: {},
  });

  revalidatePath(`/shows/${showId}`);
}

export async function unlinkContactFromShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const showId = String(formData.get("showId"));
  const contactId = String(formData.get("contactId"));

  // confirma posse do show antes de remover o vínculo
  const show = await prisma.show.findFirst({ where: { id: showId, userId: user.id } });
  if (!show) return;

  await prisma.contactsOnShows.deleteMany({ where: { contactId, showId } });
  revalidatePath(`/shows/${showId}`);
}

/**
 * Quita o cachê em aberto de um show direto da lista de "Cachês a receber",
 * sem passar pelas Finanças: cria UMA receita (INCOME) já recebida no valor que
 * ainda falta entrar. O saldo é recalculado no servidor (cachê acordado − receita
 * já recebida vinculada) — nunca confiando num valor vindo do cliente — então a
 * ação é idempotente: se o show já está quitado (ou não é do usuário, ou não tem
 * cachê), nada é criado. Espelha a regra pura de `reconcileShowFees` (ver D25).
 *
 * O campo opcional `amount` (string em reais pt-BR) permite quitar um valor
 * PARCIAL pela própria lista: vazio/inválido → quita o saldo inteiro; informado →
 * é validado e limitado ao saldo no servidor (`resolveSettlementAmount`), nunca
 * confiando no valor do cliente. Lançar parcial deixa a linha na lista com o
 * restante a receber (ver D28).
 */
export async function settleShowFeeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));

  // confirma posse e descarta shows sem cachê acordado (nada a cobrar)
  const show = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!show || show.fee <= 0) return;

  // soma só as receitas já RECEBIDAS vinculadas ao show — o que de fato entrou
  const collectedAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId: user.id, showId: id, type: "INCOME", received: true },
  });
  const collected = collectedAgg._sum.amount ?? 0;
  const outstanding = Math.max(0, show.fee - collected);
  if (outstanding <= 0) return; // já quitado — idempotente

  // valor opcional: vazio → quita tudo; informado → validado e limitado ao saldo
  const rawAmount = formData.get("amount");
  const requested =
    typeof rawAmount === "string" && rawAmount.trim() !== ""
      ? parseMoneyToCents(rawAmount)
      : null;
  const amount = resolveSettlementAmount(outstanding, requested);
  if (amount <= 0) return; // valor inválido/zerado após o clamp — no-op

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "INCOME",
      description: `Cachê — ${show.title}`,
      category: "Cachê",
      amount,
      date: new Date(),
      received: true,
      showId: id,
    },
  });

  revalidatePath("/shows/a-receber");
  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/financas");
  revalidatePath("/financas/agenda");
  revalidatePath("/dashboard");
}

export async function deleteShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await prisma.show.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/shows");
  revalidatePath("/dashboard");
  redirect("/shows");
}
