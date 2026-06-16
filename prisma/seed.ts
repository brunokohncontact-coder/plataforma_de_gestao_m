// Seed de demonstração. Cria um usuário demo com shows, transações e contatos.
// Uso: `npm run db:seed`. Idempotente (recria o usuário demo a cada execução).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@palco.app";

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Artista Demo",
      artistName: "Banda Demonstração",
      passwordHash: await bcrypt.hash("demo1234", 10),
    },
  });

  const now = new Date();
  const daysFrom = (n: number) => new Date(now.getTime() + n * 86400_000);

  const showPassado = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      date: daysFrom(-10),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "PLAYED",
      fee: 150000, // R$ 1.500,00
      notes: "Casa cheia, ótimo retorno de público.",
    },
  });

  const showFuturo = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      date: daysFrom(20),
      venue: "Parque Municipal",
      city: "Belo Horizonte",
      status: "CONFIRMED",
      fee: 350000, // R$ 3.500,00
    },
  });

  await prisma.show.create({
    data: {
      userId: user.id,
      title: "Proposta — Casamento",
      date: daysFrom(45),
      city: "Campinas",
      status: "PROPOSED",
      fee: 280000,
    },
  });

  // Transações vinculadas ao show passado (rentabilidade real)
  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "EXPENSE",
        description: "Transporte (van)",
        category: "Transporte",
        amount: 30000,
        date: daysFrom(-10),
        received: true,
        showId: showPassado.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        description: "Músico de apoio (baterista)",
        category: "Músicos de apoio",
        amount: 40000,
        date: daysFrom(-10),
        received: true,
        showId: showPassado.id,
      },
      {
        userId: user.id,
        type: "INCOME",
        description: "Venda de camisetas",
        category: "Merch",
        amount: 25000,
        date: daysFrom(-10),
        received: true,
        showId: showPassado.id,
      },
      {
        userId: user.id,
        type: "INCOME",
        description: "Cachê Festival (sinal)",
        category: "Cachê",
        amount: 175000,
        date: daysFrom(5),
        received: false, // a receber
        showId: showFuturo.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        description: "Assinatura distribuidora",
        category: "Marketing",
        amount: 5000,
        date: daysFrom(-5),
        received: true,
      },
    ],
  });

  await prisma.contact.createMany({
    data: [
      { userId: user.id, name: "Zé do Bar", role: "VENUE", phone: "(11) 99999-0001", email: "ze@bardoze.com" },
      { userId: user.id, name: "Marina Produções", role: "PROMOTER", email: "marina@prod.com" },
      { userId: user.id, name: "Estúdio Som Bom", role: "PRODUCER", phone: "(31) 98888-1234" },
    ],
  });

  console.log(`Seed concluído. Login: ${DEMO_EMAIL} / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
