/**
 * Seed de desenvolvimento: um artista demo com shows, transações e contatos,
 * incluindo um show com despesas vinculadas para exercitar a rentabilidade (F4).
 *
 * Rode com: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Usuário demo (senha "demo1234" — placeholder; auth real virá na F1).
  const user = await prisma.user.upsert({
    where: { email: "demo@palco.app" },
    update: {},
    create: {
      email: "demo@palco.app",
      name: "Artista Demo",
      // placeholder de hash; substituído quando a F1 (Auth) chegar.
      passwordHash: "seed-placeholder",
    },
  });

  // Limpa dados anteriores do usuário demo para um seed idempotente.
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.showContact.deleteMany({ where: { show: { userId: user.id } } });
  await prisma.show.deleteMany({ where: { userId: user.id } });
  await prisma.contact.deleteMany({ where: { userId: user.id } });

  const contatoVenue = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Bar do Zé (contato)",
      role: "venue",
      email: "contato@bardoze.com",
      phone: "+55 11 99999-0000",
    },
  });

  const showConfirmado = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      date: new Date("2026-07-12T21:00:00Z"),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "confirmado",
      feeCents: 200_000, // R$ 2.000
      notes: "Levar PA própria.",
      contacts: { create: [{ contactId: contatoVenue.id }] },
    },
  });

  await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival da Cidade",
      date: new Date("2026-08-03T18:00:00Z"),
      venue: "Praça Central",
      city: "Campinas",
      status: "proposto",
      feeCents: 500_000,
    },
  });

  // Transações: cachê recebido, despesas vinculadas ao show confirmado e um pendente.
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "income",
        category: "cachê",
        amountCents: 200_000,
        date: new Date("2026-07-13T10:00:00Z"),
        status: "received",
        description: "Cachê Bar do Zé",
        showId: showConfirmado.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "transporte",
        amountCents: 35_000,
        date: new Date("2026-07-12T15:00:00Z"),
        status: "received",
        showId: showConfirmado.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "alimentação",
        amountCents: 12_000,
        date: new Date("2026-07-12T19:00:00Z"),
        status: "received",
        showId: showConfirmado.id,
      },
      {
        userId: user.id,
        type: "income",
        category: "aula",
        amountCents: 60_000,
        date: new Date("2026-07-20T10:00:00Z"),
        status: "pending",
        description: "Aulas particulares (a receber)",
      },
    ],
  });

  console.log(`Seed concluído para ${user.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
