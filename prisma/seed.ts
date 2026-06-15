// Seed de demonstração. Rode com: npm run db:seed
// Cria um usuário demo (demo@palco.app / senha "senha1234") com dados de exemplo.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@palco.app";
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Artista Demo",
      artistName: "Banda Demonstração",
      passwordHash: await bcrypt.hash("senha1234", 10),
    },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      date: new Date("2026-07-12T21:00:00"),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "CONFIRMED",
      feeCents: 150000,
      notes: "Leve 2 pedais reserva.",
    },
  });

  const show2 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      date: new Date("2026-08-03T18:00:00"),
      venue: "Praça Central",
      city: "Campos do Jordão",
      status: "PROPOSED",
      feeCents: 400000,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "INCOME",
        amountCents: 150000,
        category: "Cachê",
        date: new Date("2026-07-12T21:00:00"),
        settled: false,
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amountCents: 30000,
        category: "Transporte",
        description: "Van ida e volta",
        date: new Date("2026-07-12T18:00:00"),
        settled: true,
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amountCents: 20000,
        category: "Alimentação",
        date: new Date("2026-07-12T20:00:00"),
        settled: true,
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "INCOME",
        amountCents: 8000,
        category: "Venda de merch",
        date: new Date("2026-07-12T23:00:00"),
        settled: true,
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amountCents: 12000,
        category: "Marketing",
        description: "Impulsionamento Instagram",
        date: new Date("2026-06-01T10:00:00"),
        settled: true,
      },
    ],
  });

  const contact = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Zé Silva",
      role: "VENUE",
      email: "ze@bardoze.com",
      phone: "(11) 99999-0000",
      notes: "Dono do bar, paga no dia.",
    },
  });

  await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Produtora Norte",
      role: "PROMOTER",
      email: "contato@produtoranorte.com",
    },
  });

  await prisma.showContact.create({
    data: { showId: show1.id, contactId: contact.id },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed concluído. Login: ${email} / senha1234`);
  void show2;
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
