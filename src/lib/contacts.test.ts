import { describe, it, expect } from "vitest";
import { summarizeContactShows, type ContactShowLike } from "./contacts";

const NOW = new Date("2026-06-17T12:00:00Z");

function show(over: Partial<ContactShowLike> & { id: string }): ContactShowLike {
  return {
    title: "Show",
    date: "2026-06-01T20:00:00Z",
    status: "CONFIRMED",
    fee: 100_00,
    ...over,
  };
}

describe("summarizeContactShows", () => {
  it("trata lista vazia", () => {
    const s = summarizeContactShows([], NOW);
    expect(s.total).toBe(0);
    expect(s.upcoming).toEqual([]);
    expect(s.past).toEqual([]);
    expect(s.totalFee).toBe(0);
    expect(s.nextShow).toBeNull();
    expect(s.byStatus).toEqual({ PROPOSED: 0, CONFIRMED: 0, PLAYED: 0, CANCELLED: 0 });
  });

  it("separa futuros (crescente) de passados (decrescente)", () => {
    const s = summarizeContactShows(
      [
        show({ id: "p1", date: "2026-06-01T20:00:00Z" }),
        show({ id: "f2", date: "2026-08-01T20:00:00Z" }),
        show({ id: "f1", date: "2026-07-01T20:00:00Z" }),
        show({ id: "p2", date: "2026-05-01T20:00:00Z" }),
      ],
      NOW,
    );
    expect(s.upcoming.map((x) => x.id)).toEqual(["f1", "f2"]);
    expect(s.past.map((x) => x.id)).toEqual(["p1", "p2"]);
    expect(s.total).toBe(4);
  });

  it("conta o instante exato 'agora' como futuro (>= now)", () => {
    const s = summarizeContactShows(
      [show({ id: "agora", date: NOW.toISOString() })],
      NOW,
    );
    expect(s.upcoming.map((x) => x.id)).toEqual(["agora"]);
    expect(s.past).toEqual([]);
  });

  it("conta por status incluindo zeros", () => {
    const s = summarizeContactShows(
      [
        show({ id: "a", status: "PROPOSED" }),
        show({ id: "b", status: "CONFIRMED" }),
        show({ id: "c", status: "CONFIRMED" }),
        show({ id: "d", status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(s.byStatus).toEqual({ PROPOSED: 1, CONFIRMED: 2, PLAYED: 0, CANCELLED: 1 });
  });

  it("soma o cachê ignorando cancelados", () => {
    const s = summarizeContactShows(
      [
        show({ id: "a", fee: 100_00, status: "CONFIRMED" }),
        show({ id: "b", fee: 250_00, status: "PLAYED" }),
        show({ id: "c", fee: 999_00, status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(s.totalFee).toBe(350_00);
  });

  it("nextShow é o futuro não cancelado de menor data", () => {
    const s = summarizeContactShows(
      [
        show({ id: "cancelado", date: "2026-06-20T20:00:00Z", status: "CANCELLED" }),
        show({ id: "proximo", date: "2026-06-25T20:00:00Z", status: "CONFIRMED" }),
        show({ id: "depois", date: "2026-07-25T20:00:00Z", status: "PROPOSED" }),
      ],
      NOW,
    );
    expect(s.nextShow?.id).toBe("proximo");
  });

  it("nextShow é null quando só há shows passados ou futuros cancelados", () => {
    const s = summarizeContactShows(
      [
        show({ id: "passado", date: "2026-01-01T20:00:00Z", status: "PLAYED" }),
        show({ id: "fut-cancel", date: "2026-09-01T20:00:00Z", status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(s.nextShow).toBeNull();
  });
});

import {
  filterContacts,
  findContactsToReengage,
  hasActiveContactFilter,
  isValidContactRole,
  rankContactsByActivity,
  type ContactLike,
  type ContactWithShows,
  type ContactRankLike,
  type ContactRankShowLike,
} from "./contacts";

function contact(over: Partial<ContactLike> & { name: string }): ContactLike {
  return {
    email: null,
    phone: null,
    notes: null,
    role: "OTHER",
    ...over,
  };
}

const CONTACTS: ContactLike[] = [
  contact({ name: "Bar do João", email: "contato@bardojoao.com", role: "VENUE" }),
  contact({ name: "Maria Promoções", phone: "11 99999-0000", role: "PROMOTER" }),
  contact({ name: "Estúdio Sonora", notes: "mixagem e masterização", role: "PRODUCER" }),
];

describe("isValidContactRole", () => {
  it("aceita papéis conhecidos e rejeita o resto", () => {
    expect(isValidContactRole("VENUE")).toBe(true);
    expect(isValidContactRole("PROMOTER")).toBe(true);
    expect(isValidContactRole("LIXO")).toBe(false);
    expect(isValidContactRole(undefined)).toBe(false);
    expect(isValidContactRole(null)).toBe(false);
    expect(isValidContactRole("")).toBe(false);
  });
});

describe("hasActiveContactFilter", () => {
  it("detecta critérios ativos e ignora vazios/inválidos", () => {
    expect(hasActiveContactFilter({})).toBe(false);
    expect(hasActiveContactFilter({ q: "   " })).toBe(false);
    expect(hasActiveContactFilter({ role: "LIXO" })).toBe(false);
    expect(hasActiveContactFilter({ q: "joão" })).toBe(true);
    expect(hasActiveContactFilter({ role: "VENUE" })).toBe(true);
  });
});

describe("filterContacts", () => {
  it("sem filtro retorna todos", () => {
    expect(filterContacts(CONTACTS, {})).toHaveLength(3);
  });

  it("filtra por papel exato", () => {
    const r = filterContacts(CONTACTS, { role: "VENUE" });
    expect(r.map((c) => c.name)).toEqual(["Bar do João"]);
  });

  it("ignora papel inválido", () => {
    expect(filterContacts(CONTACTS, { role: "LIXO" })).toHaveLength(3);
  });

  it("busca por nome sem acento e sem caixa", () => {
    expect(filterContacts(CONTACTS, { q: "joao" }).map((c) => c.name)).toEqual([
      "Bar do João",
    ]);
    expect(filterContacts(CONTACTS, { q: "SONORA" }).map((c) => c.name)).toEqual([
      "Estúdio Sonora",
    ]);
  });

  it("busca casa e-mail, telefone e notas", () => {
    expect(filterContacts(CONTACTS, { q: "bardojoao.com" })).toHaveLength(1);
    expect(filterContacts(CONTACTS, { q: "99999" })).toHaveLength(1);
    expect(filterContacts(CONTACTS, { q: "masterização" })).toHaveLength(1);
  });

  it("combina busca e papel em AND", () => {
    expect(filterContacts(CONTACTS, { q: "maria", role: "VENUE" })).toHaveLength(0);
    expect(filterContacts(CONTACTS, { q: "maria", role: "PROMOTER" })).toHaveLength(1);
  });

  it("termo sem correspondência retorna vazio", () => {
    expect(filterContacts(CONTACTS, { q: "zzz" })).toHaveLength(0);
  });

  it("não muta a lista original", () => {
    const original = [...CONTACTS];
    filterContacts(CONTACTS, { q: "joao", role: "VENUE" });
    expect(CONTACTS).toEqual(original);
  });
});

describe("rankContactsByActivity", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "CONFIRMED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    name: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name }, shows };
  }

  it("trata lista vazia", () => {
    const r = rankContactsByActivity([], NOW);
    expect(r.rows).toEqual([]);
    expect(r.count).toBe(0);
    expect(r.top).toBeNull();
  });

  it("ignora contatos sem shows vinculados", () => {
    const r = rankContactsByActivity(
      [item("a", "Com show", [s()]), item("b", "Sem show", [])],
      NOW,
    );
    expect(r.count).toBe(1);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["a"]);
  });

  it("ordena por cachê total decrescente", () => {
    const r = rankContactsByActivity(
      [
        item("a", "Menor", [s({ fee: 100_00 })]),
        item("b", "Maior", [s({ fee: 500_00 })]),
        item("c", "Médio", [s({ fee: 300_00 })]),
      ],
      NOW,
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["b", "c", "a"]);
    expect(r.top?.contact.id).toBe("b");
  });

  it("exclui CANCELLED do cachê, ativos e futuros (mas conta no total)", () => {
    const r = rankContactsByActivity(
      [
        item("a", "A", [
          s({ fee: 200_00, status: "PLAYED", date: "2026-01-01T20:00:00Z" }),
          s({ fee: 999_00, status: "CANCELLED", date: "2026-07-01T20:00:00Z" }),
          s({ fee: 300_00, status: "CONFIRMED", date: "2026-08-01T20:00:00Z" }),
        ]),
      ],
      NOW,
    );
    const row = r.rows[0];
    expect(row.totalShows).toBe(3);
    expect(row.activeShows).toBe(2);
    expect(row.upcomingShows).toBe(1); // só o confirmado de agosto (o cancelado não conta)
    expect(row.totalFee).toBe(500_00);
  });

  it("lastShowDate é o show não cancelado mais recente; null se só cancelados", () => {
    const r = rankContactsByActivity(
      [
        item("a", "A", [
          s({ date: "2026-01-01T20:00:00Z" }),
          s({ date: "2026-09-01T20:00:00Z" }),
          s({ date: "2026-12-01T20:00:00Z", status: "CANCELLED" }),
        ]),
        item("b", "B", [s({ date: "2026-12-01T20:00:00Z", status: "CANCELLED" })]),
      ],
      NOW,
    );
    const a = r.rows.find((x) => x.contact.id === "a")!;
    const b = r.rows.find((x) => x.contact.id === "b")!;
    expect(a.lastShowDate?.toISOString()).toBe("2026-09-01T20:00:00.000Z");
    expect(b.lastShowDate).toBeNull();
    expect(b.totalFee).toBe(0);
    expect(b.activeShows).toBe(0);
  });

  it("desempata por nº de shows ativos e depois pelo nome (pt-BR)", () => {
    const r = rankContactsByActivity(
      [
        item("a", "Zé", [s({ fee: 100_00 })]),
        item("b", "Ana", [s({ fee: 50_00 }), s({ fee: 50_00 })]), // mesmo cachê total, mais ativos
        item("c", "Bia", [s({ fee: 100_00 })]), // empata com Zé em tudo → nome
      ],
      NOW,
    );
    // b tem 2 ativos (desempate ganha); depois Bia < Zé por nome
    expect(r.rows.map((x) => x.contact.id)).toEqual(["b", "c", "a"]);
  });
});

describe("findContactsToReengage", () => {
  // NOW = 2026-06-17. "Antigo" = mais de 60 dias atrás.
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "CONFIRMED", date: "2026-01-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    name: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name }, shows };
  }

  it("trata lista vazia", () => {
    const r = findContactsToReengage([], { now: NOW });
    expect(r.rows).toEqual([]);
    expect(r.count).toBe(0);
    expect(r.staleDays).toBe(60);
  });

  it("inclui só dormentes: com passado, sem futuro e há >= staleDays dias", () => {
    const r = findContactsToReengage(
      [
        // dormente: último show há ~5 meses, nada agendado
        item("frio", "Bar Frio", [s({ date: "2026-01-10T20:00:00Z" })]),
        // tem show futuro → excluído
        item("ativo", "Bar Ativo", [
          s({ date: "2026-01-10T20:00:00Z" }),
          s({ date: "2026-08-01T20:00:00Z" }),
        ]),
        // último show há poucos dias (< 60) → ainda quente
        item("recente", "Bar Recente", [s({ date: "2026-06-10T20:00:00Z" })]),
        // nunca tocou (sem shows) → excluído
        item("novo", "Bar Novo", []),
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["frio"]);
    expect(r.rows[0].pastShows).toBe(1);
  });

  it("ignora shows cancelados (não contam como passado nem como futuro)", () => {
    const r = findContactsToReengage(
      [
        // só tem cancelado → sem passado real → excluído
        item("a", "A", [s({ date: "2026-01-10T20:00:00Z", status: "CANCELLED" })]),
        // futuro cancelado não bloqueia; passado real o torna dormente
        item("b", "B", [
          s({ date: "2026-01-10T20:00:00Z" }),
          s({ date: "2026-09-01T20:00:00Z", status: "CANCELLED" }),
        ]),
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["b"]);
    expect(r.rows[0].totalFee).toBe(100_00); // o cancelado não soma
  });

  it("calcula daysSinceLastShow pelo show não cancelado mais recente (em dias UTC)", () => {
    const r = findContactsToReengage(
      [
        item("a", "A", [
          s({ date: "2026-02-01T20:00:00Z" }),
          s({ date: "2026-04-10T23:00:00Z" }), // este é o mais recente
        ]),
      ],
      { now: NOW },
    );
    expect(r.rows[0].lastShowDate.toISOString()).toBe("2026-04-10T23:00:00.000Z");
    // de 10/abr a 17/jun = 20(abr)+31(mai)+17(jun) = 68 dias
    expect(r.rows[0].daysSinceLastShow).toBe(68);
  });

  it("ordena pelos mais esquecidos, desempatando por cachê", () => {
    const r = findContactsToReengage(
      [
        item("a", "A", [s({ date: "2026-03-01T20:00:00Z", fee: 100_00 })]), // ~108 dias
        item("b", "B", [s({ date: "2026-01-01T20:00:00Z", fee: 50_00 })]), // ~167 dias (mais antigo)
        item("c", "C", [s({ date: "2026-01-01T20:00:00Z", fee: 999_00 })]), // empata em dias → cachê maior
      ],
      { now: NOW },
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["c", "b", "a"]);
  });

  it("respeita staleDays customizado", () => {
    const items = [item("a", "A", [s({ date: "2026-05-20T20:00:00Z" })])]; // ~28 dias
    expect(findContactsToReengage(items, { now: NOW }).count).toBe(0); // < 60
    expect(findContactsToReengage(items, { now: NOW, staleDays: 14 }).count).toBe(1);
  });
});
