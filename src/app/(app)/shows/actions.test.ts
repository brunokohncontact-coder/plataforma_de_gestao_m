// Testes de integração das server actions de Shows, com foco em ISOLAMENTO POR
// USUÁRIO (segurança): um usuário não pode ler/alterar/excluir dados de outro.
// Usa o banco SQLite de teste (ver src/test/global-setup.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Controla o "usuário logado" sem passar por cookies/JWT.
const h = vi.hoisted(() => ({ currentUser: null as { id: string } | null }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    // Em produção o Next lança internamente; aqui sinalizamos com um erro
    // identificável para distinguir "sucesso + redirect" de retorno de erro.
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
import {
  createShow,
  createContact,
  createUser,
  resetDb,
} from "@/test/db";
import {
  createShowAction,
  deleteShowAction,
  linkContactToShowAction,
  unlinkContactFromShowAction,
  updateShowAction,
} from "./actions";

/** Captura o redirect lançado por uma action de sucesso. Retorna a URL ou null. */
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

function showForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("title", "Novo show");
  fd.set("date", "2026-08-10T21:00");
  fd.set("venue", "");
  fd.set("city", "");
  fd.set("status", "CONFIRMED");
  fd.set("fee", "1.000,00");
  fd.set("notes", "");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetDb();
  h.currentUser = null;
});
afterEach(() => vi.clearAllMocks());

describe("createShowAction", () => {
  it("cria o show para o usuário logado e redireciona", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const url = await catchRedirect(createShowAction({}, showForm()));

    expect(url).toBe("/shows");
    const shows = await prisma.show.findMany();
    expect(shows).toHaveLength(1);
    expect(shows[0].userId).toBe(user.id);
    expect(shows[0].fee).toBe(100000); // R$ 1.000,00 → centavos
  });

  it("retorna erro de validação sem gravar quando os dados são inválidos", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const result = await createShowAction({}, showForm({ title: "" }));

    expect(result.error).toBeTruthy();
    expect(await prisma.show.count()).toBe(0);
  });
});

describe("updateShowAction — posse", () => {
  it("NÃO altera o show de outro usuário e retorna erro", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const show = await createShow(owner.id, { title: "Original" });

    h.currentUser = attacker;
    const result = await updateShowAction(show.id, {}, showForm({ title: "Invadido" }));

    expect(result.error).toBe("Show não encontrado.");
    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.title).toBe("Original"); // inalterado
  });

  it("permite ao dono atualizar o próprio show", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { title: "Original" });

    h.currentUser = owner;
    const url = await catchRedirect(updateShowAction(show.id, {}, showForm({ title: "Atualizado" })));

    expect(url).toBe(`/shows/${show.id}`);
    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.title).toBe("Atualizado");
  });
});

describe("deleteShowAction — posse", () => {
  it("NÃO exclui o show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const show = await createShow(owner.id);

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", show.id);
    await catchRedirect(deleteShowAction(fd));

    expect(await prisma.show.findUnique({ where: { id: show.id } })).not.toBeNull();
  });

  it("exclui o próprio show", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id);

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    await catchRedirect(deleteShowAction(fd));

    expect(await prisma.show.findUnique({ where: { id: show.id } })).toBeNull();
  });
});

describe("linkContactToShowAction — posse cruzada", () => {
  it("NÃO vincula contato a um show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const show = await createShow(owner.id);
    const attackerContact = await createContact(attacker.id);

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("showId", show.id);
    fd.set("contactId", attackerContact.id);
    await linkContactToShowAction(fd);

    expect(await prisma.contactsOnShows.count()).toBe(0);
  });

  it("NÃO vincula contato de outro usuário a um show próprio", async () => {
    const owner = await createUser("owner@example.com");
    const other = await createUser("other@example.com");
    const show = await createShow(owner.id);
    const foreignContact = await createContact(other.id);

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("showId", show.id);
    fd.set("contactId", foreignContact.id);
    await linkContactToShowAction(fd);

    expect(await prisma.contactsOnShows.count()).toBe(0);
  });

  it("vincula contato e show do próprio usuário (idempotente)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id);
    const contact = await createContact(owner.id);

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("showId", show.id);
    fd.set("contactId", contact.id);
    await linkContactToShowAction(fd);
    await linkContactToShowAction(fd); // repetição não duplica

    expect(await prisma.contactsOnShows.count()).toBe(1);
  });
});

describe("unlinkContactFromShowAction — posse", () => {
  it("NÃO remove vínculo de um show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const show = await createShow(owner.id);
    const contact = await createContact(owner.id);
    await prisma.contactsOnShows.create({ data: { showId: show.id, contactId: contact.id } });

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("showId", show.id);
    fd.set("contactId", contact.id);
    await unlinkContactFromShowAction(fd);

    expect(await prisma.contactsOnShows.count()).toBe(1); // intacto
  });
});
