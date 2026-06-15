import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@palco.app";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  // Idempotente: limpa e recria o usuário demo.
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: { email, passwordHash, artistName: "Banda Exemplo" },
  });

  const contatoVenue = await prisma.contact.create({
    data: {
      userId: user.id,
      name: "Bar do Zé",
      role: "VENUE",
      email: "contato@bardoze.com",
      phone: "+55 11 99999-0001",
    },
  });

  const contatoProdutor = await prisma.contact.create({
    data: { userId: user.id, name: "Produtora Norte", role: "PROMOTER", email: "shows@norte.com" },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      venue: "Bar do Zé",
      city: "São Paulo",
      date: new Date("2026-03-10T22:00:00Z"),
      status: "DONE",
      feeCents: 200_00,
      contactId: contatoVenue.id,
      notes: "Casa cheia, bom retorno.",
    },
  });

  const show2 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      venue: "Praça Central",
      city: "Curitiba",
      date: new Date("2026-07-20T20:00:00Z"),
      status: "CONFIRMED",
      feeCents: 500_00,
      contactId: contatoProdutor.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      // Show 1 (realizado)
      { userId: user.id, type: "INCOME", amountCents: 200_00, category: "Cachê", date: new Date("2026-03-11"), paid: true, showId: show1.id },
      { userId: user.id, type: "EXPENSE", amountCents: 50_00, category: "Transporte", date: new Date("2026-03-10"), paid: true, showId: show1.id },
      { userId: user.id, type: "EXPENSE", amountCents: 30_00, category: "Alimentação", date: new Date("2026-03-10"), paid: true, showId: show1.id },
      // Show 2 (confirmado, futuro)
      { userId: user.id, type: "INCOME", amountCents: 500_00, category: "Cachê", date: new Date("2026-07-20"), paid: false, showId: show2.id },
      { userId: user.id, type: "EXPENSE", amountCents: 120_00, category: "Hospedagem", date: new Date("2026-07-19"), paid: false, showId: show2.id },
      // Avulsas
      { userId: user.id, type: "INCOME", amountCents: 300_00, category: "Aulas", date: new Date("2026-02-15"), paid: true },
      { userId: user.id, type: "EXPENSE", amountCents: 49_90, category: "Software", date: new Date("2026-02-01"), paid: true },
    ],
  });

  console.log(`Seed concluído. Usuário demo: ${email} / senha: demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
