// Escritas na carteira da conta que rodam DENTRO de uma transação Prisma.
//
// Reúne as duas operações de escrita de dados da conta que precisam ser
// atômicas e que hoje são compartilhadas por mais de uma server action:
//   • `deleteAccountWallet` — esvaziar a carteira (a base do reset em
//     `/conta/dados/apagar`);
//   • `writeAccountRestorePlan` — gravar um plano de restauração já validado
//     (a base da restauração em `/conta/dados/importar`).
//
// Isolá-las aqui garante que "apagar meus dados" e "substituir tudo pelo backup"
// (que apaga e então restaura, tudo numa transação só) usem EXATAMENTE a mesma
// ordem de remoção e a mesma escrita — sem divergir entre as duas telas.
//
// Camada de escrita (recebe o cliente transacional `tx` por parâmetro): não é
// pura (fala com o banco), então é exercitada pelos testes de integração das
// server actions, não por testes unitários. Ver DECISIONS.md.

import type { Prisma } from "@prisma/client";
import type { AccountRestorePlan } from "./accountRestore";

/** Cliente transacional do Prisma (o `tx` de `prisma.$transaction`). */
type Tx = Prisma.TransactionClient;

export interface WalletCounts {
  shows: number;
  transactions: number;
  contacts: number;
  revenueGoals: number;
}

/**
 * Remove TODA a carteira do usuário (shows, transações, contatos e metas),
 * preservando a identidade e o perfil (nome/e-mail/senha, nome artístico,
 * alíquota — que não estão nesta lista). Executa na ordem das chaves
 * estrangeiras: a junção N:N e os eventos do funil dependem dos shows. Tudo
 * escopado por `userId` — nunca toca dados de outra conta.
 *
 * Deve rodar dentro de um `prisma.$transaction` (recebe o `tx`) para ser
 * all-or-nothing. Devolve quantos registros de cada entidade foram removidos.
 */
export async function deleteAccountWallet(
  tx: Tx,
  userId: string,
): Promise<WalletCounts> {
  // A junção N:N não tem `userId`; apagamos pelas linhas cujo show é do dono.
  await tx.contactsOnShows.deleteMany({ where: { show: { userId } } });
  await tx.showStatusEvent.deleteMany({ where: { userId } });
  const transactions = await tx.transaction.deleteMany({ where: { userId } });
  const contacts = await tx.contact.deleteMany({ where: { userId } });
  const shows = await tx.show.deleteMany({ where: { userId } });
  const revenueGoals = await tx.revenueGoal.deleteMany({ where: { userId } });
  return {
    shows: shows.count,
    transactions: transactions.count,
    contacts: contacts.count,
    revenueGoals: revenueGoals.count,
  };
}

/**
 * Grava um plano de restauração já validado na conta do usuário. Assume que a
 * carteira está VAZIA no momento da escrita (a restauração simples exige conta
 * vazia; a substituição chama `deleteAccountWallet` antes, na MESMA transação),
 * então não há estratégia de conflito de ids: tudo nasce novo, com ids gerados
 * pelo banco, remapeando as chaves estáveis do plano.
 *
 * Deve rodar dentro de um `prisma.$transaction`: um backup não pode ser
 * restaurado pela metade.
 */
export async function writeAccountRestorePlan(
  tx: Tx,
  userId: string,
  plan: AccountRestorePlan,
): Promise<void> {
  // Perfil: só campos de dados (nome artístico, alíquota). Nome/e-mail/senha
  // são a identidade da conta logada e NÃO vêm do backup.
  await tx.user.update({
    where: { id: userId },
    data: {
      artistName: plan.profile.artistName,
      taxRatePercent: plan.profile.taxRatePercent,
    },
  });

  // Contatos primeiro — os shows dependem deles (vínculo N:N).
  const contactIdByKey = new Map<string, string>();
  for (const c of plan.contacts) {
    const created = await tx.contact.create({
      data: {
        userId,
        name: c.name,
        role: c.role,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
      },
    });
    contactIdByKey.set(c.key, created.id);
  }

  // Shows — com os vínculos de contato já remapeados e a linha do tempo do
  // funil restaurada: se o backup traz o histórico (schema v2), gravamos os
  // eventos originais preservando `createdAt`/`fromStatus`/`toStatus`; senão
  // (backup v1 ou show sem histórico) recriamos só o evento de criação
  // sintético (from null → status inicial), como no cadastro normal. Ver D234.
  const showIdByKey = new Map<string, string>();
  for (const s of plan.shows) {
    const statusEventsCreate = s.statusEvents.length
      ? s.statusEvents.map((e) => ({
          userId,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          createdAt: new Date(e.createdAt),
        }))
      : [{ userId, fromStatus: null, toStatus: s.status }];
    const created = await tx.show.create({
      data: {
        userId,
        title: s.title,
        date: new Date(s.date),
        venue: s.venue,
        city: s.city,
        status: s.status,
        fee: s.fee,
        notes: s.notes,
        paymentPromisedAt: s.paymentPromisedAt
          ? new Date(s.paymentPromisedAt)
          : null,
        contacts: s.contactKeys.length
          ? {
              create: s.contactKeys.map((k) => ({
                contactId: contactIdByKey.get(k) as string,
              })),
            }
          : undefined,
        statusEvents: { create: statusEventsCreate },
      },
    });
    showIdByKey.set(s.key, created.id);
  }

  // Transações — com o showId remapeado (órfão já virou null no plano).
  for (const t of plan.transactions) {
    await tx.transaction.create({
      data: {
        userId,
        type: t.type,
        description: t.description,
        category: t.category,
        amount: t.amount,
        date: new Date(t.date),
        received: t.received,
        showId: t.showKey ? (showIdByKey.get(t.showKey) as string) : null,
      },
    });
  }

  // Metas de faturamento (ano único por conta já garantido no plano).
  for (const g of plan.revenueGoals) {
    await tx.revenueGoal.create({
      data: { userId, year: g.year, amount: g.amount },
    });
  }
}
