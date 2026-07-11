import { describe, it, expect } from "vitest";
import {
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
  icsEventStatus,
  showWantsReminder,
  formatAlarmTrigger,
  parseReminderMinutes,
  DEFAULT_REMINDER_MINUTES,
  DEFAULT_REMINDER_VALUE,
  reminderLabel,
  REMINDER_OPTIONS,
  REMINDER_PRESETS,
  buildVEvent,
  showsToIcs,
  type IcsShow,
} from "./ics";

describe("escapeIcsText", () => {
  it("escapa contrabarra, ponto e vírgula e vírgula", () => {
    expect(escapeIcsText("a;b,c\\d")).toBe("a\\;b\\,c\\\\d");
  });

  it("escapa a contrabarra antes das demais (sem duplicar)", () => {
    // entrada "\;" -> a barra vira "\\" e o ; vira "\;"
    expect(escapeIcsText("\\;")).toBe("\\\\\\;");
  });

  it("converte quebras de linha em \\n", () => {
    expect(escapeIcsText("linha1\nlinha2")).toBe("linha1\\nlinha2");
    expect(escapeIcsText("a\r\nb")).toBe("a\\nb");
    expect(escapeIcsText("a\rb")).toBe("a\\nb");
  });

  it("deixa texto simples intacto", () => {
    expect(escapeIcsText("Show no Bar")).toBe("Show no Bar");
  });
});

describe("foldIcsLine", () => {
  it("não dobra linhas curtas", () => {
    expect(foldIcsLine("SUMMARY:oi")).toBe("SUMMARY:oi");
  });

  it("dobra em segmentos <= 75 octetos, com CRLF + espaço", () => {
    const line = "X".repeat(200);
    const folded = foldIcsLine(line);
    const segments = folded.split("\r\n");
    expect(segments.length).toBeGreaterThan(1);
    // primeira linha: <=75; continuações: espaço + <=74
    expect(Buffer.byteLength(segments[0], "utf8")).toBeLessThanOrEqual(75);
    for (const seg of segments.slice(1)) {
      expect(seg.startsWith(" ")).toBe(true);
      expect(Buffer.byteLength(seg, "utf8")).toBeLessThanOrEqual(75);
    }
    // desdobrar reconstrói o original
    const unfolded = segments.map((s, i) => (i === 0 ? s : s.slice(1))).join("");
    expect(unfolded).toBe(line);
  });

  it("conta por octetos UTF-8 e não parte caractere multibyte", () => {
    const line = "é".repeat(50); // cada "é" = 2 octetos -> 100 octetos
    const folded = foldIcsLine(line);
    for (const seg of folded.split("\r\n")) {
      expect(Buffer.byteLength(seg, "utf8")).toBeLessThanOrEqual(75);
    }
    const segments = folded.split("\r\n");
    const unfolded = segments.map((s, i) => (i === 0 ? s : s.slice(1))).join("");
    expect(unfolded).toBe(line);
  });
});

describe("formatIcsUtc", () => {
  it("formata em UTC com sufixo Z", () => {
    expect(formatIcsUtc(new Date("2026-06-16T20:30:00Z"))).toBe("20260616T203000Z");
    expect(formatIcsUtc("2026-01-05T09:05:07Z")).toBe("20260105T090507Z");
  });
});

describe("icsEventStatus", () => {
  it("mapeia status do show para STATUS do VEVENT", () => {
    expect(icsEventStatus("PROPOSED")).toBe("TENTATIVE");
    expect(icsEventStatus("CONFIRMED")).toBe("CONFIRMED");
    expect(icsEventStatus("PLAYED")).toBe("CONFIRMED");
    expect(icsEventStatus("CANCELLED")).toBe("CANCELLED");
  });
});

describe("showWantsReminder", () => {
  it("lembra apenas compromissos por cumprir (proposto/confirmado)", () => {
    expect(showWantsReminder("PROPOSED")).toBe(true);
    expect(showWantsReminder("CONFIRMED")).toBe(true);
    expect(showWantsReminder("PLAYED")).toBe(false);
    expect(showWantsReminder("CANCELLED")).toBe(false);
  });
});

describe("formatAlarmTrigger", () => {
  it("formata horas e minutos como DURATION negativa da RFC 5545", () => {
    expect(formatAlarmTrigger(180)).toBe("-PT3H");
    expect(formatAlarmTrigger(90)).toBe("-PT1H30M");
    expect(formatAlarmTrigger(30)).toBe("-PT30M");
  });

  it("usa a parte de data para dias e combina com horas", () => {
    expect(formatAlarmTrigger(1440)).toBe("-P1D");
    expect(formatAlarmTrigger(1560)).toBe("-P1DT2H");
    expect(formatAlarmTrigger(2880)).toBe("-P2D");
  });

  it("arredonda e trata zero/negativo como -PT0M", () => {
    expect(formatAlarmTrigger(0)).toBe("-PT0M");
    expect(formatAlarmTrigger(-10)).toBe("-PT0M");
    expect(formatAlarmTrigger(59.6)).toBe("-PT1H"); // 60 min arredondado
  });
});

describe("parseReminderMinutes", () => {
  it("cai no padrão quando ausente/vazio/desconhecido", () => {
    expect(parseReminderMinutes(null)).toBe(DEFAULT_REMINDER_MINUTES);
    expect(parseReminderMinutes(undefined)).toBe(DEFAULT_REMINDER_MINUTES);
    expect(parseReminderMinutes("  ")).toBe(DEFAULT_REMINDER_MINUTES);
    expect(parseReminderMinutes("xyz")).toBe(DEFAULT_REMINDER_MINUTES);
  });

  it("desliga o lembrete com os valores de opt-out", () => {
    expect(parseReminderMinutes("off")).toBeNull();
    expect(parseReminderMinutes("0")).toBeNull();
    expect(parseReminderMinutes("nao")).toBeNull();
    expect(parseReminderMinutes("sem")).toBeNull();
    expect(parseReminderMinutes("NONE")).toBeNull();
  });

  it("resolve os presets conhecidos (case-insensitive, com espaços)", () => {
    expect(parseReminderMinutes("30m")).toBe(30);
    expect(parseReminderMinutes("1h")).toBe(60);
    expect(parseReminderMinutes(" 3H ")).toBe(180);
    expect(parseReminderMinutes("1d")).toBe(1440);
    expect(parseReminderMinutes("2d")).toBe(2880);
  });
});

describe("reminderLabel", () => {
  it("formata minutos abaixo de uma hora", () => {
    expect(reminderLabel(30)).toBe("30 min antes");
    expect(reminderLabel(45)).toBe("45 min antes");
  });

  it("formata horas cheias e horas com minutos", () => {
    expect(reminderLabel(60)).toBe("1 h antes");
    expect(reminderLabel(120)).toBe("2 h antes");
    expect(reminderLabel(90)).toBe("1h30 antes");
  });

  it("formata dias (singular/plural) e dia com resto", () => {
    expect(reminderLabel(1440)).toBe("1 dia antes");
    expect(reminderLabel(2880)).toBe("2 dias antes");
    expect(reminderLabel(1560)).toBe("1 dia e 2 h antes");
  });

  it("zero/negativo vira 'no horário'", () => {
    expect(reminderLabel(0)).toBe("no horário");
    expect(reminderLabel(-10)).toBe("no horário");
  });
});

describe("REMINDER_OPTIONS", () => {
  it("tem uma opção por preset, na ordem, mais 'off' ao final", () => {
    const presetKeys = Object.keys(REMINDER_PRESETS);
    const optionValues = REMINDER_OPTIONS.map((o) => o.value);
    expect(optionValues).toEqual([...presetKeys, "off"]);
  });

  it("cada opção de preset carrega os minutos e o rótulo corretos", () => {
    for (const [value, minutes] of Object.entries(REMINDER_PRESETS)) {
      const opt = REMINDER_OPTIONS.find((o) => o.value === value);
      expect(opt).toBeDefined();
      expect(opt!.minutes).toBe(minutes);
      expect(opt!.label).toBe(reminderLabel(minutes));
    }
  });

  it("a opção 'off' significa sem lembrete", () => {
    const off = REMINDER_OPTIONS.find((o) => o.value === "off");
    expect(off).toEqual({ value: "off", label: "Sem lembrete", minutes: null });
  });

  it("o valor padrão do seletor casa com o preset e com o padrão de minutos", () => {
    expect(REMINDER_PRESETS[DEFAULT_REMINDER_VALUE]).toBe(DEFAULT_REMINDER_MINUTES);
    expect(parseReminderMinutes(DEFAULT_REMINDER_VALUE)).toBe(DEFAULT_REMINDER_MINUTES);
    expect(REMINDER_OPTIONS.some((o) => o.value === DEFAULT_REMINDER_VALUE)).toBe(true);
  });
});

describe("buildVEvent", () => {
  const base: IcsShow = {
    id: "show123",
    title: "Show no Bar do Zé",
    date: "2026-06-16T23:00:00Z",
    venue: "Bar do Zé",
    city: "São Paulo",
    status: "CONFIRMED",
    fee: 150000,
    notes: "Levar cabo reserva",
  };
  const opts = { now: new Date("2026-06-01T00:00:00Z") };

  it("emite as propriedades essenciais", () => {
    const lines = buildVEvent(base, opts);
    expect(lines[0]).toBe("BEGIN:VEVENT");
    expect(lines.at(-1)).toBe("END:VEVENT");
    expect(lines).toContain("UID:show123@palco.app");
    expect(lines).toContain("DTSTAMP:20260601T000000Z");
    expect(lines).toContain("DTSTART:20260616T230000Z");
    expect(lines).toContain("SUMMARY:Show no Bar do Zé");
    expect(lines).toContain("STATUS:CONFIRMED");
  });

  it("calcula DTEND com a duração padrão de 120 min", () => {
    const lines = buildVEvent(base, opts);
    expect(lines).toContain("DTEND:20260617T010000Z"); // 23:00 + 2h
  });

  it("respeita uma duração customizada", () => {
    const lines = buildVEvent(base, { ...opts, durationMinutes: 90 });
    expect(lines).toContain("DTEND:20260617T003000Z"); // 23:00 + 1h30
  });

  it("combina local e cidade em LOCATION", () => {
    expect(buildVEvent(base, opts)).toContain("LOCATION:Bar do Zé\\, São Paulo");
  });

  it("omite LOCATION quando não há local nem cidade", () => {
    const lines = buildVEvent({ ...base, venue: null, city: "  " }, opts);
    expect(lines.some((l) => l.startsWith("LOCATION:"))).toBe(false);
  });

  it("monta a DESCRIPTION com situação, cachê e notas", () => {
    const desc = buildVEvent(base, opts).find((l) => l.startsWith("DESCRIPTION:"));
    // a linha pode estar dobrada (CRLF + espaço); desdobra antes de comparar
    const unfolded = (desc ?? "").replace(/\r\n /g, "");
    expect(unfolded).toContain("Situação: Confirmado");
    expect(unfolded).toContain("Cachê:");
    expect(unfolded).toContain("Levar cabo reserva");
  });

  it("omite o cachê quando é zero/ausente", () => {
    const desc = buildVEvent({ ...base, fee: 0, notes: null }, opts).find((l) =>
      l.startsWith("DESCRIPTION:"),
    );
    expect(desc).toBe("DESCRIPTION:Situação: Confirmado");
  });

  it("respeita um domínio de UID customizado", () => {
    expect(buildVEvent(base, { ...opts, uidDomain: "exemplo.com" })).toContain(
      "UID:show123@exemplo.com",
    );
  });

  it("não emite VALARM quando não há lembrete configurado", () => {
    expect(buildVEvent(base, opts).some((l) => l === "BEGIN:VALARM")).toBe(false);
  });

  it("anexa um VALARM (DISPLAY) antes do END quando há lembrete", () => {
    const lines = buildVEvent(base, { ...opts, reminderMinutesBefore: 180 });
    const alarmStart = lines.indexOf("BEGIN:VALARM");
    expect(alarmStart).toBeGreaterThan(-1);
    expect(lines).toContain("ACTION:DISPLAY");
    expect(lines).toContain("TRIGGER:-PT3H");
    // o alarme usa o título do show como texto do lembrete
    expect(lines).toContain("DESCRIPTION:Show no Bar do Zé");
    // bloco contíguo BEGIN..END (5 linhas) dentro do VEVENT, antes do END final
    expect(lines[alarmStart + 4]).toBe("END:VALARM");
    expect(lines.at(-1)).toBe("END:VEVENT");
  });

  it("não lembra shows já tocados nem cancelados", () => {
    for (const status of ["PLAYED", "CANCELLED"] as const) {
      const lines = buildVEvent(
        { ...base, status },
        { ...opts, reminderMinutesBefore: 180 },
      );
      expect(lines.some((l) => l === "BEGIN:VALARM")).toBe(false);
    }
  });

  it("ignora lembrete zero/negativo", () => {
    expect(
      buildVEvent(base, { ...opts, reminderMinutesBefore: 0 }).some((l) => l === "BEGIN:VALARM"),
    ).toBe(false);
    expect(
      buildVEvent(base, { ...opts, reminderMinutesBefore: -5 }).some((l) => l === "BEGIN:VALARM"),
    ).toBe(false);
  });
});

describe("showsToIcs", () => {
  const opts = { now: new Date("2026-06-01T00:00:00Z") };
  const show: IcsShow = {
    id: "a1",
    title: "Festival",
    date: "2026-07-10T22:00:00Z",
    status: "PROPOSED",
  };

  it("envolve os eventos em um VCALENDAR e termina com CRLF", () => {
    const ics = showsToIcs([show], opts);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Palco//Agenda de Shows//PT");
  });

  it("gera um VEVENT por show", () => {
    const ics = showsToIcs([show, { ...show, id: "a2" }], opts);
    const begins = ics.match(/BEGIN:VEVENT/g) ?? [];
    const ends = ics.match(/END:VEVENT/g) ?? [];
    expect(begins).toHaveLength(2);
    expect(ends).toHaveLength(2);
  });

  it("produz um calendário válido (só cabeçalho) para lista vazia", () => {
    const ics = showsToIcs([], opts);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("usa linhas separadas por CRLF", () => {
    const ics = showsToIcs([show], opts);
    expect(ics).toContain("\r\n");
    // não deve haver LF solto (sem CR antes)
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("propaga o lembrete a cada evento elegível", () => {
    const ics = showsToIcs(
      [
        { ...show, id: "up1", status: "CONFIRMED" },
        { ...show, id: "past1", status: "PLAYED" },
      ],
      { ...opts, reminderMinutesBefore: 1440 },
    );
    // um VALARM só para o confirmado; nenhum para o já tocado
    expect(ics.match(/BEGIN:VALARM/g) ?? []).toHaveLength(1);
    expect(ics).toContain("TRIGGER:-P1D");
  });
});
