// Lógica pura de filtragem da lista de shows. Espelha o padrão já estabelecido
// nas Finanças (`filterTransactions`): critérios via query string, filtragem em
// memória sobre o recorte já carregado do usuário (ver DECISIONS.md D9). Mantida
// separada de `finance.ts` por ser outro domínio, mas reaproveita os helpers
// puros de texto/data de lá (uma fonte de verdade para normalização e chaves).

import { dayKey, isValidDateKey, normalizeText } from "./finance";
import { SHOW_STATUSES, type ShowStatus } from "./domain";

export interface ShowLike {
  title: string;
  venue?: string | null;
  city?: string | null;
  status: string;
  date: Date | string;
}

export interface ShowFilter {
  /** Termo de busca livre (casa título + local + cidade, sem acento/caixa). */
  q?: string | null;
  /** Status exato (PROPOSED/CONFIRMED/PLAYED/CANCELLED); inválido é ignorado. */
  status?: string | null;
  /** Início do intervalo de datas "YYYY-MM-DD" (inclusivo). */
  from?: string | null;
  /** Fim do intervalo de datas "YYYY-MM-DD" (inclusivo). */
  to?: string | null;
}

/** True se `value` é um status de show conhecido. */
export function isValidShowStatus(
  value: string | undefined | null,
): value is ShowStatus {
  return Boolean(value) && (SHOW_STATUSES as readonly string[]).includes(value as string);
}

/** True se ao menos um critério do filtro está ativo (e válido). */
export function hasActiveShowFilter(filter: ShowFilter): boolean {
  return Boolean(
    normalizeText(filter.q) ||
      isValidShowStatus(filter.status) ||
      isValidDateKey(filter.from) ||
      isValidDateKey(filter.to),
  );
}

/**
 * Filtra shows pelos critérios informados. Critérios ausentes/ inválidos são
 * ignorados. O intervalo `from`/`to` é inclusivo nas duas pontas (compara a
 * chave de dia do show); um intervalo invertido (`from` > `to`) não casa nada.
 * O termo `q` casa contra título + local + cidade normalizados (substring,
 * combinada em AND com os demais critérios). Pura.
 */
export function filterShows<T extends ShowLike>(
  shows: T[],
  filter: ShowFilter,
): T[] {
  const q = normalizeText(filter.q);
  const status = isValidShowStatus(filter.status) ? filter.status : null;
  const from = isValidDateKey(filter.from) ? filter.from : null;
  const to = isValidDateKey(filter.to) ? filter.to : null;
  return shows.filter((s) => {
    if (status && s.status !== status) return false;
    if (from || to) {
      const day = dayKey(s.date);
      if (from && day < from) return false;
      if (to && day > to) return false;
    }
    if (q) {
      const haystack = `${normalizeText(s.title)} ${normalizeText(s.venue)} ${normalizeText(
        s.city,
      )}`;
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

// ── Conflitos de agenda (dias com mais de um show) ──────────────────────────
// Detecta sobreposições na agenda: dias do calendário com 2+ shows não
// cancelados. Pode ser uma escolha intencional (matinê + noite), mas é um sinal
// operacional que vale a pena revisar para não fechar dois compromissos no mesmo
// dia por engano. Pura; o agrupamento usa `dayKey` (UTC), a mesma chave de dia
// do resto do app.

/** Show mínimo necessário para detectar conflitos de agenda. */
export interface ConflictShowLike {
  id: string;
  title: string;
  date: Date | string;
  venue?: string | null;
  city?: string | null;
  status: string;
  fee?: number;
}

/** Um dia do calendário com mais de um show não cancelado. */
export interface ScheduleConflictDay<T extends ConflictShowLike = ConflictShowLike> {
  /** Chave do dia "YYYY-MM-DD". */
  day: string;
  /** Shows naquele dia, em ordem cronológica (e, em empate, por título). */
  shows: T[];
  /** Quantos shows caem no dia (≥ 2). */
  count: number;
  /** True se o dia é hoje ou no futuro (conflito ainda acionável). */
  upcoming: boolean;
}

export interface ScheduleConflicts<T extends ConflictShowLike = ConflictShowLike> {
  /** Dias em conflito, em ordem cronológica crescente. */
  days: ScheduleConflictDay<T>[];
  /** Nº de dias em conflito. */
  dayCount: number;
  /** Nº de dias em conflito que ainda estão por vir (hoje ou depois). */
  upcomingDayCount: number;
  /** Total de shows envolvidos em algum conflito. */
  showCount: number;
}

/**
 * Agrupa os shows por dia e devolve apenas os dias com 2+ shows não cancelados
 * — sobreposições na agenda. Shows `CANCELLED` são ignorados (não conflitam).
 * Os dias saem em ordem cronológica crescente; dentro de cada dia, os shows
 * saem por data (depois por título, sem acento/caixa) para estabilidade. Pura.
 */
export function findScheduleConflicts<T extends ConflictShowLike>(
  shows: T[],
  options: { now?: Date | string } = {},
): ScheduleConflicts<T> {
  const today = dayKey(options.now ?? new Date());

  const byDay = new Map<string, T[]>();
  for (const show of shows) {
    if (show.status === "CANCELLED") continue;
    const key = dayKey(show.date);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(show);
    else byDay.set(key, [show]);
  }

  const days: ScheduleConflictDay<T>[] = [];
  let showCount = 0;
  let upcomingDayCount = 0;

  for (const [day, dayShows] of byDay) {
    if (dayShows.length < 2) continue;
    const sorted = [...dayShows].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) return ta - tb;
      return normalizeText(a.title).localeCompare(normalizeText(b.title));
    });
    const upcoming = day >= today;
    if (upcoming) upcomingDayCount += 1;
    showCount += sorted.length;
    days.push({ day, shows: sorted, count: sorted.length, upcoming });
  }

  days.sort((a, b) => a.day.localeCompare(b.day));

  return { days, dayCount: days.length, upcomingDayCount, showCount };
}

// ── Fins de semana livres (oportunidades de booking) ────────────────────────
// Para um músico que toca em bares/casas, a noite de fim de semana é onde mora
// a maior parte do faturamento. Um fim de semana sem nada agendado é receita
// que ficou na mesa. Este relatório olha para FRENTE: lista os próximos fins de
// semana (sexta/sábado/domingo) e marca os que estão livres — onde vale focar a
// prospecção. Espelha o backward-looking `findScheduleConflicts` (mesmo
// `ConflictShowLike`, mesma chave de dia UTC). Pura.

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" (UTC) da meia-noite do dia local-UTC de `date`. */
function utcDayKey(ms: number): string {
  return dayKey(new Date(ms));
}

/** Um fim de semana (sexta→domingo) e os shows nele. */
export interface OpenWeekend<T extends ConflictShowLike = ConflictShowLike> {
  /** Chave "YYYY-MM-DD" (UTC) da sexta-feira que ancora o fim de semana. */
  friday: string;
  /** As três noites: [sexta, sábado, domingo], chaves "YYYY-MM-DD" (UTC). */
  days: [string, string, string];
  /** Shows não cancelados que caem no fim de semana, em ordem cronológica. */
  shows: T[];
  /** True quando não há nenhum show marcado — livre para agendar. */
  open: boolean;
}

export interface OpenWeekendsReport<T extends ConflictShowLike = ConflictShowLike> {
  /** Fins de semana da janela, do mais próximo ao mais distante. */
  weekends: OpenWeekend<T>[];
  /** Total de fins de semana analisados (= tamanho da janela). */
  total: number;
  /** Quantos estão livres (sem nenhum show). */
  openCount: number;
  /** Quantos já têm ao menos um show marcado. */
  bookedCount: number;
  /** Sexta-feira do primeiro fim de semana livre, ou null se todos ocupados. */
  nextOpenFriday: string | null;
}

/**
 * Lista os próximos `weeks` fins de semana e marca os livres (sem show). Um fim
 * de semana = sexta + sábado + domingo; está "ocupado" se algum show não
 * cancelado cai numa dessas três noites. A janela começa no fim de semana atual
 * (incluído enquanto seu domingo não passou) e segue semana a semana. Shows
 * `CANCELLED` são ignorados (não ocupam a data). Pura.
 */
export function findOpenWeekends<T extends ConflictShowLike>(
  shows: T[],
  options: { now?: Date | string; weeks?: number } = {},
): OpenWeekendsReport<T> {
  const weeks = Math.max(1, Math.floor(options.weeks ?? 8));

  // Meia-noite UTC de hoje.
  const nowDate =
    typeof options.now === "string" || options.now instanceof Date
      ? new Date(options.now)
      : new Date();
  const t0 = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate(),
  );

  // Primeira sexta cujo domingo (sexta+2) ainda não passou: ancora a janela no
  // fim de semana corrente enquanto ele não terminou, senão no próximo.
  const base = t0 - 2 * DAY_MS;
  const baseDow = new Date(base).getUTCDay(); // 0=Dom … 5=Sex … 6=Sáb
  const firstFriday = base + ((5 - baseDow + 7) % 7) * DAY_MS;

  // Indexa os shows não cancelados por chave de dia (uma fonte de verdade).
  const byDay = new Map<string, T[]>();
  for (const show of shows) {
    if (show.status === "CANCELLED") continue;
    const key = dayKey(show.date);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(show);
    else byDay.set(key, [show]);
  }

  const weekends: OpenWeekend<T>[] = [];
  let openCount = 0;
  let nextOpenFriday: string | null = null;

  for (let i = 0; i < weeks; i++) {
    const friMs = firstFriday + i * 7 * DAY_MS;
    const days: [string, string, string] = [
      utcDayKey(friMs),
      utcDayKey(friMs + DAY_MS),
      utcDayKey(friMs + 2 * DAY_MS),
    ];

    const wkShows: T[] = [];
    for (const d of days) {
      const bucket = byDay.get(d);
      if (bucket) wkShows.push(...bucket);
    }
    wkShows.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) return ta - tb;
      return normalizeText(a.title).localeCompare(normalizeText(b.title));
    });

    const open = wkShows.length === 0;
    if (open) {
      openCount += 1;
      if (nextOpenFriday === null) nextOpenFriday = days[0];
    }

    weekends.push({ friday: days[0], days, shows: wkShows, open });
  }

  return {
    weekends,
    total: weekends.length,
    openCount,
    bookedCount: weekends.length - openCount,
    nextOpenFriday,
  };
}
