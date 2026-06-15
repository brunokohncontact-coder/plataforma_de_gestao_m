/**
 * Seed de desenvolvimento. Cria um usuário demo com shows, transações e contatos
 * para exercitar a lógica de rentabilidade. Idempotente: limpa os dados do usuário
 * demo antes de recriar.
 *
 * NOTA: o passwordHash abaixo é um placeholder. A autenticação real (hashing) será
 * implementada na feature F1 (ver PROGRESS.md). Não usar em produção.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@palco.app";

async function main() {
  // Limpa o usuário demo (cascade remove shows/transações/contatos).
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Artista Demo",
      passwordHash: "PLACEHOLDER_NOT_A_REAL_HASH",
    },
  });

  const showRock = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      venue: "Praça Central",
      city: "Curitiba",
      date: new Date("2026-07-12T21:00:00Z"),
      status: "CONFIRMED",
      feeCents: 350_000,
      notes: "Cachê fechado por contrato. Levar 2 técnicos.",
    },
  });

  const showBar = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      venue: "Bar do Zé",
      city: "São Paulo",
      date: new Date("2026-06-28T23:00:00Z"),
      status: "PLAYED",
      feeCents: 80_000,
    },
  });

  const venueContact = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Maria — Produção Praça Central",
      role: "PROMOTER",
      email: "maria@pracacentral.example",
    },
  });

  await prisma.showContact.create({
    data: { showId: showRock.id, contactId: venueContact.id },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "INCOME",
        amountCents: 350_000,
        category: "cachê",
        description: "Cachê Festival de Inverno",
        date: new Date("2026-07-13T00:00:00Z"),
        settled: false,
        showId: showRock.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amountCents: 90_000,
        category: "transporte",
        description: "Van + combustível",
        date: new Date("2026-07-12T00:00:00Z"),
        settled: true,
        showId: showRock.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amountCents: 60_000,
        category: "equipe",
        description: "2 técnicos",
        date: new Date("2026-07-12T00:00:00Z"),
        settled: false,
        showId: showRock.id,
      },
      {
        userId: user.id,
        type: "INCOME",
        amountCents: 80_000,
        category: "cachê",
        description: "Cachê Bar do Zé",
        date: new Date("2026-06-28T00:00:00Z"),
        settled: true,
        showId: showBar.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amountCents: 15_000,
        category: "transporte",
        description: "Uber ida e volta",
        date: new Date("2026-06-28T00:00:00Z"),
        settled: true,
        showId: showBar.id,
      },
    ],
  });

  console.log(`Seed concluído: usuário ${user.email} com 2 shows e 5 transações.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
