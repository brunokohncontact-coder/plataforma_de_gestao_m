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
  bookingLeadTimeByContact,
  compareBookingLeadTimeByContact,
  indexContactBookingLeadTimeChanges,
  bookingLeadTimeHeadline,
  contactBookingLeadTimeDropHeadline,
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
  proposalDeliberationByContact,
  MIN_DELIBERATION_SAMPLE,
  compareProposalDeliberationByContact,
  indexContactProposalDeliberationChanges,
  DELIBERATION_TREND_EPSILON,
  slowDeliberatorHeadline,
  contactDeliberationRiseHeadline,
  DELIBERATION_RISE_DAYS,
  DELIBERATION_RISE_CRITICAL_DAYS,
  proposalOutcomes,
  proposalOutcomeYears,
  proposalOutcomesByContact,
  compareProposalOutcomes,
  compareContactProposalOutcomes,
  indexContactProposalConversionChanges,
  proposalConversionHeadline,
  contactConversionDropHeadline,
  CONVERSION_DROP_MIN_DECIDED,
  CONVERSION_DROP_POINTS,
  CONVERSION_DROP_CRITICAL_POINTS,
  findStaleProposals,
  staleProposalsHeadline,
  STALE_PROPOSAL_DAYS,
  STALE_PROPOSAL_IMMINENT_DAYS,
  showGaps,
  MIN_SHOW_GAP_SAMPLE,
  currentDrySpellHeadline,
  DRY_SPELL_UNUSUAL_RATIO,
  gapDistribution,
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
    show({ title: "Sarau acústico", venue: "Casa Violão", city: "Santos", status: "PLAYED", date: "2026-02-20T00:00:00.000Z", notes: "Levar cabo reserva" }),
    show({ title: "Show cancelado", status: "CANCELLED", date: "2026-03-15T00:00:00.000Z", notes: "Aniversário da Cláudia" }),
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

  it("busca também nas anotações do show", () => {
    expect(filterShows(shows, { q: "cabo reserva" }).map((s) => s.title)).toEqual([
      "Sarau acústico",
    ]);
    // Sem acento/caixa nas anotações também.
    expect(filterShows(shows, { q: "CLAUDIA" }).map((s) => s.title)).toEqual([
      "Show cancelado",
    ]);
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

describe("bookingLeadTimeByContact", () => {
  type BookerShow = LeadTimeShowLike & { bookerId: string | null; bookerName: string };
  const bShow = (partial: Partial<BookerShow>): BookerShow => ({
    ...leadShow({}),
    bookerId: "c1",
    bookerName: "Bar do Zé",
    ...partial,
  });
  const getBooker = (s: BookerShow) =>
    s.bookerId ? { id: s.bookerId, name: s.bookerName } : null;
  // createdAt fixo; a data `lead` dias depois dá uma antecedência de `lead` dias.
  const lead = (bookerId: string | null, name: string, days: number, over: Partial<BookerShow> = {}) =>
    bShow({
      bookerId,
      bookerName: name,
      createdAt: "2026-01-01T00:00:00.000Z",
      date: new Date(Date.UTC(2026, 0, 1 + days)).toISOString(),
      ...over,
    });

  it("amostra vazia: sem linhas, destaques nulos, overall zerado", () => {
    const r = bookingLeadTimeByContact<{ id: string; name: string }, BookerShow>([], getBooker);
    expect(r.rows).toEqual([]);
    expect(r.contactCount).toBe(0);
    expect(r.sample).toBe(0);
    expect(r.mostLeadTime).toBeNull();
    expect(r.leastLeadTime).toBeNull();
    expect(r.overall.sample).toBe(0);
  });

  it("agrupa por contratante e cada linha reusa bookingLeadTime (mediana bate)", () => {
    const shows = [
      lead("c1", "Bar do Zé", 10),
      lead("c1", "Bar do Zé", 20),
      lead("c1", "Bar do Zé", 30),
      lead("c2", "Festival X", 90),
    ];
    const r = bookingLeadTimeByContact(shows, getBooker);
    expect(r.contactCount).toBe(2);
    expect(r.sample).toBe(4);
    const c1 = r.rows.find((x) => x.contact?.id === "c1")!;
    expect(c1.leadTime.sample).toBe(3);
    expect(c1.leadTime.medianDays).toBe(20);
    expect(c1.leadTime.medianDays).toBe(bookingLeadTime(shows.filter((s) => s.bookerId === "c1")).medianDays);
    // overall = a leitura da carteira inteira (tela-mãe)
    expect(r.overall.sample).toBe(4);
    expect(r.overall.medianDays).toBe(bookingLeadTime(shows).medianDays);
  });

  it("ordena do menor lead mediano ao maior (mais em cima da hora primeiro); sem-contratante por último", () => {
    const shows = [
      lead("c1", "Fecha com folga", 60),
      lead("c1", "Fecha com folga", 60),
      lead("c1", "Fecha com folga", 60),
      lead("c2", "Em cima da hora", 3),
      lead("c2", "Em cima da hora", 3),
      lead("c2", "Em cima da hora", 3),
      lead(null, "", 15),
    ];
    const r = bookingLeadTimeByContact(shows, getBooker);
    expect(r.rows.map((x) => x.contact?.id ?? "__none__")).toEqual(["c2", "c1", "__none__"]);
    expect(r.rows[r.rows.length - 1].contact).toBeNull();
    expect(r.leastLeadTime?.contact?.id).toBe("c2");
    expect(r.mostLeadTime?.contact?.id).toBe("c1");
  });

  it("participação (share) soma ~1 sobre a amostra total, incluindo sem-contratante", () => {
    const shows = [
      lead("c1", "A", 10),
      lead("c2", "B", 20),
      lead(null, "", 30),
    ];
    const r = bookingLeadTimeByContact(shows, getBooker);
    const total = r.rows.reduce((s, x) => s + x.share, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(r.rows.every((x) => Math.abs(x.share - x.leadTime.sample / 3) < 1e-9)).toBe(true);
  });

  it("destaques só consideram contratantes com amostra confiável (>= MIN_LEAD_TIME_SAMPLE)", () => {
    const shows = [
      // c1: 1 show com lead altíssimo, mas amostra fina → fora do destaque
      lead("c1", "Uma vez só", 200),
      // c2: 3 shows curtos, confiável
      lead("c2", "Regular", 5),
      lead("c2", "Regular", 6),
      lead("c2", "Regular", 7),
    ];
    const r = bookingLeadTimeByContact(shows, getBooker);
    expect(r.mostLeadTime?.contact?.id).toBe("c2");
    expect(r.leastLeadTime?.contact?.id).toBe("c2");
    // c1 aparece na tabela, mas nunca vira destaque (amostra não confiável).
    expect(r.rows.some((x) => x.contact?.id === "c1")).toBe(true);
  });

  it("readings do grupo vêm do maior lead ao menor e ignoram retroativos", () => {
    const shows = [
      lead("c1", "A", 5),
      lead("c1", "A", 40),
      // retroativo: createdAt depois da data → não entra na amostra nem nos readings
      bShow({ bookerId: "c1", bookerName: "A", createdAt: "2026-03-01T00:00:00.000Z", date: "2026-02-01T00:00:00.000Z" }),
    ];
    const r = bookingLeadTimeByContact(shows, getBooker);
    const c1 = r.rows.find((x) => x.contact?.id === "c1")!;
    expect(c1.shows.map((s) => s.leadDays)).toEqual([40, 5]);
    expect(c1.leadTime.retroactiveCount).toBe(1);
    expect(c1.leadTime.sample).toBe(2);
    expect(c1.totalFee).toBe(2 * 100_00);
  });

  it("escopo 'firm' restringe a amostra (só CONFIRMED/PLAYED) e casa com o overall", () => {
    const shows = [
      lead("c1", "A", 10, { status: "PROPOSED" }),
      lead("c1", "A", 20, { status: "CONFIRMED" }),
      lead("c1", "A", 30, { status: "PLAYED" }),
      lead("c1", "A", 40, { status: "CANCELLED" }),
    ];
    const r = bookingLeadTimeByContact(shows, getBooker, "firm");
    const c1 = r.rows.find((x) => x.contact?.id === "c1")!;
    expect(c1.leadTime.sample).toBe(2);
    expect(c1.shows.map((s) => s.leadDays)).toEqual([30, 20]);
    expect(r.overall.sample).toBe(2);
    expect(r.overall.medianDays).toBe(bookingLeadTime(shows, "firm").medianDays);
  });
});

describe("compareBookingLeadTimeByContact", () => {
  type BookerShow = LeadTimeShowLike & { bookerId: string | null; bookerName: string };
  const bShow = (partial: Partial<BookerShow>): BookerShow => ({
    ...leadShow({}),
    bookerId: "c1",
    bookerName: "Bar do Zé",
    ...partial,
  });
  const getBooker = (s: BookerShow) =>
    s.bookerId ? { id: s.bookerId, name: s.bookerName } : null;
  // Um show do contratante `bookerId` no ano `year` com antecedência `days`.
  const lead = (bookerId: string | null, name: string, year: number, days: number) =>
    bShow({
      bookerId,
      bookerName: name,
      createdAt: `${year}-01-01T00:00:00.000Z`,
      date: new Date(Date.UTC(year, 0, 1 + days)).toISOString(),
    });
  const report = (shows: BookerShow[]) =>
    bookingLeadTimeByContact<{ id: string; name: string }, BookerShow>(shows, getBooker);

  it("casa por id e marca 'improved' quando o contratante passa a fechar com mais folga", () => {
    // 2025: mediana 5; 2026: mediana 40 → +35 (subir a antecedência é melhora).
    const cur = report([lead("ze", "Zé", 2026, 40), lead("ze", "Zé", 2026, 40), lead("ze", "Zé", 2026, 40)]);
    const prev = report([lead("ze", "Zé", 2025, 5), lead("ze", "Zé", 2025, 5), lead("ze", "Zé", 2025, 5)]);
    const c = compareBookingLeadTimeByContact(cur, prev);
    expect(c.changes).toHaveLength(1);
    expect(c.changes[0].contact.id).toBe("ze");
    expect(c.changes[0].medianDaysDelta).toBe(35);
    expect(c.changes[0].trend).toBe("improved");
    expect(c.biggestImprovement?.contact.id).toBe("ze");
    expect(c.biggestWorsening).toBeNull();
    expect(c.newContacts).toEqual([]);
    expect(c.droppedContacts).toEqual([]);
  });

  it("marca 'worsened' quando perde folga e 'stable' dentro do limiar", () => {
    const worse = compareBookingLeadTimeByContact(
      report([lead("ze", "Zé", 2026, 5)]),
      report([lead("ze", "Zé", 2025, 40)]),
    );
    expect(worse.changes[0].medianDaysDelta).toBe(-35);
    expect(worse.changes[0].trend).toBe("worsened");
    expect(worse.biggestWorsening?.contact.id).toBe("ze");
    expect(worse.biggestImprovement).toBeNull();

    // Variação de 3 dias (< LEAD_TIME_TREND_EPSILON = 7) → estável.
    const stable = compareBookingLeadTimeByContact(
      report([lead("ze", "Zé", 2026, 13)]),
      report([lead("ze", "Zé", 2025, 10)]),
    );
    expect(stable.changes[0].medianDaysDelta).toBe(3);
    expect(stable.changes[0].trend).toBe("stable");
    expect(stable.biggestImprovement).toBeNull();
    expect(stable.biggestWorsening).toBeNull();
  });

  it("particiona novos e sumidos e ignora o grupo sem contratante", () => {
    const cur = report([
      lead("ze", "Zé", 2026, 20),
      lead("novo", "Novo", 2026, 10),
      lead(null, "", 2026, 15), // sem contratante → não comparável
    ]);
    const prev = report([lead("ze", "Zé", 2025, 30), lead("antigo", "Antigo", 2025, 40)]);
    const c = compareBookingLeadTimeByContact(cur, prev);
    expect(c.changes.map((x) => x.contact.id)).toEqual(["ze"]); // só quem está nos dois
    expect(c.newContacts.map((x) => x.contact?.id)).toEqual(["novo"]);
    expect(c.droppedContacts.map((x) => x.contact?.id)).toEqual(["antigo"]);
  });

  it("ordena as variações da maior piora à maior melhora e escolhe os extremos", () => {
    // ganhou: 5 → 60 (+55, melhora); perdeu: 60 → 5 (−55, piora).
    const cur = report([lead("ganhou", "Ganhou", 2026, 60), lead("perdeu", "Perdeu", 2026, 5)]);
    const prev = report([lead("ganhou", "Ganhou", 2025, 5), lead("perdeu", "Perdeu", 2025, 60)]);
    const c = compareBookingLeadTimeByContact(cur, prev);
    // Piora (−55) no topo, melhora (+55) embaixo.
    expect(c.changes.map((x) => x.contact.id)).toEqual(["perdeu", "ganhou"]);
    expect(c.biggestWorsening?.contact.id).toBe("perdeu");
    expect(c.biggestImprovement?.contact.id).toBe("ganhou");
  });
});

describe("indexContactBookingLeadTimeChanges", () => {
  type BookerShow = LeadTimeShowLike & { bookerId: string | null; bookerName: string };
  const bShow = (partial: Partial<BookerShow>): BookerShow => ({
    ...leadShow({}),
    bookerId: "c1",
    bookerName: "Bar do Zé",
    ...partial,
  });
  const getBooker = (s: BookerShow) =>
    s.bookerId ? { id: s.bookerId, name: s.bookerName } : null;
  const lead = (bookerId: string | null, name: string, year: number, days: number) =>
    bShow({
      bookerId,
      bookerName: name,
      createdAt: `${year}-01-01T00:00:00.000Z`,
      date: new Date(Date.UTC(year, 0, 1 + days)).toISOString(),
    });
  const report = (shows: BookerShow[]) =>
    bookingLeadTimeByContact<{ id: string; name: string }, BookerShow>(shows, getBooker);

  it("resolve 'changed' com a variação para quem está nos dois períodos", () => {
    const cur = report([lead("ze", "Zé", 2026, 40)]);
    const prev = report([lead("ze", "Zé", 2025, 5)]);
    const lookup = indexContactBookingLeadTimeChanges(compareBookingLeadTimeByContact(cur, prev));
    const status = lookup("ze");
    expect(status.kind).toBe("changed");
    if (status.kind === "changed") {
      expect(status.change.medianDaysDelta).toBe(35);
      expect(status.change.trend).toBe("improved");
    }
  });

  it("resolve 'new' para quem só existe no atual e 'none' para sem-contratante/desconhecido", () => {
    const cur = report([
      lead("ze", "Zé", 2026, 20),
      lead("novo", "Novo", 2026, 10),
      lead(null, "", 2026, 15),
    ]);
    const prev = report([lead("ze", "Zé", 2025, 30)]);
    const lookup = indexContactBookingLeadTimeChanges(compareBookingLeadTimeByContact(cur, prev));
    expect(lookup("novo").kind).toBe("new");
    expect(lookup(null).kind).toBe("none");
    expect(lookup(undefined).kind).toBe("none");
    expect(lookup("fantasma").kind).toBe("none");
    expect(lookup("ze").kind).toBe("changed");
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

describe("proposalDeliberationByContact", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  /** Um show cuja proposta ficou `days` dias na mesa antes de sair (avançar ou cancelar). */
  const decided = (days: number, out: "CONFIRMED" | "CANCELLED" = "CONFIRMED") => ({
    statusEvents: [
      ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
      ev(
        "PROPOSED",
        out,
        new Date(Date.parse("2026-01-01T00:00:00.000Z") + days * 86400000).toISOString(),
      ),
    ],
  });

  /** Um show cuja proposta ainda está na mesa (sem desfecho a cronometrar). */
  const open = () => ({
    statusEvents: [ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z")],
  });

  const c = (id: string, name: string, role = "CONTRACTOR") => ({ id, name, role });

  it("sem contratantes devolve vazio", () => {
    const r = proposalDeliberationByContact([]);
    expect(r.rows).toEqual([]);
    expect(r.contactCount).toBe(0);
    expect(r.overall).toBeNull();
    expect(r.totalSamples).toBe(0);
    expect(r.slowest).toBeNull();
  });

  it("contratante só com proposta em aberto não vira linha", () => {
    const r = proposalDeliberationByContact([
      { contact: c("1", "Ana"), shows: [open(), open()] },
    ]);
    expect(r.contactCount).toBe(0);
    expect(r.overall).toBeNull();
  });

  it("destila a etapa PROPOSED por contratante e ordena da menor mediana à maior", () => {
    const r = proposalDeliberationByContact([
      { contact: c("slow", "Lento"), shows: [decided(10), decided(20), decided(30)] },
      { contact: c("fast", "Rápido"), shows: [decided(1), decided(3), decided(5)] },
    ]);
    expect(r.contactCount).toBe(2);
    expect(r.rows.map((row) => row.contact.id)).toEqual(["fast", "slow"]);
    const fast = r.rows[0];
    expect(fast.stat.medianDays).toBe(3); // mediana de [1,3,5]
    expect(fast.reliable).toBe(true);
    const slow = r.rows[1];
    expect(slow.stat.medianDays).toBe(20); // mediana de [10,20,30]
    expect(r.totalSamples).toBe(6);
    // Participação soma 1 (3/6 cada).
    expect(fast.share).toBeCloseTo(0.5);
    expect(slow.share).toBeCloseTo(0.5);
  });

  it("marca amostra fina como não-confiável mas ainda lista o contratante", () => {
    const r = proposalDeliberationByContact([
      { contact: c("1", "Ana"), shows: [decided(5), decided(9)] }, // 2 < MIN
    ]);
    expect(MIN_DELIBERATION_SAMPLE).toBeGreaterThan(2);
    expect(r.contactCount).toBe(1);
    expect(r.rows[0].reliable).toBe(false);
    expect(r.rows[0].stat.count).toBe(2);
  });

  it("conta tanto avanços quanto cancelamentos na deliberação", () => {
    const r = proposalDeliberationByContact([
      {
        contact: c("1", "Ana"),
        shows: [decided(3, "CANCELLED"), decided(7, "CONFIRMED"), decided(5, "CANCELLED")],
      },
    ]);
    const row = r.rows[0];
    expect(row.stat.count).toBe(3);
    expect(row.stat.medianDays).toBe(5); // mediana de [3,7,5]
  });

  it("overall agrega por relação (show partilhado conta para cada contato)", () => {
    const shared = decided(8);
    const r = proposalDeliberationByContact([
      { contact: c("1", "Ana"), shows: [shared, decided(2)] },
      { contact: c("2", "Beto"), shows: [shared] },
    ]);
    // overall roda sobre [Ana.shows..., Beto.shows...] achatado: [8, 2, 8] → mediana 8.
    expect(r.overall).not.toBeNull();
    expect(r.overall!.count).toBe(3);
    expect(r.overall!.medianDays).toBe(8);
  });

  it("destaca o mais lento só quando há mais de um contratante confiável", () => {
    const oneReliable = proposalDeliberationByContact([
      { contact: c("1", "Ana"), shows: [decided(4), decided(6), decided(8)] },
      { contact: c("2", "Beto"), shows: [decided(2)] }, // amostra fina, não confiável
    ]);
    expect(oneReliable.slowest).toBeNull();

    const twoReliable = proposalDeliberationByContact([
      { contact: c("1", "Ana"), shows: [decided(4), decided(6), decided(8)] }, // mediana 6
      { contact: c("2", "Beto"), shows: [decided(20), decided(30), decided(40)] }, // mediana 30
    ]);
    expect(twoReliable.slowest?.contact.id).toBe("2");
    expect(twoReliable.slowest?.stat.medianDays).toBe(30);
  });

  /** Proposta que entrou em `year` (jun/UTC) e ficou `days` dias na mesa antes de sair. */
  const decidedInYear = (
    year: number,
    days: number,
    out: "CONFIRMED" | "CANCELLED" = "CONFIRMED",
  ) => {
    const start = Date.parse(`${year}-06-01T00:00:00.000Z`);
    return {
      statusEvents: [
        ev(null, "PROPOSED", new Date(start).toISOString()),
        ev("PROPOSED", out, new Date(start + days * 86400000).toISOString()),
      ],
    };
  };

  it("recorta por ano da entrada da proposta (opts.year)", () => {
    const items = [
      {
        contact: c("1", "Ana"),
        shows: [
          decidedInYear(2025, 10),
          decidedInYear(2026, 2),
          decidedInYear(2026, 4),
          decidedInYear(2026, 6),
        ],
      },
    ];

    // Sem recorte conta as 4 propostas (mediana de [10,2,4,6]).
    const all = proposalDeliberationByContact(items);
    expect(all.rows[0].stat.count).toBe(4);

    // 2026 conta só as três daquele ano (mediana de [2,4,6] = 4).
    const y2026 = proposalDeliberationByContact(items, { year: 2026 });
    expect(y2026.rows[0].stat.count).toBe(3);
    expect(y2026.rows[0].stat.medianDays).toBe(4);
    expect(y2026.totalSamples).toBe(3);
    expect(y2026.overall?.count).toBe(3);

    // 2025 conta só a proposta daquele ano.
    const y2025 = proposalDeliberationByContact(items, { year: 2025 });
    expect(y2025.rows[0].stat.count).toBe(1);
    expect(y2025.rows[0].stat.medianDays).toBe(10);
  });

  it("contratante sem proposta no ano recortado sai da lista", () => {
    const r = proposalDeliberationByContact(
      [{ contact: c("1", "Ana"), shows: [decidedInYear(2025, 5), decidedInYear(2025, 7)] }],
      { year: 2026 },
    );
    expect(r.contactCount).toBe(0);
    expect(r.overall).toBeNull();
    expect(r.totalSamples).toBe(0);
  });
});

describe("compareProposalDeliberationByContact", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  /** Proposta que entrou em `year` e ficou `days` dias na mesa antes de sair. */
  const decidedInYear = (year: number, days: number) => {
    const start = Date.parse(`${year}-06-01T00:00:00.000Z`);
    return {
      statusEvents: [
        ev(null, "PROPOSED", new Date(start).toISOString()),
        ev("PROPOSED", "CONFIRMED", new Date(start + days * 86400000).toISOString()),
      ],
    };
  };

  const c = (id: string, name: string, role = "CONTRACTOR") => ({ id, name, role });

  /** Roda o relatório recortado por ano para um conjunto de itens. */
  const reportFor = (
    items: Parameters<typeof proposalDeliberationByContact>[0],
    year: number,
  ) => proposalDeliberationByContact(items, { year });

  it("sem contratantes em comum devolve changes vazio", () => {
    const items = [
      { contact: c("1", "Ana"), shows: [decidedInYear(2025, 5)] },
    ];
    const cmp = compareProposalDeliberationByContact(
      reportFor(items, 2026),
      reportFor(items, 2025),
    );
    expect(cmp.changes).toEqual([]);
    expect(cmp.biggestImprovement).toBeNull();
    expect(cmp.biggestWorsening).toBeNull();
    // Ana só tem proposta em 2025 → sumiu no atual (2026).
    expect(cmp.droppedContacts.map((r) => r.contact.id)).toEqual(["1"]);
    expect(cmp.newContacts).toEqual([]);
  });

  it("marca melhora quando a mediana cai além do limiar e piora quando sobe", () => {
    // Ana acelerou (mediana 20 → 4), Beto desacelerou (mediana 4 → 20).
    const items = [
      {
        contact: c("ana", "Ana"),
        shows: [
          decidedInYear(2025, 18),
          decidedInYear(2025, 20),
          decidedInYear(2025, 22),
          decidedInYear(2026, 2),
          decidedInYear(2026, 4),
          decidedInYear(2026, 6),
        ],
      },
      {
        contact: c("beto", "Beto"),
        shows: [
          decidedInYear(2025, 2),
          decidedInYear(2025, 4),
          decidedInYear(2025, 6),
          decidedInYear(2026, 18),
          decidedInYear(2026, 20),
          decidedInYear(2026, 22),
        ],
      },
    ];
    const cmp = compareProposalDeliberationByContact(
      reportFor(items, 2026),
      reportFor(items, 2025),
    );
    expect(cmp.changes).toHaveLength(2);
    // Maior piora no topo: Beto (+16) antes de Ana (−16).
    expect(cmp.changes[0].contact.id).toBe("beto");
    expect(cmp.changes[0].medianDaysDelta).toBe(16);
    expect(cmp.changes[0].trend).toBe("worsened");
    expect(cmp.changes[1].contact.id).toBe("ana");
    expect(cmp.changes[1].medianDaysDelta).toBe(-16);
    expect(cmp.changes[1].trend).toBe("improved");
    expect(cmp.biggestImprovement?.contact.id).toBe("ana");
    expect(cmp.biggestWorsening?.contact.id).toBe("beto");
  });

  it("variação dentro do limiar fica estável (nem melhora nem piora)", () => {
    const delta = DELIBERATION_TREND_EPSILON - 1; // abaixo do limiar
    const items = [
      {
        contact: c("1", "Ana"),
        shows: [
          decidedInYear(2025, 10),
          decidedInYear(2025, 10),
          decidedInYear(2025, 10),
          decidedInYear(2026, 10 + delta),
          decidedInYear(2026, 10 + delta),
          decidedInYear(2026, 10 + delta),
        ],
      },
    ];
    const cmp = compareProposalDeliberationByContact(
      reportFor(items, 2026),
      reportFor(items, 2025),
    );
    expect(cmp.changes).toHaveLength(1);
    expect(cmp.changes[0].medianDaysDelta).toBe(delta);
    expect(cmp.changes[0].trend).toBe("stable");
    expect(cmp.biggestImprovement).toBeNull();
    expect(cmp.biggestWorsening).toBeNull();
  });

  it("classifica novos e sumidos entre os períodos", () => {
    const items = [
      // Ana existe nos dois anos (comparável).
      {
        contact: c("ana", "Ana"),
        shows: [decidedInYear(2025, 5), decidedInYear(2026, 5)],
      },
      // Beto só decidiu em 2026 → novo.
      { contact: c("beto", "Beto"), shows: [decidedInYear(2026, 8)] },
      // Caio só decidiu em 2025 → sumiu.
      { contact: c("caio", "Caio"), shows: [decidedInYear(2025, 9)] },
    ];
    const cmp = compareProposalDeliberationByContact(
      reportFor(items, 2026),
      reportFor(items, 2025),
    );
    expect(cmp.changes.map((ch) => ch.contact.id)).toEqual(["ana"]);
    expect(cmp.newContacts.map((r) => r.contact.id)).toEqual(["beto"]);
    expect(cmp.droppedContacts.map((r) => r.contact.id)).toEqual(["caio"]);
  });

  it("indexContactProposalDeliberationChanges resolve changed/new/none por id", () => {
    const items = [
      {
        contact: c("ana", "Ana"),
        shows: [
          decidedInYear(2025, 18),
          decidedInYear(2025, 20),
          decidedInYear(2025, 22),
          decidedInYear(2026, 2),
          decidedInYear(2026, 4),
          decidedInYear(2026, 6),
        ],
      },
      { contact: c("beto", "Beto"), shows: [decidedInYear(2026, 8)] },
    ];
    const cmp = compareProposalDeliberationByContact(
      reportFor(items, 2026),
      reportFor(items, 2025),
    );
    const status = indexContactProposalDeliberationChanges(cmp);
    expect(status("ana").kind).toBe("changed");
    const anaStatus = status("ana");
    if (anaStatus.kind === "changed") {
      expect(anaStatus.change.medianDaysDelta).toBe(-16);
    }
    expect(status("beto").kind).toBe("new");
    expect(status("desconhecido").kind).toBe("none");
    expect(status(null).kind).toBe("none");
  });
});

describe("slowDeliberatorHeadline", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  /** Um show cuja proposta ficou `days` dias na mesa antes de virar confirmação. */
  const decided = (days: number) => ({
    statusEvents: [
      ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
      ev(
        "PROPOSED",
        "CONFIRMED",
        new Date(Date.parse("2026-01-01T00:00:00.000Z") + days * 86400000).toISOString(),
      ),
    ],
  });
  const c = (id: string, name: string) => ({ id, name, role: "CONTRACTOR" });
  const report = (items: { contact: ReturnType<typeof c>; shows: ReturnType<typeof decided>[] }[]) =>
    proposalDeliberationByContact(items);

  it("não dispara sem mais de um contratante confiável (slowest nulo)", () => {
    const h = slowDeliberatorHeadline(
      report([{ contact: c("1", "Ana"), shows: [decided(20), decided(20), decided(20)] }]),
    );
    expect(h.show).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.ratio).toBe(0);
  });

  it("não dispara quando a deliberação típica da carteira é nula", () => {
    // Cluster dominante decide no mesmo dia → mediana geral 0, sem base de comparação.
    const h = slowDeliberatorHeadline(
      report([
        { contact: c("fast", "Rápido"), shows: [decided(0), decided(0), decided(0), decided(0), decided(0)] },
        { contact: c("slow", "Lento"), shows: [decided(10), decided(10), decided(10)] },
      ]),
    );
    expect(h.typicalDays).toBe(0);
    expect(h.show).toBe(false);
  });

  it("não dispara quando o mais lento não chega a 2× o típico (gate relativo)", () => {
    // pool [8,8,8,10,10,10] → mediana geral 9; lento 10 → 1,11× (< 2×).
    const h = slowDeliberatorHeadline(
      report([
        { contact: c("fast", "Rápido"), shows: [decided(8), decided(8), decided(8)] },
        { contact: c("slow", "Lento"), shows: [decided(10), decided(10), decided(10)] },
      ]),
    );
    expect(h.show).toBe(false);
    expect(h.ratio).toBeCloseTo(10 / 9);
  });

  it("não dispara quando é ≥ 2× o típico mas curto em absoluto (< 7 dias)", () => {
    // pool [1,1,1,1,1,5,5,5] → mediana geral 1; lento 5 → 5× o típico, mas 5 < 7 dias.
    const h = slowDeliberatorHeadline(
      report([
        { contact: c("fast", "Rápido"), shows: [decided(1), decided(1), decided(1), decided(1), decided(1)] },
        { contact: c("slow", "Lento"), shows: [decided(5), decided(5), decided(5)] },
      ]),
    );
    expect(h.ratio).toBe(5);
    expect(h.medianDays).toBe(5);
    expect(h.show).toBe(false);
  });

  it("dispara não-crítico quando é materialmente lento (≥ 2× o típico e ≥ 7 dias)", () => {
    // pool [4,4,4,4,4,10,10,10] → mediana geral 4; lento 10 → 2,5× (≥2, <3).
    const h = slowDeliberatorHeadline(
      report([
        { contact: c("fast", "Rápido"), shows: [decided(4), decided(4), decided(4), decided(4), decided(4)] },
        { contact: c("slow", "Lento"), shows: [decided(10), decided(10), decided(10)] },
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.contact?.id).toBe("slow");
    expect(h.medianDays).toBe(10);
    expect(h.typicalDays).toBe(4);
    expect(h.ratio).toBeCloseTo(2.5);
    expect(h.sample).toBe(3);
  });

  it("escala para crítico quando chega a 3× o típico", () => {
    // pool [2,2,2,2,2,9,9,9] → mediana geral 2; lento 9 → 4,5× (≥3).
    const h = slowDeliberatorHeadline(
      report([
        { contact: c("fast", "Rápido"), shows: [decided(2), decided(2), decided(2), decided(2), decided(2)] },
        { contact: c("slow", "Lento"), shows: [decided(9), decided(9), decided(9)] },
      ]),
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.ratio).toBeCloseTo(4.5);
  });

  it("respeita um slowRatio parametrizável mais exigente", () => {
    // Mesmo caso de 2,5× do teste não-crítico: com slowRatio=3 não passa no gate.
    const r = report([
      { contact: c("fast", "Rápido"), shows: [decided(4), decided(4), decided(4), decided(4), decided(4)] },
      { contact: c("slow", "Lento"), shows: [decided(10), decided(10), decided(10)] },
    ]);
    expect(slowDeliberatorHeadline(r).show).toBe(true); // default slowRatio=2
    expect(slowDeliberatorHeadline(r, 3).show).toBe(false); // exige ≥ 3×
  });
});

describe("contactDeliberationRiseHeadline", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });

  /** Proposta que entrou em `year` e ficou `days` dias na mesa antes de sair. */
  const decidedInYear = (year: number, days: number) => {
    const start = Date.parse(`${year}-06-01T00:00:00.000Z`);
    return {
      statusEvents: [
        ev(null, "PROPOSED", new Date(start).toISOString()),
        ev("PROPOSED", "CONFIRMED", new Date(start + days * 86400000).toISOString()),
      ],
    };
  };
  const c = (id: string, name: string) => ({ id, name, role: "CONTRACTOR" });
  const reportFor = (
    items: Parameters<typeof proposalDeliberationByContact>[0],
    year: number,
  ) => proposalDeliberationByContact(items, { year });
  const compareYears = (items: Parameters<typeof proposalDeliberationByContact>[0]) =>
    compareProposalDeliberationByContact(reportFor(items, 2026), reportFor(items, 2025));

  it("aponta o contratante que mais desacelerou a decisão com amostra confiável (crítico)", () => {
    // Beto sobe a mediana de 4 → 20 (+16 ≥ crítico 14); Ana melhora (não conta).
    const items = [
      {
        contact: c("beto", "Beto"),
        shows: [
          decidedInYear(2025, 2),
          decidedInYear(2025, 4),
          decidedInYear(2025, 6),
          decidedInYear(2026, 18),
          decidedInYear(2026, 20),
          decidedInYear(2026, 22),
        ],
      },
      {
        contact: c("ana", "Ana"),
        shows: [
          decidedInYear(2025, 18),
          decidedInYear(2025, 20),
          decidedInYear(2025, 22),
          decidedInYear(2026, 2),
          decidedInYear(2026, 4),
          decidedInYear(2026, 6),
        ],
      },
    ];
    const h = contactDeliberationRiseHeadline(compareYears(items));
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true); // +16 ≥ 14
    expect(h.contact?.id).toBe("beto");
    expect(h.riseDays).toBe(16);
    expect(h.currentMedianDays).toBe(20);
    expect(h.previousMedianDays).toBe(4);
    expect(h.sample).toBe(3);
    expect(h.others).toBe(0);
  });

  it("dispara não-crítico entre o piso e o limiar crítico", () => {
    // Beto sobe a mediana de 4 → 12 (+8: ≥ 6 dispara, < 14 não é crítico).
    const items = [
      {
        contact: c("beto", "Beto"),
        shows: [
          decidedInYear(2025, 2),
          decidedInYear(2025, 4),
          decidedInYear(2025, 6),
          decidedInYear(2026, 10),
          decidedInYear(2026, 12),
          decidedInYear(2026, 14),
        ],
      },
    ];
    const h = contactDeliberationRiseHeadline(compareYears(items));
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.riseDays).toBe(8);
  });

  it("ignora pioras de amostra fina e elege a maior confiável, contando o resto em others", () => {
    const items = [
      // Beto: amostra confiável (3 em cada ano), +8 → qualifica.
      {
        contact: c("beto", "Beto"),
        shows: [
          decidedInYear(2025, 2),
          decidedInYear(2025, 4),
          decidedInYear(2025, 6),
          decidedInYear(2026, 10),
          decidedInYear(2026, 12),
          decidedInYear(2026, 14),
        ],
      },
      // Caio: também confiável, +10 (piora maior que Beto) → é o "worst".
      {
        contact: c("caio", "Caio"),
        shows: [
          decidedInYear(2025, 1),
          decidedInYear(2025, 3),
          decidedInYear(2025, 5),
          decidedInYear(2026, 11),
          decidedInYear(2026, 13),
          decidedInYear(2026, 15),
        ],
      },
      // Dora: piora enorme mas amostra fina (2 shows/ano < 3) → não conta.
      {
        contact: c("dora", "Dora"),
        shows: [
          decidedInYear(2025, 1),
          decidedInYear(2025, 1),
          decidedInYear(2026, 40),
          decidedInYear(2026, 40),
        ],
      },
    ];
    const h = contactDeliberationRiseHeadline(compareYears(items));
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("caio"); // maior piora confiável no topo
    expect(h.riseDays).toBe(10);
    expect(h.others).toBe(1); // Beto também passa; Dora (fina) não
  });

  it("não dispara sem piora material (variação abaixo do piso)", () => {
    // Beto sobe só +4 (< 6): rotina, não vira nudge.
    const items = [
      {
        contact: c("beto", "Beto"),
        shows: [
          decidedInYear(2025, 8),
          decidedInYear(2025, 10),
          decidedInYear(2025, 12),
          decidedInYear(2026, 12),
          decidedInYear(2026, 14),
          decidedInYear(2026, 16),
        ],
      },
    ];
    const h = contactDeliberationRiseHeadline(compareYears(items));
    expect(h.show).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.riseDays).toBe(0);
  });

  it("respeita limiares injetáveis (piso e crítico parametrizáveis)", () => {
    // Beto: +8. Com piso default (6) dispara; com piso 10 não passa.
    const items = [
      {
        contact: c("beto", "Beto"),
        shows: [
          decidedInYear(2025, 2),
          decidedInYear(2025, 4),
          decidedInYear(2025, 6),
          decidedInYear(2026, 10),
          decidedInYear(2026, 12),
          decidedInYear(2026, 14),
        ],
      },
    ];
    const cmp = compareYears(items);
    expect(contactDeliberationRiseHeadline(cmp).show).toBe(true); // piso 6
    expect(contactDeliberationRiseHeadline(cmp, MIN_DELIBERATION_SAMPLE, 10).show).toBe(false);
    // Com crítico rebaixado a 8, o mesmo +8 vira crítico.
    expect(
      contactDeliberationRiseHeadline(cmp, MIN_DELIBERATION_SAMPLE, DELIBERATION_RISE_DAYS, 8).critical,
    ).toBe(true);
    // Sanidade: as constantes exportadas mantêm a relação piso < crítico.
    expect(DELIBERATION_RISE_DAYS).toBeLessThan(DELIBERATION_RISE_CRITICAL_DAYS);
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
    expect(cmp.winRateDelta).toBeCloseTo(0.5); // vazão: 2/2 − 1/2 (sem em aberto)
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
    // A vazão da coorte segue definida mesmo sem taxa de conversão: `openOnly`
    // tem coorte (1 proposta, 0 ganhas → winRate 0) e `decided` tem 2/2 → +1.
    expect(cmp.winRateDelta).toBeCloseTo(1);
    expect(cmp.trend).toBe("stable");
  });

  it("winRateDelta pode cair enquanto a taxa de conversão sobe (vazão × decididas)", () => {
    // Ano anterior: 2 decididas, 1 ganha → conversão 50%, vazão 1/2 = 50%.
    const previous = proposalOutcomes(
      [
        {
          statusEvents: [
            ev(null, "PROPOSED", "2024-01-01T00:00:00.000Z"),
            ev("PROPOSED", "PLAYED", "2024-01-10T00:00:00.000Z"),
          ],
        },
        {
          statusEvents: [
            ev(null, "PROPOSED", "2024-02-01T00:00:00.000Z"),
            ev("PROPOSED", "CANCELLED", "2024-02-10T00:00:00.000Z"),
          ],
        },
      ],
      { year: 2024 },
    );
    // Ano atual: 1 decidida ganha (conversão 100%, subiu) mas 3 em aberto travadas
    // → coorte de 4, vazão 1/4 = 25% (caiu).
    const current = proposalOutcomes(
      [
        {
          statusEvents: [
            ev(null, "PROPOSED", "2025-01-01T00:00:00.000Z"),
            ev("PROPOSED", "PLAYED", "2025-01-10T00:00:00.000Z"),
          ],
        },
        { statusEvents: [ev(null, "PROPOSED", "2025-02-01T00:00:00.000Z")] },
        { statusEvents: [ev(null, "PROPOSED", "2025-03-01T00:00:00.000Z")] },
        { statusEvents: [ev(null, "PROPOSED", "2025-04-01T00:00:00.000Z")] },
      ],
      { year: 2025 },
    );
    const cmp = compareProposalOutcomes(current, previous);
    expect(cmp.conversionRateDelta).toBeCloseTo(0.5); // 100% − 50%, melhora
    expect(cmp.trend).toBe("improved"); // veredito ancora na conversão
    expect(cmp.winRateDelta).toBeCloseTo(-0.25); // 25% − 50%, vazão caiu
  });

  it("winRateDelta é null quando alguma coorte está vazia", () => {
    const withCohort = proposalOutcomes(shows, { year: 2026 });
    const empty = proposalOutcomes(shows, { year: 2099 }); // sem propostas
    expect(empty.total).toBe(0);
    expect(empty.winRate).toBeNull();
    const cmp = compareProposalOutcomes(withCohort, empty);
    expect(cmp.winRateDelta).toBeNull();
  });
});

describe("compareContactProposalOutcomes", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });
  const won = (createdAt: string) => ({
    statusEvents: [ev(null, "PROPOSED", createdAt), ev("PROPOSED", "PLAYED", createdAt)],
  });
  const lost = (createdAt: string) => ({
    statusEvents: [ev(null, "PROPOSED", createdAt), ev("PROPOSED", "CANCELLED", createdAt)],
  });
  const open = (createdAt: string) => ({
    statusEvents: [ev(null, "PROPOSED", createdAt)],
  });
  type C = { id: string; name: string; role: string };

  // Alfa melhora (2025: 1/2=50% → 2026: 2/2=100%, +50 p.p.); Beta piora
  // (2025: 2/2=100% → 2026: 1/2=50%, −50 p.p.). Comparação por contratante
  // recorta cada coorte pela data da proposta via `opts.year`.
  const items: { contact: C; shows: { statusEvents: StatusEventLike[] }[] }[] = [
    {
      contact: { id: "a", name: "Alfa", role: "VENUE" },
      shows: [
        won("2025-01-01T00:00:00.000Z"),
        lost("2025-02-01T00:00:00.000Z"),
        won("2026-01-01T00:00:00.000Z"),
        won("2026-02-01T00:00:00.000Z"),
      ],
    },
    {
      contact: { id: "b", name: "Beta", role: "PRODUCER" },
      shows: [
        won("2025-03-01T00:00:00.000Z"),
        won("2025-04-01T00:00:00.000Z"),
        won("2026-03-01T00:00:00.000Z"),
        lost("2026-04-01T00:00:00.000Z"),
      ],
    },
  ];

  const currentReport = proposalOutcomesByContact(items, { year: 2026 });
  const previousReport = proposalOutcomesByContact(items, { year: 2025 });

  it("casa os contratantes por id e destila a variação da taxa de conversão", () => {
    const cmp = compareContactProposalOutcomes(currentReport, previousReport);
    expect(cmp.changes.map((c) => c.contact.id).sort()).toEqual(["a", "b"]);
    const alfa = cmp.changes.find((c) => c.contact.id === "a")!;
    const beta = cmp.changes.find((c) => c.contact.id === "b")!;
    expect(alfa.conversionRateDelta).toBeCloseTo(0.5);
    expect(alfa.trend).toBe("improved");
    expect(alfa.wonCountDelta).toBe(1); // 2 em 2026 − 1 em 2025
    expect(beta.conversionRateDelta).toBeCloseTo(-0.5);
    expect(beta.trend).toBe("worsened");
    // Sem propostas em aberto, a vazão da coorte segue a taxa de conversão:
    // Alfa 2025 1/2 → 2026 2/2 (+0.5); Beta 2025 2/2 → 2026 1/2 (−0.5).
    expect(alfa.winRateDelta).toBeCloseTo(0.5);
    expect(beta.winRateDelta).toBeCloseTo(-0.5);
  });

  it("winRateDelta por contratante pode divergir da taxa de conversão (propostas em aberto)", () => {
    // Gama 2025: 1 ganha + 1 perdida → conversão 50%, vazão 1/2 = 50%.
    // Gama 2026: 1 ganha + 1 em aberto → conversão 100% (1/1 decidida), vazão 1/2
    // = 50% (a em aberto entra no denominador). A taxa de conversão SOBE enquanto a
    // vazão fica parada porque sobrou proposta em aberto — espelho por-contratante
    // do caso de divergência do comparativo geral (D243).
    const current = proposalOutcomesByContact(
      [
        {
          contact: { id: "g", name: "Gama", role: "VENUE" },
          shows: [won("2026-01-01T00:00:00.000Z"), open("2026-02-01T00:00:00.000Z")],
        },
      ],
      { year: 2026 },
    );
    const previous = proposalOutcomesByContact(
      [
        {
          contact: { id: "g", name: "Gama", role: "VENUE" },
          shows: [won("2025-01-01T00:00:00.000Z"), lost("2025-02-01T00:00:00.000Z")],
        },
      ],
      { year: 2025 },
    );
    const cmp = compareContactProposalOutcomes(current, previous);
    const gama = cmp.changes.find((c) => c.contact.id === "g")!;
    expect(gama.conversionRateDelta).toBeCloseTo(0.5); // 100% − 50%, melhora
    expect(gama.trend).toBe("improved");
    expect(gama.winRateDelta).toBeCloseTo(0); // 50% − 50%, vazão parada
  });

  it("elege os movers e ordena da maior piora à maior melhora", () => {
    const cmp = compareContactProposalOutcomes(currentReport, previousReport);
    // maior piora no topo
    expect(cmp.changes[0].contact.id).toBe("b");
    expect(cmp.biggestImprovement?.contact.id).toBe("a");
    expect(cmp.biggestWorsening?.contact.id).toBe("b");
  });

  it("classifica novos (só no atual) e sumidos (só no anterior)", () => {
    const current = proposalOutcomesByContact(
      [
        { contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [won("2026-01-01T00:00:00.000Z")] },
        { contact: { id: "n", name: "Nova", role: "VENUE" }, shows: [won("2026-02-01T00:00:00.000Z")] },
      ],
      { year: 2026 },
    );
    const previous = proposalOutcomesByContact(
      [
        { contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [lost("2025-01-01T00:00:00.000Z")] },
        { contact: { id: "d", name: "Sumida", role: "VENUE" }, shows: [won("2025-02-01T00:00:00.000Z")] },
      ],
      { year: 2025 },
    );
    const cmp = compareContactProposalOutcomes(current, previous);
    expect(cmp.newContacts.map((r) => r.contact.id)).toEqual(["n"]);
    expect(cmp.droppedContacts.map((r) => r.contact.id)).toEqual(["d"]);
    expect(cmp.changes.map((c) => c.contact.id)).toEqual(["a"]);
  });

  it("com taxa indefinida em algum período, delta é null, veredito 'stable' e fica fora dos movers", () => {
    const current = proposalOutcomesByContact(
      [{ contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [open("2026-01-01T00:00:00.000Z")] }],
      { year: 2026 },
    );
    const previous = proposalOutcomesByContact(
      [{ contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [won("2025-01-01T00:00:00.000Z")] }],
      { year: 2025 },
    );
    const cmp = compareContactProposalOutcomes(current, previous);
    expect(cmp.changes).toHaveLength(1);
    expect(cmp.changes[0].conversionRateDelta).toBeNull();
    expect(cmp.changes[0].trend).toBe("stable");
    expect(cmp.biggestImprovement).toBeNull();
    expect(cmp.biggestWorsening).toBeNull();
  });

  it("sem contratantes em comum, changes fica vazio (nada a exibir)", () => {
    const cmp = compareContactProposalOutcomes(currentReport, proposalOutcomesByContact([]));
    expect(cmp.changes).toEqual([]);
    expect(cmp.newContacts.map((r) => r.contact.id).sort()).toEqual(["a", "b"]);
    expect(cmp.droppedContacts).toEqual([]);
  });

  describe("indexContactProposalConversionChanges", () => {
    it("resolve 'changed' para quem tem coorte nos dois períodos, com a variação", () => {
      const cmp = compareContactProposalOutcomes(currentReport, previousReport);
      const lookup = indexContactProposalConversionChanges(cmp);
      const alfa = lookup("a");
      expect(alfa.kind).toBe("changed");
      if (alfa.kind === "changed") {
        expect(alfa.change.contact.id).toBe("a");
        expect(alfa.change.conversionRateDelta).toBeCloseTo(0.5);
        expect(alfa.change.trend).toBe("improved");
      }
    });

    it("resolve 'new' para quem só tem coorte no atual e 'none' para desconhecidos/nulos", () => {
      const current = proposalOutcomesByContact(
        [
          { contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [won("2026-01-01T00:00:00.000Z")] },
          { contact: { id: "n", name: "Nova", role: "VENUE" }, shows: [won("2026-02-01T00:00:00.000Z")] },
        ],
        { year: 2026 },
      );
      const previous = proposalOutcomesByContact(
        [{ contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [lost("2025-01-01T00:00:00.000Z")] }],
        { year: 2025 },
      );
      const lookup = indexContactProposalConversionChanges(
        compareContactProposalOutcomes(current, previous),
      );
      expect(lookup("n").kind).toBe("new");
      expect(lookup("a").kind).toBe("changed");
      expect(lookup("zzz").kind).toBe("none");
      expect(lookup(null).kind).toBe("none");
      expect(lookup(undefined).kind).toBe("none");
    });

    it("mantém 'changed' mesmo com delta null (taxa indefinida em algum ano)", () => {
      const current = proposalOutcomesByContact(
        [{ contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [open("2026-01-01T00:00:00.000Z")] }],
        { year: 2026 },
      );
      const previous = proposalOutcomesByContact(
        [{ contact: { id: "a", name: "Alfa", role: "VENUE" }, shows: [won("2025-01-01T00:00:00.000Z")] }],
        { year: 2025 },
      );
      const status = indexContactProposalConversionChanges(
        compareContactProposalOutcomes(current, previous),
      )("a");
      expect(status.kind).toBe("changed");
      if (status.kind === "changed") {
        expect(status.change.conversionRateDelta).toBeNull();
        expect(status.change.trend).toBe("stable");
      }
    });
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

describe("contactConversionDropHeadline", () => {
  const ev = (
    fromStatus: string | null,
    toStatus: string,
    createdAt: string,
  ): StatusEventLike => ({ fromStatus, toStatus, createdAt });
  const won = (createdAt: string) => ({
    statusEvents: [ev(null, "PROPOSED", createdAt), ev("PROPOSED", "PLAYED", createdAt)],
  });
  const lost = (createdAt: string) => ({
    statusEvents: [ev(null, "PROPOSED", createdAt), ev("PROPOSED", "CANCELLED", createdAt)],
  });
  type C = { id: string; name: string; role: string };

  // Data da proposta: só o ANO importa (a coorte recorta por `opts.year`); o dia
  // varia só para gerar eventos distintos. Uma coorte de `wins` ganhas + `losses`
  // perdidas naquele ano.
  const at = (year: number, i: number) =>
    `${year}-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`;
  const cohort = (year: number, wins: number, losses: number) => {
    const shows: { statusEvents: StatusEventLike[] }[] = [];
    for (let i = 0; i < wins; i++) shows.push(won(at(year, i)));
    for (let i = 0; i < losses; i++) shows.push(lost(at(year, wins + i)));
    return shows;
  };

  // Cada def: id/nome + [ganhas, perdidas] na coorte atual (2026) e anterior (2025).
  type Def = { id: string; name: string; cur: [number, number]; prev: [number, number] };
  const build = (defs: Def[]): { contact: C; shows: { statusEvents: StatusEventLike[] }[] }[] =>
    defs.map((d) => ({
      contact: { id: d.id, name: d.name, role: "VENUE" },
      shows: [...cohort(2026, d.cur[0], d.cur[1]), ...cohort(2025, d.prev[0], d.prev[1])],
    }));
  const headline = (defs: Def[]) => {
    const items = build(defs);
    return contactConversionDropHeadline(
      compareContactProposalOutcomes(
        proposalOutcomesByContact(items, { year: 2026 }),
        proposalOutcomesByContact(items, { year: 2025 }),
      ),
    );
  };

  it("aponta o contratante que mais esfriou, com amostra confiável nas duas coortes", () => {
    // Beta piora forte (2025: 4/4=100% → 2026: 1/4=25%, −75 p.p.); Alfa melhora.
    const h = headline([
      { id: "a", name: "Alfa", cur: [4, 0], prev: [2, 2] },
      { id: "b", name: "Beta", cur: [1, 3], prev: [4, 0] },
    ]);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true); // 75 p.p. >> 25 p.p. crítico
    expect(h.contact?.id).toBe("b");
    expect(h.drop).toBeCloseTo(0.75);
    expect(h.currentRate).toBeCloseTo(0.25);
    expect(h.previousRate).toBeCloseTo(1);
    expect(h).toMatchObject({ won: 1, decided: 4, others: 0 });
  });

  it("ignora quedas de amostra fina e elege a maior queda CONFIÁVEL", () => {
    // Fina: queda de 100 p.p. mas só 1 decidida em cada coorte → fora do gate.
    // Sólida: 75%→25% (−50 p.p.) com 4 decididas em cada → é o eleito.
    const h = headline([
      { id: "fina", name: "Fina", cur: [0, 1], prev: [1, 0] },
      { id: "solida", name: "Sólida", cur: [1, 3], prev: [3, 1] },
    ]);
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("solida");
    expect(h.drop).toBeCloseTo(0.5);
    expect(h.others).toBe(0); // a fina não conta (não passa no gate)
  });

  it("conta em `others` os demais contratantes que também esfriaram no gate", () => {
    const h = headline([
      { id: "b", name: "Beta", cur: [1, 3], prev: [4, 0] }, // −75 p.p.
      { id: "c", name: "Cecê", cur: [2, 2], prev: [4, 0] }, // −50 p.p.
      { id: "a", name: "Alfa", cur: [4, 0], prev: [2, 2] }, // melhora
    ]);
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("b"); // maior queda no topo
    expect(h.others).toBe(1); // Cecê também passou no gate
  });

  it("não dispara quando ninguém tem queda material e confiável", () => {
    const h = headline([
      { id: "a", name: "Alfa", cur: [4, 0], prev: [2, 2] }, // melhora
      { id: "b", name: "Beta", cur: [3, 1], prev: [3, 1] }, // estável
    ]);
    expect(h.show).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.drop).toBe(0);
    expect(h.others).toBe(0);
  });

  it("uma queda pequena (abaixo do piso) não vira nudge", () => {
    // 60%→45% seria −15 p.p. (dispararia); aqui 55%→50% = −5 p.p. < piso.
    const h = headline([
      { id: "a", name: "Alfa", cur: [10, 10], prev: [11, 9] }, // 50% vs 55% → −5 p.p.
    ]);
    expect(h.show).toBe(false);
  });

  it("respeita limiares injetáveis (min de decididas / pontos / crítico)", () => {
    const items = build([
      { id: "a", name: "Alfa", cur: [1, 2], prev: [3, 0] }, // 33% vs 100%, 3 decididas cada
    ]);
    const cmp = compareContactProposalOutcomes(
      proposalOutcomesByContact(items, { year: 2026 }),
      proposalOutcomesByContact(items, { year: 2025 }),
    );
    // com mínimo 4 não passa (só 3 decididas); com mínimo 3 passa
    expect(contactConversionDropHeadline(cmp, 4).show).toBe(false);
    expect(contactConversionDropHeadline(cmp, 3).show).toBe(true);
    // ponto crítico afrouxado torna a queda "crítica"
    expect(contactConversionDropHeadline(cmp, 3, 0.1, 0.5).critical).toBe(true);
  });
});

describe("contactBookingLeadTimeDropHeadline", () => {
  type BookerShow = LeadTimeShowLike & { bookerId: string | null; bookerName: string };
  const bShow = (partial: Partial<BookerShow>): BookerShow => ({
    ...leadShow({}),
    bookerId: "c1",
    bookerName: "Bar do Zé",
    ...partial,
  });
  const getBooker = (s: BookerShow) =>
    s.bookerId ? { id: s.bookerId, name: s.bookerName } : null;
  // Um show do contratante no ano `year` com antecedência `days`.
  const lead = (bookerId: string | null, name: string, year: number, days: number) =>
    bShow({
      bookerId,
      bookerName: name,
      createdAt: `${year}-01-01T00:00:00.000Z`,
      date: new Date(Date.UTC(year, 0, 1 + days)).toISOString(),
    });
  const report = (shows: BookerShow[]) =>
    bookingLeadTimeByContact<{ id: string; name: string }, BookerShow>(shows, getBooker);
  // `n` shows do contratante naquele ano, todos com a mesma antecedência `days`
  // (mediana estável e amostra confiável quando n >= MIN_LEAD_TIME_SAMPLE).
  const many = (bookerId: string, name: string, year: number, days: number, n: number) =>
    Array.from({ length: n }, () => lead(bookerId, name, year, days));
  const headline = (cur: BookerShow[], prev: BookerShow[]) =>
    contactBookingLeadTimeDropHeadline(compareBookingLeadTimeByContact(report(cur), report(prev)));

  it("aponta o contratante que mais perdeu folga, com amostra confiável nas duas coortes", () => {
    // Zé: 2025 mediana 40 → 2026 mediana 5 (−35 dias de folga); Ana melhora.
    const h = headline(
      [...many("ze", "Zé", 2026, 5, 3), ...many("ana", "Ana", 2026, 50, 3)],
      [...many("ze", "Zé", 2025, 40, 3), ...many("ana", "Ana", 2025, 10, 3)],
    );
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true); // 35 dias >= 30 crítico
    expect(h.contact?.id).toBe("ze");
    expect(h.dropDays).toBe(35);
    expect(h.currentMedianDays).toBe(5);
    expect(h.previousMedianDays).toBe(40);
    expect(h).toMatchObject({ sample: 3, others: 0 });
  });

  it("ignora quedas de amostra fina e elege a maior queda CONFIÁVEL", () => {
    // Fina: perde 40 dias mas só 1 show em cada coorte → fora do gate.
    // Sólida: 40→20 (−20 dias) com 3 shows em cada → é a eleita.
    const h = headline(
      [lead("fina", "Fina", 2026, 5), ...many("sol", "Sólida", 2026, 20, 3)],
      [lead("fina", "Fina", 2025, 45), ...many("sol", "Sólida", 2025, 40, 3)],
    );
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("sol");
    expect(h.dropDays).toBe(20);
    expect(h.others).toBe(0); // a fina não conta (não passa no gate)
  });

  it("conta em `others` os demais contratantes que também perderam folga no gate", () => {
    const h = headline(
      [
        ...many("ze", "Zé", 2026, 5, 3), // 45 → 5 (−40)
        ...many("bar", "Bar", 2026, 10, 3), // 40 → 10 (−30)
        ...many("ana", "Ana", 2026, 50, 3), // melhora
      ],
      [
        ...many("ze", "Zé", 2025, 45, 3),
        ...many("bar", "Bar", 2025, 40, 3),
        ...many("ana", "Ana", 2025, 10, 3),
      ],
    );
    expect(h.show).toBe(true);
    expect(h.contact?.id).toBe("ze"); // maior queda no topo
    expect(h.others).toBe(1); // Bar também passou no gate
  });

  it("não dispara quando ninguém tem perda material e confiável", () => {
    const h = headline(
      [...many("ze", "Zé", 2026, 50, 3), ...many("bar", "Bar", 2026, 20, 3)],
      [...many("ze", "Zé", 2025, 20, 3), ...many("bar", "Bar", 2025, 22, 3)], // Zé melhora, Bar estável
    );
    expect(h.show).toBe(false);
    expect(h.contact).toBeNull();
    expect(h.dropDays).toBe(0);
    expect(h.others).toBe(0);
  });

  it("uma perda pequena (abaixo do piso de 14 dias) não vira nudge", () => {
    // 30 → 20 = −10 dias < LEAD_TIME_DROP_DAYS (14).
    const h = headline(many("ze", "Zé", 2026, 20, 3), many("ze", "Zé", 2025, 30, 3));
    expect(h.show).toBe(false);
  });

  it("respeita limiares injetáveis (amostra mínima / piso de dias / crítico)", () => {
    // Zé: 40 → 20 (−20 dias), com só 2 shows em cada coorte.
    const cmp = compareBookingLeadTimeByContact(
      report(many("ze", "Zé", 2026, 20, 2)),
      report(many("ze", "Zé", 2025, 40, 2)),
    );
    // amostra mínima 3 não passa (só 2 shows); mínima 2 passa
    expect(contactBookingLeadTimeDropHeadline(cmp, 3).show).toBe(false);
    expect(contactBookingLeadTimeDropHeadline(cmp, 2).show).toBe(true);
    // −20 dias não é crítico no padrão (>= 30), mas vira crítico com piso afrouxado
    expect(contactBookingLeadTimeDropHeadline(cmp, 2).critical).toBe(false);
    expect(contactBookingLeadTimeDropHeadline(cmp, 2, 14, 15).critical).toBe(true);
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

describe("showGaps", () => {
  const NOW = "2026-06-15T12:00:00.000Z";
  const g = (date: string, status: string = "PLAYED") => ({ date, status });

  it("devolve tudo zerado/nulo sem shows", () => {
    const r = showGaps([], { now: NOW });
    expect(r.gaps).toEqual([]);
    expect(r.showDays).toBe(0);
    expect(r.longest).toBeNull();
    expect(r.medianGapDays).toBe(0);
    expect(r.averageGapDays).toBe(0);
    expect(r.firstDay).toBeNull();
    expect(r.lastDay).toBeNull();
    expect(r.currentGapDays).toBeNull();
    expect(r.currentGapVsLongest).toBeNull();
    expect(r.daysUntilNext).toBeNull();
  });

  it("ignora propostas e cancelados (só firmes ocupam a agenda)", () => {
    const r = showGaps(
      [
        g("2026-01-10", "PROPOSED"),
        g("2026-02-10", "CANCELLED"),
        g("2026-03-10", "PLAYED"),
      ],
      { now: NOW },
    );
    expect(r.showDays).toBe(1);
    expect(r.gaps).toEqual([]);
  });

  it("um único gig passado: sem hiatos, mas conta a seca atual", () => {
    const r = showGaps([g("2026-06-05")], { now: NOW });
    expect(r.showDays).toBe(1);
    expect(r.longest).toBeNull();
    expect(r.firstDay).toBe("2026-06-05");
    expect(r.lastDay).toBe("2026-06-05");
    expect(r.currentGapDays).toBe(10); // 05 → 15 de junho
    expect(r.daysUntilNext).toBeNull();
  });

  it("mede os hiatos entre dias consecutivos e ordena do maior ao menor", () => {
    const r = showGaps(
      [g("2026-01-01"), g("2026-01-11"), g("2026-02-10")],
      { now: NOW },
    );
    // 01→11 = 10 dias; 11 jan → 10 fev = 30 dias
    expect(r.gaps.map((x) => x.days)).toEqual([30, 10]);
    expect(r.longest).toEqual({ fromDay: "2026-01-11", toDay: "2026-02-10", days: 30 });
    expect(r.averageGapDays).toBe(20);
    expect(r.medianGapDays).toBe(20); // média de 10 e 30 (par → média dos centrais)
  });

  it("colapsa vários shows no mesmo dia (uma seca é sobre dias sem gig)", () => {
    const r = showGaps(
      [g("2026-03-01"), g("2026-03-01", "CONFIRMED"), g("2026-03-08")],
      { now: NOW },
    );
    expect(r.showDays).toBe(2);
    expect(r.gaps).toHaveLength(1);
    expect(r.gaps[0].days).toBe(7);
  });

  it("trata CONFIRMED futuro como próximo gig e não como seca atual", () => {
    const r = showGaps(
      [g("2026-06-01"), g("2026-06-20", "CONFIRMED")],
      { now: NOW },
    );
    expect(r.currentGapDays).toBe(14); // último passado = 01 jun → 15 jun
    expect(r.daysUntilNext).toBe(5); // 15 → 20 jun
    // o hiato passado↔futuro entra na lista
    expect(r.gaps[0]).toEqual({ fromDay: "2026-06-01", toDay: "2026-06-20", days: 19 });
  });

  it("sem gig passado (só futuros), a seca atual é nula", () => {
    const r = showGaps([g("2026-07-01", "CONFIRMED")], { now: NOW });
    expect(r.currentGapDays).toBeNull();
    expect(r.daysUntilNext).toBe(16); // 15 jun → 01 jul
  });

  it("gig hoje zera a seca atual", () => {
    const r = showGaps([g("2026-06-15")], { now: NOW });
    expect(r.currentGapDays).toBe(0);
  });

  it("desempata hiatos iguais pelo mais recente", () => {
    const r = showGaps(
      [g("2026-01-01"), g("2026-01-08"), g("2026-02-01"), g("2026-02-08")],
      { now: NOW },
    );
    // dois hiatos de 7 dias (01→08 jan e 01→08 fev) e um de 24 (08 jan→01 fev)
    expect(r.gaps[0].days).toBe(24);
    expect(r.gaps[1]).toEqual({ fromDay: "2026-02-01", toDay: "2026-02-08", days: 7 });
    expect(r.gaps[2]).toEqual({ fromDay: "2026-01-01", toDay: "2026-01-08", days: 7 });
  });

  it("expõe o limiar mínimo de amostra", () => {
    expect(MIN_SHOW_GAP_SAMPLE).toBeGreaterThanOrEqual(2);
  });

  it("relaciona a seca atual ao espaçamento típico (múltiplos da mediana)", () => {
    const r = showGaps(
      [g("2026-05-01"), g("2026-05-11"), g("2026-05-21")],
      { now: NOW },
    );
    expect(r.showDays).toBe(3);
    expect(r.medianGapDays).toBe(10); // gaps 10 e 10
    expect(r.currentGapDays).toBe(25); // 21 mai → 15 jun
    expect(r.currentGapVsTypical).toBe(2.5); // 25 / 10
  });

  it("arredonda o múltiplo da mediana a uma casa decimal", () => {
    const r = showGaps(
      [g("2026-06-01"), g("2026-06-04"), g("2026-06-07")],
      { now: NOW },
    );
    expect(r.medianGapDays).toBe(3); // gaps 3 e 3
    expect(r.currentGapDays).toBe(8); // 07 → 15 jun
    expect(r.currentGapVsTypical).toBe(2.7); // 8 / 3 = 2.666… → 2.7
  });

  it("não relaciona com amostra pequena (mediana frágil)", () => {
    const r = showGaps([g("2026-06-01"), g("2026-06-05")], { now: NOW });
    expect(r.showDays).toBe(2); // abaixo de MIN_SHOW_GAP_SAMPLE
    expect(r.currentGapDays).toBe(10);
    expect(r.currentGapVsTypical).toBeNull();
  });

  it("não relaciona sem seca atual (só gigs futuros)", () => {
    const r = showGaps(
      [
        g("2026-07-01", "CONFIRMED"),
        g("2026-07-11", "CONFIRMED"),
        g("2026-07-21", "CONFIRMED"),
      ],
      { now: NOW },
    );
    expect(r.showDays).toBe(3);
    expect(r.medianGapDays).toBe(10);
    expect(r.currentGapDays).toBeNull();
    expect(r.currentGapVsTypical).toBeNull();
    expect(r.currentGapVsLongest).toBeNull();
  });

  it("relaciona a seca atual ao recorde (múltiplos do maior hiato)", () => {
    const r = showGaps(
      // hiatos passados: 10 (01→11 mai) e 20 (11→31 mai) → recorde 20
      [g("2026-05-01"), g("2026-05-11"), g("2026-05-31")],
      { now: NOW }, // 15 jun → seca atual 15 dias
    );
    expect(r.longest?.days).toBe(20);
    expect(r.currentGapDays).toBe(15); // 31 mai → 15 jun
    expect(r.currentGapVsLongest).toBe(0.8); // 15 / 20
  });

  it("sinaliza recorde batido quando a seca atual supera o maior hiato", () => {
    const r = showGaps(
      // hiatos passados: 5 (01→06 abr) e 5 (06→11 abr) → recorde 5
      [g("2026-04-01"), g("2026-04-06"), g("2026-04-11")],
      { now: NOW }, // 15 jun → seca atual 65 dias, muito além do recorde
    );
    expect(r.longest?.days).toBe(5);
    expect(r.currentGapDays).toBe(65); // 11 abr → 15 jun
    expect(r.currentGapVsLongest).toBe(13); // 65 / 5 (inteiro, sem casa)
  });

  it("não relaciona com o recorde sem hiato passado (um único gig)", () => {
    const r = showGaps([g("2026-06-05")], { now: NOW });
    expect(r.longest).toBeNull();
    expect(r.currentGapDays).toBe(10);
    expect(r.currentGapVsLongest).toBeNull();
  });
});

describe("gapDistribution", () => {
  const NOW = "2026-06-15T12:00:00.000Z";
  const g = (date: string, status: string = "PLAYED") => ({ date, status });

  it("devolve todas as faixas zeradas e busiest nulo sem hiatos", () => {
    const d = gapDistribution(showGaps([], { now: NOW }));
    expect(d.total).toBe(0);
    expect(d.busiest).toBeNull();
    expect(d.buckets).toHaveLength(5);
    expect(d.buckets.every((b) => b.count === 0 && b.share === 0)).toBe(true);
    // ordem canônica curta → longa preservada
    expect(d.buckets.map((b) => b.label)).toEqual([
      "Até 1 semana",
      "1 a 2 semanas",
      "2 a 4 semanas",
      "1 a 2 meses",
      "Mais de 2 meses",
    ]);
    // a última faixa não tem teto
    expect(d.buckets[4].maxDays).toBeNull();
  });

  it("um único gig (sem hiato) mantém tudo zerado", () => {
    const d = gapDistribution(showGaps([g("2026-06-05")], { now: NOW }));
    expect(d.total).toBe(0);
    expect(d.busiest).toBeNull();
  });

  it("reparte cada hiato na sua faixa e soma a participação a 1", () => {
    // hiatos: 5 (01→06), 10 (06→16), 20 (16 jun → 06 jul), 40 (06 jul → 15 ago)
    const d = gapDistribution(
      showGaps(
        [
          g("2026-06-01"),
          g("2026-06-06"),
          g("2026-06-16"),
          g("2026-07-06", "CONFIRMED"),
          g("2026-08-15", "CONFIRMED"),
        ],
        { now: NOW },
      ),
    );
    expect(d.total).toBe(4);
    const byLabel = Object.fromEntries(d.buckets.map((b) => [b.label, b.count]));
    expect(byLabel["Até 1 semana"]).toBe(1); // 5 dias
    expect(byLabel["1 a 2 semanas"]).toBe(1); // 10 dias
    expect(byLabel["2 a 4 semanas"]).toBe(1); // 20 dias
    expect(byLabel["1 a 2 meses"]).toBe(1); // 40 dias
    expect(byLabel["Mais de 2 meses"]).toBe(0);
    // participação soma ~1 (cada faixa 0.25)
    expect(d.buckets.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 10);
    expect(d.buckets.find((b) => b.label === "Até 1 semana")?.share).toBeCloseTo(0.25, 10);
  });

  it("respeita os limites inclusivos das faixas (7, 8, 14, 15…)", () => {
    // hiatos de 7 e 8 dias caem em faixas vizinhas (limite inclusivo)
    const d = gapDistribution(
      showGaps([g("2026-06-01"), g("2026-06-08"), g("2026-06-16")], { now: NOW }),
    );
    // 01→08 = 7 (Até 1 semana), 08→16 = 8 (1 a 2 semanas)
    const byLabel = Object.fromEntries(d.buckets.map((b) => [b.label, b.count]));
    expect(byLabel["Até 1 semana"]).toBe(1);
    expect(byLabel["1 a 2 semanas"]).toBe(1);
  });

  it("busiest é a faixa mais cheia", () => {
    // três hiatos de ~10 dias (1 a 2 semanas) e um de 40 (1 a 2 meses)
    const d = gapDistribution(
      showGaps(
        [
          g("2026-04-01"),
          g("2026-04-11"),
          g("2026-04-21"),
          g("2026-05-01"),
          g("2026-06-10", "CONFIRMED"),
        ],
        { now: NOW },
      ),
    );
    expect(d.busiest?.label).toBe("1 a 2 semanas");
    expect(d.busiest?.count).toBe(3);
  });

  it("desempata busiest pela faixa mais curta (ordem canônica)", () => {
    // um hiato de 5 dias (Até 1 semana) e um de 20 (2 a 4 semanas): empate 1×1
    const d = gapDistribution(
      showGaps([g("2026-06-01"), g("2026-06-06"), g("2026-06-26", "CONFIRMED")], {
        now: NOW,
      }),
    );
    expect(d.busiest?.count).toBe(1);
    expect(d.busiest?.label).toBe("Até 1 semana");
  });

  it("classifica hiatos longos na faixa sem teto", () => {
    // hiato único de 100 dias
    const d = gapDistribution(
      showGaps([g("2026-03-01"), g("2026-06-09", "CONFIRMED")], { now: NOW }),
    );
    expect(d.total).toBe(1);
    expect(d.busiest?.label).toBe("Mais de 2 meses");
    expect(d.buckets[4].count).toBe(1);
  });
});

describe("currentDrySpellHeadline", () => {
  const NOW = "2026-06-15T12:00:00.000Z";
  const g = (date: string, status: string = "PLAYED") => ({ date, status });

  it("não dispara sem seca a mostrar (sem shows)", () => {
    const h = currentDrySpellHeadline(showGaps([], { now: NOW }));
    expect(h.show).toBe(false);
    expect(h.critical).toBe(false);
    expect(h.days).toBe(0);
    expect(h.ratio).toBe(0);
    expect(h.typicalDays).toBe(0);
    expect(h.vsLongest).toBeNull();
  });

  it("não dispara com a seca dentro do hábito (abaixo de 2×)", () => {
    // gaps 10 e 10 (mediana 10); seca atual 15 dias → 1,5× (< 2×)
    const h = currentDrySpellHeadline(
      showGaps([g("2026-05-01"), g("2026-05-11"), g("2026-05-21")], {
        now: "2026-06-05T12:00:00.000Z", // 21 mai → 05 jun = 15 dias
      }),
    );
    expect(h.ratio).toBe(1.5);
    expect(h.show).toBe(false);
  });

  it("não dispara quando já há um gig firme à frente (seca por terminar)", () => {
    // seca alta, mas um CONFIRMED futuro → daysUntilNext != null → suprime
    const r = showGaps(
      [
        g("2026-01-01"),
        g("2026-04-01"), // recorde: hiato de 90 dias
        g("2026-04-11"),
        g("2026-04-21"),
        g("2026-05-01"),
        g("2026-07-01", "CONFIRMED"), // próximo gig agendado
      ],
      { now: NOW },
    );
    expect(r.daysUntilNext).not.toBeNull();
    expect(currentDrySpellHeadline(r).show).toBe(false);
  });

  it("dispara (não crítico) com seca fora do comum abaixo do recorde", () => {
    // mediana 10; recorde 90; seca atual 45 dias → 4,5× o hábito, mas 0,5× o recorde
    const r = showGaps(
      [
        g("2026-01-01"),
        g("2026-04-01"), // hiato 90 (recorde)
        g("2026-04-11"),
        g("2026-04-21"),
        g("2026-05-01"),
      ],
      { now: NOW }, // 01 mai → 15 jun = 45 dias
    );
    const h = currentDrySpellHeadline(r);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(false);
    expect(h.days).toBe(45);
    expect(h.ratio).toBe(4.5);
    expect(h.typicalDays).toBe(10);
    expect(h.vsLongest).toBe(0.5);
  });

  it("escala para crítico quando a seca iguala/supera o recorde", () => {
    // mediana 10; recorde 30; seca atual 115 dias → supera o recorde
    const r = showGaps(
      [g("2026-01-01"), g("2026-01-31"), g("2026-02-10"), g("2026-02-20")],
      { now: NOW }, // 20 fev → 15 jun = 115 dias
    );
    const h = currentDrySpellHeadline(r);
    expect(h.show).toBe(true);
    expect(h.critical).toBe(true);
    expect(h.vsLongest).not.toBeNull();
    expect(h.vsLongest! >= 1).toBe(true);
  });

  it("aceita um limiar injetado", () => {
    // seca 1,5× o hábito: não dispara no padrão (2×), dispara com limiar 1,5×
    const r = showGaps([g("2026-05-01"), g("2026-05-11"), g("2026-05-21")], {
      now: "2026-06-05T12:00:00.000Z",
    });
    expect(currentDrySpellHeadline(r).show).toBe(false);
    expect(currentDrySpellHeadline(r, 1.5).show).toBe(true);
  });

  it("expõe o limiar padrão de seca fora do comum", () => {
    expect(DRY_SPELL_UNUSUAL_RATIO).toBe(2);
  });
});
