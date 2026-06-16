// Testes de integração das server actions de Finanças, com foco em ISOLAMENTO
// POR USUÁRIO e na regra de que uma transação só pode vincular shows do dono.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ currentUser: null as { id: string } | null }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { redirectUrl: url });
  }),
}));
vi.mock("@/lib/session", () => ({
  requireUser: vi.fn(async () => {
    if (!h.currentUser) throw new Error("não autenticado");
    return h.currentUser;
  }),
}));

import { prisma } from "@/lib/prisma";
import { createShow, createTransaction, createUser, resetDb } from "@/test/db";
import {
  createTransactionAction,
  deleteTransactionAction,
  toggleReceivedAction,
  updateTransactionAction,
} from "./actions";

async function catchRedirect(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") {
      return (e as { redirectUrl?: string }).redirectUrl ?? "";
    }
    throw e;
  }
}

function txForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("type", "INCOME");
  fd.set("description", "Cachê do show");
  fd.set("category", "cachê");
  fd.set("amount", "1.500,00");
  fd.set("date", "2026-08-10T21:00");
  fd.set("received", "on");
  fd.set("showId", "");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetDb();
  h.currentUser = null;
});
afterEach(() => vi.clearAllMocks());

describe("createTransactionAction", () => {
  it("cria a transação para o usuário logado", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const url = await catchRedirect(createTransactionAction({}, txForm()));

    expect(url).toBe("/financas");
    const txs = await prisma.transaction.findMany();
    expect(txs).toHaveLength(1);
    expect(txs[0].userId).toBe(user.id);
    expect(txs[0].amount).toBe(150000);
  });

  it("REJEITA vincular a um show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const foreignShow = await createShow(owner.id);

    h.currentUser = attacker;
    const result = await createTransactionAction({}, txForm({ showId: foreignShow.id }));

    expect(result.error).toBe("Show inválido.");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("vincula a um show do próprio usuário e redireciona ao show", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id);

    h.currentUser = owner;
    const url = await catchRedirect(createTransactionAction({}, txForm({ showId: show.id })));

    expect(url).toBe(`/shows/${show.id}`);
    const tx = await prisma.transaction.findFirst();
    expect(tx?.showId).toBe(show.id);
  });
});

describe("updateTransactionAction — posse", () => {
  it("NÃO altera a transação de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const tx = await createTransaction(owner.id, { description: "Original" });

    h.currentUser = attacker;
    const result = await updateTransactionAction(tx.id, {}, txForm({ description: "Invadido" }));

    expect(result.error).toBe("Transação não encontrada.");
    const fresh = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(fresh?.description).toBe("Original");
  });

  it("NÃO permite ao dono mover a transação para um show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const other = await createUser("other@example.com");
    const tx = await createTransaction(owner.id);
    const foreignShow = await createShow(other.id);

    h.currentUser = owner;
    const result = await updateTransactionAction(tx.id, {}, txForm({ showId: foreignShow.id }));

    expect(result.error).toBe("Show inválido.");
    const fresh = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(fresh?.showId).toBeNull();
  });
});

describe("toggleReceivedAction — posse", () => {
  it("NÃO alterna o status de uma transação de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const tx = await createTransaction(owner.id, { received: true });

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", tx.id);
    await toggleReceivedAction(fd);

    const fresh = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(fresh?.received).toBe(true); // inalterado
  });

  it("alterna o status da própria transação", async () => {
    const owner = await createUser("owner@example.com");
    const tx = await createTransaction(owner.id, { received: true });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", tx.id);
    await toggleReceivedAction(fd);

    const fresh = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(fresh?.received).toBe(false);
  });
});

describe("deleteTransactionAction — posse", () => {
  it("NÃO exclui a transação de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const tx = await createTransaction(owner.id);

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", tx.id);
    await deleteTransactionAction(fd);

    expect(await prisma.transaction.findUnique({ where: { id: tx.id } })).not.toBeNull();
  });
});
