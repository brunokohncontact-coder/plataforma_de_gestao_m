import { describe, it, expect } from "vitest";
import {
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
  icsEventStatus,
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
});
