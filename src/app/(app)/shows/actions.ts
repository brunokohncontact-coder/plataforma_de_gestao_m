"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  resolveSettlementAmount,
  resolveReceivedDate,
  resolvePromiseDate,
} from "@/lib/finance";
import { parseMoneyToCents, showSchema } from "@/lib/validation";
import {
  buildDuplicatedShowSeries,
  parseDuplicateInterval,
  parseDuplicateCount,
} from "@/lib/shows";
import { rescheduleToDay } from "@/lib/calendar";

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
  const created = await prisma.show.create({
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

  // Registra o primeiro evento da linha do tempo do funil (criação). Ver D234.
  await prisma.showStatusEvent.create({
    data: { showId: created.id, userId: user.id, fromStatus: null, toStatus: d.status },
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

  // Registra a transição na linha do tempo do funil só quando o status muda de
  // fato (uma edição de título/cachê não é evento de status). Ver D234.
  if (d.status !== existing.status) {
    await prisma.showStatusEvent.create({
      data: { showId: id, userId: user.id, fromStatus: existing.status, toStatus: d.status },
    });
  }

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

  // data REAL do recebimento: campo opcional `receivedAt` ("YYYY-MM-DD"); vazio/
  // inválido/futuro → agora. Determina em que mês o caixa entra (ver D29).
  const rawReceivedAt = formData.get("receivedAt");
  const receivedAt = resolveReceivedDate(
    typeof rawReceivedAt === "string" ? rawReceivedAt : null,
  );

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "INCOME",
      description: `Cachê — ${show.title}`,
      category: "Cachê",
      amount,
      date: receivedAt,
      received: true,
      showId: id,
    },
  });

  revalidatePath("/shows/a-receber");
  revalidatePath("/shows");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/financas");
  revalidatePath("/financas/agenda");
  revalidatePath("/financas/relatorio");
  revalidatePath("/financas/anual");
  revalidatePath("/dashboard");
}

/**
 * Registra (ou limpa) a DATA PROMETIDA de pagamento de um cachê em aberto, direto
 * da lista de "Cachês a receber". O campo `promisedAt` ("YYYY-MM-DD") é resolvido
 * no servidor por `resolvePromiseDate`: vazio/inválido → `null` (limpa a promessa);
 * data válida (inclusive futura) → meia-noite UTC daquele dia. Nunca confia no
 * cliente. Só atua sobre show do próprio usuário. Ver D94.
 */
export async function setPaymentPromiseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));

  // confirma posse antes de gravar
  const show = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!show) return;

  const rawPromisedAt = formData.get("promisedAt");
  const promisedAt = resolvePromiseDate(
    typeof rawPromisedAt === "string" ? rawPromisedAt : null,
  );

  await prisma.show.update({ where: { id }, data: { paymentPromisedAt: promisedAt } });

  revalidatePath("/shows/a-receber");
  revalidatePath("/shows/a-receber/por-contratante");
  revalidatePath(`/shows/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Lembra qual contato o usuário prefere cobrar por um show (a última escolha no
 * seletor "quem cobrar" da lista de cachês a receber), para a próxima abertura da
 * lista já vir pré-selecionada nele. Só grava um `contactId` que seja REALMENTE um
 * contato do usuário vinculado ao show — qualquer outro valor (vazio, id desconhecido,
 * contato de outro usuário) limpa a preferência (`null`), voltando à prioridade padrão
 * por papel. Só atua sobre show do próprio usuário. Nunca confia no cliente. Ver D198.
 */
export async function setBillingContactAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));

  // confirma posse do show antes de gravar
  const show = await prisma.show.findFirst({ where: { id, userId: user.id } });
  if (!show) return;

  const rawContactId = formData.get("contactId");
  const contactId =
    typeof rawContactId === "string" && rawContactId.trim() !== ""
      ? rawContactId.trim()
      : null;

  // só aceita um contato do usuário que esteja vinculado a este show; senão limpa
  let value: string | null = null;
  if (contactId) {
    const link = await prisma.contactsOnShows.findFirst({
      where: { showId: id, contactId, contact: { userId: user.id } },
    });
    value = link ? contactId : null;
  }

  await prisma.show.update({ where: { id }, data: { billingContactId: value } });
  revalidatePath("/shows/a-receber");
}

/**
 * Duplica um show existente — para residências / eventos recorrentes (mesma casa,
 * toda semana), poupando redigitar o mesmo cadastro. Cria uma cópia com o mesmo
 * conteúdo (título, local, cidade, cachê acordado, notas), data deslocada à frente
 * pelo intervalo escolhido (semanal/quinzenal/mensal, mesmo dia/horário) e status de
 * volta a `PROPOSED` — ver as regras puras `parseDuplicateInterval`/`buildDuplicatedShow`. Copia os vínculos de contato (o contratante/casa da
 * residência costuma ser o mesmo), mas NÃO copia transações (são realizados do
 * evento passado) nem o estado de cobrança (promessa/contato de cobrança). Só atua
 * sobre show do próprio usuário. Ao fim, redireciona para a edição da cópia, para o
 * usuário ajustar a data/detalhes antes de confirmar.
 */
export async function duplicateShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));

  const show = await prisma.show.findFirst({
    where: { id, userId: user.id },
    include: { contacts: { select: { contactId: true } } },
  });
  if (!show) return;

  const weeksAhead = parseDuplicateInterval(formData.get("intervalo"));
  const count = parseDuplicateCount(formData.get("quantidade"));
  const series = buildDuplicatedShowSeries(show, weeksAhead, count);
  const contacts = show.contacts.length
    ? { create: show.contacts.map((c) => ({ contactId: c.contactId })) }
    : undefined;

  // Cria todas as cópias atomicamente — uma residência agendada em lote não deve
  // ficar pela metade se uma inserção falhar. Cada cópia nasce com o evento de
  // criação na linha do tempo do funil (from null → status inicial). Ver D234.
  const created = await prisma.$transaction(
    series.map((data) =>
      prisma.show.create({
        data: {
          userId: user.id,
          title: data.title,
          date: data.date,
          venue: data.venue,
          city: data.city,
          status: data.status,
          fee: data.fee,
          notes: data.notes,
          contacts,
          statusEvents: {
            create: { userId: user.id, fromStatus: null, toStatus: data.status },
          },
        },
      }),
    ),
  );

  revalidatePath("/shows");
  revalidatePath("/dashboard");
  // Uma cópia → abre a edição dela (padrão "duplicar → editar" da D218). Várias →
  // volta à lista, já que não há uma única cópia para editar.
  if (created.length === 1) {
    redirect(`/shows/${created[0].id}/editar`);
  }
  redirect("/shows");
}

/**
 * Remarca um show para um novo dia sem abrir o formulário — o alvo do
 * arrastar-e-soltar no calendário (`CalendarGrid`). Lê `id` e `dia`
 * ("YYYY-MM-DD", a célula-alvo) do `FormData`; preserva o horário local do gig
 * (só o dia muda, via `rescheduleToDay`). No-op silencioso quando o show não é do
 * usuário, o dia é inválido ou a data não muda de fato — arrastar de volta para a
 * mesma célula não deve gerar escrita. Não redireciona (a UI só se atualiza no
 * lugar); remarcar é mudança de DATA, não de status, então não gera
 * `ShowStatusEvent` (espelha `updateShowAction`, que só registra evento na
 * transição de status).
 */
export async function rescheduleShowAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const day = String(formData.get("dia"));

  const show = await prisma.show.findFirst({
    where: { id, userId: user.id },
    select: { id: true, date: true },
  });
  if (!show) return;

  const next = rescheduleToDay(show.date, day);
  if (!next || next.getTime() === show.date.getTime()) return;

  await prisma.show.update({ where: { id }, data: { date: next } });

  revalidatePath("/shows");
  revalidatePath("/shows/calendario");
  revalidatePath("/shows/semana");
  revalidatePath(`/shows/${id}`);
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
