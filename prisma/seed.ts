// Seed de desenvolvimento: cria um usuário demo com shows, transações e contatos
// para visualizar a aplicação rapidamente. Rode com `npm run db:seed`.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = "demo@palco.app";
  await db.user.deleteMany({ where: { email } });

  const user = await db.user.create({
    data: {
      email,
      name: "Artista Demo",
      passwordHash: await bcrypt.hash("demodemo", 10),
    },
  });

  const contatos = await Promise.all([
    db.contact.create({ data: { userId: user.id, name: "Bar do Zé", role: "VENUE", email: "contato@bardoze.com" } }),
    db.contact.create({ data: { userId: user.id, name: "Produtora Norte", role: "PROMOTER", phone: "(11) 99999-0000" } }),
  ]);

  const show1 = await db.show.create({
    data: {
      userId: user.id,
      title: "Show no Bar do Zé",
      date: new Date("2026-07-10T22:00:00Z"),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "CONFIRMED",
      feeCents: 150000,
      notes: "Levar próprio cabo de guitarra.",
      contacts: { create: [{ contactId: contatos[0].id }] },
    },
  });

  await db.transaction.createMany({
    data: [
      { userId: user.id, type: "INCOME", amountCents: 150000, category: "Cachê", date: new Date("2026-07-10T00:00:00Z"), status: "PENDING", showId: show1.id },
      { userId: user.id, type: "EXPENSE", amountCents: 20000, category: "Transporte", date: new Date("2026-07-10T00:00:00Z"), status: "SETTLED", showId: show1.id },
      { userId: user.id, type: "EXPENSE", amountCents: 8000, category: "Alimentação", date: new Date("2026-07-10T00:00:00Z"), status: "SETTLED", showId: show1.id },
      { userId: user.id, type: "INCOME", amountCents: 30000, category: "Venda de merch", date: new Date("2026-06-01T00:00:00Z"), status: "SETTLED" },
    ],
  });

  console.log(`Seed concluído. Login: ${email} / senha: demodemo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
