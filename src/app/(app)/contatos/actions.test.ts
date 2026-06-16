// Testes de integração das server actions de Contatos, com foco em ISOLAMENTO
// POR USUÁRIO (CRM de cada artista é privado).
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
import { createContact, createUser, resetDb } from "@/test/db";
import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
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

function contactForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("name", "Casa de Shows X");
  fd.set("role", "VENUE");
  fd.set("email", "contato@casax.com");
  fd.set("phone", "");
  fd.set("notes", "");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetDb();
  h.currentUser = null;
});
afterEach(() => vi.clearAllMocks());

describe("createContactAction", () => {
  it("cria o contato para o usuário logado", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const url = await catchRedirect(createContactAction({}, contactForm()));

    expect(url).toBe("/contatos");
    const contacts = await prisma.contact.findMany();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].userId).toBe(user.id);
  });

  it("rejeita e-mail inválido sem gravar", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const result = await createContactAction({}, contactForm({ email: "não-é-email" }));

    expect(result.error).toBeTruthy();
    expect(await prisma.contact.count()).toBe(0);
  });
});

describe("updateContactAction — posse", () => {
  it("NÃO altera o contato de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const contact = await createContact(owner.id, { name: "Original" });

    h.currentUser = attacker;
    const result = await updateContactAction(contact.id, {}, contactForm({ name: "Invadido" }));

    expect(result.error).toBe("Contato não encontrado.");
    const fresh = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(fresh?.name).toBe("Original");
  });
});

describe("deleteContactAction — posse", () => {
  it("NÃO exclui o contato de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const contact = await createContact(owner.id);

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", contact.id);
    await deleteContactAction(fd);

    expect(await prisma.contact.findUnique({ where: { id: contact.id } })).not.toBeNull();
  });
});
