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
  type ConflictShowLike,
  type ShowLike,
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
