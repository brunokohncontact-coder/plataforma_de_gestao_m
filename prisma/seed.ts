// Seed de desenvolvimento: cria um artista demo com shows, transações e contatos.
// Rode com `npm run db:seed`. Idempotente: limpa os dados do usuário demo antes de recriar.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@palco.app";

async function main() {
  const passwordHash = await hashPassword("demo12345");

  // Remove usuário demo anterior (cascade apaga shows/transações/contatos).
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Banda Demo", passwordHash },
  });

  const venue = await prisma.contact.create({
    data: { userId: user.id, name: "Bar do Zé", role: "venue", phone: "(11) 99999-0000" },
  });

  const promoter = await prisma.contact.create({
    data: { userId: user.id, name: "Maria Promoter", role: "promoter", email: "maria@prod.com" },
  });

  const show1 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Show de lançamento",
      venue: "Bar do Zé",
      city: "São Paulo",
      date: new Date("2026-05-10T21:00:00"),
      status: "done",
      fee: 2000,
      contactId: venue.id,
    },
  });

  const show2 = await prisma.show.create({
    data: {
      userId: user.id,
      title: "Festival de Inverno",
      venue: "Praça Central",
      city: "Curitiba",
      date: new Date("2026-07-20T18:00:00"),
      status: "confirmed",
      fee: 5000,
      contactId: promoter.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      // Show 1 (realizado): cachê recebido + despesas vinculadas
      {
        userId: user.id,
        type: "income",
        category: "Cachê",
        amount: 2000,
        date: new Date("2026-05-12T00:00:00"),
        status: "received",
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "Transporte",
        amount: 350,
        date: new Date("2026-05-10T00:00:00"),
        status: "received",
        showId: show1.id,
      },
      {
        userId: user.id,
        type: "expense",
        category: "Equipe / Músicos",
        amount: 600,
        date: new Date("2026-05-10T00:00:00"),
        status: "received",
        showId: show1.id,
      },
      // Show 2 (confirmado): cachê ainda pendente
      {
        userId: user.id,
        type: "income",
        category: "Cachê",
        amount: 5000,
        date: new Date("2026-07-22T00:00:00"),
        status: "pending",
        showId: show2.id,
      },
      // Despesa avulsa (sem show)
      {
        userId: user.id,
        type: "expense",
        category: "Marketing",
        amount: 200,
        date: new Date("2026-06-01T00:00:00"),
        status: "received",
      },
    ],
  });

  console.log(`Seed concluído. Usuário demo: ${DEMO_EMAIL} / senha: demo12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
