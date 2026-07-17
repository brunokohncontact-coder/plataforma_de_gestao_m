// Testes de integração da importação de backup: conferência (dry-run) e
// restauração numa conta VAZIA (grava no banco de teste). Foco no contrato de
// segurança — restaurar recusa conta não-vazia — e na fidelidade dos vínculos.
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
import { importAccountAction, type ImportState } from "./actions";
import {
  buildAccountDataExport,
  accountDataExportToJson,
  type AccountDataExportInput,
} from "@/lib/accountExport";
import { RESET_CONFIRMATION_PHRASE } from "@/lib/accountReset";

/**
 * Monta um FormData com um backup JSON como arquivo + o intent. Para a
 * substituição, aceita a frase de confirmação (omissa/errada = não autoriza).
 */
function backupForm(
  json: string,
  intent: "conferir" | "restaurar" | "substituir",
  confirmacao?: string,
): FormData {
  const fd = new FormData();
  fd.set("arquivo", new File([json], "backup.json", { type: "application/json" }));
  fd.set("intent", intent);
  if (confirmacao !== undefined) fd.set("confirmacao", confirmacao);
  return fd;
}

/** Um snapshot de export com relações show↔contato↔transação para o round-trip. */
function sampleExportJson(): string {
  const input: AccountDataExportInput = {
    profile: {
      name: "Antigo",
      email: "antigo@example.com",
      artistName: "Banda Restaurada",
      taxRatePercent: 9,
    },
    shows: [
      {
        id: "old-show-1",
        title: "Show no Bar",
        date: new Date("2026-09-10T22:00:00.000Z"),
        venue: "Bar X",
        city: "São Paulo",
        status: "CONFIRMED",
        fee: 120000,
        notes: "levar cabos",
        paymentPromisedAt: new Date("2026-09-20T00:00:00.000Z"),
        contactIds: ["old-contact-1"],
      },
    ],
    transactions: [
      {
        id: "old-tx-1",
        type: "INCOME",
        description: "Cachê do show",
        category: "Cachê",
        amount: 120000,
        date: new Date("2026-09-10T22:00:00.000Z"),
        received: false,
        showId: "old-show-1",
      },
    ],
    contacts: [
      {
        id: "old-contact-1",
        name: "Casa X",
        role: "VENUE",
        email: "casa@example.com",
        phone: null,
        notes: null,
      },
    ],
    revenueGoals: [{ year: 2026, amount: 5000000 }],
    exportedAt: new Date("2026-07-17T12:00:00.000Z"),
  };
  return accountDataExportToJson(buildAccountDataExport(input));
}

const state: ImportState = {};

describe("importAccountAction — conferência (dry-run)", () => {
  beforeEach(async () => {
    await resetDb();
    const u = await createUser("dono@example.com");
    h.currentUser = { id: u.id };
  });

  it("valida o arquivo e NÃO grava nada", async () => {
    const result = await importAccountAction(state, backupForm(sampleExportJson(), "conferir"));
    expect(result.summary?.counts).toEqual({
      shows: 1,
      transactions: 1,
      contacts: 1,
      revenueGoals: 1,
    });
    // Nada gravado:
    expect(await prisma.show.count()).toBe(0);
    expect(await prisma.contact.count()).toBe(0);
  });

  it("rejeita um arquivo que não é backup do Palco", async () => {
    const result = await importAccountAction(state, backupForm("{}", "conferir"));
    expect(result.errors && result.errors.length).toBeGreaterThan(0);
  });
});

describe("importAccountAction — restauração", () => {
  beforeEach(async () => {
    await resetDb();
    const u = await createUser("dono@example.com");
    h.currentUser = { id: u.id };
  });

  it("restaura numa conta vazia preservando os vínculos e o perfil", async () => {
    const user = h.currentUser!;
    const result = await importAccountAction(state, backupForm(sampleExportJson(), "restaurar"));

    expect(result.errors).toBeUndefined();
    expect(result.restored).toEqual({
      shows: 1,
      transactions: 1,
      contacts: 1,
      revenueGoals: 1,
    });

    // Perfil de dados restaurado (nome/e-mail intocados).
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.artistName).toBe("Banda Restaurada");
    expect(dbUser?.taxRatePercent).toBe(9);
    expect(dbUser?.email).toBe("dono@example.com");

    // Show com ids NOVOS, mas com o vínculo N:N preservado ao contato certo.
    const show = await prisma.show.findFirst({
      where: { userId: user.id },
      include: { contacts: true, statusEvents: true },
    });
    expect(show).toBeTruthy();
    expect(show!.id).not.toBe("old-show-1");
    expect(show!.title).toBe("Show no Bar");
    expect(show!.fee).toBe(120000);
    expect(show!.paymentPromisedAt?.toISOString()).toBe("2026-09-20T00:00:00.000Z");

    const contact = await prisma.contact.findFirst({ where: { userId: user.id } });
    expect(contact!.id).not.toBe("old-contact-1");
    expect(show!.contacts).toHaveLength(1);
    expect(show!.contacts[0].contactId).toBe(contact!.id);

    // Evento de criação na linha do tempo do funil.
    expect(show!.statusEvents).toHaveLength(1);
    expect(show!.statusEvents[0].fromStatus).toBeNull();
    expect(show!.statusEvents[0].toStatus).toBe("CONFIRMED");

    // Transação religada ao show novo.
    const txn = await prisma.transaction.findFirst({ where: { userId: user.id } });
    expect(txn!.showId).toBe(show!.id);
    expect(txn!.received).toBe(false);

    const goal = await prisma.revenueGoal.findFirst({ where: { userId: user.id } });
    expect(goal).toMatchObject({ year: 2026, amount: 5000000 });
  });

  it("restaura o histórico REAL do funil (statusEvents) de um backup v2", async () => {
    const user = h.currentUser!;
    // Backup com um show que carrega a linha do tempo do funil (v2).
    const input: AccountDataExportInput = {
      profile: { name: "Antigo", email: "antigo@example.com" },
      shows: [
        {
          id: "old-show-1",
          title: "Turnê",
          date: new Date("2026-09-10T22:00:00.000Z"),
          status: "PLAYED",
          fee: 80000,
          statusEvents: [
            { fromStatus: null, toStatus: "PROPOSED", createdAt: new Date("2026-06-01T10:00:00.000Z") },
            { fromStatus: "PROPOSED", toStatus: "CONFIRMED", createdAt: new Date("2026-06-15T10:00:00.000Z") },
            { fromStatus: "CONFIRMED", toStatus: "PLAYED", createdAt: new Date("2026-09-11T02:00:00.000Z") },
          ],
        },
      ],
      transactions: [],
      contacts: [],
      revenueGoals: [],
      exportedAt: new Date("2026-07-17T12:00:00.000Z"),
    };
    const json = accountDataExportToJson(buildAccountDataExport(input));

    const result = await importAccountAction(state, backupForm(json, "restaurar"));
    expect(result.errors).toBeUndefined();
    expect(result.restored?.shows).toBe(1);

    const show = await prisma.show.findFirst({
      where: { userId: user.id },
      include: { statusEvents: { orderBy: { createdAt: "asc" } } },
    });
    // Os três eventos originais, não o único evento de criação sintético.
    expect(show!.statusEvents).toHaveLength(3);
    expect(show!.statusEvents.map((e) => e.toStatus)).toEqual([
      "PROPOSED",
      "CONFIRMED",
      "PLAYED",
    ]);
    expect(show!.statusEvents[0].fromStatus).toBeNull();
    expect(show!.statusEvents[1].fromStatus).toBe("PROPOSED");
    // createdAt preservado do backup (a data real, não o "agora" da restauração).
    expect(show!.statusEvents[0].createdAt.toISOString()).toBe("2026-06-01T10:00:00.000Z");
    expect(show!.statusEvents[2].createdAt.toISOString()).toBe("2026-09-11T02:00:00.000Z");
    // Os eventos pertencem ao usuário logado.
    expect(show!.statusEvents.every((e) => e.userId === user.id)).toBe(true);
  });

  it("recusa restaurar numa conta que já tem dados (não sobrescreve)", async () => {
    const user = h.currentUser!;
    await createShow(user.id, { title: "Já existente" });

    const result = await importAccountAction(state, backupForm(sampleExportJson(), "restaurar"));
    expect(result.restored).toBeUndefined();
    expect(result.errors?.[0]).toContain("conta vazia");

    // O backup não foi aplicado — segue só o show pré-existente.
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.contact.count({ where: { userId: user.id } })).toBe(0);
  });

  it("não vaza entre usuários: a emptiness é por conta", async () => {
    // Um segundo usuário com dados não deve bloquear a restauração do primeiro.
    const other = await createUser("outro@example.com");
    await createShow(other.id, { title: "Do outro" });

    const result = await importAccountAction(state, backupForm(sampleExportJson(), "restaurar"));
    expect(result.restored?.shows).toBe(1);
    expect(await prisma.show.count({ where: { userId: h.currentUser!.id } })).toBe(1);
    expect(await prisma.show.count({ where: { userId: other.id } })).toBe(1);
  });

  it("bloqueia a restauração de um backup com status de show inválido", async () => {
    // Adultera o JSON válido trocando o status por um desconhecido.
    const tampered = sampleExportJson().replace('"CONFIRMED"', '"RESCHEDULED"');
    const result = await importAccountAction(state, backupForm(tampered, "restaurar"));
    expect(result.restored).toBeUndefined();
    expect(result.errors?.[0]).toContain("status");
    expect(await prisma.show.count()).toBe(0);
  });
});

describe("importAccountAction — substituição (substituir tudo pelo backup)", () => {
  beforeEach(async () => {
    await resetDb();
    const u = await createUser("dono@example.com");
    h.currentUser = { id: u.id };
  });

  it("apaga a carteira atual e restaura o backup na mesma operação", async () => {
    const user = h.currentUser!;
    // Carteira pré-existente que deve ser SUBSTITUÍDA por completo.
    const oldShow = await createShow(user.id, { title: "Antigo a apagar" });
    await createContact(user.id, { name: "Contato antigo" });
    await createTransaction(user.id, { showId: oldShow.id });
    await prisma.revenueGoal.create({
      data: { userId: user.id, year: 2025, amount: 1000000 },
    });

    const result = await importAccountAction(
      state,
      backupForm(sampleExportJson(), "substituir", RESET_CONFIRMATION_PHRASE),
    );

    expect(result.errors).toBeUndefined();
    // Reporta o que foi apagado antes de restaurar...
    expect(result.deletedBeforeRestore).toEqual({
      shows: 1,
      transactions: 1,
      contacts: 1,
      revenueGoals: 1,
    });
    // ...e o que foi gravado a partir do backup.
    expect(result.restored).toEqual({
      shows: 1,
      transactions: 1,
      contacts: 1,
      revenueGoals: 1,
    });

    // A carteira antiga sumiu: sobra só o conteúdo do backup.
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(1);
    const show = await prisma.show.findFirst({ where: { userId: user.id } });
    expect(show!.title).toBe("Show no Bar");
    expect(show!.id).not.toBe(oldShow.id);
    const goal = await prisma.revenueGoal.findFirst({ where: { userId: user.id } });
    expect(goal).toMatchObject({ year: 2026, amount: 5000000 });
    // Perfil de dados do backup aplicado.
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.artistName).toBe("Banda Restaurada");
  });

  it("substitui também numa conta vazia (apaga zero, grava o backup)", async () => {
    const user = h.currentUser!;
    const result = await importAccountAction(
      state,
      backupForm(sampleExportJson(), "substituir", RESET_CONFIRMATION_PHRASE),
    );
    expect(result.deletedBeforeRestore).toEqual({
      shows: 0,
      transactions: 0,
      contacts: 0,
      revenueGoals: 0,
    });
    expect(result.restored?.shows).toBe(1);
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(1);
  });

  it("recusa substituir sem a frase de confirmação — nada é apagado nem gravado", async () => {
    const user = h.currentUser!;
    await createShow(user.id, { title: "Preservar" });

    // Sem confirmação:
    const semFrase = await importAccountAction(
      state,
      backupForm(sampleExportJson(), "substituir"),
    );
    expect(semFrase.restored).toBeUndefined();
    expect(semFrase.deletedBeforeRestore).toBeUndefined();
    expect(semFrase.errors?.[0]).toContain("confirmação");

    // Com frase errada:
    const fraseErrada = await importAccountAction(
      state,
      backupForm(sampleExportJson(), "substituir", "apagar tudo"),
    );
    expect(fraseErrada.restored).toBeUndefined();

    // A carteira pré-existente segue intacta e o backup não foi aplicado.
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(1);
    const show = await prisma.show.findFirst({ where: { userId: user.id } });
    expect(show!.title).toBe("Preservar");
    expect(await prisma.contact.count({ where: { userId: user.id } })).toBe(0);
  });

  it("aceita a frase com caixa/espaços tolerados (mesma normalização do reset)", async () => {
    const user = h.currentUser!;
    await createShow(user.id, { title: "Antigo" });
    const result = await importAccountAction(
      state,
      backupForm(sampleExportJson(), "substituir", "  apagar   meus dados "),
    );
    expect(result.errors).toBeUndefined();
    expect(result.restored?.shows).toBe(1);
    const show = await prisma.show.findFirst({ where: { userId: user.id } });
    expect(show!.title).toBe("Show no Bar");
  });

  it("não vaza entre usuários: substituir só apaga a carteira do dono", async () => {
    const user = h.currentUser!;
    await createShow(user.id, { title: "Do dono" });
    const other = await createUser("outro@example.com");
    await createShow(other.id, { title: "Do outro" });

    const result = await importAccountAction(
      state,
      backupForm(sampleExportJson(), "substituir", RESET_CONFIRMATION_PHRASE),
    );
    expect(result.restored?.shows).toBe(1);
    // O outro usuário não foi tocado.
    expect(await prisma.show.count({ where: { userId: other.id } })).toBe(1);
    const otherShow = await prisma.show.findFirst({ where: { userId: other.id } });
    expect(otherShow!.title).toBe("Do outro");
  });

  it("um backup inválido não apaga a carteira atual (valida antes de apagar)", async () => {
    const user = h.currentUser!;
    await createShow(user.id, { title: "Preservar" });
    const tampered = sampleExportJson().replace('"CONFIRMED"', '"RESCHEDULED"');
    const result = await importAccountAction(
      state,
      backupForm(tampered, "substituir", RESET_CONFIRMATION_PHRASE),
    );
    expect(result.restored).toBeUndefined();
    expect(result.errors?.[0]).toContain("status");
    // A carteira pré-existente continua lá — a validação barra antes do apagar.
    expect(await prisma.show.count({ where: { userId: user.id } })).toBe(1);
    const show = await prisma.show.findFirst({ where: { userId: user.id } });
    expect(show!.title).toBe("Preservar");
  });
});
