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
  createTransaction,
  createUser,
  resetDb,
} from "@/test/db";
import {
  createShowAction,
  deleteShowAction,
  linkContactToShowAction,
  settleShowFeeAction,
  setPaymentPromiseAction,
  setBillingContactAction,
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

describe("settleShowFeeAction — quita o cachê em aberto", () => {
  it("cria UMA receita recebida com o saldo total quando nada foi recebido", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    await settleShowFeeAction(fd);

    const txs = await prisma.transaction.findMany({ where: { showId: show.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("INCOME");
    expect(txs[0].received).toBe(true);
    expect(txs[0].amount).toBe(50000);
    expect(txs[0].userId).toBe(owner.id);
  });

  it("quita apenas o saldo restante quando já houve recebimento parcial", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });
    await createTransaction(owner.id, { showId: show.id, amount: 20000, received: true });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    await settleShowFeeAction(fd);

    const created = await prisma.transaction.findMany({
      where: { showId: show.id },
      orderBy: { amount: "asc" },
    });
    // a parcial (20000) + a quitação do restante (30000)
    expect(created.map((t) => t.amount)).toEqual([20000, 30000]);
  });

  it("NÃO cria nada quando o cachê já está quitado (idempotente)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });
    await createTransaction(owner.id, { showId: show.id, amount: 50000, received: true });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    await settleShowFeeAction(fd);

    expect(await prisma.transaction.count({ where: { showId: show.id } })).toBe(1);
  });

  it("ignora receita PENDENTE ao calcular o saldo (só recebida abate)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });
    await createTransaction(owner.id, { showId: show.id, amount: 50000, received: false });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    await settleShowFeeAction(fd);

    const received = await prisma.transaction.findMany({
      where: { showId: show.id, received: true },
    });
    expect(received).toHaveLength(1);
    expect(received[0].amount).toBe(50000);
  });

  it("NÃO quita o show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", show.id);
    await settleShowFeeAction(fd);

    expect(await prisma.transaction.count({ where: { showId: show.id } })).toBe(0);
  });

  it("NÃO faz nada para um show sem cachê (fee <= 0)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 0, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    await settleShowFeeAction(fd);

    expect(await prisma.transaction.count({ where: { showId: show.id } })).toBe(0);
  });

  it("lança um valor PARCIAL quando o campo amount é informado", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("amount", "200,00"); // R$ 200,00 dos R$ 500,00 em aberto
    await settleShowFeeAction(fd);

    const txs = await prisma.transaction.findMany({ where: { showId: show.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(20000);
    expect(txs[0].received).toBe(true);
  });

  it("limita o valor parcial ao saldo em aberto (não sobre-lança)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("amount", "999,00"); // mais que o saldo → clamp para 500,00
    await settleShowFeeAction(fd);

    const txs = await prisma.transaction.findMany({ where: { showId: show.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(50000);
  });

  it("amount vazio quita o saldo inteiro (compatível com o botão Quitar)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("amount", "");
    await settleShowFeeAction(fd);

    const txs = await prisma.transaction.findMany({ where: { showId: show.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(50000);
  });

  it("registra a data REAL do recebimento quando `receivedAt` é informada", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("receivedAt", "2026-05-10"); // recebido num mês anterior

    await settleShowFeeAction(fd);

    const txs = await prisma.transaction.findMany({ where: { showId: show.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].date.toISOString()).toBe("2026-05-10T00:00:00.000Z");
  });

  it("ignora `receivedAt` no futuro/ inválida e cai para o momento atual", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const before = Date.now();
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("receivedAt", "2999-01-01"); // futuro → agora
    await settleShowFeeAction(fd);
    const after = Date.now();

    const txs = await prisma.transaction.findMany({ where: { showId: show.id } });
    expect(txs).toHaveLength(1);
    const t = txs[0].date.getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });
});

describe("setPaymentPromiseAction — data prometida de pagamento", () => {
  it("registra a data prometida (meia-noite UTC) num show do usuário", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("promisedAt", "2026-09-15");
    await setPaymentPromiseAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.paymentPromisedAt?.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("limpa a promessa quando a data vem vazia", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, {
      fee: 50000,
      status: "PLAYED",
      paymentPromisedAt: new Date("2026-09-15T00:00:00.000Z"),
    });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("promisedAt", "");
    await setPaymentPromiseAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.paymentPromisedAt).toBeNull();
  });

  it("ignora data inválida (limpa em vez de gravar lixo)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("promisedAt", "15/09/2026");
    await setPaymentPromiseAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.paymentPromisedAt).toBeNull();
  });

  it("NÃO altera a promessa de um show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("promisedAt", "2026-09-15");
    await setPaymentPromiseAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.paymentPromisedAt).toBeNull();
  });
});

describe("setBillingContactAction — lembra quem cobrar", () => {
  it("grava o contato preferido quando ele está vinculado ao show do usuário", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });
    const contact = await createContact(owner.id, { email: "c@x.com" });
    await prisma.contactsOnShows.create({ data: { showId: show.id, contactId: contact.id } });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("contactId", contact.id);
    await setBillingContactAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.billingContactId).toBe(contact.id);
  });

  it("limpa a preferência (null) quando o contactId vem vazio", async () => {
    const owner = await createUser("owner@example.com");
    const contact = await createContact(owner.id, { email: "c@x.com" });
    const show = await createShow(owner.id, {
      fee: 50000,
      status: "PLAYED",
      billingContactId: contact.id,
    });
    await prisma.contactsOnShows.create({ data: { showId: show.id, contactId: contact.id } });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("contactId", "");
    await setBillingContactAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.billingContactId).toBeNull();
  });

  it("NÃO grava um contato que não está vinculado ao show (limpa)", async () => {
    const owner = await createUser("owner@example.com");
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });
    const unlinked = await createContact(owner.id, { email: "c@x.com" });

    h.currentUser = owner;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("contactId", unlinked.id); // do usuário, mas NÃO vinculado ao show
    await setBillingContactAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.billingContactId).toBeNull();
  });

  it("NÃO altera a preferência de um show de outro usuário", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    const contact = await createContact(owner.id, { email: "c@x.com" });
    const show = await createShow(owner.id, { fee: 50000, status: "PLAYED" });
    await prisma.contactsOnShows.create({ data: { showId: show.id, contactId: contact.id } });

    h.currentUser = attacker;
    const fd = new FormData();
    fd.set("id", show.id);
    fd.set("contactId", contact.id);
    await setBillingContactAction(fd);

    const fresh = await prisma.show.findUnique({ where: { id: show.id } });
    expect(fresh?.billingContactId).toBeNull(); // inalterado
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
