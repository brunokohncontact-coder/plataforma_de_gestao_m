// Utilitários para os testes de integração que tocam o banco de teste.
// `resetDb` limpa todas as tabelas entre testes; os helpers criam registros
// mínimos válidos para montar cenários de posse (isolamento por usuário).
import { prisma } from "@/lib/prisma";

/** Apaga todos os registros, respeitando a ordem das chaves estrangeiras. */
export async function resetDb(): Promise<void> {
  await prisma.contactsOnShows.deleteMany();
  await prisma.showStatusEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.show.deleteMany();
  await prisma.revenueGoal.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(email: string) {
  return prisma.user.create({
    data: { email, name: email.split("@")[0], passwordHash: "x" },
  });
}

export async function createShow(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.show.create({
    data: {
      userId,
      title: "Show de teste",
      date: new Date("2026-07-01T20:00:00"),
      status: "CONFIRMED",
      fee: 50000,
      ...overrides,
    },
  });
}

export async function createContact(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.contact.create({
    data: { userId, name: "Contato de teste", role: "VENUE", ...overrides },
  });
}

export async function createTransaction(
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.transaction.create({
    data: {
      userId,
      type: "INCOME",
      description: "Cachê",
      category: "cachê",
      amount: 50000,
      date: new Date("2026-07-01T20:00:00"),
      received: true,
      ...overrides,
    },
  });
}
