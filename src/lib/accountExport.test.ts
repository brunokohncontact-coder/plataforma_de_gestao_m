import { describe, it, expect } from "vitest";
import {
  buildAccountDataExport,
  accountDataExportToJson,
  accountDataExportFilename,
  ACCOUNT_EXPORT_APP,
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  type AccountDataExportInput,
} from "./accountExport";

const baseInput = (): AccountDataExportInput => ({
  exportedAt: new Date("2026-07-17T12:34:56.000Z"),
  profile: {
    name: "Ana Beat",
    email: "ana@example.com",
    artistName: "Trio Beat",
    taxRatePercent: 6,
  },
  shows: [
    {
      id: "show_1",
      title: "Show no Bar X",
      date: new Date("2026-05-01T22:00:00.000Z"),
      venue: "Bar X",
      city: "São Paulo",
      status: "CONFIRMED",
      fee: 150000,
      notes: "levar cabo extra",
      paymentPromisedAt: new Date("2026-05-10T00:00:00.000Z"),
      contactIds: ["contact_1", "contact_2"],
    },
  ],
  transactions: [
    {
      id: "tx_1",
      type: "INCOME",
      description: "Cachê Bar X",
      category: "cachê",
      amount: 150000,
      date: new Date("2026-05-02T00:00:00.000Z"),
      received: true,
      showId: "show_1",
    },
  ],
  contacts: [
    {
      id: "contact_1",
      name: "João Promoter",
      role: "PROMOTER",
      email: "joao@example.com",
      phone: "+55 11 90000-0000",
      notes: null,
    },
  ],
  revenueGoals: [{ year: 2026, amount: 5000000 }],
});

describe("buildAccountDataExport", () => {
  it("monta o cabeçalho com app, versão, data ISO e contagens", () => {
    const data = buildAccountDataExport(baseInput());
    expect(data.meta.app).toBe(ACCOUNT_EXPORT_APP);
    expect(data.meta.schemaVersion).toBe(ACCOUNT_EXPORT_SCHEMA_VERSION);
    expect(data.meta.exportedAt).toBe("2026-07-17T12:34:56.000Z");
    expect(data.meta.counts).toEqual({
      shows: 1,
      transactions: 1,
      contacts: 1,
      revenueGoals: 1,
    });
  });

  it("normaliza datas para ISO e preserva valores em centavos", () => {
    const data = buildAccountDataExport(baseInput());
    expect(data.shows[0].date).toBe("2026-05-01T22:00:00.000Z");
    expect(data.shows[0].paymentPromisedAt).toBe("2026-05-10T00:00:00.000Z");
    expect(data.shows[0].fee).toBe(150000);
    expect(data.transactions[0].date).toBe("2026-05-02T00:00:00.000Z");
    expect(data.transactions[0].amount).toBe(150000);
  });

  it("preserva os ids de contato vinculados a cada show (relação N:N)", () => {
    const data = buildAccountDataExport(baseInput());
    expect(data.shows[0].contactIds).toEqual(["contact_1", "contact_2"]);
  });

  it("exporta o histórico do funil (statusEvents) normalizando datas e fromStatus null", () => {
    const input = baseInput();
    input.shows[0].statusEvents = [
      { fromStatus: null, toStatus: "PROPOSED", createdAt: new Date("2026-04-01T10:00:00.000Z") },
      {
        fromStatus: "PROPOSED",
        toStatus: "CONFIRMED",
        createdAt: "2026-04-10T10:00:00.000Z",
      },
    ];
    const data = buildAccountDataExport(input);
    expect(data.shows[0].statusEvents).toEqual([
      { fromStatus: null, toStatus: "PROPOSED", createdAt: "2026-04-01T10:00:00.000Z" },
      { fromStatus: "PROPOSED", toStatus: "CONFIRMED", createdAt: "2026-04-10T10:00:00.000Z" },
    ]);
  });

  it("aceita string ISO já pronta como data", () => {
    const input = baseInput();
    input.exportedAt = "2026-01-01T00:00:00.000Z";
    input.shows[0].date = "2026-01-05T00:00:00.000Z";
    const data = buildAccountDataExport(input);
    expect(data.meta.exportedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(data.shows[0].date).toBe("2026-01-05T00:00:00.000Z");
  });

  it("campos opcionais ausentes viram null (não undefined)", () => {
    const data = buildAccountDataExport({
      exportedAt: new Date("2026-07-17T00:00:00.000Z"),
      profile: { name: "Solo", email: "solo@example.com" },
      shows: [
        {
          id: "s",
          title: "Ensaio aberto",
          date: new Date("2026-03-03T00:00:00.000Z"),
          status: "PROPOSED",
          fee: 0,
        },
      ],
      transactions: [],
      contacts: [],
      revenueGoals: [],
    });
    expect(data.profile.artistName).toBeNull();
    expect(data.profile.taxRatePercent).toBeNull();
    expect(data.shows[0].venue).toBeNull();
    expect(data.shows[0].city).toBeNull();
    expect(data.shows[0].notes).toBeNull();
    expect(data.shows[0].paymentPromisedAt).toBeNull();
    expect(data.shows[0].contactIds).toEqual([]);
    expect(data.shows[0].statusEvents).toEqual([]);
    // Sem `undefined` no JSON serializado.
    expect(accountDataExportToJson(data)).not.toContain("undefined");
  });

  it("preserva a ordem recebida das listas (ordenação é da rota)", () => {
    const input = baseInput();
    input.contacts = [
      { id: "b", name: "B", role: "OTHER" },
      { id: "a", name: "A", role: "OTHER" },
    ];
    const data = buildAccountDataExport(input);
    expect(data.contacts.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("conta corretamente uma conta vazia", () => {
    const data = buildAccountDataExport({
      exportedAt: new Date("2026-07-17T00:00:00.000Z"),
      profile: { name: "Novo", email: "novo@example.com" },
      shows: [],
      transactions: [],
      contacts: [],
      revenueGoals: [],
    });
    expect(data.meta.counts).toEqual({
      shows: 0,
      transactions: 0,
      contacts: 0,
      revenueGoals: 0,
    });
    expect(data.shows).toEqual([]);
  });
});

describe("accountDataExportToJson", () => {
  it("produz JSON válido, indentado, que faz round-trip", () => {
    const data = buildAccountDataExport(baseInput());
    const json = accountDataExportToJson(data);
    expect(json).toContain("\n  "); // indentação de 2 espaços
    expect(JSON.parse(json)).toEqual(data);
  });
});

describe("accountDataExportFilename", () => {
  it("ancora o nome do arquivo na chave de dia", () => {
    expect(accountDataExportFilename("2026-07-17")).toBe(
      "palco-meus-dados-2026-07-17.json",
    );
  });
});
