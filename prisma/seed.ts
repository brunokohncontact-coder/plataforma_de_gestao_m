// Seed de demonstração. Cria um usuário demo com shows, transações e contatos.
// Rode com: npm run db:seed  (login: demo@palco.app / senha: demo12345)
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
      passwordHash: await bcrypt.hash("demo12345", 10),
    },
  });

  const venue = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Bar do Zé",
      role: "VENUE",
      email: "contato@bardoze.com",
      phone: "(11) 99999-0000",
    },
  });

  const booker = await prisma.contact.create({
    data: { userId: user.id, name: "Produtora Som&Cia", role: "BOOKER" },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      venue: "Bar do Zé",
      city: "São Paulo",
      date: new Date("2026-05-20T21:00:00Z"),
      status: "COMPLETED",
      fee: 1500,
      feePaid: true,
      contactId: venue.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, type: "EXPENSE", amount: 200, category: "Transporte", date: new Date("2026-05-20"), received: true, showId: show1.id },
      { userId: user.id, type: "EXPENSE", amount: 150, category: "Alimentação", date: new Date("2026-05-20"), received: true, showId: show1.id },
      { userId: user.id, type: "INCOME", amount: 300, category: "Venda de merch", date: new Date("2026-05-20"), received: true, showId: show1.id },
    ],
  });

  await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      venue: "Praça Central",
      city: "Campos do Jordão",
      date: new Date("2026-07-10T20:00:00Z"),
      status: "CONFIRMED",
      fee: 4000,
      feePaid: false,
      contactId: booker.id,
    },
  });

  await prisma.transaction.create({
    data: { userId: user.id, type: "INCOME", amount: 500, category: "Aula", date: new Date("2026-06-01"), received: false },
  });

  console.log(`Seed concluído. Login: ${email} / demo12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
