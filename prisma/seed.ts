// Seed de demonstração — cria um usuário demo com shows, transações e contatos
// para facilitar o desenvolvimento e testes manuais.
//   Login: demo@palco.app  /  Senha: demo1234
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@palco.app";
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Banda Demo",
      passwordHash: await bcrypt.hash("demo1234", 10),
    },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show de lançamento",
      date: new Date("2026-07-12T21:00:00"),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "confirmado",
      fee: 2500,
      notes: "Levar backline próprio.",
    },
  });

  const show2 = await prisma.show.create({
    data: {
      userId: user.id,
      date: new Date("2026-05-20T20:00:00"),
      venue: "Casa da Música",
      city: "Campinas",
      status: "realizado",
      fee: 1800,
    },
  });

  const venue = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Bar do Zé",
      role: "venue",
      email: "contato@bardoze.com",
      phone: "(11) 99999-0000",
    },
  });

  await prisma.contact.create({
    data: { userId: user.id, name: "Produtora Som&Cia", role: "promoter" },
  });

  await prisma.showContact.create({
    data: { showId: show1.id, contactId: venue.id },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "income",
        category: "Cachê",
        amount: 1800,
        date: new Date("2026-05-20"),
        status: "received",
        showId: show2.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "Transporte",
        amount: 300,
        date: new Date("2026-05-20"),
        status: "paid",
        showId: show2.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "Alimentação",
        amount: 150,
        date: new Date("2026-05-20"),
        status: "paid",
        showId: show2.id,
      },
      {
        userId: user.id,
        type: "income",
        category: "Venda de merch",
        amount: 220,
        date: new Date("2026-05-20"),
        status: "received",
        showId: show2.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "Equipamento",
        amount: 500,
        date: new Date("2026-06-01"),
        status: "pending",
        showId: show1.id,
      },
    ],
  });

  console.log(`Seed concluído. Login: ${email} / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
