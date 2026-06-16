import { describe, it, expect } from "vitest";
import {
  parseMonthKey,
  monthKey,
  shiftMonth,
  monthGridRange,
  buildMonthGrid,
  formatMonthTitle,
  toDayParam,
  dayParamToDateTimeLocal,
} from "./calendar";

describe("monthKey / parseMonthKey", () => {
  it("formata com zero à esquerda", () => {
    expect(monthKey(2026, 6)).toBe("2026-06");
    expect(monthKey(2026, 12)).toBe("2026-12");
  });

  it("faz round-trip de chaves válidas", () => {
    expect(parseMonthKey("2026-06")).toEqual({ year: 2026, month: 6 });
    expect(parseMonthKey("2026-12")).toEqual({ year: 2026, month: 12 });
  });

  it("usa o mês de referência para entradas inválidas/ausentes", () => {
    const ref = new Date(2026, 5, 15); // junho/2026
    expect(parseMonthKey(undefined, ref)).toEqual({ year: 2026, month: 6 });
    expect(parseMonthKey("", ref)).toEqual({ year: 2026, month: 6 });
    expect(parseMonthKey("lixo", ref)).toEqual({ year: 2026, month: 6 });
    expect(parseMonthKey("2026-13", ref)).toEqual({ year: 2026, month: 6 });
    expect(parseMonthKey("2026-00", ref)).toEqual({ year: 2026, month: 6 });
  });
});

describe("shiftMonth", () => {
  it("avança e retrocede dentro do ano", () => {
    expect(shiftMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
    expect(shiftMonth(2026, 6, -1)).toEqual({ year: 2026, month: 5 });
  });

  it("vira o ano corretamente", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("formatMonthTitle", () => {
  it("rotula em pt-BR", () => {
    expect(formatMonthTitle(2026, 6)).toBe("Junho de 2026");
    expect(formatMonthTitle(2026, 1)).toBe("Janeiro de 2026");
  });
});

describe("monthGridRange", () => {
  it("inicia no domingo da semana do dia 1", () => {
    // Junho/2026: dia 1 é segunda-feira -> grade começa no domingo 31/mai.
    const { start } = monthGridRange(2026, 6);
    expect(start.getDay()).toBe(0); // domingo
    expect(start.getDate()).toBe(31);
    expect(start.getMonth()).toBe(4); // maio (0-based)
  });

  it("cobre um número inteiro de semanas", () => {
    const { start, endExclusive } = monthGridRange(2026, 6);
    const days = Math.round(
      (endExclusive.getTime() - start.getTime()) / (24 * 3600 * 1000),
    );
    expect(days % 7).toBe(0);
  });
});

describe("buildMonthGrid", () => {
  const today = new Date(2026, 5, 16); // 16/jun/2026

  it("produz semanas de 7 dias começando no domingo", () => {
    const grid = buildMonthGrid(2026, 6, [], today);
    expect(grid.length).toBeGreaterThanOrEqual(4);
    for (const week of grid) {
      expect(week).toHaveLength(7);
      expect(week[0].date.getDay()).toBe(0); // domingo
      expect(week[6].date.getDay()).toBe(6); // sábado
    }
  });

  it("marca dias do mês vs. bordas e o dia de hoje", () => {
    const grid = buildMonthGrid(2026, 6, [], today);
    const flat = grid.flat();
    // primeiro dia da grade (31/mai) é borda
    expect(flat[0].inMonth).toBe(false);
    // o dia 1/jun pertence ao mês
    const dia1 = flat.find((c) => c.inMonth && c.date.getDate() === 1)!;
    expect(dia1.inMonth).toBe(true);
    // hoje marcado
    const hoje = flat.find((c) => c.isToday);
    expect(hoje?.date.getDate()).toBe(16);
    expect(hoje?.inMonth).toBe(true);
  });

  it("distribui itens no dia local e ordena por horário", () => {
    const items = [
      { id: "tarde", date: new Date(2026, 5, 10, 20, 0) },
      { id: "manha", date: new Date(2026, 5, 10, 9, 0) },
      { id: "outro", date: new Date(2026, 5, 22, 12, 0) },
    ];
    const grid = buildMonthGrid(2026, 6, items, today);
    const flat = grid.flat();
    const dia10 = flat.find((c) => c.inMonth && c.date.getDate() === 10)!;
    expect(dia10.items.map((i) => i.id)).toEqual(["manha", "tarde"]);
    const dia22 = flat.find((c) => c.inMonth && c.date.getDate() === 22)!;
    expect(dia22.items.map((i) => i.id)).toEqual(["outro"]);
    // total de itens distribuídos
    expect(flat.reduce((n, c) => n + c.items.length, 0)).toBe(3);
  });

  it("não coloca itens de outro mês em dias do mês exibido", () => {
    const items = [{ id: "maio", date: new Date(2026, 4, 15, 12, 0) }];
    const grid = buildMonthGrid(2026, 6, items, today);
    const inMonthItems = grid
      .flat()
      .filter((c) => c.inMonth)
      .reduce((n, c) => n + c.items.length, 0);
    expect(inMonthItems).toBe(0);
  });
});

describe("toDayParam", () => {
  it("formata a data local com zero à esquerda", () => {
    expect(toDayParam(new Date(2026, 5, 9, 23, 30))).toBe("2026-06-09");
    expect(toDayParam(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  it("usa o dia LOCAL, não UTC (ignora a hora do dia)", () => {
    // 1º de junho à meia-noite local continua sendo "2026-06-01".
    expect(toDayParam(new Date(2026, 5, 1, 0, 0))).toBe("2026-06-01");
  });

  it("faz round-trip com as células da grade", () => {
    const grid = buildMonthGrid(2026, 6, [], new Date(2026, 5, 16));
    const dia10 = grid.flat().find((c) => c.inMonth && c.date.getDate() === 10)!;
    expect(toDayParam(dia10.date)).toBe("2026-06-10");
  });
});

describe("dayParamToDateTimeLocal", () => {
  it("converte uma chave de dia no valor de datetime-local com horário padrão", () => {
    expect(dayParamToDateTimeLocal("2026-06-09")).toBe("2026-06-09T20:00");
  });

  it("aceita um horário padrão customizado", () => {
    expect(dayParamToDateTimeLocal("2026-06-09", "09:30")).toBe("2026-06-09T09:30");
  });

  it("retorna undefined para entradas ausentes ou inválidas", () => {
    expect(dayParamToDateTimeLocal(undefined)).toBeUndefined();
    expect(dayParamToDateTimeLocal(null)).toBeUndefined();
    expect(dayParamToDateTimeLocal("")).toBeUndefined();
    expect(dayParamToDateTimeLocal("2026-06")).toBeUndefined();
    expect(dayParamToDateTimeLocal("09/06/2026")).toBeUndefined();
    expect(dayParamToDateTimeLocal("2026-13-09")).toBeUndefined(); // mês inválido
    expect(dayParamToDateTimeLocal("2026-06-32")).toBeUndefined(); // dia inválido
  });

  it("o resultado é consumível por toDayParam de volta à mesma chave", () => {
    const param = toDayParam(new Date(2026, 5, 9, 12, 0));
    const dt = dayParamToDateTimeLocal(param)!;
    expect(dt.startsWith(param)).toBe(true);
  });
});
