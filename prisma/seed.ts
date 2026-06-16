// Seed de desenvolvimento: cria um workspace de exemplo com shows, transações e contatos.
// Uso: `npm run db:seed` (requer `npm run db:push` antes para criar o schema).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.create({
    data: {
      name: "Banda Demo",
      users: {
        create: {
          email: "demo@palco.app",
          name: "Artista Demo",
          // hash placeholder; autenticação real será implementada na F1.
          passwordHash: "seed-placeholder",
          role: "owner",
        },
      },
    },
  });

  const contato = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "Casa de Show Aurora",
      role: "venue",
      email: "contato@aurora.com",
      phone: "(11) 99999-0000",
    },
  });

  const show = await prisma.show.create({
    data: {
      workspaceId: workspace.id,
      title: "Show de lançamento",
      venue: "Casa de Show Aurora",
      city: "São Paulo",
      date: new Date("2026-07-20T22:00:00Z"),
      status: "confirmed",
      feeCents: 3000_00,
      contactId: contato.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        workspaceId: workspace.id,
        showId: show.id,
        type: "expense",
        category: "transporte",
        amountCents: 400_00,
        date: new Date("2026-07-20T00:00:00Z"),
        status: "received",
      },
      {
        workspaceId: workspace.id,
        showId: show.id,
        type: "income",
        category: "cachê",
        amountCents: 3000_00,
        date: new Date("2026-07-25T00:00:00Z"),
        status: "pending",
      },
    ],
  });

  console.log("Seed concluído:", { workspace: workspace.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
