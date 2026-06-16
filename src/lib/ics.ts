// Serialização de iCalendar (RFC 5545) — pura, sem dependência de banco/UI.
// Testada em ics.test.ts. Gera um VCALENDAR com um VEVENT por show, para que o
// músico possa importar/assinar a agenda no Google/Apple Calendar.
//
// Todas as datas são emitidas em UTC (sufixo "Z"), o formato mais portável entre
// clientes de calendário (cada um exibe no fuso local do usuário).

import { SHOW_STATUS_LABELS, type ShowStatus } from "./domain";
import { formatMoney } from "./money";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Escapa um valor de TEXT do iCalendar (RFC 5545 §3.3.11): contrabarra, ponto e
 * vírgula e vírgula são escapados; quebras de linha viram "\n". A contrabarra é
 * escapada primeiro para não duplicar o escape das demais sequências.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Dobra uma linha de conteúdo em segmentos de no máximo 75 octetos (RFC 5545
 * §3.1), unindo com CRLF + espaço. A contagem é por bytes UTF-8 (não por
 * caracteres), e nunca parte um caractere multibyte ao meio. As linhas de
 * continuação reservam 1 octeto para o espaço inicial.
 */
export function foldIcsLine(line: string): string {
  const enc = new TextEncoder();
  const segments: string[] = [];
  let current = "";
  let currentBytes = 0;
  let first = true;
  for (const ch of line) {
    const chBytes = enc.encode(ch).length;
    const limit = first ? 75 : 74; // continuação gasta 1 octeto com o espaço
    if (currentBytes + chBytes > limit) {
      segments.push(current);
      current = "";
      currentBytes = 0;
      first = false;
    }
    current += ch;
    currentBytes += chBytes;
  }
  segments.push(current);
  return segments.join("\r\n ");
}

/** Date -> "AAAAMMDDTHHMMSSZ" (UTC). */
export function formatIcsUtc(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Mapeia o status do show para o STATUS do VEVENT (RFC 5545 §3.8.1.11). */
export function icsEventStatus(status: ShowStatus): "TENTATIVE" | "CONFIRMED" | "CANCELLED" {
  switch (status) {
    case "PROPOSED":
      return "TENTATIVE";
    case "CANCELLED":
      return "CANCELLED";
    default: // CONFIRMED, PLAYED
      return "CONFIRMED";
  }
}

/** Forma mínima de show para exportação (desacoplada do Prisma). */
export interface IcsShow {
  id: string;
  title: string;
  date: Date | string;
  venue?: string | null;
  city?: string | null;
  status: ShowStatus;
  fee?: number | null; // centavos
  notes?: string | null;
}

export interface IcsOptions {
  /** Momento de geração (DTSTAMP). Default: agora. */
  now?: Date;
  /** Duração padrão do evento em minutos (DTEND = DTSTART + duração). Default: 120. */
  durationMinutes?: number;
  /** Domínio usado no UID (`<id>@<uidDomain>`). Default: "palco.app". */
  uidDomain?: string;
}

/** Junta local + cidade em uma única linha de LOCATION (ignora partes vazias). */
function locationLine(show: IcsShow): string {
  return [show.venue, show.city].filter((p) => p && p.trim()).join(", ");
}

/** Monta a DESCRIPTION a partir de situação, cachê e notas (linhas com "\n"). */
function descriptionLines(show: IcsShow): string {
  const parts = [`Situação: ${SHOW_STATUS_LABELS[show.status]}`];
  if (show.fee && show.fee > 0) parts.push(`Cachê: ${formatMoney(show.fee)}`);
  if (show.notes && show.notes.trim()) parts.push(show.notes.trim());
  return parts.join("\n");
}

/**
 * Gera as linhas (já dobradas) de um VEVENT para um show. Não inclui CRLF de
 * separação entre propriedades — o chamador junta com "\r\n".
 */
export function buildVEvent(show: IcsShow, opts: IcsOptions = {}): string[] {
  const now = opts.now ?? new Date();
  const durationMs = (opts.durationMinutes ?? 120) * 60_000;
  const uidDomain = opts.uidDomain ?? "palco.app";
  const start = show.date instanceof Date ? show.date : new Date(show.date);
  const end = new Date(start.getTime() + durationMs);

  const props: string[] = [
    "BEGIN:VEVENT",
    `UID:${show.id}@${uidDomain}`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(show.title)}`,
  ];

  const location = locationLine(show);
  if (location) props.push(`LOCATION:${escapeIcsText(location)}`);

  props.push(`DESCRIPTION:${escapeIcsText(descriptionLines(show))}`);
  props.push(`STATUS:${icsEventStatus(show.status)}`);
  props.push("END:VEVENT");

  return props.map(foldIcsLine);
}

/**
 * Serializa uma lista de shows em um documento iCalendar (VCALENDAR) completo,
 * pronto para download. Linhas separadas por CRLF, conforme a RFC.
 */
export function showsToIcs(shows: IcsShow[], opts: IcsOptions = {}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Palco//Agenda de Shows//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText("Agenda de shows")}`,
  ];
  for (const show of shows) {
    lines.push(...buildVEvent(show, opts));
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
