import { describe, it, expect } from "vitest";
import {
  buildAccountDataExport,
  accountDataExportToJson,
  type AccountDataExportInput,
} from "./accountExport";
import {
  parseAccountDataExport,
  parseAccountDataExportJson,
  SUPPORTED_ACCOUNT_IMPORT_SCHEMA_VERSIONS,
} from "./accountImport";

// Um export bem-formado, montado pela própria camada de export (round-trip real).
const goodInput = (): AccountDataExportInput => ({
  exportedAt: new Date("2026-07-17T12:34:56.000Z"),
  profile: {
    name: "Ana Beat",
    email: "ana@example.com",
    artistName: "Trio Beat",
    taxRatePercent: 6,
  },
  shows: [
    {
      id: "show-1",
      title: "Bar do Zé",
      date: new Date("2026-08-01T22:00:00.000Z"),
      venue: "Bar do Zé",
      city: "São Paulo",
      status: "CONFIRMED",
      fee: 120000,
      notes: null,
      paymentPromisedAt: new Date("2026-08-10T00:00:00.000Z"),
      contactIds: ["contact-1"],
    },
  ],
  transactions: [
    {
      id: "tx-1",
      type: "INCOME",
      description: "Cachê Bar do Zé",
      category: "Show",
      amount: 120000,
      date: new Date("2026-08-01T22:00:00.000Z"),
      received: false,
      showId: "show-1",
    },
  ],
  contacts: [
    {
      id: "contact-1",
      name: "Zé",
      role: "OWNER",
      email: null,
      phone: null,
      notes: null,
    },
  ],
  revenueGoals: [{ year: 2026, amount: 5000000 }],
});

const goodExport = () => buildAccountDataExport(goodInput());

describe("parseAccountDataExport", () => {
  it("aceita um export bem-formado e devolve resumo + zero avisos", () => {
    const result = parseAccountDataExport(goodExport());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
    expect(result.summary).toEqual({
      app: "Palco",
      schemaVersion: 1,
      exportedAt: "2026-07-17T12:34:56.000Z",
      counts: { shows: 1, transactions: 1, contacts: 1, revenueGoals: 1 },
    });
    expect(result.data.shows[0]?.id).toBe("show-1");
    expect(result.data.shows[0]?.contactIds).toEqual(["contact-1"]);
  });

  it("faz round-trip completo pelo JSON serializado", () => {
    const json = accountDataExportToJson(goodExport());
    const result = parseAccountDataExportJson(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(goodExport());
  });

  it("rejeita valores que não são objeto JSON", () => {
    for (const bad of [null, 42, "texto", [], true]) {
      const r = parseAccountDataExport(bad);
      expect(r.ok).toBe(false);
    }
  });

  it("rejeita quando falta o cabeçalho meta", () => {
    const r = parseAccountDataExport({ shows: [], transactions: [], contacts: [], revenueGoals: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/meta/);
  });

  it("rejeita arquivo de outro app", () => {
    const data = goodExport();
    const r = parseAccountDataExport({ ...data, meta: { ...data.meta, app: "Outro" } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join(" ")).toMatch(/Palco/);
  });

  it("rejeita versão de formato não suportada", () => {
    const data = goodExport();
    const r = parseAccountDataExport({ ...data, meta: { ...data.meta, schemaVersion: 99 } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join(" ")).toMatch(/não suportada/);
  });

  it("rejeita quando uma lista de topo não é uma lista", () => {
    const data = goodExport();
    const r = parseAccountDataExport({ ...data, shows: "nope" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join(" ")).toMatch(/shows/);
  });

  it("rejeita registro com campo obrigatório ausente/inválido", () => {
    const data = goodExport();
    const broken = { ...data, shows: [{ ...data.shows[0], id: "" , fee: "muito" }] };
    const r = parseAccountDataExport(broken);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join(" ")).toMatch(/shows\[0\]\.id/);
    expect(r.errors.join(" ")).toMatch(/shows\[0\]\.fee/);
  });

  it("rejeita perfil sem nome/email", () => {
    const data = goodExport();
    const r = parseAccountDataExport({ ...data, profile: { ...data.profile, name: "", email: "" } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join(" ")).toMatch(/profile\.name/);
    expect(r.errors.join(" ")).toMatch(/profile\.email/);
  });

  it("aceita mas AVISA quando um vínculo de contato aponta para contato ausente", () => {
    const data = goodExport();
    data.shows[0]!.contactIds = ["fantasma"];
    const r = parseAccountDataExport(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.join(" ")).toMatch(/vínculo/);
  });

  it("aceita mas AVISA quando uma transação referencia show ausente", () => {
    const data = goodExport();
    data.transactions[0]!.showId = "fantasma";
    const r = parseAccountDataExport(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.join(" ")).toMatch(/transação/);
  });

  it("aceita mas AVISA sobre ids duplicados", () => {
    const data = goodExport();
    data.contacts.push({ ...data.contacts[0]! });
    const r = parseAccountDataExport(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.join(" ")).toMatch(/duplicado/);
  });

  it("aceita mas AVISA quando meta.counts não bate com o conteúdo", () => {
    const data = goodExport();
    data.meta.counts.shows = 99;
    const r = parseAccountDataExport(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.join(" ")).toMatch(/meta\.counts\.shows/);
  });

  it("aceita conta vazia (só perfil)", () => {
    const data = buildAccountDataExport({
      exportedAt: new Date("2026-07-17T00:00:00.000Z"),
      profile: { name: "Solo", email: "solo@example.com" },
      shows: [],
      transactions: [],
      contacts: [],
      revenueGoals: [],
    });
    const r = parseAccountDataExport(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary.counts).toEqual({ shows: 0, transactions: 0, contacts: 0, revenueGoals: 0 });
    expect(r.data.profile.artistName).toBeNull();
  });

  it("normaliza opcionais ausentes para null nos registros", () => {
    const data = goodExport();
    // Simula um arquivo que omitiu campos opcionais (em vez de gravar null).
    const trimmed = {
      ...data,
      contacts: [{ id: "c1", name: "X", role: "OWNER" }],
    };
    const r = parseAccountDataExport(trimmed);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.contacts[0]).toEqual({
      id: "c1",
      name: "X",
      role: "OWNER",
      email: null,
      phone: null,
      notes: null,
    });
  });

  it("expõe apenas a versão 1 como suportada", () => {
    expect(SUPPORTED_ACCOUNT_IMPORT_SCHEMA_VERSIONS).toEqual([1]);
  });
});

describe("parseAccountDataExportJson", () => {
  it("trata JSON malformado como erro amigável", () => {
    const r = parseAccountDataExportJson("{ isto não é json");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/JSON válido/);
  });
});
