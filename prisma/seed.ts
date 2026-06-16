/**
 * Seed de desenvolvimento. Cria um usuário demo com shows, transações e
 * contatos de exemplo para visualizar a aplicação rapidamente.
 *   Login: demo@palco.app  /  senha: demo12345
 * Idempotente: apaga e recria os dados do usuário demo a cada execução.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@palco.app";

  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo Artista",
      artistName: "Banda Demo",
      passwordHash: hashPassword("demo12345"),
    },
  });

  const venue = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Bar do Zé",
      role: "VENUE",
      company: "Bar do Zé Ltda",
      email: "contato@bardoze.com",
      phone: "(11) 99999-0000",
    },
  });

  const promoter = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Carla Produções",
      role: "PROMOTER",
      email: "carla@producoes.com",
    },
  });

  const day = (offset: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  const showPast = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      venue: "Bar do Zé",
      city: "São Paulo",
      date: day(-20),
      status: "DONE",
      fee: 1800,
      contactId: venue.id,
    },
  });

  await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival da Cidade",
      venue: "Praça Central",
      city: "Campinas",
      date: day(15),
      status: "CONFIRMED",
      fee: 3500,
      contactId: promoter.id,
    },
  });

  await prisma.show.create({
    data: {
      userId: user.id,
      title: "Casamento (proposta)",
      city: "Santos",
      date: day(40),
      status: "PROPOSED",
      fee: 2500,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 300,
        category: "Transporte",
        date: day(-20),
        showId: showPast.id,
        settled: true,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 200,
        category: "Alimentação",
        date: day(-20),
        showId: showPast.id,
        settled: true,
      },
      {
        userId: user.id,
        type: "INCOME",
        amount: 400,
        category: "Merch",
        description: "Venda de camisetas",
        date: day(-20),
        showId: showPast.id,
        settled: true,
      },
      {
        userId: user.id,
        type: "INCOME",
        amount: 1800,
        category: "Cachê",
        date: day(-18),
        showId: showPast.id,
        settled: false,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 150,
        category: "Marketing",
        description: "Anúncios redes sociais",
        date: day(-5),
        settled: true,
      },
    ],
  });

  console.log(`Seed concluído. Login: ${email} / demo12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
