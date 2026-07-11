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

/**
 * Um lembrete (VALARM) só faz sentido para compromissos ainda por cumprir:
 * PROPOSED (a acompanhar) e CONFIRMED (firme). Um show PLAYED já aconteceu e um
 * CANCELLED não vai acontecer — nenhum precisa de alarme. Ver DECISIONS.md (D295).
 */
export function showWantsReminder(status: ShowStatus): boolean {
  return status === "PROPOSED" || status === "CONFIRMED";
}

/**
 * Formata uma antecedência em minutos como uma DURATION negativa da RFC 5545
 * §3.3.6 (ex.: 180 → "-PT3H", 90 → "-PT1H30M", 1440 → "-P1D", 1560 → "-P1DT2H"),
 * pronta para a propriedade TRIGGER de um VALARM. Zero/negativo → "-PT0M".
 */
export function formatAlarmTrigger(minutesBefore: number): string {
  const total = Math.max(0, Math.round(minutesBefore));
  if (total === 0) return "-PT0M";
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const time = `${hours > 0 ? `${hours}H` : ""}${mins > 0 ? `${mins}M` : ""}`;
  return `-P${days > 0 ? `${days}D` : ""}${time ? `T${time}` : ""}`;
}

/**
 * Presets de antecedência do lembrete (valor do parâmetro `?lembrete=` → minutos).
 * Cobre da véspera imediata ("30m") a dois dias antes ("2d").
 */
export const REMINDER_PRESETS: Readonly<Record<string, number>> = {
  "30m": 30,
  "1h": 60,
  "2h": 120,
  "3h": 180,
  "6h": 360,
  "12h": 720,
  "1d": 1440,
  "2d": 2880,
};

/** Antecedência padrão do lembrete quando `?lembrete=` está ausente: 3h antes. */
export const DEFAULT_REMINDER_MINUTES = 180;

/**
 * Valor do parâmetro `?lembrete=` que corresponde ao padrão ({@link
 * DEFAULT_REMINDER_MINUTES}). É a opção pré-selecionada no seletor da UI e casa
 * com {@link REMINDER_PRESETS} (invariante coberto por teste).
 */
export const DEFAULT_REMINDER_VALUE = "3h";

/**
 * Rótulo legível (pt-BR) de uma antecedência em minutos para o seletor de
 * lembrete — "30 min antes", "1 h antes", "1 dia antes", "1 dia e 2 h antes".
 * Pura, sem dependência dos presets (aceita qualquer valor positivo).
 */
export function reminderLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return "no horário";
  const days = Math.floor(total / 1440);
  const rest = total % 1440;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (rest > 0) {
    if (rest < 60) parts.push(`${rest} min`);
    else {
      const h = Math.floor(rest / 60);
      const m = rest % 60;
      parts.push(m === 0 ? `${h} h` : `${h}h${m}`);
    }
  }
  return `${parts.join(" e ")} antes`;
}

/** Uma opção do seletor de lembrete na UI. */
export interface ReminderOption {
  /** Valor do parâmetro `?lembrete=` (ex.: "3h", "off"). */
  value: string;
  /** Rótulo exibido ao usuário. */
  label: string;
  /** Minutos de antecedência; `null` = sem lembrete ("off"). */
  minutes: number | null;
}

/**
 * Opções ordenadas do seletor de lembrete do feed .ics, da mais próxima ao show
 * ("30 min antes") à mais distante ("2 dias antes"), terminando em "Sem
 * lembrete" (`off`). Deriva de {@link REMINDER_PRESETS} para manter UI e parser
 * (`parseReminderMinutes`) em sincronia — um preset novo aparece automaticamente.
 */
export const REMINDER_OPTIONS: readonly ReminderOption[] = [
  ...Object.entries(REMINDER_PRESETS).map(([value, minutes]) => ({
    value,
    minutes,
    label: reminderLabel(minutes),
  })),
  { value: "off", label: "Sem lembrete", minutes: null },
];

/**
 * Interpreta o parâmetro `?lembrete=` do feed .ics em minutos de antecedência.
 * Ausente/vazio → o padrão ({@link DEFAULT_REMINDER_MINUTES}); "off"/"0"/"nao"/
 * "sem"/"none" → `null` (sem lembrete); um preset conhecido → seus minutos;
 * qualquer outro valor cai no padrão (leniente, nunca lança).
 */
export function parseReminderMinutes(value: string | null | undefined): number | null {
  if (value == null) return DEFAULT_REMINDER_MINUTES;
  const v = value.trim().toLowerCase();
  if (v === "") return DEFAULT_REMINDER_MINUTES;
  if (["off", "0", "nao", "não", "none", "sem"].includes(v)) return null;
  return REMINDER_PRESETS[v] ?? DEFAULT_REMINDER_MINUTES;
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
  /**
   * Quando um número positivo, anexa um VALARM (ACTION:DISPLAY) que dispara este
   * tanto de minutos antes do início — mas só para shows ainda por cumprir
   * ({@link showWantsReminder}). Ausente/≤0 → sem lembrete. Ver DECISIONS.md (D295).
   */
  reminderMinutesBefore?: number;
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

  const reminder = opts.reminderMinutesBefore;
  if (typeof reminder === "number" && reminder > 0 && showWantsReminder(show.status)) {
    props.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(show.title)}`,
      `TRIGGER:${formatAlarmTrigger(reminder)}`,
      "END:VALARM",
    );
  }

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
