// Seed de desenvolvimento: cria um workspace demo com usuário, shows, transações e
// contatos de exemplo para visualizar a rentabilidade por show e o dashboard.
// Rode com: `npm run db:seed`. Idempotente: limpa e recria o workspace demo.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@palco.app";

async function main() {
  // Limpa workspace demo anterior (cascata remove shows/tx/contatos).
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.workspace.delete({ where: { id: existing.workspaceId } });
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const workspace = await prisma.workspace.create({
    data: {
      name: "Banda Demo",
      users: {
        create: {
          email: DEMO_EMAIL,
          name: "Artista Demo",
          passwordHash,
        },
      },
    },
  });

  const venue = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "Casa Rock SP",
      role: "venue",
      email: "contato@casarock.com",
      phone: "+55 11 99999-0000",
    },
  });

  const promoter = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "Festival Verão",
      role: "promoter",
      email: "booking@festivalverao.com",
    },
  });

  // Show 1 — realizado, lucrativo
  const show1 = await prisma.show.create({
    data: {
      workspaceId: workspace.id,
      title: "Show no Casa Rock",
      date: new Date("2026-05-10T21:00:00"),
      venue: "Casa Rock SP",
      city: "São Paulo",
      status: "done",
      feeAgreed: 2500,
      contactId: venue.id,
      notes: "Casa cheia, ótima recepção.",
    },
  });

  // Show 2 — confirmado, futuro
  const show2 = await prisma.show.create({
    data: {
      workspaceId: workspace.id,
      title: "Festival Verão — palco principal",
      date: new Date("2026-07-20T18:00:00"),
      venue: "Parque Central",
      city: "Rio de Janeiro",
      status: "confirmed",
      feeAgreed: 6000,
      contactId: promoter.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      // Vinculadas ao show 1
      { workspaceId: workspace.id, showId: show1.id, type: "expense", category: "transporte", description: "Van + combustível", amount: 600, date: new Date("2026-05-10"), status: "received" },
      { workspaceId: workspace.id, showId: show1.id, type: "expense", category: "alimentação", description: "Equipe", amount: 250, date: new Date("2026-05-10"), status: "received" },
      { workspaceId: workspace.id, showId: show1.id, type: "income", category: "merch", description: "Venda de camisetas", amount: 480, date: new Date("2026-05-10"), status: "received" },
      // Cachê do show 1 como receita recebida (não vinculada para não duplicar no P&L)
      { workspaceId: workspace.id, type: "income", category: "cachê", description: "Cachê Casa Rock", amount: 2500, date: new Date("2026-05-12"), status: "received" },
      // Receita pendente (conta a receber) do show 2
      { workspaceId: workspace.id, type: "income", category: "cachê", description: "Sinal Festival Verão", amount: 3000, date: new Date("2026-06-01"), status: "pending" },
      // Despesas gerais
      { workspaceId: workspace.id, type: "expense", category: "marketing", description: "Anúncios redes sociais", amount: 300, date: new Date("2026-05-05"), status: "received" },
      { workspaceId: workspace.id, type: "expense", category: "equipamento", description: "Cordas e baquetas", amount: 180, date: new Date("2026-06-02"), status: "pending" },
    ],
  });

  console.log("Seed concluído. Login demo:", DEMO_EMAIL, "/ senha: demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
