/**
 * Seed de desenvolvimento — cria um artista de exemplo com shows, transações e contatos.
 * Rode com: npm run db:seed (requer DATABASE_URL e schema aplicado).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@palco.app";
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("demo1234", 10),
      artistName: "Banda Exemplo",
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
    data: { userId: user.id, name: "Produtora Som & Cia", role: "promoter" },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show de lançamento",
      date: new Date(Date.now() + 7 * 86400000),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "confirmed",
      feeCents: 200000,
      contactId: venue.id,
      notes: "Levar dois microfones extras.",
    },
  });

  const show2 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      date: new Date(Date.now() - 20 * 86400000),
      venue: "Praça Central",
      city: "Campos do Jordão",
      status: "done",
      feeCents: 350000,
    },
  });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, type: "expense", amountCents: 40000, category: "Transporte", date: new Date(Date.now() - 19 * 86400000), showId: show2.id, received: true },
      { userId: user.id, type: "expense", amountCents: 25000, category: "Alimentação", date: new Date(Date.now() - 19 * 86400000), showId: show2.id, received: true },
      { userId: user.id, type: "income", amountCents: 60000, category: "Merch", date: new Date(Date.now() - 19 * 86400000), showId: show2.id, received: true },
      { userId: user.id, type: "expense", amountCents: 30000, category: "Equipamento", date: new Date(Date.now() - 5 * 86400000), showId: show1.id, received: true },
      { userId: user.id, type: "income", amountCents: 200000, category: "Cachê", date: new Date(Date.now() + 7 * 86400000), showId: show1.id, received: false },
    ],
  });

  console.log("Seed concluído. Login: demo@palco.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
