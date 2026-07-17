// Testes de integração do apagamento da conta: remove a carteira do usuário
// logado (shows, transações, contatos, metas + junção/eventos dependentes),
// mantém a identidade da conta e NÃO vaza para outros usuários. Guardado pela
// frase de confirmação.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ currentUser: null as { id: string } | null }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireUser: vi.fn(async () => {
    if (!h.currentUser) throw new Error("não autenticado");
    return h.currentUser;
  }),
}));

import { prisma } from "@/lib/prisma";
import {
  createUser,
  createShow,
  createContact,
  createTransaction,
  resetDb,
} from "@/test/db";
import { resetAccountDataAction, type ResetState } from "./actions";
import { RESET_CONFIRMATION_PHRASE } from "@/lib/accountReset";

function form(confirmacao: string): FormData {
  const fd = new FormData();
  fd.set("confirmacao", confirmacao);
  return fd;
}

/** Semeia uma carteira completa (com relações) para o usuário. */
async function seedWallet(userId: string) {
  const contact = await createContact(userId, { name: "Casa X" });
  const show = await createShow(userId, {
    title: "Show semeado",
    status: "CONFIRMED",
    contacts: { create: [{ contactId: contact.id }] },
    statusEvents: { create: [{ userId, fromStatus: null, toStatus: "CONFIRMED" }] },
  });
  await createTransaction(userId, { showId: show.id });
  await prisma.revenueGoal.create({
    data: { userId, year: 2026, amount: 5_000_000 },
  });
  return { contact, show };
}

const state: ResetState = {};

describe("resetAccountDataAction", () => {
  beforeEach(async () => {
    await resetDb();
    const u = await createUser("dono@example.com");
    h.currentUser = { id: u.id };
  });

  it("recusa apagar sem a frase de confirmação correta (nada é removido)", async () => {
    const user = h.currentUser!;
    await seedWallet(user.id);

    const result = await resetAccountDataAction(state, form("apagar"));
    expect(result.deleted).toBeUndefined();
    expect(result.errors?.length).toBeGreaterThan(0);

    // A carteira segue intacta.
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.contact.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.revenueGoal.count({ where: { userId: user.id } })).toBe(1);
  });

  it("apaga toda a carteira com a frase correta, preservando a identidade", async () => {
    const user = h.currentUser!;
    await seedWallet(user.id);

    const result = await resetAccountDataAction(state, form(RESET_CONFIRMATION_PHRASE));
    expect(result.errors).toBeUndefined();
    expect(result.deleted).toEqual({
      shows: 1,
      transactions: 1,
      contacts: 1,
      revenueGoals: 1,
    });

    // Carteira zerada — incluindo a junção N:N e os eventos do funil.
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.contact.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.revenueGoal.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.contactsOnShows.count()).toBe(0);
    expect(await prisma.showStatusEvent.count()).toBe(0);

    // A conta em si continua existindo (identidade preservada).
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.email).toBe("dono@example.com");
  });

  it("é tolerante a caixa/espaços na frase de confirmação", async () => {
    const user = h.currentUser!;
    await seedWallet(user.id);

    const result = await resetAccountDataAction(state, form("  apagar meus dados "));
    expect(result.deleted?.shows).toBe(1);
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(0);
  });

  it("não vaza entre usuários: só apaga a carteira do dono logado", async () => {
    const user = h.currentUser!;
    await seedWallet(user.id);

    const other = await createUser("outro@example.com");
    await seedWallet(other.id);

    const result = await resetAccountDataAction(state, form(RESET_CONFIRMATION_PHRASE));
    expect(result.deleted?.shows).toBe(1);

    // A carteira do outro usuário fica intacta.
    expect(await prisma.show.count({ where: { userId: other.id } })).toBe(1);
    expect(await prisma.contact.count({ where: { userId: other.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: other.id } })).toBe(1);
    expect(await prisma.revenueGoal.count({ where: { userId: other.id } })).toBe(1);
    expect(await prisma.contactsOnShows.count()).toBe(1);
    expect(await prisma.showStatusEvent.count()).toBe(1);
  });

  it("numa conta já vazia, apaga zero e não falha", async () => {
    const user = h.currentUser!;
    const result = await resetAccountDataAction(state, form(RESET_CONFIRMATION_PHRASE));
    expect(result.deleted).toEqual({
      shows: 0,
      transactions: 0,
      contacts: 0,
      revenueGoals: 0,
    });
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(0);
  });
});
