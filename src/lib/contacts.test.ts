import { describe, it, expect } from "vitest";
import {
  summarizeContactShows,
  summarizeContactProfit,
  type ContactShowLike,
} from "./contacts";
import { filterShowsByYear } from "./finance";
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
  cancellationByContact,
  cancelledShowYears,
  cancellationHeadline,
  compareCancellationRate,
  pipelineByContact,
  pipelineByContactHeadline,
  compareContactPipelines,
  indexContactPipelineChanges,
  PIPELINE_CONCENTRATION_HIGH_SHARE,
  PIPELINE_CONCENTRATION_CRITICAL_SHARE,
  CANCELLATION_TREND_EPSILON,
  clientConcentration,
  clientConcentrationYears,
  indexClientShareChanges,
  CLIENT_SHARE_TREND_EPSILON,
  clientRetention,
  retentionPricingSignal,
  RETENTION_PRICING_EPSILON,
  filterContacts,
  findContactsToReengage,
  hasActiveContactFilter,
  isValidContactRole,
  rankContactsByActivity,
  MIN_CANCELLATION_SAMPLE,
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
    expect(r.recurringShows).toBe(0);
    expect(r.oneTimeFee).toBe(0);
    expect(r.recurringAvgFee).toBeNull();
    expect(r.oneTimeAvgFee).toBeNull();
    expect(r.avgShowsPerClient).toBe(0);
    expect(r.mostLoyal).toBeNull();
  });

  it("calcula o cachê médio POR SHOW de cada segmento (recorrentes × únicos)", () => {
    const r = clientRetention(
      [
        // recorrente: 3 shows, 900 → 300/show
        item("rec", "Recorrente", [
          s({ fee: 300_00 }),
          s({ fee: 300_00 }),
          s({ fee: 300_00 }),
        ]),
        // únicos: 1 show cada
        item("u1", "Único 1", [s({ fee: 200_00 })]),
        item("u2", "Único 2", [s({ fee: 400_00 })]),
      ],
      NOW,
    );
    expect(r.recurringShows).toBe(3);
    expect(r.recurringFee).toBe(900_00);
    expect(r.recurringAvgFee).toBe(300_00);
    expect(r.oneTimeFee).toBe(600_00);
    expect(r.oneTimeAvgFee).toBe(300_00); // (200+400)/2 clientes
  });

  it("deixa os médios por segmento nulos quando o segmento não existe", () => {
    const soloRecurring = clientRetention([item("rec", "Rec", [s(), s()])], NOW);
    expect(soloRecurring.recurringAvgFee).not.toBeNull();
    expect(soloRecurring.oneTimeAvgFee).toBeNull();

    const soloOneTime = clientRetention([item("uni", "Uni", [s()])], NOW);
    expect(soloOneTime.recurringAvgFee).toBeNull();
    expect(soloOneTime.oneTimeAvgFee).not.toBeNull();
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

describe("retentionPricingSignal", () => {
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

  it("é null sem um dos dois segmentos", () => {
    expect(retentionPricingSignal(clientRetention([], NOW))).toBeNull();
    // só recorrentes
    expect(
      retentionPricingSignal(clientRetention([item("r", "R", [s(), s()])], NOW)),
    ).toBeNull();
    // só únicos
    expect(
      retentionPricingSignal(clientRetention([item("u", "U", [s()])], NOW)),
    ).toBeNull();
  });

  it("é null quando algum segmento tem cachê médio zero", () => {
    const r = clientRetention(
      [
        item("rec", "Rec", [s({ fee: 0 }), s({ fee: 0 })]), // médio recorrente 0
        item("uni", "Uni", [s({ fee: 200_00 })]),
      ],
      NOW,
    );
    expect(retentionPricingSignal(r)).toBeNull();
  });

  it("aponta 'recurring-more' quando o fiel paga mais por show", () => {
    const r = clientRetention(
      [
        item("rec", "Rec", [s({ fee: 500_00 }), s({ fee: 500_00 })]), // 500/show
        item("uni", "Uni", [s({ fee: 200_00 })]), // 200/show
      ],
      NOW,
    );
    const sig = retentionPricingSignal(r)!;
    expect(sig.direction).toBe("recurring-more");
    expect(sig.recurringAvgFee).toBe(500_00);
    expect(sig.oneTimeAvgFee).toBe(200_00);
    expect(sig.delta).toBe(300_00);
    expect(sig.relativeDelta).toBeCloseTo(0.6);
  });

  it("aponta 'recurring-less' quando o fiel paga menos (loyalty creep)", () => {
    const r = clientRetention(
      [
        item("rec", "Rec", [s({ fee: 200_00 }), s({ fee: 200_00 })]), // 200/show
        item("uni", "Uni", [s({ fee: 500_00 })]), // 500/show
      ],
      NOW,
    );
    const sig = retentionPricingSignal(r)!;
    expect(sig.direction).toBe("recurring-less");
    expect(sig.delta).toBe(-300_00);
    expect(sig.relativeDelta).toBeCloseTo(-0.6);
  });

  it("empata em 'similar' dentro do limiar relativo de 5%", () => {
    const r = clientRetention(
      [
        item("rec", "Rec", [s({ fee: 400_00 }), s({ fee: 400_00 })]), // 400/show
        item("uni", "Uni", [s({ fee: 410_00 })]), // 410/show → ~2,4% de diferença
      ],
      NOW,
    );
    const sig = retentionPricingSignal(r)!;
    expect(sig.direction).toBe("similar");
    expect(Math.abs(sig.relativeDelta)).toBeLessThan(RETENTION_PRICING_EPSILON);
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

describe("clientConcentrationYears", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "CONFIRMED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name: id.toUpperCase() }, shows };
  }

  it("lista vazia → sem anos", () => {
    expect(clientConcentrationYears([])).toEqual([]);
  });

  it("anos UTC decrescentes e deduplicados dos shows que faturam", () => {
    const years = clientConcentrationYears([
      item("a", [s({ date: "2024-03-01T20:00:00Z" }), s({ date: "2026-01-10T20:00:00Z" })]),
      item("b", [s({ date: "2024-11-20T20:00:00Z" }), s({ date: "2025-07-07T20:00:00Z" })]),
    ]);
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it("ignora shows cancelados e sem cachê (não entram na concentração)", () => {
    const years = clientConcentrationYears([
      item("a", [
        s({ date: "2025-06-01T20:00:00Z", status: "CANCELLED" }),
        s({ date: "2024-06-01T20:00:00Z", fee: 0 }),
        s({ date: "2023-06-01T20:00:00Z", fee: 50_00 }),
      ]),
    ]);
    expect(years).toEqual([2023]);
  });

  it("usa o ano UTC da fronteira (01/01 00:00Z conta como o próprio ano)", () => {
    const years = clientConcentrationYears([
      item("a", [s({ date: "2025-01-01T00:00:00Z" })]),
    ]);
    expect(years).toEqual([2025]);
  });
});

describe("indexClientShareChanges", () => {
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

  it("id nulo/undefined e ids fora da carteira atual → none", () => {
    const cur = clientConcentration([item("a", "A", [s({ fee: 500_00 })])]);
    const prev = clientConcentration([item("a", "A", [s({ fee: 500_00 })])]);
    const lookup = indexClientShareChanges(cur, prev);
    expect(lookup(null).kind).toBe("none");
    expect(lookup(undefined).kind).toBe("none");
    expect(lookup("desconhecido").kind).toBe("none");
  });

  it("contratante só no ano atual → new", () => {
    const cur = clientConcentration([
      item("a", "A", [s({ fee: 500_00 })]),
      item("b", "B", [s({ fee: 500_00 })]),
    ]);
    const prev = clientConcentration([item("a", "A", [s({ fee: 500_00 })])]);
    const lookup = indexClientShareChanges(cur, prev);
    expect(lookup("b").kind).toBe("new");
  });

  it("subir a participação além do epsilon → up (mais dependência)", () => {
    // atual: a=800/1000=0.8; anterior: a=500/1000=0.5 → +0.30
    const cur = clientConcentration([
      item("a", "A", [s({ fee: 800_00 })]),
      item("b", "B", [s({ fee: 200_00 })]),
    ]);
    const prev = clientConcentration([
      item("a", "A", [s({ fee: 500_00 })]),
      item("b", "B", [s({ fee: 500_00 })]),
    ]);
    const st = indexClientShareChanges(cur, prev)("a");
    expect(st.kind).toBe("changed");
    if (st.kind === "changed") {
      expect(st.change.currentShare).toBeCloseTo(0.8);
      expect(st.change.previousShare).toBeCloseTo(0.5);
      expect(st.change.shareDelta).toBeCloseTo(0.3);
      expect(st.change.trend).toBe("up");
    }
  });

  it("cair a participação além do epsilon → down (menos dependência)", () => {
    const cur = clientConcentration([
      item("a", "A", [s({ fee: 200_00 })]),
      item("b", "B", [s({ fee: 800_00 })]),
    ]);
    const prev = clientConcentration([
      item("a", "A", [s({ fee: 500_00 })]),
      item("b", "B", [s({ fee: 500_00 })]),
    ]);
    const st = indexClientShareChanges(cur, prev)("a");
    expect(st.kind).toBe("changed");
    if (st.kind === "changed") expect(st.change.trend).toBe("down");
  });

  it("variação dentro do epsilon → flat", () => {
    // +1 p.p. (0,01) < epsilon (0,02) → ruído, não vira up/down
    const cur = clientConcentration([
      item("a", "A", [s({ fee: 510_00 })]),
      item("b", "B", [s({ fee: 490_00 })]),
    ]);
    const prev = clientConcentration([
      item("a", "A", [s({ fee: 500_00 })]),
      item("b", "B", [s({ fee: 500_00 })]),
    ]);
    const st = indexClientShareChanges(cur, prev)("a");
    expect(st.kind).toBe("changed");
    if (st.kind === "changed") {
      expect(st.change.shareDelta).toBeCloseTo(0.01);
      expect(st.change.shareDelta).toBeLessThan(CLIENT_SHARE_TREND_EPSILON);
      expect(st.change.trend).toBe("flat");
    }
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

describe("cancellationByContact", () => {
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
    const r = cancellationByContact([]);
    expect(r.rows).toEqual([]);
    expect(r.contactCount).toBe(0);
    expect(r.totalShows).toBe(0);
    expect(r.totalCancelled).toBe(0);
    expect(r.totalLostFee).toBe(0);
    expect(r.overallRate).toBe(0);
    expect(r.minSample).toBe(MIN_CANCELLATION_SAMPLE);
  });

  it("só lista contatos com ao menos um cancelamento", () => {
    const r = cancellationByContact([
      item("limpo", "Limpo", [s({ status: "PLAYED" }), s({ status: "CONFIRMED" })]),
      item("furao", "Furão", [s({ status: "CANCELLED", fee: 300_00 }), s({ status: "PLAYED" })]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["furao"]);
    expect(r.contactCount).toBe(1);
    // agregados somam TODOS os contatos com shows, não só os listados
    expect(r.totalShows).toBe(4);
    expect(r.totalCancelled).toBe(1);
    expect(r.totalLostFee).toBe(300_00);
    expect(r.overallRate).toBeCloseTo(0.25);
  });

  it("mede taxa e cachê perdido por contato", () => {
    const r = cancellationByContact([
      item("a", "A", [
        s({ status: "CANCELLED", fee: 200_00 }),
        s({ status: "CANCELLED", fee: 100_00 }),
        s({ status: "PLAYED" }),
        s({ status: "CONFIRMED" }),
      ]),
    ]);
    const row = r.rows[0];
    expect(row.totalShows).toBe(4);
    expect(row.cancelledShows).toBe(2);
    expect(row.cancellationRate).toBeCloseTo(0.5);
    expect(row.lostFee).toBe(300_00);
    expect(row.reliable).toBe(true); // 4 >= 3
  });

  it("ordena confiáveis (amostra >= minSample) antes das ruidosas, depois por taxa", () => {
    const r = cancellationByContact([
      // ruidoso: 1/1 = 100% mas amostra 1
      item("ruido", "Ruidoso", [s({ status: "CANCELLED", fee: 900_00 })]),
      // confiável: 2/4 = 50% com amostra 4
      item("solido", "Sólido", [
        s({ status: "CANCELLED", fee: 100_00 }),
        s({ status: "CANCELLED", fee: 100_00 }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["solido", "ruido"]);
    expect(r.rows[0].reliable).toBe(true);
    expect(r.rows[1].reliable).toBe(false);
  });

  it("entre confiáveis, maior taxa primeiro; desempata por cancelados e cachê", () => {
    const r = cancellationByContact([
      item("baixo", "Baixo", [
        s({ status: "CANCELLED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]), // 1/3
      item("alto", "Alto", [
        s({ status: "CANCELLED" }),
        s({ status: "CANCELLED" }),
        s({ status: "PLAYED" }),
      ]), // 2/3
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["alto", "baixo"]);
  });

  it("respeita minSample customizado", () => {
    const r = cancellationByContact(
      [item("a", "A", [s({ status: "CANCELLED" }), s({ status: "PLAYED" })])],
      2,
    );
    expect(r.minSample).toBe(2);
    expect(r.rows[0].reliable).toBe(true); // 2 >= 2
  });

  it("conta por relação: um show cancelado vinculado a 2 contatos conta para cada", () => {
    const r = cancellationByContact([
      item("a", "A", [s({ status: "CANCELLED", fee: 500_00 })]),
      item("b", "B", [s({ status: "CANCELLED", fee: 500_00 })]),
    ]);
    expect(r.totalCancelled).toBe(2);
    expect(r.totalLostFee).toBe(1000_00);
    expect(r.contactCount).toBe(2);
  });

  it("ignora contatos sem shows vinculados", () => {
    const r = cancellationByContact([
      item("vazio", "Vazio", []),
      item("furao", "Furão", [s({ status: "CANCELLED" })]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["furao"]);
    expect(r.totalShows).toBe(1);
  });
});

describe("cancelledShowYears", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "CONFIRMED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name: id }, shows };
  }

  it("lista vazia devolve sem anos", () => {
    expect(cancelledShowYears([])).toEqual([]);
  });

  it("só considera shows cancelados, ignorando os demais status", () => {
    const years = cancelledShowYears([
      item("a", [
        s({ status: "CANCELLED", date: "2024-03-10T00:00:00Z" }),
        s({ status: "PLAYED", date: "2023-01-01T00:00:00Z" }), // ativo → não conta
      ]),
    ]);
    expect(years).toEqual([2024]);
  });

  it("deduplica e ordena os anos do mais recente ao mais antigo", () => {
    const years = cancelledShowYears([
      item("a", [
        s({ status: "CANCELLED", date: "2024-06-01T00:00:00Z" }),
        s({ status: "CANCELLED", date: "2026-02-01T00:00:00Z" }),
      ]),
      item("b", [
        s({ status: "CANCELLED", date: "2024-11-01T00:00:00Z" }), // 2024 repetido
        s({ status: "CANCELLED", date: "2025-08-01T00:00:00Z" }),
      ]),
    ]);
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it("usa o ano UTC (aceita Date e string ISO)", () => {
    const years = cancelledShowYears([
      item("a", [
        s({ status: "CANCELLED", date: new Date("2025-12-31T23:00:00Z") }),
        s({ status: "CANCELLED", date: "2023-01-01T00:00:00Z" }),
      ]),
    ]);
    expect(years).toEqual([2025, 2023]);
  });
});

describe("cancellationByContact — recorte por período (ano)", () => {
  // Compõe filterShowsByYear (finance) + cancellationByContact (contacts), como a
  // página /contatos/cancelamentos: filtrar os shows por ano antes de agregar
  // recorta a taxa e o cachê perdido àquele ano, sem tocar a lógica pura. Os
  // shows usam `date: Date` concreto (como o Prisma entrega na página) para
  // satisfazer o `{ date: Date }` de filterShowsByYear.
  interface DatedShow {
    status: string;
    date: Date;
    fee: number;
  }
  function s(over: Partial<DatedShow> = {}): DatedShow {
    return { status: "CONFIRMED", date: new Date("2026-05-01T20:00:00Z"), fee: 100_00, ...over };
  }

  const items = [
    {
      contact: { id: "furao", name: "Furão" },
      shows: [
        s({ status: "CANCELLED", fee: 300_00, date: new Date("2025-04-01T00:00:00Z") }),
        s({ status: "CANCELLED", fee: 200_00, date: new Date("2026-04-01T00:00:00Z") }),
        s({ status: "PLAYED", date: new Date("2026-05-01T00:00:00Z") }),
      ],
    },
  ];

  it("recorta a taxa e o cachê perdido ao ano selecionado", () => {
    const filtered = items.map((it) => ({
      contact: it.contact,
      shows: filterShowsByYear(it.shows, 2026),
    }));
    const r = cancellationByContact(filtered);
    expect(r.totalShows).toBe(2); // só os 2 shows de 2026
    expect(r.totalCancelled).toBe(1);
    expect(r.totalLostFee).toBe(200_00);
    expect(r.rows[0].cancellationRate).toBeCloseTo(0.5);
  });

  it("sem recorte (\"all\") agrega todos os anos", () => {
    const filtered = items.map((it) => ({
      contact: it.contact,
      shows: filterShowsByYear(it.shows, "all"),
    }));
    const r = cancellationByContact(filtered);
    expect(r.totalShows).toBe(3);
    expect(r.totalCancelled).toBe(2);
    expect(r.totalLostFee).toBe(500_00);
  });
});

describe("pipelineByContact", () => {
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
    const r = pipelineByContact([]);
    expect(r.rows).toEqual([]);
    expect(r.contactCount).toBe(0);
    expect(r.totalOpenValue).toBe(0);
    expect(r.totalOpenCount).toBe(0);
    expect(r.totalProposedValue).toBe(0);
    expect(r.totalConfirmedValue).toBe(0);
    expect(r.overallConversionRate).toBeNull();
  });

  it("só lista contratantes com pipeline aberto (PROPOSED ou CONFIRMED)", () => {
    const r = pipelineByContact([
      // só shows já decididos → sem pipeline aberto, fora da lista
      item("fechado", "Fechado", [s({ status: "PLAYED" }), s({ status: "CANCELLED" })]),
      // tem proposta em aberto → entra
      item("ativo", "Ativo", [s({ status: "PROPOSED", fee: 300_00 })]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["ativo"]);
    expect(r.contactCount).toBe(1);
    // agregados da carteira somam TODOS os contatos com shows
    expect(r.totalOpenValue).toBe(300_00);
    expect(r.totalOpenCount).toBe(1);
    // conversão da carteira: 1 PLAYED de 2 decididos (do "Fechado")
    expect(r.overallConversionRate).toBeCloseTo(0.5);
  });

  it("separa proposto e confirmado e soma o aberto por contratante", () => {
    const r = pipelineByContact([
      item("a", "A", [
        s({ status: "PROPOSED", fee: 200_00 }),
        s({ status: "CONFIRMED", fee: 500_00 }),
        s({ status: "PLAYED", fee: 100_00 }),
        s({ status: "CANCELLED", fee: 100_00 }),
      ]),
    ]);
    const row = r.rows[0];
    expect(row.totalShows).toBe(4);
    expect(row.proposedCount).toBe(1);
    expect(row.proposedValue).toBe(200_00);
    expect(row.confirmedCount).toBe(1);
    expect(row.confirmedValue).toBe(500_00);
    expect(row.openCount).toBe(2);
    expect(row.openValue).toBe(700_00);
    expect(row.playedCount).toBe(1);
    expect(row.cancelledCount).toBe(1);
    expect(row.decidedCount).toBe(2);
    expect(row.conversionRate).toBeCloseTo(0.5);
  });

  it("conversionRate é null quando o contratante nada decidiu ainda", () => {
    const r = pipelineByContact([
      item("novo", "Novo", [s({ status: "PROPOSED", fee: 100_00 })]),
    ]);
    expect(r.rows[0].conversionRate).toBeNull();
  });

  it("ordena por maior cachê em aberto, depois nº de shows abertos", () => {
    const r = pipelineByContact([
      item("medio", "Médio", [s({ status: "CONFIRMED", fee: 300_00 })]),
      item("grande", "Grande", [s({ status: "PROPOSED", fee: 900_00 })]),
      // mesmo cachê aberto do "Médio" (300), mas 2 shows → vem antes por openCount
      item("varios", "Vários", [
        s({ status: "PROPOSED", fee: 150_00 }),
        s({ status: "CONFIRMED", fee: 150_00 }),
      ]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["grande", "varios", "medio"]);
  });

  it("desempata cachê e contagem iguais pelo nome (pt-BR) e id", () => {
    const r = pipelineByContact([
      item("z", "Zé", [s({ status: "PROPOSED", fee: 100_00 })]),
      item("a", "Ana", [s({ status: "PROPOSED", fee: 100_00 })]),
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual(["a", "z"]);
  });

  it("ignora contatos sem shows e status desconhecido", () => {
    const r = pipelineByContact([
      item("vazio", "Vazio", []),
      item("estranho", "Estranho", [
        s({ status: "RASCUNHO", fee: 999_00 }),
        s({ status: "CONFIRMED", fee: 100_00 }),
      ]),
    ]);
    // "Vazio" some; "Estranho" entra só com o CONFIRMED (o status desconhecido é ignorado)
    expect(r.rows.map((x) => x.contact.id)).toEqual(["estranho"]);
    const row = r.rows[0];
    expect(row.totalShows).toBe(2); // totalShows conta a relação, inclusive o desconhecido
    expect(row.openValue).toBe(100_00);
    expect(row.openCount).toBe(1);
  });

  it("agrega o proposto e o confirmado da carteira", () => {
    const r = pipelineByContact([
      item("a", "A", [s({ status: "PROPOSED", fee: 200_00 })]),
      item("b", "B", [s({ status: "CONFIRMED", fee: 500_00 })]),
    ]);
    expect(r.totalProposedValue).toBe(200_00);
    expect(r.totalConfirmedValue).toBe(500_00);
    expect(r.totalOpenValue).toBe(700_00);
    expect(r.totalOpenCount).toBe(2);
  });
});

describe("pipelineByContact — recorte por período (ano)", () => {
  // Compõe filterShowsByYear (finance) + pipelineByContact (contacts), como a
  // página /contatos/funil: filtrar os shows por ano ANTES de agregar recorta o
  // pipeline aberto (e a concretização) àquele ano, sem tocar a lógica pura. Os
  // shows usam `date: Date` concreto (como o Prisma entrega na página) para
  // satisfazer o `{ date: Date }` de filterShowsByYear.
  interface DatedShow {
    status: string;
    date: Date;
    fee: number;
  }
  function s(over: Partial<DatedShow> = {}): DatedShow {
    return { status: "CONFIRMED", date: new Date("2026-05-01T20:00:00Z"), fee: 100_00, ...over };
  }

  const items = [
    {
      contact: { id: "a", name: "A" },
      shows: [
        // 2025: só decidido → nada em aberto naquele ano
        s({ status: "PLAYED", date: new Date("2025-04-01T00:00:00Z") }),
        // 2026: proposta em aberto
        s({ status: "PROPOSED", fee: 300_00, date: new Date("2026-04-01T00:00:00Z") }),
      ],
    },
    {
      contact: { id: "b", name: "B" },
      shows: [
        // só 2025 em aberto
        s({ status: "CONFIRMED", fee: 500_00, date: new Date("2025-07-01T00:00:00Z") }),
      ],
    },
  ];

  function scoped(year: 2025 | 2026 | "all") {
    return pipelineByContact(
      items.map((it) => ({ contact: it.contact, shows: filterShowsByYear(it.shows, year) })),
    );
  }

  it("recorta o pipeline aberto ao ano selecionado", () => {
    const r = scoped(2026);
    // só "A" tem pipeline aberto em 2026 (a proposta de 300); "B" some
    expect(r.rows.map((x) => x.contact.id)).toEqual(["a"]);
    expect(r.rows[0].openValue).toBe(300_00);
    expect(r.totalOpenValue).toBe(300_00);
    expect(r.totalOpenCount).toBe(1);
  });

  it("um ano diferente muda quem aparece", () => {
    const r = scoped(2025);
    // em 2025 só "B" tem cachê em aberto (o show de "A" naquele ano é PLAYED)
    expect(r.rows.map((x) => x.contact.id)).toEqual(["b"]);
    expect(r.totalOpenValue).toBe(500_00);
  });

  it('"all" preserva a carteira inteira (comportamento histórico)', () => {
    const r = scoped("all");
    expect(r.rows.map((x) => x.contact.id).sort()).toEqual(["a", "b"]);
    expect(r.totalOpenValue).toBe(800_00);
    expect(r.totalOpenCount).toBe(2);
  });
});

describe("pipelineByContactHeadline", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "PROPOSED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    name: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name }, shows };
  }

  it("não mostra sem pipeline aberto", () => {
    const h = pipelineByContactHeadline(pipelineByContact([]));
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.topShare).toBe(0);
    expect(h.totalOpenValue).toBe(0);
  });

  it("contratante único com pipeline aberto → crítico (100%)", () => {
    const h = pipelineByContactHeadline(
      pipelineByContact([item("uni", "Único", [s({ fee: 500_00 })])]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.contact?.id).toBe("uni");
    expect(h.openValue).toBe(500_00);
    expect(h.topShare).toBeCloseTo(1);
    expect(h.contactCount).toBe(1);
  });

  it("mostra quando o maior concentra ≥ metade do pipeline (mas < 2/3 → não crítico)", () => {
    // Maior = 550 de 1000 = 55% → acima do HIGH (0.5), abaixo do CRITICAL (2/3)
    const h = pipelineByContactHeadline(
      pipelineByContact([
        item("grande", "Grande", [s({ fee: 550_00 })]),
        item("b", "B", [s({ fee: 250_00 })]),
        item("c", "C", [s({ fee: 200_00 })]),
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.contact?.id).toBe("grande");
    expect(h.topShare).toBeCloseTo(0.55);
  });

  it("não mostra quando o pipeline está distribuído (< metade no maior)", () => {
    // Maior = 400 de 1000 = 40% → abaixo do HIGH (0.5)
    const h = pipelineByContactHeadline(
      pipelineByContact([
        item("a", "A", [s({ fee: 400_00 })]),
        item("b", "B", [s({ fee: 350_00 })]),
        item("c", "C", [s({ fee: 250_00 })]),
      ]),
    );
    expect(h.show).toBe(false);
    expect(h.topShare).toBeCloseTo(0.4);
  });

  it("crítico quando o maior passa de 2/3 do pipeline, com mais de um contratante", () => {
    // Maior = 700 de 1000 = 70% → acima do CRITICAL (2/3)
    const h = pipelineByContactHeadline(
      pipelineByContact([
        item("dominante", "Dominante", [s({ fee: 700_00 })]),
        item("b", "B", [s({ fee: 300_00 })]),
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.contact?.id).toBe("dominante");
    expect(h.contactCount).toBe(2);
  });

  it("respeita limiares injetados", () => {
    const report = pipelineByContact([
      item("a", "A", [s({ fee: 400_00 })]),
      item("b", "B", [s({ fee: 600_00 })]),
    ]);
    // topShare = 0.6: com HIGH=0.5 default mostra; com HIGH=0.7 não
    expect(pipelineByContactHeadline(report).show).toBe(true);
    expect(pipelineByContactHeadline(report, 0.7).show).toBe(false);
    // com CRITICAL=0.5, o 0.6 vira crítico
    expect(pipelineByContactHeadline(report, 0.5, 0.5).critical).toBe(true);
  });

  it("os limiares default são coerentes (HIGH < CRITICAL)", () => {
    expect(PIPELINE_CONCENTRATION_HIGH_SHARE).toBeLessThan(
      PIPELINE_CONCENTRATION_CRITICAL_SHARE,
    );
  });
});

describe("compareContactPipelines", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "PLAYED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    name: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name }, shows };
  }
  // Contratante com pipeline aberto (1 PROPOSED) + N PLAYED + M CANCELLED, para
  // controlar a taxa de concretização mantendo-o na lista (openCount >= 1).
  function contact(id: string, played: number, cancelled: number) {
    const shows: ContactRankShowLike[] = [s({ status: "PROPOSED" })];
    for (let i = 0; i < played; i++) shows.push(s({ status: "PLAYED" }));
    for (let i = 0; i < cancelled; i++) shows.push(s({ status: "CANCELLED" }));
    return item(id, id, shows);
  }

  it("dois períodos vazios → sem movers", () => {
    const c = compareContactPipelines(pipelineByContact([]), pipelineByContact([]));
    expect(c.changes).toEqual([]);
    expect(c.biggestImprovement).toBeNull();
    expect(c.biggestWorsening).toBeNull();
    expect(c.newContacts).toEqual([]);
    expect(c.droppedContacts).toEqual([]);
  });

  it("casa contratantes dos dois períodos e mede a variação da concretização", () => {
    // A: 1/2 (50%) → 3/4 (75%) = +0.25 melhora; B: 3/4 (75%) → 1/2 (50%) = -0.25 piora
    const current = pipelineByContact([contact("a", 3, 1), contact("b", 1, 1)]);
    const previous = pipelineByContact([contact("a", 1, 1), contact("b", 3, 1)]);
    const c = compareContactPipelines(current, previous);
    expect(c.changes.length).toBe(2);
    const a = c.changes.find((x) => x.contact.id === "a")!;
    const b = c.changes.find((x) => x.contact.id === "b")!;
    expect(a.conversionRateDelta).toBeCloseTo(0.25);
    expect(a.trend).toBe("improved");
    expect(b.conversionRateDelta).toBeCloseTo(-0.25);
    expect(b.trend).toBe("worsened");
    expect(c.biggestImprovement?.contact.id).toBe("a");
    expect(c.biggestWorsening?.contact.id).toBe("b");
    // "subir a taxa é melhora" → o playedCountDelta acompanha
    expect(a.playedCountDelta).toBe(2);
  });

  it("ordena as changes da maior piora à maior melhora", () => {
    // pior: -0.5; leve piora: -0.25; melhora: +0.5
    const current = pipelineByContact([
      contact("pior", 0, 1), // 0/1 = 0%
      contact("leve", 1, 3), // 1/4 = 25%
      contact("melhor", 3, 1), // 3/4 = 75%
    ]);
    const previous = pipelineByContact([
      contact("pior", 1, 1), // 1/2 = 50%
      contact("leve", 1, 1), // 1/2 = 50%
      contact("melhor", 1, 3), // 1/4 = 25%
    ]);
    const c = compareContactPipelines(current, previous);
    expect(c.changes.map((x) => x.contact.id)).toEqual(["pior", "leve", "melhor"]);
  });

  it("variação dentro do limiar → estável, fora dos movers", () => {
    // 1/2 (50%) → 2/4 (50%) = 0 → estável (< CONVERSION_TREND_EPSILON)
    const current = pipelineByContact([contact("x", 2, 2)]);
    const previous = pipelineByContact([contact("x", 1, 1)]);
    const c = compareContactPipelines(current, previous);
    expect(c.changes[0].conversionRateDelta).toBeCloseTo(0);
    expect(c.changes[0].trend).toBe("stable");
    expect(c.biggestImprovement).toBeNull();
    expect(c.biggestWorsening).toBeNull();
  });

  it("taxa indefinida em algum período → delta null, estável e ao fim da ordem", () => {
    // "novo": sem decididos no anterior (só PROPOSED) → taxa null no previous
    const current = pipelineByContact([
      item("novo", "novo", [s({ status: "PROPOSED" }), s({ status: "PLAYED" })]),
      contact("real", 0, 1), // 50% → 0% (piora clara)
    ]);
    const previous = pipelineByContact([
      item("novo", "novo", [s({ status: "PROPOSED" })]),
      contact("real", 1, 1),
    ]);
    const c = compareContactPipelines(current, previous);
    const novo = c.changes.find((x) => x.contact.id === "novo")!;
    expect(novo.conversionRateDelta).toBeNull();
    expect(novo.trend).toBe("stable");
    // delta null vai ao fim; a piora real vem antes
    expect(c.changes[c.changes.length - 1].contact.id).toBe("novo");
  });

  it("separa novos (só no atual) e sumidos (só no anterior)", () => {
    const current = pipelineByContact([contact("fica", 1, 1), contact("novo", 1, 1)]);
    const previous = pipelineByContact([contact("fica", 1, 1), contact("sumiu", 1, 1)]);
    const c = compareContactPipelines(current, previous);
    expect(c.changes.map((x) => x.contact.id)).toEqual(["fica"]);
    expect(c.newContacts.map((x) => x.contact.id)).toEqual(["novo"]);
    expect(c.droppedContacts.map((x) => x.contact.id)).toEqual(["sumiu"]);
  });

  it("registra a variação do cachê em aberto (informativa)", () => {
    const current = pipelineByContact([
      item("a", "a", [s({ status: "PROPOSED", fee: 500_00 }), s({ status: "PLAYED" })]),
    ]);
    const previous = pipelineByContact([
      item("a", "a", [s({ status: "PROPOSED", fee: 200_00 }), s({ status: "PLAYED" })]),
    ]);
    const c = compareContactPipelines(current, previous);
    expect(c.changes[0].openValueDelta).toBe(300_00);
  });
});

describe("indexContactPipelineChanges", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "PLAYED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(id: string, shows: ContactRankShowLike[]): ContactWithShows<ContactRankLike> {
    return { contact: { id, name: id }, shows };
  }
  function contact(id: string, played: number, cancelled: number) {
    const shows: ContactRankShowLike[] = [s({ status: "PROPOSED" })];
    for (let i = 0; i < played; i++) shows.push(s({ status: "PLAYED" }));
    for (let i = 0; i < cancelled; i++) shows.push(s({ status: "CANCELLED" }));
    return item(id, shows);
  }

  it("id nulo/ausente → none", () => {
    const cmp = compareContactPipelines(pipelineByContact([]), pipelineByContact([]));
    const at = indexContactPipelineChanges(cmp);
    expect(at(null).kind).toBe("none");
    expect(at(undefined).kind).toBe("none");
    expect(at("qualquer").kind).toBe("none");
  });

  it("contratante nos dois períodos → changed com a variação da taxa", () => {
    // 1/2 (50%) → 3/4 (75%) = +0.25 melhora
    const current = pipelineByContact([contact("a", 3, 1)]);
    const previous = pipelineByContact([contact("a", 1, 1)]);
    const at = indexContactPipelineChanges(compareContactPipelines(current, previous));
    const st = at("a");
    expect(st.kind).toBe("changed");
    if (st.kind === "changed") {
      expect(st.change.conversionRateDelta).toBeCloseTo(0.25);
      expect(st.change.trend).toBe("improved");
    }
  });

  it("só no período atual → new; só no anterior → none", () => {
    const current = pipelineByContact([contact("fica", 1, 1), contact("novo", 1, 1)]);
    const previous = pipelineByContact([contact("fica", 1, 1), contact("sumiu", 1, 1)]);
    const at = indexContactPipelineChanges(compareContactPipelines(current, previous));
    expect(at("fica").kind).toBe("changed");
    expect(at("novo").kind).toBe("new");
    expect(at("sumiu").kind).toBe("none");
  });

  it("taxa indefinida em algum período → changed com delta null", () => {
    const current = pipelineByContact([
      item("x", [s({ status: "PROPOSED" }), s({ status: "PLAYED" })]),
    ]);
    const previous = pipelineByContact([item("x", [s({ status: "PROPOSED" })])]);
    const at = indexContactPipelineChanges(compareContactPipelines(current, previous));
    const st = at("x");
    expect(st.kind).toBe("changed");
    if (st.kind === "changed") expect(st.change.conversionRateDelta).toBeNull();
  });
});

describe("cancellationHeadline", () => {
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

  it("não dispara sem cancelamentos", () => {
    const h = cancellationHeadline(cancellationByContact([]));
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.flaggedCount).toBe(0);
  });

  it("ignora contratante ruidoso (amostra pequena) mesmo com taxa 100%", () => {
    // 1/1 = 100% mas amostra 1 → não é padrão confiável, não vira nudge
    const h = cancellationHeadline(
      cancellationByContact([
        item("ruido", "Ruidoso", [s({ status: "CANCELLED", fee: 900_00 })]),
      ]),
    );
    expect(h.show).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.flaggedCount).toBe(0);
  });

  it("dispara para confiável acima do limiar; expõe o pior contratante", () => {
    const h = cancellationHeadline(
      cancellationByContact([
        item("furao", "Furão", [
          s({ status: "CANCELLED", fee: 200_00 }),
          s({ status: "CANCELLED", fee: 100_00 }),
          s({ status: "PLAYED" }),
          s({ status: "PLAYED" }),
        ]), // 2/4 = 50%, amostra 4
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("furao");
    expect(h.cancelledShows).toBe(2);
    expect(h.totalShows).toBe(4);
    expect(h.cancellationRate).toBeCloseTo(0.5);
    expect(h.lostFee).toBe(300_00);
    expect(h.critical).toBe(true); // 50% >= CRITICAL_CANCELLATION_RATE
    expect(h.flaggedCount).toBe(1);
  });

  it("não fica crítico entre highRate e criticalRate", () => {
    const h = cancellationHeadline(
      cancellationByContact([
        item("morno", "Morno", [
          s({ status: "CANCELLED" }),
          s({ status: "PLAYED" }),
          s({ status: "PLAYED" }),
        ]), // 1/3 ≈ 33%, amostra 3
      ]),
    );
    expect(h.show).toBe(true); // 0.33 >= 0.3
    expect(h.critical).toBe(false); // 0.33 < 0.5
    expect(h.contact?.id).toBe("morno");
  });

  it("não dispara abaixo do limiar de taxa alta", () => {
    const h = cancellationHeadline(
      cancellationByContact([
        item("ok", "Ok", [
          s({ status: "CANCELLED" }),
          s({ status: "PLAYED" }),
          s({ status: "PLAYED" }),
          s({ status: "PLAYED" }),
          s({ status: "PLAYED" }),
        ]), // 1/5 = 20% < 30%
      ]),
    );
    expect(h.show).toBe(false);
  });

  it("escolhe o pior confiável e conta os demais sinalizados", () => {
    const h = cancellationHeadline(
      cancellationByContact([
        item("meio", "Meio", [
          s({ status: "CANCELLED" }),
          s({ status: "CANCELLED" }),
          s({ status: "PLAYED" }),
          s({ status: "PLAYED" }),
        ]), // 2/4 = 50%
        item("pior", "Pior", [
          s({ status: "CANCELLED" }),
          s({ status: "CANCELLED" }),
          s({ status: "CANCELLED" }),
          s({ status: "PLAYED" }),
        ]), // 3/4 = 75%
      ]),
    );
    expect(h.contact?.id).toBe("pior");
    expect(h.cancellationRate).toBeCloseTo(0.75);
    expect(h.flaggedCount).toBe(2); // ambos acima de 30% e confiáveis
  });

  it("respeita limiares customizados", () => {
    const report = cancellationByContact([
      item("morno", "Morno", [
        s({ status: "CANCELLED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]), // 1/4 = 25%
    ]);
    // limiar padrão (0.3) não pega 25%
    expect(cancellationHeadline(report).show).toBe(false);
    // baixando o limiar para 0.2, pega — e vira crítico com criticalRate 0.25
    const h = cancellationHeadline(report, 0.2, 0.25);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
  });
});

describe("compareCancellationRate", () => {
  function s(over: Partial<ContactRankShowLike> = {}): ContactRankShowLike {
    return { status: "CONFIRMED", date: "2026-05-01T20:00:00Z", fee: 100_00, ...over };
  }
  function item(
    id: string,
    shows: ContactRankShowLike[],
  ): ContactWithShows<ContactRankLike> {
    return { contact: { id, name: id }, shows };
  }

  it("aponta piora quando a taxa da carteira sobe além do limiar", () => {
    // ano anterior: 1/5 = 20%; ano atual: 3/5 = 60%
    const previous = cancellationByContact([
      item("a", [
        s({ status: "CANCELLED", fee: 200_00 }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]),
    ]);
    const current = cancellationByContact([
      item("a", [
        s({ status: "CANCELLED", fee: 300_00 }),
        s({ status: "CANCELLED", fee: 300_00 }),
        s({ status: "CANCELLED", fee: 300_00 }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]),
    ]);
    const cmp = compareCancellationRate(current, previous);
    expect(cmp.overallRateDelta).toBeCloseTo(0.4);
    expect(cmp.lostFeeDelta).toBe(700_00); // 900_00 − 200_00
    expect(cmp.trend).toBe("worsened");
  });

  it("aponta melhora quando a taxa cai além do limiar", () => {
    const previous = cancellationByContact([
      item("a", [
        s({ status: "CANCELLED" }),
        s({ status: "CANCELLED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]),
    ]); // 2/4 = 50%
    const current = cancellationByContact([
      item("a", [
        s({ status: "CANCELLED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]),
    ]); // 1/4 = 25%
    const cmp = compareCancellationRate(current, previous);
    expect(cmp.overallRateDelta).toBeCloseTo(-0.25);
    expect(cmp.trend).toBe("improved");
  });

  it("trata variação dentro do limiar como estável", () => {
    // 2/10 = 20% → 3/10 = 30%: 10 pontos — mas testamos o piso do limiar com
    // uma variação de exatamente EPSILON e uma logo abaixo.
    const previous = cancellationByContact([
      item("a", [s({ status: "CANCELLED" }), ...Array(9).fill(s({ status: "PLAYED" }))]),
    ]); // 1/10 = 10%
    // atual 13% ≈ dentro de 5 p.p. → estável
    const current = cancellationByContact([
      item("a", [
        s({ status: "CANCELLED" }),
        s({ status: "CANCELLED" }),
        ...Array(13).fill(s({ status: "PLAYED" })),
      ]),
    ]); // 2/15 ≈ 13.3%
    const cmp = compareCancellationRate(current, previous);
    expect(Math.abs(cmp.overallRateDelta)).toBeLessThan(CANCELLATION_TREND_EPSILON);
    expect(cmp.trend).toBe("stable");
  });

  it("melhora até taxa zero quando o período atual não teve cancelamentos", () => {
    const previous = cancellationByContact([
      item("a", [
        s({ status: "CANCELLED" }),
        s({ status: "CANCELLED" }),
        s({ status: "PLAYED" }),
        s({ status: "PLAYED" }),
      ]),
    ]); // 50%
    const current = cancellationByContact([
      item("a", [s({ status: "PLAYED" }), s({ status: "PLAYED" })]),
    ]); // 0%
    const cmp = compareCancellationRate(current, previous);
    expect(cmp.current.overallRate).toBe(0);
    expect(cmp.overallRateDelta).toBeCloseTo(-0.5);
    expect(cmp.trend).toBe("improved");
  });
});
