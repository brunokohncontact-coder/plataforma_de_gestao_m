// Seed de desenvolvimento — popula dados de exemplo para testar a UI localmente.
// Rode com: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("senha123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@palco.app" },
    update: {},
    create: {
      email: "demo@palco.app",
      passwordHash,
      name: "Artista Demo",
      artistName: "Banda Demo",
    },
  });

  // Limpa dados anteriores do usuário demo para um seed idempotente.
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.show.deleteMany({ where: { userId: user.id } });
  await prisma.contact.deleteMany({ where: { userId: user.id } });

  const venue = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Bar do Rock",
      role: "VENUE",
      company: "Bar do Rock Ltda",
      email: "contato@bardorock.com",
    },
  });

  const show = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show de lançamento",
      date: new Date("2026-07-12T21:00:00Z"),
      venue: "Bar do Rock",
      city: "São Paulo",
      status: "CONFIRMED",
      fee: 2500,
      feeStatus: "PENDING",
      contactId: venue.id,
      notes: "Soundcheck às 18h.",
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 400,
        category: "Transporte",
        description: "Van ida e volta",
        date: new Date("2026-07-12T00:00:00Z"),
        status: "PENDING",
        showId: show.id,
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 300,
        category: "Equipe",
        description: "Técnico de som",
        date: new Date("2026-07-12T00:00:00Z"),
        status: "PENDING",
        showId: show.id,
      },
      {
        userId: user.id,
        type: "INCOME",
        amount: 600,
        category: "Merch",
        description: "Venda de camisetas",
        date: new Date("2026-07-12T00:00:00Z"),
        status: "SETTLED",
        showId: show.id,
      },
    ],
  });

  console.log("Seed concluído. Login: demo@palco.app / senha123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
