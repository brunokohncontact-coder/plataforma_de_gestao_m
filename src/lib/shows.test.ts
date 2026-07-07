import { describe, it, expect } from "vitest";
import {
  filterShows,
  findScheduleConflicts,
  findOpenWeekends,
  formatWeekendLabel,
  weekendKeyToDate,
  parseWeekendWindow,
  WEEKEND_WINDOW_DEFAULT,
  WEEKEND_WINDOW_MIN,
  WEEKEND_WINDOW_MAX,
  hasActiveShowFilter,
  isValidShowStatus,
  bookingLeadTime,
  bookingLeadTimeYears,
  parseLeadTimeScope,
  compareBookingLeadTime,
  compareBookingLeadTimeScopes,
  bookingLeadTimeHeadline,
  summarizeMonthShows,
  summarizeWeekShows,
  buildDuplicatedShow,
  buildDuplicatedShowSeries,
  parseDuplicateInterval,
  parseDuplicateCount,
  DUPLICATE_SHOW_WEEKS_AHEAD,
  DUPLICATE_INTERVAL_WEEKS,
  DEFAULT_DUPLICATE_INTERVAL,
  DEFAULT_DUPLICATE_COUNT,
  MAX_DUPLICATE_COUNT,
  LEAD_TIME_TREND_EPSILON,
  LEAD_TIME_SHORT_DAYS,
  LEAD_TIME_CRITICAL_DAYS,
  MIN_LEAD_TIME_SAMPLE,
  buildStatusTimeline,
  funnelStageDurations,
  proposalOutcomes,
  proposalOutcomeYears,
  proposalOutcomesByContact,
  compareProposalOutcomes,
  proposalConversionHeadline,
  CONVERSION_DROP_MIN_DECIDED,
  CONVERSION_DROP_POINTS,
  CONVERSION_DROP_CRITICAL_POINTS,
  findStaleProposals,
  staleProposalsHeadline,
  STALE_PROPOSAL_DAYS,
  STALE_PROPOSAL_IMMINENT_DAYS,
  type ConflictShowLike,
  type StaleProposalShowLike,
  type LeadTimeShowLike,
  type ShowLike,
  type StatusEventLike,
} from "./shows";

function show(partial: Partial<ShowLike>): ShowLike {
  return {
    title: "Show",
    venue: null,
    city: null,
    status: "CONFIRMED",
    date: "2026-03-10T00:00:00.000Z",
    ...partial,
  };
}

describe("isValidShowStatus", () => {
  it("aceita os status conhecidos", () => {
    expect(isValidShowStatus("PROPOSED")).toBe(true);
    expect(isValidShowStatus("CONFIRMED")).toBe(true);
    expect(isValidShowStatus("PLAYED")).toBe(true);
    expect(isValidShowStatus("CANCELLED")).toBe(true);
  });

  it("rejeita valores desconhecidos, vazios e nulos", () => {
    expect(isValidShowStatus("LIXO")).toBe(false);
    expect(isValidShowStatus("")).toBe(false);
    expect(isValidShowStatus(undefined)).toBe(false);
    expect(isValidShowStatus(null)).toBe(false);
  });
});

describe("hasActiveShowFilter", () => {
  it("é falso para filtro vazio ou só com critérios inválidos", () => {
    expect(hasActiveShowFilter({})).toBe(false);
    expect(hasActiveShowFilter({ q: "   " })).toBe(false);
    expect(hasActiveShowFilter({ status: "LIXO" })).toBe(false);
    expect(hasActiveShowFilter({ from: "2026-13-40" })).toBe(false);
  });

  it("é verdadeiro quando há um critério válido", () => {
    expect(hasActiveShowFilter({ q: "bar" })).toBe(true);
    expect(hasActiveShowFilter({ status: "PLAYED" })).toBe(true);
    expect(hasActiveShowFilter({ from: "2026-03-01" })).toBe(true);
    expect(hasActiveShowFilter({ to: "2026-03-31" })).toBe(true);
  });
});

describe("filterShows", () => {
  const shows: ShowLike[] = [
    show({ title: "Show no Bar do Zé", city: "São Paulo", status: "CONFIRMED", date: "2026-03-05T00:00:00.000Z" }),
    show({ title: "Festival de Inverno", venue: "Praça Central", city: "Curitiba", status: "PROPOSED", date: "2026-04-10T00:00:00.000Z" }),
    show({ title: "Sarau acústico", venue: "Casa Violão", city: "Santos", status: "PLAYED", date: "2026-02-20T00:00:00.000Z" }),
    show({ title: "Show cancelado", status: "CANCELLED", date: "2026-03-15T00:00:00.000Z" }),
  ];

  it("retorna tudo quando o filtro está vazio", () => {
    expect(filterShows(shows, {})).toHaveLength(4);
  });

  it("filtra por status exato", () => {
    const r = filterShows(shows, { status: "PLAYED" });
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe("Sarau acústico");
  });

  it("ignora status inválido (não filtra)", () => {
    expect(filterShows(shows, { status: "LIXO" })).toHaveLength(4);
  });

  it("busca no título, local e cidade", () => {
    expect(filterShows(shows, { q: "bar" }).map((s) => s.title)).toEqual([
      "Show no Bar do Zé",
    ]);
    expect(filterShows(shows, { q: "praça" }).map((s) => s.title)).toEqual([
      "Festival de Inverno",
    ]);
    expect(filterShows(shows, { q: "santos" }).map((s) => s.title)).toEqual([
      "Sarau acústico",
    ]);
  });

  it("busca ignorando acentos e caixa", () => {
    expect(filterShows(shows, { q: "VIOLAO" })).toHaveLength(1);
    expect(filterShows(shows, { q: "sao paulo" })).toHaveLength(1);
  });

  it("ignora termo de busca só com espaços", () => {
    expect(filterShows(shows, { q: "   " })).toHaveLength(4);
  });

  it("filtra por intervalo de datas inclusivo nas duas pontas", () => {
    const r = filterShows(shows, { from: "2026-03-01", to: "2026-03-31" });
    expect(r.map((s) => s.title).sort()).toEqual([
      "Show cancelado",
      "Show no Bar do Zé",
    ]);
  });

  it("usa só o início (from) ou só o fim (to)", () => {
    expect(filterShows(shows, { from: "2026-04-01" }).map((s) => s.title)).toEqual([
      "Festival de Inverno",
    ]);
    expect(filterShows(shows, { to: "2026-02-28" }).map((s) => s.title)).toEqual([
      "Sarau acústico",
    ]);
  });

  it("intervalo invertido não casa nada", () => {
    expect(filterShows(shows, { from: "2026-04-01", to: "2026-03-01" })).toHaveLength(0);
  });

  it("combina status, data e busca em AND", () => {
    const r = filterShows(shows, {
      status: "CONFIRMED",
      from: "2026-03-01",
      to: "2026-03-31",
      q: "bar",
    });
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe("Show no Bar do Zé");
  });

  it("não muta o array de entrada", () => {
    const input = [...shows];
    filterShows(input, { status: "PLAYED" });
    expect(input).toHaveLength(4);
  });
});

describe("findScheduleConflicts", () => {
  function gig(partial: Partial<ConflictShowLike>): ConflictShowLike {
    return {
      id: Math.random().toString(36).slice(2),
      title: "Show",
      status: "CONFIRMED",
      date: "2026-03-10T00:00:00.000Z",
      venue: null,
      city: null,
      ...partial,
    };
  }

  const NOW = "2026-03-15T12:00:00.000Z";

  it("não aponta conflito quando há no máximo um show por dia", () => {
    const r = findScheduleConflicts(
      [
        gig({ date: "2026-03-10T00:00:00.000Z" }),
        gig({ date: "2026-03-11T00:00:00.000Z" }),
      ],
      { now: NOW },
    );
    expect(r.dayCount).toBe(0);
    expect(r.days).toEqual([]);
    expect(r.showCount).toBe(0);
    expect(r.upcomingDayCount).toBe(0);
  });

  it("agrupa dois shows no mesmo dia como conflito", () => {
    const r = findScheduleConflicts(
      [
        gig({ id: "a", title: "Bar X", date: "2026-03-20T22:00:00.000Z" }),
        gig({ id: "b", title: "Casa Y", date: "2026-03-20T18:00:00.000Z" }),
      ],
      { now: NOW },
    );
    expect(r.dayCount).toBe(1);
    expect(r.showCount).toBe(2);
    expect(r.days[0].day).toBe("2026-03-20");
    expect(r.days[0].count).toBe(2);
    // ordenado por horário: 18h antes de 22h
    expect(r.days[0].shows.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("ignora shows cancelados ao detectar conflitos", () => {
    const r = findScheduleConflicts(
      [
        gig({ date: "2026-03-20T18:00:00.000Z", status: "CONFIRMED" }),
        gig({ date: "2026-03-20T22:00:00.000Z", status: "CANCELLED" }),
      ],
      { now: NOW },
    );
    expect(r.dayCount).toBe(0);
  });

  it("marca como upcoming o conflito de hoje ou no futuro", () => {
    const r = findScheduleConflicts(
      [
        // passado
        gig({ date: "2026-03-01T18:00:00.000Z" }),
        gig({ date: "2026-03-01T22:00:00.000Z" }),
        // hoje
        gig({ date: "2026-03-15T10:00:00.000Z" }),
        gig({ date: "2026-03-15T20:00:00.000Z" }),
        // futuro
        gig({ date: "2026-03-25T10:00:00.000Z" }),
        gig({ date: "2026-03-25T20:00:00.000Z" }),
      ],
      { now: NOW },
    );
    expect(r.dayCount).toBe(3);
    expect(r.upcomingDayCount).toBe(2);
    const byDay = Object.fromEntries(r.days.map((d) => [d.day, d.upcoming]));
    expect(byDay["2026-03-01"]).toBe(false);
    expect(byDay["2026-03-15"]).toBe(true);
    expect(byDay["2026-03-25"]).toBe(true);
  });

  it("devolve os dias em ordem cronológica crescente", () => {
    const r = findScheduleConflicts(
      [
        gig({ date: "2026-04-10T18:00:00.000Z" }),
        gig({ date: "2026-04-10T22:00:00.000Z" }),
        gig({ date: "2026-02-05T18:00:00.000Z" }),
        gig({ date: "2026-02-05T22:00:00.000Z" }),
      ],
      { now: NOW },
    );
    expect(r.days.map((d) => d.day)).toEqual(["2026-02-05", "2026-04-10"]);
  });

  it("conta três shows no mesmo dia", () => {
    const r = findScheduleConflicts(
      [
        gig({ date: "2026-03-20T10:00:00.000Z" }),
        gig({ date: "2026-03-20T16:00:00.000Z" }),
        gig({ date: "2026-03-20T22:00:00.000Z" }),
      ],
      { now: NOW },
    );
    expect(r.dayCount).toBe(1);
    expect(r.days[0].count).toBe(3);
    expect(r.showCount).toBe(3);
  });

  it("não muta o array de entrada", () => {
    const input = [
      gig({ date: "2026-03-20T22:00:00.000Z" }),
      gig({ date: "2026-03-20T18:00:00.000Z" }),
    ];
    const before = input.map((s) => s.date);
    findScheduleConflicts(input, { now: NOW });
    expect(input.map((s) => s.date)).toEqual(before);
  });
});

describe("findOpenWeekends", () => {
  function gig(partial: Partial<ConflictShowLike>): ConflictShowLike {
    return {
      id: Math.random().toString(36).slice(2),
      title: "Show",
      status: "CONFIRMED",
      date: "2026-03-13T22:00:00.000Z",
      venue: null,
      city: null,
      ...partial,
    };
  }

  // 2026-03-15 é domingo; as sextas de março/2026 caem em 06, 13, 20, 27.
  const SUNDAY = "2026-03-15T12:00:00.000Z";
  const WEDNESDAY = "2026-03-18T12:00:00.000Z";

  it("sem shows, todos os fins de semana ficam livres", () => {
    const r = findOpenWeekends([], { now: SUNDAY, weeks: 3 });
    expect(r.total).toBe(3);
    expect(r.openCount).toBe(3);
    expect(r.bookedCount).toBe(0);
    expect(r.weekends.map((w) => w.friday)).toEqual([
      "2026-03-13",
      "2026-03-20",
      "2026-03-27",
    ]);
    expect(r.weekends.every((w) => w.open)).toBe(true);
    expect(r.nextOpenFriday).toBe("2026-03-13");
  });

  it("inclui o fim de semana corrente enquanto o domingo não passou", () => {
    // Domingo 03-15 ainda pertence ao fim de semana da sexta 03-13.
    const r = findOpenWeekends([], { now: SUNDAY, weeks: 1 });
    expect(r.weekends[0].days).toEqual([
      "2026-03-13",
      "2026-03-14",
      "2026-03-15",
    ]);
  });

  it("numa quarta, pula o fim de semana já passado e começa no próximo", () => {
    const r = findOpenWeekends([], { now: WEDNESDAY, weeks: 2 });
    expect(r.weekends[0].friday).toBe("2026-03-20");
    expect(r.weekends[1].friday).toBe("2026-03-27");
  });

  it("um show no sábado ocupa aquele fim de semana", () => {
    const s = gig({ date: "2026-03-21T23:00:00.000Z" }); // sábado do 2º fds
    const r = findOpenWeekends([s], { now: SUNDAY, weeks: 3 });
    expect(r.openCount).toBe(2);
    expect(r.bookedCount).toBe(1);
    expect(r.weekends[1].open).toBe(false);
    expect(r.weekends[1].shows).toHaveLength(1);
    expect(r.weekends[0].open).toBe(true);
    // o primeiro livre continua sendo o fim de semana corrente
    expect(r.nextOpenFriday).toBe("2026-03-13");
  });

  it("shows na sexta e no domingo também ocupam o fim de semana", () => {
    const friday = findOpenWeekends([gig({ date: "2026-03-20T20:00:00.000Z" })], {
      now: SUNDAY,
      weeks: 3,
    });
    expect(friday.weekends[1].open).toBe(false);

    const sunday = findOpenWeekends([gig({ date: "2026-03-22T18:00:00.000Z" })], {
      now: SUNDAY,
      weeks: 3,
    });
    expect(sunday.weekends[1].open).toBe(false);
  });

  it("show em dia de semana não ocupa nenhum fim de semana", () => {
    const wed = gig({ date: "2026-03-18T20:00:00.000Z" }); // quarta
    const r = findOpenWeekends([wed], { now: SUNDAY, weeks: 3 });
    expect(r.openCount).toBe(3);
    expect(r.weekends.every((w) => w.open)).toBe(true);
  });

  it("show cancelado não ocupa o fim de semana", () => {
    const s = gig({ date: "2026-03-21T23:00:00.000Z", status: "CANCELLED" });
    const r = findOpenWeekends([s], { now: SUNDAY, weeks: 3 });
    expect(r.openCount).toBe(3);
    expect(r.weekends[1].open).toBe(true);
    expect(r.weekends[1].shows).toHaveLength(0);
  });

  it("agrupa vários shows do mesmo fim de semana em ordem cronológica", () => {
    const r = findOpenWeekends(
      [
        gig({ title: "Tarde", date: "2026-03-21T16:00:00.000Z" }), // sábado
        gig({ title: "Noite", date: "2026-03-20T23:00:00.000Z" }), // sexta
        gig({ title: "Domingo", date: "2026-03-22T19:00:00.000Z" }),
      ],
      { now: SUNDAY, weeks: 3 },
    );
    expect(r.weekends[1].shows.map((s) => s.title)).toEqual([
      "Noite",
      "Tarde",
      "Domingo",
    ]);
  });

  it("nextOpenFriday é null quando todos os fins de semana estão ocupados", () => {
    const r = findOpenWeekends(
      [
        gig({ date: "2026-03-13T22:00:00.000Z" }),
        gig({ date: "2026-03-20T22:00:00.000Z" }),
      ],
      { now: SUNDAY, weeks: 2 },
    );
    expect(r.openCount).toBe(0);
    expect(r.bookedCount).toBe(2);
    expect(r.nextOpenFriday).toBeNull();
  });

  it("a janela tem 8 fins de semana por padrão", () => {
    const r = findOpenWeekends([], { now: SUNDAY });
    expect(r.total).toBe(8);
  });

  it("não muta o array de entrada", () => {
    const input = [
      gig({ date: "2026-03-21T22:00:00.000Z" }),
      gig({ date: "2026-03-21T18:00:00.000Z" }),
    ];
    const before = input.map((s) => s.date);
    findOpenWeekends(input, { now: SUNDAY, weeks: 3 });
    expect(input.map((s) => s.date)).toEqual(before);
  });
});

describe("weekendKeyToDate", () => {
  it("interpreta a chave como meia-noite UTC (sem escorregar de fuso)", () => {
    const d = weekendKeyToDate("2026-03-13");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2); // março (0-based)
    expect(d.getUTCDate()).toBe(13);
    expect(d.getUTCHours()).toBe(0);
  });
});

describe("formatWeekendLabel", () => {
  it("usa um mês só quando sexta e domingo caem no mesmo mês", () => {
    expect(formatWeekendLabel("2026-03-13", "2026-03-15")).toBe("13–15 de mar");
  });

  it("mostra os dois meses quando o fim de semana vira o mês", () => {
    expect(formatWeekendLabel("2026-02-27", "2026-03-01")).toBe("27 fev – 1 mar");
  });

  it("vira o ano sem quebrar (dez → jan)", () => {
    expect(formatWeekendLabel("2026-12-31", "2027-01-02")).toBe("31 dez – 2 jan");
  });

  it("casa o rótulo do próximo fim de semana livre de findOpenWeekends", () => {
    // Domingo 15/03/2026; o fim de semana corrente (13–15) está livre.
    const r = findOpenWeekends([], { now: "2026-03-15T12:00:00.000Z", weeks: 4 });
    const next = r.weekends.find((w) => w.friday === r.nextOpenFriday)!;
    expect(formatWeekendLabel(next.friday, next.days[2])).toBe("13–15 de mar");
  });
});

describe("parseWeekendWindow", () => {
  it("cai no default quando o parâmetro está ausente", () => {
    expect(parseWeekendWindow(undefined)).toBe(WEEKEND_WINDOW_DEFAULT);
  });

  it("cai no default em string vazia ou só espaços", () => {
    expect(parseWeekendWindow("")).toBe(WEEKEND_WINDOW_DEFAULT);
    expect(parseWeekendWindow("   ")).toBe(WEEKEND_WINDOW_DEFAULT);
  });

  it("cai no default quando não é numérico", () => {
    expect(parseWeekendWindow("abc")).toBe(WEEKEND_WINDOW_DEFAULT);
    expect(parseWeekendWindow("NaN")).toBe(WEEKEND_WINDOW_DEFAULT);
  });

  it("aceita um inteiro válido dentro da faixa", () => {
    expect(parseWeekendWindow("8")).toBe(8);
    expect(parseWeekendWindow("26")).toBe(26);
  });

  it("trunca a parte fracionária", () => {
    expect(parseWeekendWindow("12.9")).toBe(12);
  });

  it("grampeia abaixo do mínimo e acima do máximo", () => {
    expect(parseWeekendWindow("0")).toBe(WEEKEND_WINDOW_MIN);
    expect(parseWeekendWindow("-5")).toBe(WEEKEND_WINDOW_MIN);
    expect(parseWeekendWindow("999")).toBe(WEEKEND_WINDOW_MAX);
  });

  it("usa o primeiro valor quando o parâmetro vem repetido (array)", () => {
    expect(parseWeekendWindow(["8", "26"])).toBe(8);
  });

  it("aceita um fallback customizado", () => {
    expect(parseWeekendWindow(undefined, 4)).toBe(4);
    expect(parseWeekendWindow("lixo", 4)).toBe(4);
  });

  it("alimenta findOpenWeekends com um tamanho de janela coerente", () => {
    const weeks = parseWeekendWindow("26");
    const r = findOpenWeekends([], { now: "2026-03-15T12:00:00.000Z", weeks });
    expect(r.total).toBe(26);
  });
});

function leadShow(partial: Partial<LeadTimeShowLike>): LeadTimeShowLike {
  return {
    status: "CONFIRMED",
    createdAt: "2026-01-01T00:00:00.000Z",
    date: "2026-02-01T00:00:00.000Z",
    fee: 100_00,
    ...partial,
  };
}

describe("bookingLeadTime", () => {
  it("amostra vazia zera tudo e não é confiável", () => {
    const r = bookingLeadTime([]);
    expect(r.sample).toBe(0);
    expect(r.medianDays).toBe(0);
    expect(r.avgDays).toBe(0);
    expect(r.shortestDays).toBeNull();
    expect(r.longestDays).toBeNull();
    expect(r.retroactiveCount).toBe(0);
    expect(r.reliable).toBe(false);
    expect(r.buckets).toHaveLength(4);
    expect(r.buckets.every((b) => b.count === 0 && b.share === 0)).toBe(true);
  });

  it("calcula a antecedência em dias UTC inteiros (createdAt → date)", () => {
    const r = bookingLeadTime([
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-08T00:00:00.000Z" }),
    ]);
    expect(r.sample).toBe(1);
    expect(r.medianDays).toBe(7);
    expect(r.avgDays).toBe(7);
    expect(r.shortestDays).toBe(7);
    expect(r.longestDays).toBe(7);
  });

  it("ignora a hora do dia — conta por dia UTC, não por 24h corridas", () => {
    // createdAt à noite, date de manhã do dia seguinte: ainda é 1 dia de lead.
    const r = bookingLeadTime([
      leadShow({ createdAt: "2026-01-01T23:00:00.000Z", date: "2026-01-02T01:00:00.000Z" }),
    ]);
    expect(r.medianDays).toBe(1);
  });

  it("exclui shows cancelados da amostra", () => {
    const r = bookingLeadTime([
      leadShow({ status: "CANCELLED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-03-01T00:00:00.000Z" }),
      leadShow({ status: "CONFIRMED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-11T00:00:00.000Z" }),
    ]);
    expect(r.sample).toBe(1);
    expect(r.medianDays).toBe(10);
  });

  it("conta lançamentos retroativos à parte (createdAt depois da data)", () => {
    const r = bookingLeadTime([
      leadShow({ createdAt: "2026-02-10T00:00:00.000Z", date: "2026-02-01T00:00:00.000Z" }),
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-15T00:00:00.000Z" }),
    ]);
    expect(r.sample).toBe(1);
    expect(r.retroactiveCount).toBe(1);
    expect(r.medianDays).toBe(14);
  });

  it("trata lead 0 (mesmo dia) como amostra, não como retroativo", () => {
    const r = bookingLeadTime([
      leadShow({ createdAt: "2026-01-05T09:00:00.000Z", date: "2026-01-05T21:00:00.000Z" }),
    ]);
    expect(r.sample).toBe(1);
    expect(r.retroactiveCount).toBe(0);
    expect(r.medianDays).toBe(0);
    expect(r.buckets[0].count).toBe(1); // "Até 1 semana"
  });

  it("mediana é robusta a outlier (não desloca como a média)", () => {
    const r = bookingLeadTime([
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-06T00:00:00.000Z" }), // 5
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-08T00:00:00.000Z" }), // 7
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-07-01T00:00:00.000Z" }), // 181
    ]);
    expect(r.medianDays).toBe(7);
    expect(r.avgDays).toBe(64); // (5+7+181)/3 ≈ 64.3 → 64
    expect(r.shortestDays).toBe(5);
    expect(r.longestDays).toBe(181);
  });

  it("distribui nas faixas canônicas com cachê e participação", () => {
    const r = bookingLeadTime([
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-04T00:00:00.000Z", fee: 100 }), // 3 → Até 1 semana
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-21T00:00:00.000Z", fee: 200 }), // 20 → 1 a 4 semanas
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-03-01T00:00:00.000Z", fee: 300 }), // 59 → 1 a 3 meses
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-06-01T00:00:00.000Z", fee: 400 }), // 151 → Mais de 3 meses
    ]);
    expect(r.buckets.map((b) => b.count)).toEqual([1, 1, 1, 1]);
    expect(r.buckets.map((b) => b.totalFee)).toEqual([100, 200, 300, 400]);
    expect(r.buckets.every((b) => Math.abs(b.share - 0.25) < 1e-9)).toBe(true);
  });

  it("cobre os limites exatos das faixas (7/8, 30/31, 90/91)", () => {
    const at = (leadDays: number) =>
      leadShow({
        createdAt: "2026-01-01T00:00:00.000Z",
        date: new Date(Date.UTC(2026, 0, 1 + leadDays)).toISOString(),
      });
    const r = bookingLeadTime([at(7), at(8), at(30), at(31), at(90), at(91)]);
    expect(r.buckets[0].count).toBe(1); // 7
    expect(r.buckets[1].count).toBe(2); // 8, 30
    expect(r.buckets[2].count).toBe(2); // 31, 90
    expect(r.buckets[3].count).toBe(1); // 91
  });

  it("marca a amostra como confiável só a partir do mínimo", () => {
    const two = Array.from({ length: MIN_LEAD_TIME_SAMPLE - 1 }, () => leadShow({}));
    const enough = Array.from({ length: MIN_LEAD_TIME_SAMPLE }, () => leadShow({}));
    expect(bookingLeadTime(two).reliable).toBe(false);
    expect(bookingLeadTime(enough).reliable).toBe(true);
  });

  it("escopo padrão (all) inclui propostas, cancelados de fora", () => {
    const r = bookingLeadTime([
      leadShow({ status: "PROPOSED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-11T00:00:00.000Z" }), // 10
      leadShow({ status: "CONFIRMED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-31T00:00:00.000Z" }), // 30
      leadShow({ status: "CANCELLED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-06-01T00:00:00.000Z" }),
    ]);
    expect(r.sample).toBe(2);
    expect(r.medianDays).toBe(20); // (10+30)/2
  });

  it("escopo firm conta só CONFIRMED+PLAYED, ignora propostas", () => {
    const shows = [
      leadShow({ status: "PROPOSED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-04T00:00:00.000Z" }), // 3
      leadShow({ status: "CONFIRMED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-31T00:00:00.000Z" }), // 30
      leadShow({ status: "PLAYED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-03-02T00:00:00.000Z" }), // 60
      leadShow({ status: "CANCELLED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-06-01T00:00:00.000Z" }),
    ];
    const firm = bookingLeadTime(shows, "firm");
    expect(firm.sample).toBe(2); // só o CONFIRMED e o PLAYED
    expect(firm.medianDays).toBe(45); // (30+60)/2
    // o cachê por faixa também respeita o escopo (proposta de fora)
    expect(firm.buckets[0].count).toBe(0); // "Até 1 semana" (a proposta de 3 dias saiu)
    // o escopo all vê os três não cancelados
    expect(bookingLeadTime(shows, "all").sample).toBe(3);
  });
});

describe("parseLeadTimeScope", () => {
  it("só 'firm' liga o escopo firme; o resto cai em 'all'", () => {
    expect(parseLeadTimeScope("firm")).toBe("firm");
    expect(parseLeadTimeScope("FIRM")).toBe("firm");
    expect(parseLeadTimeScope(" firm ")).toBe("firm");
    expect(parseLeadTimeScope("all")).toBe("all");
    expect(parseLeadTimeScope(undefined)).toBe("all");
    expect(parseLeadTimeScope("")).toBe("all");
    expect(parseLeadTimeScope("qualquer")).toBe("all");
    expect(parseLeadTimeScope(["firm", "all"])).toBe("firm"); // primeiro valor
  });
});

describe("bookingLeadTimeYears", () => {
  it("amostra vazia devolve lista vazia", () => {
    expect(bookingLeadTimeYears([])).toEqual([]);
  });

  it("devolve os anos (UTC) da data, decrescente e deduplicados", () => {
    const years = bookingLeadTimeYears([
      leadShow({ createdAt: "2024-01-01T00:00:00.000Z", date: "2024-06-01T00:00:00.000Z" }),
      leadShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-03-01T00:00:00.000Z" }),
      leadShow({ createdAt: "2026-02-01T00:00:00.000Z", date: "2026-08-01T00:00:00.000Z" }),
    ]);
    expect(years).toEqual([2026, 2024]);
  });

  it("usa o ano da data do show, não o do createdAt (recorte por virada de ano)", () => {
    // Fechado em dez/2025 para um show em jan/2026: o ano do seletor é 2026.
    const years = bookingLeadTimeYears([
      leadShow({ createdAt: "2025-12-20T00:00:00.000Z", date: "2026-01-10T00:00:00.000Z" }),
    ]);
    expect(years).toEqual([2026]);
  });

  it("ignora cancelados e retroativos — só anos com antecedência mensurável", () => {
    const years = bookingLeadTimeYears([
      // cancelado em 2023 → fora
      leadShow({ status: "CANCELLED", createdAt: "2023-01-01T00:00:00.000Z", date: "2023-06-01T00:00:00.000Z" }),
      // retroativo em 2024 (createdAt depois da data) → fora
      leadShow({ createdAt: "2024-07-01T00:00:00.000Z", date: "2024-06-01T00:00:00.000Z" }),
      // mensurável em 2025 → entra
      leadShow({ createdAt: "2025-01-01T00:00:00.000Z", date: "2025-05-01T00:00:00.000Z" }),
    ]);
    expect(years).toEqual([2025]);
  });

  it("no escopo firm os anos vêm só de compromissos firmes", () => {
    const shows = [
      // proposta em 2024 → entra no escopo all, fora do firm
      leadShow({ status: "PROPOSED", createdAt: "2024-01-01T00:00:00.000Z", date: "2024-06-01T00:00:00.000Z" }),
      // confirmado em 2026 → entra em ambos
      leadShow({ status: "CONFIRMED", createdAt: "2026-01-01T00:00:00.000Z", date: "2026-03-01T00:00:00.000Z" }),
    ];
    expect(bookingLeadTimeYears(shows)).toEqual([2026, 2024]);
    expect(bookingLeadTimeYears(shows, "firm")).toEqual([2026]);
  });
});

describe("compareBookingLeadTime", () => {
  // Show com antecedência `lead` dias, ancorado num createdAt fixo (a data
  // sai `lead` dias depois). Ano é irrelevante aqui — o helper compara duas
  // `bookingLeadTime` já computadas, agnóstico ao recorte por período.
  const withLead = (lead: number) =>
    leadShow({
      createdAt: "2026-01-01T00:00:00.000Z",
      date: new Date(Date.UTC(2026, 0, 1 + lead)).toISOString(),
    });

  it("mediana subindo além do limiar é melhora (mais folga para agendar)", () => {
    const current = bookingLeadTime([withLead(40), withLead(45), withLead(50)]); // mediana 45
    const previous = bookingLeadTime([withLead(10), withLead(12), withLead(14)]); // mediana 12
    const cmp = compareBookingLeadTime(current, previous);
    expect(cmp.medianDaysDelta).toBe(33);
    expect(cmp.trend).toBe("improved");
  });

  it("mediana caindo além do limiar é piora (agendando em cima da hora)", () => {
    const current = bookingLeadTime([withLead(3), withLead(4), withLead(5)]); // mediana 4
    const previous = bookingLeadTime([withLead(30), withLead(31), withLead(32)]); // mediana 31
    const cmp = compareBookingLeadTime(current, previous);
    expect(cmp.medianDaysDelta).toBe(-27);
    expect(cmp.trend).toBe("worsened");
  });

  it("variação dentro do limiar é estável", () => {
    const current = bookingLeadTime([withLead(20), withLead(22), withLead(24)]); // mediana 22
    const previous = bookingLeadTime([withLead(18), withLead(20), withLead(22)]); // mediana 20
    const cmp = compareBookingLeadTime(current, previous);
    expect(cmp.medianDaysDelta).toBe(2);
    expect(cmp.trend).toBe("stable");
  });

  it("o veredito olha só a mediana — a média pode divergir sem virar tendência", () => {
    // Medianas iguais (10 × 10), mas a média atual é puxada por um outlier.
    const current = bookingLeadTime([withLead(10), withLead(10), withLead(200)]); // mediana 10, média 73
    const previous = bookingLeadTime([withLead(9), withLead(10), withLead(11)]); // mediana 10, média 10
    const cmp = compareBookingLeadTime(current, previous);
    expect(cmp.medianDaysDelta).toBe(0);
    expect(cmp.avgDaysDelta).toBe(63);
    expect(cmp.trend).toBe("stable");
  });

  it("o limiar é inclusivo nas duas pontas (±epsilon já vira tendência)", () => {
    const base = bookingLeadTime([withLead(30), withLead(30), withLead(30)]); // mediana 30
    const up = bookingLeadTime([
      withLead(30 + LEAD_TIME_TREND_EPSILON),
      withLead(30 + LEAD_TIME_TREND_EPSILON),
      withLead(30 + LEAD_TIME_TREND_EPSILON),
    ]);
    const down = bookingLeadTime([
      withLead(30 - LEAD_TIME_TREND_EPSILON),
      withLead(30 - LEAD_TIME_TREND_EPSILON),
      withLead(30 - LEAD_TIME_TREND_EPSILON),
    ]);
    expect(compareBookingLeadTime(up, base).trend).toBe("improved");
    expect(compareBookingLeadTime(down, base).trend).toBe("worsened");
  });
});

describe("compareBookingLeadTimeScopes", () => {
  // Show com antecedência `lead` dias e status escolhido (createdAt fixo).
  const withLead = (lead: number, status: string) =>
    leadShow({
      status,
      createdAt: "2026-01-01T00:00:00.000Z",
      date: new Date(Date.UTC(2026, 0, 1 + lead)).toISOString(),
    });

  it("firmes com mais folga: propostas em aberto puxam a mediana geral para baixo", () => {
    // Firmes agendados com muita folga (40/45/50 → mediana 45); propostas em
    // cima da hora (2/3/4) só entram no escopo amplo e derrubam a mediana geral.
    const shows = [
      withLead(40, "CONFIRMED"),
      withLead(45, "PLAYED"),
      withLead(50, "CONFIRMED"),
      withLead(2, "PROPOSED"),
      withLead(3, "PROPOSED"),
      withLead(4, "PROPOSED"),
    ];
    const cmp = compareBookingLeadTimeScopes(
      bookingLeadTime(shows, "all"),
      bookingLeadTime(shows, "firm"),
    );
    expect(cmp.all.sample).toBe(6);
    expect(cmp.firm.sample).toBe(3);
    expect(cmp.openProposalCount).toBe(3);
    // mediana firme 45 − mediana geral ~5.5→arred → positivo e além do limiar.
    expect(cmp.medianDaysDelta).toBeGreaterThanOrEqual(LEAD_TIME_TREND_EPSILON);
    expect(cmp.gap).toBe("firm-more-lead");
  });

  it("firmes em cima da hora: propostas distantes inflam a mediana geral", () => {
    // Os shows que fecham entram em cima da hora (2/3/4 → mediana 3); as
    // propostas distantes (80/85/90) só existem no escopo amplo e sobem a geral.
    const shows = [
      withLead(2, "CONFIRMED"),
      withLead(3, "PLAYED"),
      withLead(4, "CONFIRMED"),
      withLead(80, "PROPOSED"),
      withLead(85, "PROPOSED"),
      withLead(90, "PROPOSED"),
    ];
    const cmp = compareBookingLeadTimeScopes(
      bookingLeadTime(shows, "all"),
      bookingLeadTime(shows, "firm"),
    );
    expect(cmp.medianDaysDelta).toBeLessThanOrEqual(-LEAD_TIME_TREND_EPSILON);
    expect(cmp.gap).toBe("firm-less-lead");
  });

  it("sem proposta em aberto os dois escopos coincidem (gap similar, delta 0)", () => {
    const shows = [
      withLead(30, "CONFIRMED"),
      withLead(31, "PLAYED"),
      withLead(32, "CONFIRMED"),
    ];
    const cmp = compareBookingLeadTimeScopes(
      bookingLeadTime(shows, "all"),
      bookingLeadTime(shows, "firm"),
    );
    expect(cmp.openProposalCount).toBe(0);
    expect(cmp.medianDaysDelta).toBe(0);
    expect(cmp.avgDaysDelta).toBe(0);
    expect(cmp.gap).toBe("similar");
  });

  it("variação da mediana dentro do limiar é 'similar' mesmo com propostas", () => {
    const shows = [
      withLead(20, "CONFIRMED"),
      withLead(22, "PLAYED"),
      withLead(24, "CONFIRMED"),
      withLead(18, "PROPOSED"),
      withLead(20, "PROPOSED"),
    ];
    const cmp = compareBookingLeadTimeScopes(
      bookingLeadTime(shows, "all"),
      bookingLeadTime(shows, "firm"),
    );
    expect(cmp.openProposalCount).toBe(2);
    expect(Math.abs(cmp.medianDaysDelta)).toBeLessThan(LEAD_TIME_TREND_EPSILON);
    expect(cmp.gap).toBe("similar");
  });
});

describe("bookingLeadTimeHeadline", () => {
  // Show com antecedência `lead` dias (createdAt fixo, data `lead` dias depois).
  const withLead = (lead: number) =>
    leadShow({
      createdAt: "2026-01-01T00:00:00.000Z",
      date: new Date(Date.UTC(2026, 0, 1 + lead)).toISOString(),
    });

  it("não mostra com amostra pequena, mesmo que a mediana seja curta", () => {
    // 2 shows curtíssimos: mediana baixa, mas amostra abaixo de MIN → ruído.
    const h = bookingLeadTimeHeadline(bookingLeadTime([withLead(2), withLead(3)]));
    expect(h.show).toBe(false);
  });

  it("mediana longa com amostra confiável não dispara o nudge", () => {
    const h = bookingLeadTimeHeadline(
      bookingLeadTime([withLead(40), withLead(45), withLead(50)]), // mediana 45
    );
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.medianDays).toBe(45);
  });

  it("mediana curta com amostra confiável mostra (não crítico entre crítico e curto)", () => {
    const h = bookingLeadTimeHeadline(
      bookingLeadTime([withLead(9), withLead(10), withLead(12)]), // mediana 10
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.medianDays).toBe(10);
    expect(h.sample).toBe(3);
  });

  it("mediana muito curta é crítica", () => {
    const h = bookingLeadTimeHeadline(
      bookingLeadTime([withLead(3), withLead(5), withLead(6)]), // mediana 5
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
  });

  it("os limiares são inclusivos (mediana == curto mostra; == crítico é crítica)", () => {
    const atShort = bookingLeadTimeHeadline(
      bookingLeadTime([
        withLead(LEAD_TIME_SHORT_DAYS),
        withLead(LEAD_TIME_SHORT_DAYS),
        withLead(LEAD_TIME_SHORT_DAYS),
      ]),
    );
    expect(atShort.show).toBe(true);
    expect(atShort.critical).toBe(false);

    const atCritical = bookingLeadTimeHeadline(
      bookingLeadTime([
        withLead(LEAD_TIME_CRITICAL_DAYS),
        withLead(LEAD_TIME_CRITICAL_DAYS),
        withLead(LEAD_TIME_CRITICAL_DAYS),
      ]),
    );
    expect(atCritical.show).toBe(true);
    expect(atCritical.critical).toBe(true);
  });

  it("aceita limiares injetados", () => {
    const report = bookingLeadTime([withLead(20), withLead(20), withLead(20)]); // mediana 20
    expect(bookingLeadTimeHeadline(report).show).toBe(false); // padrão 14: não
    expect(bookingLeadTimeHeadline(report, 30, 15).show).toBe(true); // curto 30: mostra
    expect(bookingLeadTimeHeadline(report, 30, 20).critical).toBe(true); // crítico 20: sim
  });

  it("os limiares crítico e curto respeitam a ordem esperada", () => {
    expect(LEAD_TIME_CRITICAL_DAYS).toBeLessThan(LEAD_TIME_SHORT_DAYS);
  });
});

describe("summarizeMonthShows", () => {
  // Datas em horário LOCAL (a mesma convenção da grade do calendário).
  const local = (y: number, m: number, d: number, hh = 20, mm = 0) =>
    new Date(y, m - 1, d, hh, mm);

  it("soma o cachê confirmado (CONFIRMED+PLAYED) e o pendente (PROPOSED)", () => {
    const shows = [
      { date: local(2026, 3, 5), status: "CONFIRMED", fee: 100_00 },
      { date: local(2026, 3, 12), status: "PLAYED", fee: 250_00 },
      { date: local(2026, 3, 20), status: "PROPOSED", fee: 400_00 },
    ];
    const s = summarizeMonthShows(shows, 2026, 3);
    expect(s.total).toBe(3);
    expect(s.confirmedFee).toBe(350_00);
    expect(s.pendingFee).toBe(400_00);
    expect(s.totalFee).toBe(750_00);
    expect(s.byStatus).toEqual({
      PROPOSED: 1,
      CONFIRMED: 1,
      PLAYED: 1,
      CANCELLED: 0,
    });
  });

  it("exclui cancelados do total e dos cachês, mas os conta à parte", () => {
    const shows = [
      { date: local(2026, 3, 5), status: "CONFIRMED", fee: 100_00 },
      { date: local(2026, 3, 8), status: "CANCELLED", fee: 999_00 },
      { date: local(2026, 3, 9), status: "CANCELLED", fee: 500_00 },
    ];
    const s = summarizeMonthShows(shows, 2026, 3);
    expect(s.total).toBe(1);
    expect(s.cancelled).toBe(2);
    expect(s.confirmedFee).toBe(100_00);
    expect(s.pendingFee).toBe(0);
    expect(s.totalFee).toBe(100_00);
  });

  it("ignora shows de outros meses (bordas da grade) pela data LOCAL", () => {
    const shows = [
      { date: local(2026, 2, 28), status: "CONFIRMED", fee: 100_00 }, // fev
      { date: local(2026, 3, 1), status: "CONFIRMED", fee: 200_00 }, // mar
      { date: local(2026, 3, 31), status: "PROPOSED", fee: 300_00 }, // mar
      { date: local(2026, 4, 1), status: "CONFIRMED", fee: 400_00 }, // abr
    ];
    const s = summarizeMonthShows(shows, 2026, 3);
    expect(s.total).toBe(2);
    expect(s.confirmedFee).toBe(200_00);
    expect(s.pendingFee).toBe(300_00);
  });

  it("aceita datas como string ISO e trata fee ausente como zero", () => {
    const shows = [
      { date: "2026-03-10T23:00:00.000Z", status: "CONFIRMED" },
      { date: local(2026, 3, 15), status: "PLAYED", fee: 80_00 },
    ];
    const s = summarizeMonthShows(shows, 2026, 3);
    expect(s.total).toBe(2);
    expect(s.confirmedFee).toBe(80_00);
  });

  it("ignora status desconhecido (fora do domínio)", () => {
    const shows = [
      { date: local(2026, 3, 10), status: "CONFIRMED", fee: 100_00 },
      { date: local(2026, 3, 11), status: "RASCUNHO", fee: 999_00 },
    ];
    const s = summarizeMonthShows(shows, 2026, 3);
    expect(s.total).toBe(1);
    expect(s.confirmedFee).toBe(100_00);
    expect(s.byStatus.CONFIRMED).toBe(1);
  });

  it("mês sem shows zera tudo", () => {
    const s = summarizeMonthShows([], 2026, 3);
    expect(s).toEqual({
      total: 0,
      cancelled: 0,
      confirmedFee: 0,
      pendingFee: 0,
      totalFee: 0,
      byStatus: { PROPOSED: 0, CONFIRMED: 0, PLAYED: 0, CANCELLED: 0 },
    });
  });
});

describe("summarizeWeekShows", () => {
  const local = (y: number, m: number, d: number, hh = 20, mm = 0) =>
    new Date(y, m - 1, d, hh, mm);

  it("soma confirmado (CONFIRMED+PLAYED) e pendente (PROPOSED) sem recortar por data", () => {
    // Nenhum filtro de data: a janela já veio recortada pelo chamador (weekRange).
    const s = summarizeWeekShows([
      { date: local(2026, 3, 2), status: "CONFIRMED", fee: 100_00 },
      { date: local(2026, 3, 4), status: "PLAYED", fee: 250_00 },
      { date: local(2026, 3, 6), status: "PROPOSED", fee: 400_00 },
    ]);
    expect(s.total).toBe(3);
    expect(s.confirmedFee).toBe(350_00);
    expect(s.pendingFee).toBe(400_00);
    expect(s.totalFee).toBe(750_00);
    expect(s.byStatus).toEqual({ PROPOSED: 1, CONFIRMED: 1, PLAYED: 1, CANCELLED: 0 });
  });

  it("exclui cancelados do total e dos cachês, mas os conta à parte", () => {
    const s = summarizeWeekShows([
      { date: local(2026, 3, 2), status: "CONFIRMED", fee: 100_00 },
      { date: local(2026, 3, 3), status: "CANCELLED", fee: 999_00 },
      { date: local(2026, 3, 5), status: "CANCELLED", fee: 500_00 },
    ]);
    expect(s.total).toBe(1);
    expect(s.cancelled).toBe(2);
    expect(s.confirmedFee).toBe(100_00);
    expect(s.totalFee).toBe(100_00);
  });

  it("ignora status desconhecido e trata fee ausente como zero", () => {
    const s = summarizeWeekShows([
      { date: local(2026, 3, 2), status: "CONFIRMED" },
      { date: local(2026, 3, 3), status: "RASCUNHO", fee: 999_00 },
    ]);
    expect(s.total).toBe(1);
    expect(s.confirmedFee).toBe(0);
    expect(s.byStatus.CONFIRMED).toBe(1);
  });

  it("semana sem shows zera tudo", () => {
    expect(summarizeWeekShows([])).toEqual({
      total: 0,
      cancelled: 0,
      confirmedFee: 0,
      pendingFee: 0,
      totalFee: 0,
      byStatus: { PROPOSED: 0, CONFIRMED: 0, PLAYED: 0, CANCELLED: 0 },
    });
  });
});

describe("buildDuplicatedShow", () => {
  const base = {
    title: "Residência no Bar X",
    date: new Date("2026-03-06T22:00:00.000Z"), // sexta
    venue: "Bar X",
    city: "São Paulo",
    fee: 150_00,
    notes: "Levar cabo reserva",
  };

  it("desloca a data uma semana à frente por padrão, preservando o horário", () => {
    const dup = buildDuplicatedShow(base);
    expect(dup.date.toISOString()).toBe("2026-03-13T22:00:00.000Z");
    // mesmo dia da semana (sexta) e mesmo instante do dia
    expect(dup.date.getUTCDay()).toBe(base.date.getUTCDay());
  });

  it("copia título, local, cidade, cachê e notas", () => {
    const dup = buildDuplicatedShow(base);
    expect(dup.title).toBe("Residência no Bar X");
    expect(dup.venue).toBe("Bar X");
    expect(dup.city).toBe("São Paulo");
    expect(dup.fee).toBe(150_00);
    expect(dup.notes).toBe("Levar cabo reserva");
  });

  it("reseta o status para PROPOSED qualquer que seja o original", () => {
    for (const status of ["PLAYED", "CONFIRMED", "CANCELLED", "PROPOSED"]) {
      const dup = buildDuplicatedShow({ ...base, status } as never);
      expect(dup.status).toBe("PROPOSED");
    }
  });

  it("respeita weeksAhead inteiro (ex.: mensal ≈ 4 semanas)", () => {
    const dup = buildDuplicatedShow(base, 4);
    expect(dup.date.toISOString()).toBe("2026-04-03T22:00:00.000Z");
  });

  it("weeksAhead inválido (0, negativo, NaN, fracionário<1) cai no padrão de 1 semana", () => {
    for (const bad of [0, -3, NaN, 0.5]) {
      const dup = buildDuplicatedShow(base, bad);
      expect(dup.date.toISOString()).toBe("2026-03-13T22:00:00.000Z");
    }
    expect(DUPLICATE_SHOW_WEEKS_AHEAD).toBe(1);
  });

  it("weeksAhead fracionário ≥1 é truncado para inteiro", () => {
    const dup = buildDuplicatedShow(base, 2.9);
    expect(dup.date.toISOString()).toBe("2026-03-20T22:00:00.000Z");
  });

  it("aceita data em string e normaliza local/cidade/notas ausentes para null", () => {
    const dup = buildDuplicatedShow({
      title: "Show solto",
      date: "2026-03-06T20:00:00.000Z",
    });
    expect(dup.venue).toBeNull();
    expect(dup.city).toBeNull();
    expect(dup.notes).toBeNull();
    expect(dup.fee).toBe(0);
    expect(dup.date.toISOString()).toBe("2026-03-13T20:00:00.000Z");
  });

  it("cachê nulo vira 0 (convenção de show sem cachê acordado)", () => {
    const dup = buildDuplicatedShow({ ...base, fee: null });
    expect(dup.fee).toBe(0);
  });
});

describe("parseDuplicateInterval", () => {
  it("mapeia cada opção conhecida no nº de semanas correto", () => {
    expect(parseDuplicateInterval("weekly")).toBe(1);
    expect(parseDuplicateInterval("biweekly")).toBe(2);
    expect(parseDuplicateInterval("monthly")).toBe(4);
  });

  it("valor desconhecido/ausente cai no padrão (semanal)", () => {
    const defaultWeeks = DUPLICATE_INTERVAL_WEEKS[DEFAULT_DUPLICATE_INTERVAL];
    for (const bad of ["", "anual", "1", null, undefined, 2, {}]) {
      expect(parseDuplicateInterval(bad)).toBe(defaultWeeks);
    }
    expect(defaultWeeks).toBe(DUPLICATE_SHOW_WEEKS_AHEAD);
  });

  it("não confunde chaves herdadas do Object com opções válidas", () => {
    expect(parseDuplicateInterval("toString")).toBe(
      DUPLICATE_INTERVAL_WEEKS[DEFAULT_DUPLICATE_INTERVAL],
    );
    expect(parseDuplicateInterval("hasOwnProperty")).toBe(
      DUPLICATE_INTERVAL_WEEKS[DEFAULT_DUPLICATE_INTERVAL],
    );
  });

  it("compõe com buildDuplicatedShow: mensal cai 4 semanas à frente, mesmo dia da semana", () => {
    const from = new Date("2026-03-06T22:00:00.000Z"); // sexta
    const dup = buildDuplicatedShow(
      { title: "Residência", date: from },
      parseDuplicateInterval("monthly"),
    );
    expect(dup.date.toISOString()).toBe("2026-04-03T22:00:00.000Z");
    expect(dup.date.getUTCDay()).toBe(from.getUTCDay());
  });
});

describe("parseDuplicateCount", () => {
  it("mantém quantidades válidas dentro da faixa", () => {
    expect(parseDuplicateCount(1)).toBe(1);
    expect(parseDuplicateCount(4)).toBe(4);
    expect(parseDuplicateCount("8")).toBe(8);
    expect(parseDuplicateCount(MAX_DUPLICATE_COUNT)).toBe(MAX_DUPLICATE_COUNT);
  });

  it("não-numérico/ausente/< 1 cai no padrão (1 cópia)", () => {
    for (const bad of ["", "abc", null, undefined, {}, NaN, 0, -3]) {
      expect(parseDuplicateCount(bad)).toBe(DEFAULT_DUPLICATE_COUNT);
    }
    expect(DEFAULT_DUPLICATE_COUNT).toBe(1);
  });

  it("satura acima do teto e trunca fracionário", () => {
    expect(parseDuplicateCount(99)).toBe(MAX_DUPLICATE_COUNT);
    expect(parseDuplicateCount(3.9)).toBe(3);
  });
});

describe("buildDuplicatedShowSeries", () => {
  const base = {
    title: "Residência no Bar X",
    date: new Date("2026-03-06T22:00:00.000Z"), // sexta
    venue: "Bar X",
    city: "São Paulo",
    fee: 150_00,
    notes: "Levar cabo reserva",
  };

  it("cria N cópias espaçadas pela cadência, todas no mesmo dia da semana", () => {
    const series = buildDuplicatedShowSeries(base, 1, 3);
    expect(series.map((s) => s.date.toISOString())).toEqual([
      "2026-03-13T22:00:00.000Z",
      "2026-03-20T22:00:00.000Z",
      "2026-03-27T22:00:00.000Z",
    ]);
    for (const s of series) {
      expect(s.date.getUTCDay()).toBe(base.date.getUTCDay());
      expect(s.status).toBe("PROPOSED");
      expect(s.title).toBe("Residência no Bar X");
    }
  });

  it("respeita o intervalo quinzenal/mensal no espaçamento", () => {
    const quinzenal = buildDuplicatedShowSeries(base, 2, 2);
    expect(quinzenal.map((s) => s.date.toISOString())).toEqual([
      "2026-03-20T22:00:00.000Z",
      "2026-04-03T22:00:00.000Z",
    ]);
    const mensal = buildDuplicatedShowSeries(base, 4, 2);
    expect(mensal.map((s) => s.date.toISOString())).toEqual([
      "2026-04-03T22:00:00.000Z",
      "2026-05-01T22:00:00.000Z",
    ]);
  });

  it("count padrão cria uma única cópia (equivale a buildDuplicatedShow)", () => {
    const series = buildDuplicatedShowSeries(base, 1);
    expect(series).toHaveLength(1);
    expect(series[0].date.toISOString()).toBe(
      buildDuplicatedShow(base, 1).date.toISOString(),
    );
  });

  it("count inválido vira 1 e count acima do teto satura", () => {
    expect(buildDuplicatedShowSeries(base, 1, 0)).toHaveLength(1);
    expect(buildDuplicatedShowSeries(base, 1, NaN)).toHaveLength(1);
    expect(buildDuplicatedShowSeries(base, 1, 99)).toHaveLength(
      MAX_DUPLICATE_COUNT,
    );
  });

  it("weeksAhead inválido cai na cadência semanal (1)", () => {
    const series = buildDuplicatedShowSeries(base, 0, 2);
    expect(series.map((s) => s.date.toISOString())).toEqual([
      "2026-03-13T22:00:00.000Z",
      "2026-03-20T22:00:00.000Z",
    ]);
  });
});

describe("buildStatusTimeline", () => {
  const ev = (fromStatus: string | null, toStatus: string, createdAt: string): StatusEventLike => ({
    fromStatus,
    toStatus,
    createdAt,
  });

  it("devolve lista vazia sem eventos", () => {
    expect(buildStatusTimeline([])).toEqual([]);
  });

  it("no primeiro evento (criação) daysInPrevious é null", () => {
    const t = buildStatusTimeline([ev(null, "PROPOSED", "2026-01-10T12:00:00.000Z")]);
    expect(t).toHaveLength(1);
    expect(t[0].fromStatus).toBeNull();
    expect(t[0].toStatus).toBe("PROPOSED");
    expect(t[0].daysInPrevious).toBeNull();
    expect(t[0].at.toISOString()).toBe("2026-01-10T12:00:00.000Z");
  });

  it("calcula os dias inteiros que o show ficou na etapa anterior", () => {
    const t = buildStatusTimeline([
      ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
      ev("PROPOSED", "CONFIRMED", "2026-01-06T00:00:00.000Z"), // +5 dias
      ev("CONFIRMED", "PLAYED", "2026-01-06T10:00:00.000Z"), // +10h → 0 dias inteiros
    ]);
    expect(t.map((e) => e.daysInPrevious)).toEqual([null, 5, 0]);
    expect(t.map((e) => e.toStatus)).toEqual(["PROPOSED", "CONFIRMED", "PLAYED"]);
  });

  it("ordena cronologicamente eventos fora de ordem antes de cronometrar", () => {
    const t = buildStatusTimeline([
      ev("PROPOSED", "CONFIRMED", "2026-02-10T00:00:00.000Z"),
      ev(null, "PROPOSED", "2026-02-01T00:00:00.000Z"),
    ]);
    expect(t.map((e) => e.toStatus)).toEqual(["PROPOSED", "CONFIRMED"]);
    expect(t.map((e) => e.daysInPrevious)).toEqual([null, 9]);
  });

  it("nunca devolve permanência negativa (piso em 0) e aceita Date", () => {
    const t = buildStatusTimeline([
      { fromStatus: null, toStatus: "PROPOSED", createdAt: new Date("2026-03-01T00:00:00.000Z") },
      { fromStatus: "PROPOSED", toStatus: "CANCELLED", createdAt: new Date("2026-03-01T00:00:00.000Z") },
    ]);
    expect(t[1].daysInPrevious).toBe(0);
  });
});

describe("funnelStageDurations", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  it("sem shows devolve vazio", () => {
    const r = funnelStageDurations([]);
    expect(r.stages).toEqual([]);
    expect(r.totalSamples).toBe(0);
    expect(r.showCount).toBe(0);
  });

  it("shows só com o evento de criação não geram amostra (nada a cronometrar)", () => {
    const r = funnelStageDurations([
      { statusEvents: [ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z")] },
    ]);
    expect(r.stages).toEqual([]);
    expect(r.totalSamples).toBe(0);
    expect(r.showCount).toBe(0);
  });

  it("credita cada transição à etapa de origem (fromStatus)", () => {
    const r = funnelStageDurations([
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
          ev("PROPOSED", "CONFIRMED", "2026-01-05T00:00:00.000Z"), // 4 dias em PROPOSED
          ev("CONFIRMED", "PLAYED", "2026-01-11T00:00:00.000Z"), // 6 dias em CONFIRMED
        ],
      },
    ]);
    expect(r.stages.map((s) => s.status)).toEqual(["PROPOSED", "CONFIRMED"]);
    const proposed = r.stages.find((s) => s.status === "PROPOSED")!;
    const confirmed = r.stages.find((s) => s.status === "CONFIRMED")!;
    expect(proposed).toMatchObject({ count: 1, medianDays: 4, averageDays: 4, shortestDays: 4, longestDays: 4 });
    expect(confirmed).toMatchObject({ count: 1, medianDays: 6, averageDays: 6 });
    expect(r.totalSamples).toBe(2);
    expect(r.showCount).toBe(1);
  });

  it("agrega a mesma etapa entre vários shows (mediana, média, mín, máx)", () => {
    const mkProposed = (days: number, id: string) => ({
      statusEvents: [
        ev(null, "PROPOSED", `2026-02-0${id}T00:00:00.000Z`),
        ev("PROPOSED", "CONFIRMED", new Date(Date.parse(`2026-02-0${id}T00:00:00.000Z`) + days * 86400000).toISOString()),
      ],
    });
    const r = funnelStageDurations([
      mkProposed(2, "1"),
      mkProposed(4, "2"),
      mkProposed(9, "3"),
    ]);
    const proposed = r.stages.find((s) => s.status === "PROPOSED")!;
    expect(proposed.count).toBe(3);
    expect(proposed.medianDays).toBe(4); // mediana de [2,4,9]
    expect(proposed.averageDays).toBe(5); // média 5
    expect(proposed.shortestDays).toBe(2);
    expect(proposed.longestDays).toBe(9);
    expect(r.showCount).toBe(3);
  });

  it("conta tanto saídas por avanço quanto por cancelamento (residência honesta)", () => {
    const r = funnelStageDurations([
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-03-01T00:00:00.000Z"),
          ev("PROPOSED", "CANCELLED", "2026-03-04T00:00:00.000Z"), // 3 dias em PROPOSED, cancelou
        ],
      },
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-03-01T00:00:00.000Z"),
          ev("PROPOSED", "CONFIRMED", "2026-03-08T00:00:00.000Z"), // 7 dias em PROPOSED, avançou
        ],
      },
    ]);
    const proposed = r.stages.find((s) => s.status === "PROPOSED")!;
    expect(proposed.count).toBe(2);
    expect(proposed.medianDays).toBe(5); // mediana de [3,7]
  });

  it("devolve as etapas na ordem canônica do funil", () => {
    // eventos fora de ordem canônica na entrada; a saída deve ser PROPOSED antes de CONFIRMED
    const r = funnelStageDurations([
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-04-01T00:00:00.000Z"),
          ev("PROPOSED", "CONFIRMED", "2026-04-03T00:00:00.000Z"),
          ev("CONFIRMED", "CANCELLED", "2026-04-10T00:00:00.000Z"),
        ],
      },
    ]);
    expect(r.stages.map((s) => s.status)).toEqual(["PROPOSED", "CONFIRMED"]);
  });
});

describe("proposalOutcomes", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  it("sem shows devolve conversão zerada e taxas nulas", () => {
    const r = proposalOutcomes([]);
    expect(r).toMatchObject({
      total: 0,
      wonCount: 0,
      lostCount: 0,
      openCount: 0,
      decidedCount: 0,
      conversionRate: null,
      winRate: null,
    });
  });

  it("classifica ganho/perdido/aberto e calcula as duas taxas", () => {
    const r = proposalOutcomes([
      // ganho: chegou a PLAYED
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
          ev("PROPOSED", "CONFIRMED", "2026-01-05T00:00:00.000Z"),
          ev("CONFIRMED", "PLAYED", "2026-01-20T00:00:00.000Z"),
        ],
      },
      // perdido: chegou a CANCELLED sem tocar
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-02-01T00:00:00.000Z"),
          ev("PROPOSED", "CANCELLED", "2026-02-10T00:00:00.000Z"),
        ],
      },
      // aberto: só proposto ainda
      { statusEvents: [ev(null, "PROPOSED", "2026-03-01T00:00:00.000Z")] },
    ]);
    expect(r).toMatchObject({
      total: 3,
      wonCount: 1,
      lostCount: 1,
      openCount: 1,
      decidedCount: 2,
    });
    expect(r.conversionRate).toBeCloseTo(0.5); // 1 de 2 decididas
    expect(r.winRate).toBeCloseTo(1 / 3); // 1 de 3 da coorte
  });

  it("PLAYED vence CANCELLED (show tocado que depois foi marcado cancelado conta como ganho)", () => {
    const r = proposalOutcomes([
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
          ev("PROPOSED", "PLAYED", "2026-01-15T00:00:00.000Z"),
          ev("PLAYED", "CANCELLED", "2026-01-16T00:00:00.000Z"),
        ],
      },
    ]);
    expect(r).toMatchObject({ total: 1, wonCount: 1, lostCount: 0, openCount: 0 });
  });

  it("exclui da coorte shows que nunca entraram em PROPOSED (sem backfill)", () => {
    const r = proposalOutcomes([
      // nasceu já CONFIRMED, sem evento PROPOSED → fora da coorte
      {
        statusEvents: [
          ev(null, "CONFIRMED", "2026-01-01T00:00:00.000Z"),
          ev("CONFIRMED", "PLAYED", "2026-01-10T00:00:00.000Z"),
        ],
      },
      // sem eventos → fora da coorte
      { statusEvents: [] },
    ]);
    expect(r.total).toBe(0);
    expect(r.conversionRate).toBeNull();
  });

  it("com ano, restringe a coorte pela data (UTC) da PRIMEIRA entrada em PROPOSED", () => {
    const shows = [
      // proposta entrou em 2025, tocada em 2026
      {
        statusEvents: [
          ev(null, "PROPOSED", "2025-12-20T00:00:00.000Z"),
          ev("PROPOSED", "PLAYED", "2026-01-10T00:00:00.000Z"),
        ],
      },
      // proposta entrou em 2026, perdida
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-02-01T00:00:00.000Z"),
          ev("PROPOSED", "CANCELLED", "2026-02-05T00:00:00.000Z"),
        ],
      },
    ];
    const y2025 = proposalOutcomes(shows, { year: 2025 });
    expect(y2025).toMatchObject({ total: 1, wonCount: 1, lostCount: 0 });
    const y2026 = proposalOutcomes(shows, { year: 2026 });
    expect(y2026).toMatchObject({ total: 1, wonCount: 0, lostCount: 1 });
    // "all" (default) soma os dois anos
    expect(proposalOutcomes(shows).total).toBe(2);
  });

  it("usa a PRIMEIRA entrada em PROPOSED quando há reentradas (re-proposta)", () => {
    const r = proposalOutcomes(
      [
        {
          statusEvents: [
            ev(null, "PROPOSED", "2025-11-01T00:00:00.000Z"),
            ev("PROPOSED", "CANCELLED", "2025-11-05T00:00:00.000Z"),
            ev("CANCELLED", "PROPOSED", "2026-01-02T00:00:00.000Z"), // reaberta em 2026
            ev("PROPOSED", "PLAYED", "2026-01-20T00:00:00.000Z"),
          ],
        },
      ],
      { year: 2025 },
    );
    // a coorte é ancorada na primeira proposta (2025), e o desfecho é ganho (chegou a PLAYED)
    expect(r).toMatchObject({ total: 1, wonCount: 1 });
    expect(proposalOutcomes([], { year: 2026 })).toMatchObject({ total: 0 });
  });
});

describe("proposalOutcomeYears", () => {
  const ev = (toStatus: string, createdAt: string): StatusEventLike => ({
    fromStatus: null,
    toStatus,
    createdAt,
  });

  it("devolve os anos UTC da entrada da proposta, decrescente e sem repetição", () => {
    const years = proposalOutcomeYears([
      { statusEvents: [ev("PROPOSED", "2026-05-01T00:00:00.000Z")] },
      { statusEvents: [ev("PROPOSED", "2024-01-01T00:00:00.000Z")] },
      { statusEvents: [ev("PROPOSED", "2026-11-01T00:00:00.000Z")] }, // 2026 de novo
    ]);
    expect(years).toEqual([2026, 2024]);
  });

  it("ignora shows sem evento PROPOSED e usa a primeira entrada em reentradas", () => {
    const years = proposalOutcomeYears([
      { statusEvents: [ev("CONFIRMED", "2026-01-01T00:00:00.000Z")] }, // sem PROPOSED
      { statusEvents: [] },
      {
        statusEvents: [
          ev("PROPOSED", "2025-06-01T00:00:00.000Z"),
          ev("PROPOSED", "2026-06-01T00:00:00.000Z"),
        ],
      },
    ]);
    expect(years).toEqual([2025]);
  });

  it("usa o ano UTC na virada do dia", () => {
    const years = proposalOutcomeYears([
      { statusEvents: [ev("PROPOSED", "2025-12-31T23:30:00.000Z")] },
    ]);
    expect(years).toEqual([2025]);
  });
});

describe("proposalOutcomesByContact", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  const won = (createdAt: string): { statusEvents: StatusEventLike[] } => ({
    statusEvents: [
      ev(null, "PROPOSED", createdAt),
      ev("PROPOSED", "PLAYED", createdAt),
    ],
  });
  const lost = (createdAt: string): { statusEvents: StatusEventLike[] } => ({
    statusEvents: [
      ev(null, "PROPOSED", createdAt),
      ev("PROPOSED", "CANCELLED", createdAt),
    ],
  });
  const open = (createdAt: string): { statusEvents: StatusEventLike[] } => ({
    statusEvents: [ev(null, "PROPOSED", createdAt)],
  });

  it("sem itens devolve carteira zerada e nenhuma linha", () => {
    const r = proposalOutcomesByContact([]);
    expect(r.contactCount).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.overall).toMatchObject({ total: 0, conversionRate: null, winRate: null });
  });

  it("agrega a coorte por contratante e destila a taxa de conversão", () => {
    const r = proposalOutcomesByContact([
      {
        contact: { id: "a", name: "Alfa", role: "VENUE" },
        shows: [won("2026-01-01T00:00:00.000Z"), won("2026-02-01T00:00:00.000Z")],
      },
      {
        contact: { id: "b", name: "Beta", role: "PRODUCER" },
        shows: [won("2026-01-01T00:00:00.000Z"), lost("2026-02-01T00:00:00.000Z")],
      },
    ]);
    expect(r.contactCount).toBe(2);
    const alfa = r.rows.find((x) => x.contact.id === "a")!;
    const beta = r.rows.find((x) => x.contact.id === "b")!;
    expect(alfa.conversion).toMatchObject({ total: 2, wonCount: 2, decidedCount: 2 });
    expect(alfa.conversion.conversionRate).toBeCloseTo(1);
    expect(beta.conversion.conversionRate).toBeCloseTo(0.5);
  });

  it("exclui contratantes sem coorte no recorte (sem proposta / fora do ano)", () => {
    const r = proposalOutcomesByContact(
      [
        {
          contact: { id: "a", name: "Alfa", role: "VENUE" },
          shows: [won("2026-03-01T00:00:00.000Z")],
        },
        {
          // só show sem evento PROPOSED → fora da coorte
          contact: { id: "b", name: "Beta", role: "VENUE" },
          shows: [
            { statusEvents: [ev(null, "CONFIRMED", "2026-03-01T00:00:00.000Z")] },
          ],
        },
        {
          // proposta de 2025 → fora do recorte de 2026
          contact: { id: "c", name: "Gama", role: "VENUE" },
          shows: [lost("2025-05-01T00:00:00.000Z")],
        },
      ],
      { year: 2026 },
    );
    expect(r.rows.map((x) => x.contact.id)).toEqual(["a"]);
  });

  it("ordena por taxa desc, com decididas desempatando amostras finas, e indefinida ao fim", () => {
    const r = proposalOutcomesByContact([
      // taxa 1/1 = 100% mas só 1 decidida
      {
        contact: { id: "thin", name: "Fina", role: "VENUE" },
        shows: [won("2026-01-01T00:00:00.000Z")],
      },
      // taxa 3/3 = 100% com 3 decididas → vem antes da amostra fina
      {
        contact: { id: "robust", name: "Robusta", role: "VENUE" },
        shows: [
          won("2026-01-01T00:00:00.000Z"),
          won("2026-01-02T00:00:00.000Z"),
          won("2026-01-03T00:00:00.000Z"),
        ],
      },
      // taxa 1/2 = 50%
      {
        contact: { id: "mid", name: "Media", role: "VENUE" },
        shows: [won("2026-01-01T00:00:00.000Z"), lost("2026-01-02T00:00:00.000Z")],
      },
      // taxa indefinida (só em aberto) → ao fim
      {
        contact: { id: "openonly", name: "Aberta", role: "VENUE" },
        shows: [open("2026-01-01T00:00:00.000Z")],
      },
    ]);
    expect(r.rows.map((x) => x.contact.id)).toEqual([
      "robust",
      "thin",
      "mid",
      "openonly",
    ]);
  });

  it("o agregado da carteira soma as coortes por relação (show partilhado conta para cada contato)", () => {
    // o mesmo desfecho de show entra na coorte de dois contatos (relação, não show único)
    const shared = won("2026-01-01T00:00:00.000Z");
    const r = proposalOutcomesByContact([
      { contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [shared] },
      { contact: { id: "b", name: "Beta", role: "VENUE" }, shows: [shared, lost("2026-02-01T00:00:00.000Z")] },
    ]);
    // total por relação = 3 (won em A, won+lost em B), 2 ganhas, 1 perdida
    expect(r.overall).toMatchObject({ total: 3, wonCount: 2, lostCount: 1, decidedCount: 3 });
    expect(r.overall.conversionRate).toBeCloseTo(2 / 3);
  });
});

describe("compareProposalOutcomes", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  // Coorte com propostas de 2025 e 2026: em 2025, 1 de 2 decididas ganhou (50%);
  // em 2026, 2 de 2 decididas ganharam (100%) — melhora de +50 p.p.
  const shows = [
    // 2025 — ganho
    {
      statusEvents: [
        ev(null, "PROPOSED", "2025-01-01T00:00:00.000Z"),
        ev("PROPOSED", "PLAYED", "2025-01-20T00:00:00.000Z"),
      ],
    },
    // 2025 — perda
    {
      statusEvents: [
        ev(null, "PROPOSED", "2025-02-01T00:00:00.000Z"),
        ev("PROPOSED", "CANCELLED", "2025-02-10T00:00:00.000Z"),
      ],
    },
    // 2026 — ganho
    {
      statusEvents: [
        ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
        ev("PROPOSED", "PLAYED", "2026-01-20T00:00:00.000Z"),
      ],
    },
    // 2026 — ganho
    {
      statusEvents: [
        ev(null, "PROPOSED", "2026-02-01T00:00:00.000Z"),
        ev("PROPOSED", "PLAYED", "2026-02-20T00:00:00.000Z"),
      ],
    },
  ];

  it("mede a variação da taxa de conversão e vereda 'improved' quando sobe além do limiar", () => {
    const current = proposalOutcomes(shows, { year: 2026 });
    const previous = proposalOutcomes(shows, { year: 2025 });
    const cmp = compareProposalOutcomes(current, previous);
    expect(cmp.conversionRateDelta).toBeCloseTo(0.5); // 100% − 50%
    expect(cmp.wonCountDelta).toBe(1); // 2 ganhas em 2026 − 1 em 2025
    expect(cmp.decidedCountDelta).toBe(0); // 2 decididas em cada
    expect(cmp.trend).toBe("improved");
    expect(cmp.current).toBe(current);
    expect(cmp.previous).toBe(previous);
  });

  it("vereda 'worsened' quando a taxa cai além do limiar (ordem invertida)", () => {
    const current = proposalOutcomes(shows, { year: 2025 }); // 50%
    const previous = proposalOutcomes(shows, { year: 2026 }); // 100%
    const cmp = compareProposalOutcomes(current, previous);
    expect(cmp.conversionRateDelta).toBeCloseTo(-0.5);
    expect(cmp.trend).toBe("worsened");
  });

  it("vereda 'stable' quando a variação fica dentro do limiar de ruído", () => {
    // duas coortes com taxa idêntica (50%): delta 0 → estável
    const a = proposalOutcomes(shows, { year: 2025 });
    const cmp = compareProposalOutcomes(a, a);
    expect(cmp.conversionRateDelta).toBeCloseTo(0);
    expect(cmp.trend).toBe("stable");
  });

  it("com taxa indefinida em algum período, delta é null e o veredito é 'stable'", () => {
    const decided = proposalOutcomes(shows, { year: 2026 }); // 2 decididas
    const openOnly = proposalOutcomes(
      [{ statusEvents: [ev(null, "PROPOSED", "2024-01-01T00:00:00.000Z")] }],
      { year: 2024 },
    ); // só em aberto → conversionRate null
    expect(openOnly.conversionRate).toBeNull();
    const cmp = compareProposalOutcomes(decided, openOnly);
    expect(cmp.conversionRateDelta).toBeNull();
    expect(cmp.trend).toBe("stable");
  });
});

describe("proposalConversionHeadline", () => {
  // Fábrica de uma coorte `ProposalConversion` a partir de won/lost/open, com a
  // mesma aritmética de `proposalOutcomes` (taxa = won/decididas).
  const conv = (won: number, lost: number, open: number) => {
    const total = won + lost + open;
    const decidedCount = won + lost;
    return {
      total,
      wonCount: won,
      lostCount: lost,
      openCount: open,
      decidedCount,
      conversionRate: decidedCount > 0 ? won / decidedCount : null,
      winRate: total > 0 ? won / total : null,
    };
  };
  const headline = (current: ReturnType<typeof conv>, previous: ReturnType<typeof conv>) =>
    proposalConversionHeadline(compareProposalOutcomes(current, previous));

  it("dispara quando a conversão cai além do limiar com amostra confiável nas duas coortes", () => {
    // atual 2/6 ≈ 33% ; anterior 6/6 = 100% → queda ~67 p.p.
    const h = headline(conv(2, 4, 0), conv(6, 0, 0));
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true); // queda >> 25 p.p.
    expect(h.drop).toBeCloseTo(1 - 2 / 6);
    expect(h.currentRate).toBeCloseTo(2 / 6);
    expect(h.previousRate).toBeCloseTo(1);
    expect(h).toMatchObject({ won: 2, decided: 6 });
  });

  it("respeita o piso de queda: uma queda material dispara, uma pequena não", () => {
    // 8/20 (40%) vs 11/20 (55%) → queda de 15 p.p., acima do piso → dispara
    const material = headline(conv(8, 12, 0), conv(11, 9, 0));
    expect(material.drop).toBeCloseTo(0.15);
    expect(material.show).toBe(true);
    expect(material.critical).toBe(false); // 15 p.p. < 25 p.p. crítico
    // 11/20 (55%) vs 12/20 (60%) → queda de 5 p.p., abaixo do piso → não dispara
    const belowFloor = headline(conv(11, 9, 0), conv(12, 8, 0));
    expect(belowFloor.drop).toBeCloseTo(0.05);
    expect(belowFloor.show).toBe(false);
    expect(CONVERSION_DROP_POINTS).toBe(0.1);
  });

  it("uma melhora (conversão subindo) nunca vira nudge", () => {
    const h = headline(conv(6, 0, 0), conv(2, 4, 0)); // 100% vs 33% → subiu
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.drop).toBeLessThan(0); // drop negativo = melhora
  });

  it("não dispara sem amostra mínima de decididas em alguma coorte", () => {
    // queda enorme, mas a coorte anterior tem só 1 decidida (abaixo do mínimo)
    const thin = headline(conv(0, 6, 0), conv(1, 0, 0));
    expect(thin.show).toBe(false);
    // agora com amostra suficiente nas duas → dispara
    const enough = headline(conv(0, 6, 0), conv(4, 0, 0));
    expect(enough.show).toBe(true);
  });

  it("com taxa indefinida (coorte sem decididas) não dispara", () => {
    const h = headline(conv(0, 0, 5), conv(5, 0, 0)); // atual só em aberto → rate null
    expect(h.show).toBe(false);
    expect(h.drop).toBe(0);
    expect(h.currentRate).toBe(0);
  });

  it("respeita limiares injetáveis (min de decididas / pontos)", () => {
    const cmp = compareProposalOutcomes(conv(1, 2, 0), conv(3, 0, 0)); // 33% vs 100%, 3 decididas cada
    // com mínimo 4 não passa; com mínimo 3 passa
    expect(proposalConversionHeadline(cmp, 4).show).toBe(false);
    expect(proposalConversionHeadline(cmp, 3).show).toBe(true);
    // ponto crítico afrouxado torna a queda "crítica"
    const h = proposalConversionHeadline(cmp, 3, 0.1, 0.5);
    expect(h.critical).toBe(true);
  });

  it("as constantes de gate são coerentes (crítico > piso > epsilon do card)", () => {
    expect(CONVERSION_DROP_CRITICAL_POINTS).toBeGreaterThan(CONVERSION_DROP_POINTS);
    expect(CONVERSION_DROP_MIN_DECIDED).toBeGreaterThan(1);
  });
});

describe("findStaleProposals", () => {
  const NOW = new Date("2026-06-01T00:00:00.000Z");
  const daysBefore = (n: number) =>
    new Date(NOW.getTime() - n * 86400000).toISOString();
  const daysAfter = (n: number) =>
    new Date(NOW.getTime() + n * 86400000).toISOString();

  function prop(partial: Partial<StaleProposalShowLike>): StaleProposalShowLike {
    return {
      id: "s1",
      title: "Show",
      date: daysAfter(60),
      venue: null,
      city: null,
      fee: 100_00,
      status: "PROPOSED",
      createdAt: daysBefore(30),
      ...partial,
    };
  }

  it("sem shows devolve relatório zerado", () => {
    const r = findStaleProposals([], { now: NOW });
    expect(r).toMatchObject({ count: 0, totalFee: 0, overdueCount: 0, imminentCount: 0, coldCount: 0 });
    expect(r.proposals).toEqual([]);
  });

  it("só considera shows em PROPOSED (ignora confirmados/realizados/cancelados)", () => {
    const r = findStaleProposals(
      [
        prop({ id: "a", status: "CONFIRMED", createdAt: daysBefore(90) }),
        prop({ id: "b", status: "PLAYED", createdAt: daysBefore(90) }),
        prop({ id: "c", status: "CANCELLED", createdAt: daysBefore(90) }),
      ],
      { now: NOW },
    );
    expect(r.count).toBe(0);
  });

  it("não sinaliza proposta recente (dentro do limiar e sem data vencida)", () => {
    const r = findStaleProposals(
      [prop({ createdAt: daysBefore(5), date: daysAfter(60) })],
      { now: NOW },
    );
    expect(r.count).toBe(0);
  });

  it("sinaliza proposta parada há mais do que o limiar como 'cold' (data distante)", () => {
    const r = findStaleProposals(
      [prop({ createdAt: daysBefore(30), date: daysAfter(60) })],
      { now: NOW },
    );
    expect(r.count).toBe(1);
    expect(r.coldCount).toBe(1);
    expect(r.proposals[0]).toMatchObject({ urgency: "cold", daysInStatus: 30, daysUntilShow: 60 });
    expect(r.totalFee).toBe(100_00);
  });

  it("classifica como 'imminent' quando a data cai dentro da janela iminente", () => {
    const r = findStaleProposals(
      [prop({ createdAt: daysBefore(30), date: daysAfter(10) })],
      { now: NOW },
    );
    expect(r.proposals[0]).toMatchObject({ urgency: "imminent", daysUntilShow: 10 });
    expect(r.imminentCount).toBe(1);
  });

  it("marca 'overdue' quando a data já passou, mesmo com pouco tempo no status", () => {
    // criado ontem (daysInStatus < limiar) mas a data já passou → entra por vencida
    const r = findStaleProposals(
      [prop({ createdAt: daysBefore(1), date: daysBefore(3) })],
      { now: NOW },
    );
    expect(r.count).toBe(1);
    expect(r.proposals[0]).toMatchObject({ urgency: "overdue", daysUntilShow: -3 });
    expect(r.overdueCount).toBe(1);
  });

  it("usa o último evento de status para medir o tempo no status atual", () => {
    // criado há 90 dias, mas voltou a PROPOSED há 5 dias → não parado ainda
    const r = findStaleProposals(
      [
        prop({
          createdAt: daysBefore(90),
          date: daysAfter(60),
          statusEvents: [
            { fromStatus: null, toStatus: "PROPOSED", createdAt: daysBefore(90) },
            { fromStatus: "PROPOSED", toStatus: "CONFIRMED", createdAt: daysBefore(40) },
            { fromStatus: "CONFIRMED", toStatus: "PROPOSED", createdAt: daysBefore(5) },
          ],
        }),
      ],
      { now: NOW },
    );
    expect(r.count).toBe(0); // 5 dias no status atual < limiar
  });

  it("ordena por urgência: overdue, depois imminent, depois cold", () => {
    const r = findStaleProposals(
      [
        prop({ id: "cold", createdAt: daysBefore(40), date: daysAfter(80) }),
        prop({ id: "overdue", createdAt: daysBefore(40), date: daysBefore(2) }),
        prop({ id: "imminent", createdAt: daysBefore(40), date: daysAfter(7) }),
      ],
      { now: NOW },
    );
    expect(r.proposals.map((p) => p.id)).toEqual(["overdue", "imminent", "cold"]);
  });

  it("dentro de overdue/imminent ordena pela data (mais próxima/vencida primeiro); cold pelo maior tempo parado", () => {
    const r = findStaleProposals(
      [
        prop({ id: "imm-late", createdAt: daysBefore(40), date: daysAfter(12) }),
        prop({ id: "imm-soon", createdAt: daysBefore(40), date: daysAfter(2) }),
        prop({ id: "cold-old", createdAt: daysBefore(60), date: daysAfter(90) }),
        prop({ id: "cold-new", createdAt: daysBefore(25), date: daysAfter(90) }),
      ],
      { now: NOW },
    );
    expect(r.proposals.map((p) => p.id)).toEqual(["imm-soon", "imm-late", "cold-old", "cold-new"]);
  });

  it("respeita limiares customizados de staleDays e imminentDays", () => {
    const shows = [prop({ createdAt: daysBefore(10), date: daysAfter(5) })];
    // limiar default 21 → nada; com staleDays=7 vira parada
    expect(findStaleProposals(shows, { now: NOW }).count).toBe(0);
    const r = findStaleProposals(shows, { now: NOW, staleDays: 7, imminentDays: 14 });
    expect(r.count).toBe(1);
    expect(r.proposals[0].urgency).toBe("imminent");
  });

  it("cai para createdAt quando não há histórico de eventos (shows antigos)", () => {
    const r = findStaleProposals(
      [prop({ createdAt: daysBefore(STALE_PROPOSAL_DAYS + 1), date: daysAfter(90), statusEvents: [] })],
      { now: NOW },
    );
    expect(r.count).toBe(1);
    expect(r.proposals[0].daysInStatus).toBe(STALE_PROPOSAL_DAYS + 1);
  });

  it("expõe constantes de limiar sensatas", () => {
    expect(STALE_PROPOSAL_DAYS).toBeGreaterThan(0);
    expect(STALE_PROPOSAL_IMMINENT_DAYS).toBeGreaterThan(0);
    expect(STALE_PROPOSAL_IMMINENT_DAYS).toBeLessThan(STALE_PROPOSAL_DAYS);
  });
});

describe("staleProposalsHeadline", () => {
  const NOW = new Date("2026-06-01T00:00:00.000Z");
  const daysBefore = (n: number) =>
    new Date(NOW.getTime() - n * 86400000).toISOString();
  const daysAfter = (n: number) =>
    new Date(NOW.getTime() + n * 86400000).toISOString();

  function prop(partial: Partial<StaleProposalShowLike>): StaleProposalShowLike {
    return {
      id: "s1",
      title: "Show",
      date: daysAfter(60),
      venue: null,
      city: null,
      fee: 100_00,
      status: "PROPOSED",
      createdAt: daysBefore(30),
      ...partial,
    };
  }

  it("sem propostas paradas não mostra nudge", () => {
    const h = staleProposalsHeadline(findStaleProposals([], { now: NOW }));
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.top).toBeNull();
    expect(h).toMatchObject({ actionableCount: 0, actionableFee: 0, totalStale: 0 });
  });

  it("só propostas 'cold' (data distante) não disparam o nudge", () => {
    // parada há 30 dias, mas o show é daqui a 60 → cold, sem urgência de decisão
    const h = staleProposalsHeadline(
      findStaleProposals([prop({ createdAt: daysBefore(30), date: daysAfter(60) })], {
        now: NOW,
      }),
    );
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.top).toBeNull();
    expect(h.totalStale).toBe(1);
    expect(h.actionableCount).toBe(0);
  });

  it("proposta iminente dispara o nudge (não crítico)", () => {
    const h = staleProposalsHeadline(
      findStaleProposals([prop({ createdAt: daysBefore(30), date: daysAfter(10) })], {
        now: NOW,
      }),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.imminentCount).toBe(1);
    expect(h.actionableCount).toBe(1);
    expect(h.actionableFee).toBe(100_00);
    expect(h.top?.urgency).toBe("imminent");
  });

  it("proposta vencida deixa o nudge crítico e é o topo da fila", () => {
    const h = staleProposalsHeadline(
      findStaleProposals(
        [
          prop({ id: "cold", createdAt: daysBefore(30), date: daysAfter(60) }),
          prop({ id: "late", createdAt: daysBefore(2), date: daysBefore(3), fee: 500_00 }),
        ],
        { now: NOW },
      ),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.overdueCount).toBe(1);
    expect(h.top?.id).toBe("late");
    expect(h.top?.urgency).toBe("overdue");
    // cold não entra na conta acionável, mas continua no totalStale
    expect(h.actionableCount).toBe(1);
    expect(h.actionableFee).toBe(500_00);
    expect(h.totalStale).toBe(2);
  });

  it("soma o cachê só das acionáveis (vencidas + iminentes), ignorando cold", () => {
    const h = staleProposalsHeadline(
      findStaleProposals(
        [
          prop({ id: "over", createdAt: daysBefore(2), date: daysBefore(1), fee: 300_00 }),
          prop({ id: "imm", createdAt: daysBefore(30), date: daysAfter(5), fee: 200_00 }),
          prop({ id: "cold", createdAt: daysBefore(40), date: daysAfter(90), fee: 999_00 }),
        ],
        { now: NOW },
      ),
    );
    expect(h.actionableCount).toBe(2);
    expect(h.actionableFee).toBe(500_00);
    expect(h.totalStale).toBe(3);
    // a fila vem ordenada por urgência → vencida é o topo
    expect(h.top?.id).toBe("over");
  });
});
