// Seed de demonstração para desenvolvimento. Rode com: npm run db:seed
// Cria um usuário demo com shows, transações e contatos de exemplo.
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  const email = "demo@palco.app";
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Artista Demo",
      artistName: "Banda Exemplo",
      passwordHash: hashPassword("demodemo123"),
    },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      venue: "Praça Central",
      city: "Curitiba",
      date: new Date("2026-07-12T20:00:00Z"),
      status: "confirmado",
      feeAgreed: 4000,
      notes: "Levar backline próprio.",
    },
  });

  const show2 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      venue: "Bar do Zé",
      city: "São Paulo",
      date: new Date("2026-05-03T22:00:00Z"),
      status: "realizado",
      feeAgreed: 1200,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "receita",
        amount: 1200,
        category: "cache",
        description: "Cachê Bar do Zé",
        date: new Date("2026-05-03"),
        received: true,
        showId: show2.id,
      },
      {
        userId: user.id,
        type: "despesa",
        amount: 250,
        category: "transporte",
        description: "Combustível + pedágio",
        date: new Date("2026-05-03"),
        received: true,
        showId: show2.id,
      },
      {
        userId: user.id,
        type: "despesa",
        amount: 600,
        category: "equipamento",
        description: "Aluguel de PA (Festival)",
        date: new Date("2026-07-01"),
        received: false,
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "receita",
        amount: 350,
        category: "outro",
        description: "Venda de merch",
        date: new Date("2026-05-03"),
        received: true,
        showId: show2.id,
      },
    ],
  });

  await prisma.contact.createMany({
    data: [
      {
        userId: user.id,
        name: "Maria Promoter",
        role: "promoter",
        email: "maria@eventos.com",
        phone: "(41) 99999-0000",
      },
      {
        userId: user.id,
        name: "Bar do Zé",
        role: "venue",
        phone: "(11) 98888-1111",
        notes: "Pagam no dia, em dinheiro.",
      },
    ],
  });

  console.log(`Seed concluído. Login: ${email} / senha: demodemo123`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
