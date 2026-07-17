import { describe, it, expect } from "vitest";
import { buildAccountRestorePlan } from "./accountRestore";
import type { AccountDataExport } from "./accountExport";

/** Snapshot mínimo válido, no formato exato de `parseAccountDataExport` → ok. */
function makeExport(over: Partial<AccountDataExport> = {}): AccountDataExport {
  return {
    meta: {
      app: "Palco",
      schemaVersion: 1,
      exportedAt: "2026-07-17T12:00:00.000Z",
      counts: { shows: 0, transactions: 0, contacts: 0, revenueGoals: 0 },
    },
    profile: {
      name: "Fulano",
      email: "fulano@example.com",
      artistName: "Banda X",
      taxRatePercent: 8,
    },
    shows: [],
    transactions: [],
    contacts: [],
    revenueGoals: [],
    ...over,
  };
}

const show = (over: Partial<AccountDataExport["shows"][number]> = {}) => ({
  id: "s1",
  title: "Show",
  date: "2026-08-01T22:00:00.000Z",
  venue: null,
  city: null,
  status: "CONFIRMED",
  fee: 50000,
  notes: null,
  paymentPromisedAt: null,
  contactIds: [],
  ...over,
});

const tx = (over: Partial<AccountDataExport["transactions"][number]> = {}) => ({
  id: "t1",
  type: "INCOME",
  description: "Cachê",
  category: "Cachê",
  amount: 50000,
  date: "2026-08-01T22:00:00.000Z",
  received: true,
  showId: null,
  ...over,
});

const contact = (over: Partial<AccountDataExport["contacts"][number]> = {}) => ({
  id: "c1",
  name: "Casa X",
  role: "VENUE",
  email: null,
  phone: null,
  notes: null,
  ...over,
});

describe("buildAccountRestorePlan", () => {
  it("monta plano de conta vazia sem notas nem erros", () => {
    const r = buildAccountRestorePlan(makeExport());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.contacts).toHaveLength(0);
    expect(r.plan.shows).toHaveLength(0);
    expect(r.plan.transactions).toHaveLength(0);
    expect(r.plan.revenueGoals).toHaveLength(0);
    expect(r.plan.notes).toHaveLength(0);
    expect(r.plan.profile).toEqual({ artistName: "Banda X", taxRatePercent: 8 });
  });

  it("preserva o vínculo N:N show↔contato pelas chaves do arquivo", () => {
    const r = buildAccountRestorePlan(
      makeExport({
        contacts: [contact({ id: "c1" }), contact({ id: "c2", name: "Promoter" })],
        shows: [show({ id: "s1", contactIds: ["c1", "c2"] })],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.shows[0].contactKeys).toEqual(["c1", "c2"]);
  });

  it("preserva o vínculo transação→show pela chave do arquivo", () => {
    const r = buildAccountRestorePlan(
      makeExport({
        shows: [show({ id: "s1" })],
        transactions: [tx({ id: "t1", showId: "s1" })],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.transactions[0].showKey).toBe("s1");
  });

  it("remove vínculo de contato órfão do show com nota", () => {
    const r = buildAccountRestorePlan(
      makeExport({
        contacts: [contact({ id: "c1" })],
        shows: [show({ id: "s1", contactIds: ["c1", "ausente"] })],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.shows[0].contactKeys).toEqual(["c1"]);
    expect(r.plan.notes.some((n) => n.includes("vínculo"))).toBe(true);
  });

  it("zera o showId órfão de uma transação com nota", () => {
    const r = buildAccountRestorePlan(
      makeExport({ transactions: [tx({ showId: "ausente" })] }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.transactions[0].showKey).toBeNull();
    expect(r.plan.notes.some((n) => n.includes("sem vínculo de show"))).toBe(true);
  });

  it("deduplica ids de show/contato e ano de meta, mantendo o primeiro", () => {
    const r = buildAccountRestorePlan(
      makeExport({
        contacts: [contact({ id: "c1", name: "A" }), contact({ id: "c1", name: "B" })],
        shows: [show({ id: "s1", title: "A" }), show({ id: "s1", title: "B" })],
        revenueGoals: [
          { year: 2026, amount: 1000 },
          { year: 2026, amount: 2000 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.contacts).toHaveLength(1);
    expect(r.plan.contacts[0].name).toBe("A");
    expect(r.plan.shows).toHaveLength(1);
    expect(r.plan.shows[0].title).toBe("A");
    expect(r.plan.revenueGoals).toEqual([{ year: 2026, amount: 1000 }]);
    expect(r.plan.notes.filter((n) => n.includes("duplicado")).length).toBe(2);
    expect(r.plan.notes.some((n) => n.includes("ano repetido"))).toBe(true);
  });

  it("coage papel de contato desconhecido para OTHER com nota", () => {
    const r = buildAccountRestorePlan(
      makeExport({ contacts: [contact({ role: "MANAGER" })] }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.contacts[0].role).toBe("OTHER");
    expect(r.plan.notes.some((n) => n.includes("Outro"))).toBe(true);
  });

  it("bloqueia data de show não-parseável", () => {
    const r = buildAccountRestorePlan(
      makeExport({ shows: [show({ date: "não é data" })] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toContain("date");
  });

  it("bloqueia paymentPromisedAt não-parseável", () => {
    const r = buildAccountRestorePlan(
      makeExport({ shows: [show({ paymentPromisedAt: "xx" })] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toContain("paymentPromisedAt");
  });

  it("bloqueia status de show desconhecido", () => {
    const r = buildAccountRestorePlan(
      makeExport({ shows: [show({ status: "RESCHEDULED" })] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toContain("status");
  });

  it("bloqueia tipo de transação desconhecido", () => {
    const r = buildAccountRestorePlan(
      makeExport({ transactions: [tx({ type: "REFUND" })] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toContain("type");
  });

  it("bloqueia data de transação não-parseável", () => {
    const r = buildAccountRestorePlan(
      makeExport({ transactions: [tx({ date: "ontem" })] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toContain("date");
  });
});
