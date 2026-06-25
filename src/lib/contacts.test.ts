import { describe, it, expect } from "vitest";
import {
  summarizeContactShows,
  summarizeContactProfit,
  type ContactShowLike,
} from "./contacts";
import type { TxLike } from "./finance";

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
  clientConcentration,
  clientRetention,
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

describe("clientRetention", () => {
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
    const r = clientRetention([], NOW);
    expect(r.rows).toEqual([]);
    expect(r.recurring).toEqual([]);
    expect(r.totalClients).toBe(0);
    expect(r.recurringClients).toBe(0);
    expect(r.oneTimeClients).toBe(0);
    expect(r.repeatRate).toBeNull();
    expect(r.totalShows).toBe(0);
    expect(r.totalFee).toBe(0);
    expect(r.recurringFee).toBe(0);
    expect(r.recurringFeeShare).toBeNull();
    expect(r.avgShowsPerClient).toBe(0);
    expect(r.mostLoyal).toBeNull();
  });

  it("ignora contatos sem shows não cancelados", () => {
    const r = clientRetention(
      [
        item("sem", "Sem shows", []),
        item("cancel", "Só cancelado", [s({ status: "CANCELLED" })]),
        item("ok", "Tocou", [s()]),
      ],
      NOW,
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["ok"]);
    expect(r.totalClients).toBe(1);
  });

  it("classifica recorrente (≥2) vs. um show só e calcula a taxa de recompra", () => {
    const r = clientRetention(
      [
        item("a", "Recorrente A", [s(), s()]),
        item("b", "Recorrente B", [s(), s(), s()]),
        item("c", "Único C", [s()]),
        item("d", "Único D", [s()]),
      ],
      NOW,
    );
    expect(r.totalClients).toBe(4);
    expect(r.recurringClients).toBe(2);
    expect(r.oneTimeClients).toBe(2);
    expect(r.repeatRate).toBe(0.5);
    expect(r.recurring.map((x) => x.contact.id)).toEqual(["b", "a"]);
    expect(r.totalShows).toBe(7);
    expect(r.avgShowsPerClient).toBeCloseTo(7 / 4);
  });

  it("não conta shows cancelados no nº de shows nem no cachê", () => {
    const r = clientRetention(
      [item("a", "A", [s({ fee: 100_00 }), s({ fee: 200_00, status: "CANCELLED" })])],
      NOW,
    );
    // só 1 show válido → não é recorrente
    expect(r.recurringClients).toBe(0);
    expect(r.rows[0].activeShows).toBe(1);
    expect(r.rows[0].totalFee).toBe(100_00);
    expect(r.rows[0].recurring).toBe(false);
  });

  it("calcula a fatia do faturamento vinda dos recorrentes", () => {
    const r = clientRetention(
      [
        item("rec", "Recorrente", [s({ fee: 300_00 }), s({ fee: 300_00 })]), // 600
        item("uni", "Único", [s({ fee: 200_00 })]), // 200
      ],
      NOW,
    );
    expect(r.totalFee).toBe(800_00);
    expect(r.recurringFee).toBe(600_00);
    expect(r.recurringFeeShare).toBeCloseTo(0.75);
  });

  it("ordena por nº de shows, desempatando por cachê, e aponta o mais fiel", () => {
    const r = clientRetention(
      [
        item("a", "A", [s(), s()]), // 2 shows, 200
        item("b", "B", [s({ fee: 500_00 }), s({ fee: 500_00 }), s({ fee: 500_00 })]), // 3 shows
        item("c", "C", [s({ fee: 900_00 }), s({ fee: 900_00 })]), // 2 shows, 1800 (empata em shows com A → cachê maior)
      ],
      NOW,
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["b", "c", "a"]);
    expect(r.mostLoyal?.contact.id).toBe("b");
  });

  it("usa o show não cancelado mais recente como lastShowDate", () => {
    const r = clientRetention(
      [
        item("a", "A", [
          s({ date: "2026-02-01T20:00:00Z" }),
          s({ date: "2026-09-15T23:00:00Z" }), // futuro confirmado também conta
        ]),
      ],
      NOW,
    );
    expect(r.rows[0].lastShowDate?.toISOString()).toBe("2026-09-15T23:00:00.000Z");
    expect(r.rows[0].recurring).toBe(true);
  });
});

describe("clientConcentration", () => {
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
    const r = clientConcentration([]);
    expect(r.rows).toEqual([]);
    expect(r.clientCount).toBe(0);
    expect(r.totalFee).toBe(0);
    expect(r.top).toBeNull();
    expect(r.topShare).toBe(0);
    expect(r.top3Share).toBe(0);
    expect(r.hhi).toBe(0);
    expect(r.effectiveClients).toBe(0);
    expect(r.level).toBe("concentrated");
  });

  it("ignora contratantes sem faturamento (cachê 0 ou só cancelados)", () => {
    const r = clientConcentration([
      item("pago", "Paga", [s({ fee: 500_00 })]),
      item("zero", "Sem cachê", [s({ fee: 0 })]),
      item("cancel", "Só cancelado", [s({ fee: 900_00, status: "CANCELLED" })]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["pago"]);
    expect(r.clientCount).toBe(1);
    expect(r.totalFee).toBe(500_00);
  });

  it("um único contratante → 100% concentrado", () => {
    const r = clientConcentration([item("a", "A", [s({ fee: 700_00 })])]);
    expect(r.topShare).toBe(1);
    expect(r.top3Share).toBe(1);
    expect(r.hhi).toBe(1);
    expect(r.effectiveClients).toBe(1);
    expect(r.level).toBe("concentrated");
  });

  it("ordena por cachê e calcula participações e o top", () => {
    const r = clientConcentration([
      item("a", "A", [s({ fee: 100_00 })]),
      item("b", "B", [s({ fee: 700_00 })]),
      item("c", "C", [s({ fee: 200_00 })]),
    ]);
    // total 1000; b=700, c=200, a=100
    expect(r.rows.map((x) => x.contact.id)).toEqual(["b", "c", "a"]);
    expect(r.totalFee).toBe(1000_00);
    expect(r.top?.contact.id).toBe("b");
    expect(r.topShare).toBeCloseTo(0.7);
    expect(r.top3Share).toBeCloseTo(1);
    // HHI = 0.49 + 0.04 + 0.01 = 0.54 → concentrada
    expect(r.hhi).toBeCloseTo(0.54);
    expect(r.effectiveClients).toBeCloseTo(1 / 0.54);
    expect(r.level).toBe("concentrated");
  });

  it("soma o cachê por contato sobre vários shows não cancelados", () => {
    const r = clientConcentration([
      item("a", "A", [s({ fee: 300_00 }), s({ fee: 200_00 }), s({ fee: 100_00, status: "CANCELLED" })]),
    ]);
    expect(r.rows[0].totalFee).toBe(500_00);
    expect(r.rows[0].activeShows).toBe(2);
  });

  it("carteira equilibrada → diversificada", () => {
    // 5 contratantes de R$ 200 cada: HHI = 5 * 0.04 = 0.20 < 0.25
    const r = clientConcentration(
      ["a", "b", "c", "d", "e"].map((id) => item(id, id.toUpperCase(), [s({ fee: 200_00 })])),
    );
    expect(r.clientCount).toBe(5);
    expect(r.hhi).toBeCloseTo(0.2);
    expect(r.effectiveClients).toBeCloseTo(5);
    expect(r.level).toBe("diversified");
  });

  it("uma fonte dominante e várias pequenas → moderada na faixa intermediária", () => {
    // a=500, b..e=125 cada (total 1000): HHI = 0.25 + 4*0.015625 = 0.3125
    const r = clientConcentration([
      item("a", "A", [s({ fee: 500_00 })]),
      item("b", "B", [s({ fee: 125_00 })]),
      item("c", "C", [s({ fee: 125_00 })]),
      item("d", "D", [s({ fee: 125_00 })]),
      item("e", "E", [s({ fee: 125_00 })]),
    ]);
    expect(r.hhi).toBeCloseTo(0.3125);
    expect(r.level).toBe("moderate");
  });
});

describe("summarizeContactProfit", () => {
  const sh = (over: Partial<ContactShowLike> & { id: string }): ContactShowLike => ({
    title: "Show",
    date: "2026-06-01T20:00:00Z",
    status: "PLAYED",
    fee: 100_00,
    ...over,
  });
  const tx = (over: Partial<TxLike>): TxLike => ({
    type: "EXPENSE",
    amount: 0,
    category: "Transporte",
    date: "2026-06-01T20:00:00Z",
    received: true,
    showId: null,
    ...over,
  });

  it("trata lista vazia", () => {
    const r = summarizeContactProfit([], []);
    expect(r).toEqual({
      showCount: 0,
      totalFee: 0,
      totalExtra: 0,
      totalExpenses: 0,
      totalNet: 0,
      avgNet: 0,
      margin: 0,
    });
  });

  it("soma cachê e desconta despesas vinculadas (net por show)", () => {
    const shows = [sh({ id: "s1", fee: 100_00 }), sh({ id: "s2", fee: 200_00 })];
    const txs = [
      tx({ showId: "s1", type: "EXPENSE", amount: 30_00 }),
      tx({ showId: "s2", type: "EXPENSE", amount: 50_00 }),
    ];
    const r = summarizeContactProfit(shows, txs);
    expect(r.showCount).toBe(2);
    expect(r.totalFee).toBe(300_00);
    expect(r.totalExpenses).toBe(80_00);
    expect(r.totalNet).toBe(220_00);
    expect(r.avgNet).toBe(110_00);
  });

  it("inclui receita extra vinculada e calcula margem sobre a bruta", () => {
    const shows = [sh({ id: "s1", fee: 100_00 })];
    const txs = [
      tx({ showId: "s1", type: "INCOME", amount: 50_00 }), // merch
      tx({ showId: "s1", type: "EXPENSE", amount: 30_00 }),
    ];
    const r = summarizeContactProfit(shows, txs);
    expect(r.totalExtra).toBe(50_00);
    expect(r.totalExpenses).toBe(30_00);
    expect(r.totalNet).toBe(120_00); // 100 + 50 - 30
    expect(r.margin).toBeCloseTo(120_00 / 150_00); // net / (fee + extra)
  });

  it("ignora shows cancelados (espelha totalFee de summarizeContactShows)", () => {
    const shows = [
      sh({ id: "s1", fee: 100_00, status: "PLAYED" }),
      sh({ id: "s2", fee: 999_00, status: "CANCELLED" }),
    ];
    const txs = [tx({ showId: "s2", type: "EXPENSE", amount: 10_00 })];
    const r = summarizeContactProfit(shows, txs);
    expect(r.showCount).toBe(1);
    expect(r.totalFee).toBe(100_00);
    expect(r.totalExpenses).toBe(0); // despesa do cancelado não entra
    expect(r.totalNet).toBe(100_00);
  });

  it("ignora transações de outros shows (filtro por showId)", () => {
    const shows = [sh({ id: "s1", fee: 100_00 })];
    const txs = [tx({ showId: "outro", type: "EXPENSE", amount: 80_00 })];
    const r = summarizeContactProfit(shows, txs);
    expect(r.totalExpenses).toBe(0);
    expect(r.totalNet).toBe(100_00);
  });

  it("margem 0 quando receita bruta é 0", () => {
    const shows = [sh({ id: "s1", fee: 0 })];
    const txs = [tx({ showId: "s1", type: "EXPENSE", amount: 40_00 })];
    const r = summarizeContactProfit(shows, txs);
    expect(r.margin).toBe(0);
    expect(r.totalNet).toBe(-40_00); // prejuízo possível
  });
});
