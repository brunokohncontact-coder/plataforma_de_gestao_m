// Lógica pura de filtragem da lista de shows. Espelha o padrão já estabelecido
// nas Finanças (`filterTransactions`): critérios via query string, filtragem em
// memória sobre o recorte já carregado do usuário (ver DECISIONS.md D9). Mantida
// separada de `finance.ts` por ser outro domínio, mas reaproveita os helpers
// puros de texto/data de lá (uma fonte de verdade para normalização e chaves).

import { CONVERSION_TREND_EPSILON, dayKey, monthKey, isValidDateKey, normalizeText } from "./finance";
import { SHOW_STATUSES, type ShowStatus } from "./domain";
import { MONTH_NAMES_LONG } from "./calendar";

export interface ShowLike {
  title: string;
  venue?: string | null;
  city?: string | null;
  status: string;
  date: Date | string;
  notes?: string | null;
}

export interface ShowFilter {
  /** Termo de busca livre (casa título + local + cidade + anotações, sem acento/caixa). */
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
 * O termo `q` casa contra título + local + cidade + anotações normalizados
 * (substring, combinada em AND com os demais critérios). Pura.
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
      )} ${normalizeText(s.notes)}`;
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

/** Presets de janela (em semanas) oferecidos na página de fins de semana livres. */
export const WEEKEND_WINDOW_PRESETS = [4, 8, 12, 26] as const;
/** Janela padrão: ~3 meses de fins de semana. */
export const WEEKEND_WINDOW_DEFAULT = 12;
/** Limites duros da janela analisável (1 fim de semana … ~1 ano). */
export const WEEKEND_WINDOW_MIN = 1;
export const WEEKEND_WINDOW_MAX = 52;

/**
 * Lê o parâmetro `?semanas=` e devolve um tamanho de janela válido — um inteiro
 * dentro de [WEEKEND_WINDOW_MIN, WEEKEND_WINDOW_MAX]. Valor ausente, vazio ou não
 * numérico cai no `fallback`; fora da faixa é grampeado nos limites. Pura.
 */
export function parseWeekendWindow(
  raw: string | string[] | undefined,
  fallback: number = WEEKEND_WINDOW_DEFAULT,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < WEEKEND_WINDOW_MIN) return WEEKEND_WINDOW_MIN;
  if (i > WEEKEND_WINDOW_MAX) return WEEKEND_WINDOW_MAX;
  return i;
}

/** "YYYY-MM-DD" (UTC) → Date em UTC, para formatação sem escorregar de fuso. Pura. */
export function weekendKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Rótulo compacto de um fim de semana sexta→domingo, ex.: "13–15 de mar" (mesmo
 * mês) ou "27 fev – 1 mar" (vira o mês). Uma fonte de verdade reaproveitada pela
 * página `/shows/fins-de-semana-livres` e pelo card do Painel. Pura.
 */
export function formatWeekendLabel(friday: string, sunday: string): string {
  const f = weekendKeyToDate(friday);
  const s = weekendKeyToDate(sunday);
  const fMonth = MONTH_NAMES_LONG[f.getUTCMonth()].slice(0, 3).toLowerCase();
  const sMonth = MONTH_NAMES_LONG[s.getUTCMonth()].slice(0, 3).toLowerCase();
  if (f.getUTCMonth() === s.getUTCMonth()) {
    return `${f.getUTCDate()}–${s.getUTCDate()} de ${fMonth}`;
  }
  return `${f.getUTCDate()} ${fMonth} – ${s.getUTCDate()} ${sMonth}`;
}

// ── Hiatos entre shows (secas de agenda) ────────────────────────────────────
// A cadência (`gigCadence`) conta shows por mês e a sazonalidade diz QUAIS meses
// costumam encher. Falta a leitura da CONTINUIDADE: quanto tempo, na prática,
// passa entre um gig e o outro — e qual foi a maior seca já vivida. Para quem
// vive de tocar, um hiato longo é receita e presença de palco perdidas. Este
// relatório olha só os compromissos FIRMES (CONFIRMED + PLAYED) — os que de fato
// ocupam/ocuparam a agenda; propostas em aberto ainda podem cair e não entram
// (mesmo critério `firm` da antecedência, ver D190). Colapsa vários shows no
// mesmo dia (uma seca é sobre dias SEM nenhum gig) e mede o intervalo em dias
// UTC entre dias-de-show consecutivos. A "seca atual" (dias desde o último gig
// já passado até hoje) e a espera pelo próximo gig futuro saem à parte. Pura.

/** Um show visto pela ótica dos hiatos: só precisa de data e status. */
export interface ShowGapShowLike {
  date: Date | string;
  status: string;
}

/** Um hiato entre dois gigs consecutivos. */
export interface ShowGap {
  /** Dia "YYYY-MM-DD" (UTC) do gig que abre o hiato. */
  fromDay: string;
  /** Dia "YYYY-MM-DD" (UTC) do gig que o fecha. */
  toDay: string;
  /** Dias corridos entre os dois dias-de-show (>= 1). */
  days: number;
}

export interface ShowGapsReport {
  /** Hiatos entre gigs consecutivos, do MAIOR para o menor (desempate: mais recente primeiro). */
  gaps: ShowGap[];
  /** Nº de dias-de-show firmes distintos considerados. */
  showDays: number;
  /** O maior hiato já registrado; null com menos de 2 dias-de-show. */
  longest: ShowGap | null;
  /** Espaçamento mediano entre gigs consecutivos (dias); 0 sem amostra. */
  medianGapDays: number;
  /** Espaçamento médio entre gigs consecutivos (dias, arredondado); 0 sem amostra. */
  averageGapDays: number;
  /** Primeiro dia-de-show ("YYYY-MM-DD"); null sem gigs. */
  firstDay: string | null;
  /** Último dia-de-show firme ("YYYY-MM-DD"), passado ou futuro; null sem gigs. */
  lastDay: string | null;
  /**
   * Dias do último gig JÁ PASSADO (<= hoje) até hoje — a seca atual. `null` se
   * não há gig passado (só futuros agendados ou nenhum gig).
   */
  currentGapDays: number | null;
  /**
   * Quantas vezes o espaçamento típico (mediana) a seca atual já representa —
   * ex.: `2` = a seca atual é o dobro do intervalo mediano entre gigs;
   * arredondado a uma casa decimal. Contextualiza `currentGapDays`: distingue
   * uma espera rotineira de uma seca fora do comum. `null` quando não há seca
   * atual (sem gig passado) ou não há espaçamento típico confiável
   * (`showDays < MIN_SHOW_GAP_SAMPLE` ou mediana 0 — a UI já marca esse caso
   * como amostra pequena).
   */
  currentGapVsTypical: number | null;
  /**
   * Quantas vezes a MAIOR seca já registrada a seca atual representa — ex.:
   * `1` = a espera atual igualou o recorde; `> 1` = já o superou (você nunca
   * passou tanto tempo sem tocar); arredondado a uma casa decimal. Dimensão
   * distinta de `currentGapVsTypical`: aquela mede contra o hábito (mediana),
   * esta contra o extremo (o pior hiato já vivido). `null` quando não há seca
   * atual (sem gig passado) ou nenhum hiato registrado (menos de dois dias de
   * show, `longest` nulo).
   */
  currentGapVsLongest: number | null;
  /** Dias de hoje até o próximo gig FUTURO agendado; null se nada à frente. */
  daysUntilNext: number | null;
}

/**
 * Nº mínimo de dias-de-show para o espaçamento típico (mediana/média) ser uma
 * leitura confiável. Com 1–2 dias há no máximo um hiato — a UI mostra o número
 * mas marca a amostra como pequena.
 */
export const MIN_SHOW_GAP_SAMPLE = 3;

/** "YYYY-MM-DD" (UTC) → meia-noite UTC em ms. Pura. */
function dayKeyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Hiatos entre shows firmes (CONFIRMED + PLAYED) do usuário. Colapsa vários
 * gigs no mesmo dia, ordena os dias-de-show e mede o intervalo (em dias UTC)
 * entre cada par consecutivo. Devolve os hiatos ordenados do maior ao menor, o
 * espaçamento típico (mediano/médio), a seca atual (dias desde o último gig já
 * passado) e a espera pelo próximo gig futuro. Pura; `now` injetável.
 */
export function showGaps<T extends ShowGapShowLike>(
  shows: T[],
  options: { now?: Date | string } = {},
): ShowGapsReport {
  const todayMs = dayKeyToUtcMs(dayKey(options.now ?? new Date()));

  // Dias-de-show FIRMES distintos (colapsa vários gigs no mesmo dia).
  const daySet = new Set<string>();
  for (const s of shows) {
    if (!FIRM_LEAD_STATUSES.has(s.status)) continue;
    daySet.add(dayKey(s.date));
  }
  const days = [...daySet].sort((a, b) => a.localeCompare(b));

  const showDays = days.length;
  const firstDay = showDays > 0 ? days[0] : null;
  const lastDay = showDays > 0 ? days[showDays - 1] : null;

  // Hiatos entre dias-de-show consecutivos.
  const gaps: ShowGap[] = [];
  const gapDays: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const fromDay = days[i - 1];
    const toDay = days[i];
    const d = Math.round((dayKeyToUtcMs(toDay) - dayKeyToUtcMs(fromDay)) / DAY_MS);
    gaps.push({ fromDay, toDay, days: d });
    gapDays.push(d);
  }

  // Maior hiato primeiro; empate pelo mais recente (toDay desc).
  gaps.sort((a, b) => b.days - a.days || b.toDay.localeCompare(a.toDay));

  const averageGapDays =
    gapDays.length > 0
      ? Math.round(gapDays.reduce((sum, n) => sum + n, 0) / gapDays.length)
      : 0;

  // Seca atual: dias do último dia-de-show <= hoje até hoje.
  let currentGapDays: number | null = null;
  for (let i = days.length - 1; i >= 0; i--) {
    const ms = dayKeyToUtcMs(days[i]);
    if (ms <= todayMs) {
      currentGapDays = Math.round((todayMs - ms) / DAY_MS);
      break;
    }
  }

  // Espera pelo próximo gig futuro (primeiro dia-de-show > hoje).
  let daysUntilNext: number | null = null;
  for (const key of days) {
    const ms = dayKeyToUtcMs(key);
    if (ms > todayMs) {
      daysUntilNext = Math.round((ms - todayMs) / DAY_MS);
      break;
    }
  }

  const medianGapDays = leadMedian(gapDays);
  const longest = gaps.length > 0 ? gaps[0] : null;

  // Seca atual em múltiplos do espaçamento típico — só quando há seca atual e a
  // mediana é confiável (amostra >= MIN_SHOW_GAP_SAMPLE, mediana > 0), para não
  // dividir por uma mediana frágil de um ou dois hiatos.
  const currentGapVsTypical =
    currentGapDays != null &&
    medianGapDays > 0 &&
    showDays >= MIN_SHOW_GAP_SAMPLE
      ? Math.round((currentGapDays / medianGapDays) * 10) / 10
      : null;

  // Seca atual em múltiplos do RECORDE (maior hiato já registrado) — só quando
  // há seca atual e existe ao menos um hiato passado. Contextualiza a magnitude
  // contra o próprio extremo do músico: ratio >= 1 é uma seca inédita.
  const currentGapVsLongest =
    currentGapDays != null && longest != null && longest.days > 0
      ? Math.round((currentGapDays / longest.days) * 10) / 10
      : null;

  return {
    gaps,
    showDays,
    longest,
    medianGapDays,
    averageGapDays,
    firstDay,
    lastDay,
    currentGapDays,
    currentGapVsTypical,
    currentGapVsLongest,
    daysUntilNext,
  };
}

// ── Nudge de seca atual no Painel ───────────────────────────────────────────
// `showGaps` (D262) já mede a seca atual e a contextualiza pelo hábito
// (`currentGapVsTypical`, D263) e pelo recorde (`currentGapVsLongest`, D264),
// mas só na página `/shows/hiatos`. O Painel não avisava, num relance, "faz
// tempo que você não sobe ao palco e NADA está agendado" — justamente a hora de
// prospectar. Este helper destila `showGaps` num nudge, espelho dos headlines
// irmãos (`bookingLeadTimeHeadline`, `staleProposalsHeadline`…): a regra de
// EXIBIÇÃO vive num helper puro, testável, e o nudge só dispara quando morde.

/**
 * Quantas vezes o espaçamento típico a seca atual precisa alcançar para virar
 * nudge no Painel. Espelha o limiar de APRESENTAÇÃO "fora do comum" da página
 * `/shows/hiatos` (2×): abaixo disso a espera é rotina do próprio hábito e o
 * aviso seria ruído, não alerta.
 */
export const DRY_SPELL_UNUSUAL_RATIO = 2;

/** Manchete de seca atual para o Painel (nudge de "vá prospectar"). */
export interface CurrentDrySpellHeadline {
  /**
   * True quando o nudge deve aparecer: seca fora do comum (`>= unusualRatio` o
   * espaçamento típico) **e** nada firme à frente (`daysUntilNext == null`) —
   * com um gig já agendado a seca está por terminar e prospectar não é a ação.
   */
  show: boolean;
  /** True quando a seca atual já igualou/superou o RECORDE (nunca ficou tanto tempo sem tocar). */
  critical: boolean;
  /** Dias sem tocar — a seca atual (0 quando não há seca a mostrar). */
  days: number;
  /** Quantas vezes o espaçamento típico (mediana) a seca já representa (0 sem leitura). */
  ratio: number;
  /** Espaçamento típico (mediana, dias) — a base da comparação. */
  typicalDays: number;
  /** Quantas vezes o RECORDE a seca representa; `null` sem hiato passado. */
  vsLongest: number | null;
}

/**
 * Decide se o Painel deve alertar que a seca atual está fora do comum e nada
 * está agendado — o eco de `showGaps` no dashboard, espelho de
 * `bookingLeadTimeHeadline` no eixo de continuidade da agenda. Recebe um
 * `showGaps` já computado e não faz I/O. `show` só quando a seca atual é
 * confiável e **fora do comum** (`currentGapVsTypical >= unusualRatio`, o que já
 * exige amostra de mediana confiável — ver D263) **e** não há gig firme à frente
 * (`daysUntilNext == null`); `critical` quando a seca já igualou/superou o
 * recorde (`currentGapVsLongest >= 1`, D264). Fica raro (mesma disciplina de
 * gate dos nudges irmãos). Pura.
 */
export function currentDrySpellHeadline(
  report: ShowGapsReport,
  unusualRatio: number = DRY_SPELL_UNUSUAL_RATIO,
): CurrentDrySpellHeadline {
  const ratio = report.currentGapVsTypical;
  const vsLongest = report.currentGapVsLongest;
  const show =
    report.currentGapDays != null &&
    report.daysUntilNext == null &&
    ratio != null &&
    ratio >= unusualRatio;
  return {
    show,
    critical: show && vsLongest != null && vsLongest >= 1,
    days: report.currentGapDays ?? 0,
    ratio: ratio ?? 0,
    typicalDays: report.medianGapDays,
    vsLongest,
  };
}

// ── Distribuição das secas por faixa ────────────────────────────────────────
// `showGaps` (D262) já dá os MAIORES hiatos (a cauda) e o espaçamento TÍPICO
// (mediana/média, o centro), mas não a FORMA da distribuição: o músico com 30
// gigs por ano e o com uma temporada de bursts seguida de meses parados podem
// ter a mesma mediana e o mesmo recorde — o que os separa é como os hiatos se
// repartem. Este helper reparte os hiatos já computados em faixas canônicas
// (contagem + participação), o mesmo recorte que `feeDistribution`/`bookingLeadTime`
// fazem no eixo de cachê/antecedência. Distingue uma cadência regular ("quase
// tudo até 2 semanas") de um padrão de festa-ou-fome ("metade dos intervalos
// passa de um mês"). Deriva do relatório já pronto — zero I/O, zero regra nova.

/** Uma faixa de duração de hiato (ex.: "1 a 2 semanas") e quantos caem nela. */
export interface GapBucket {
  /** Rótulo legível da faixa. */
  label: string;
  /** Limite inferior em dias (inclusivo). */
  minDays: number;
  /** Limite superior em dias (inclusivo), ou null para "sem teto". */
  maxDays: number | null;
  /** Hiatos cuja duração cai nesta faixa. */
  count: number;
  /** Participação da faixa no total de hiatos (0..1). */
  share: number;
}

/** Repartição dos hiatos entre gigs por faixa de duração. */
export interface GapDistribution {
  /** Faixas na ordem canônica (curta → longa). */
  buckets: GapBucket[];
  /** Total de hiatos repartidos (== `report.gaps.length`). */
  total: number;
  /** A faixa com mais hiatos (a "cara" da agenda); null sem hiatos. */
  busiest: GapBucket | null;
}

/** Faixas de duração de hiato (dias), da mais curta à mais longa. */
const GAP_BUCKET_DEFS: { label: string; minDays: number; maxDays: number | null }[] = [
  { label: "Até 1 semana", minDays: 1, maxDays: 7 },
  { label: "1 a 2 semanas", minDays: 8, maxDays: 14 },
  { label: "2 a 4 semanas", minDays: 15, maxDays: 30 },
  { label: "1 a 2 meses", minDays: 31, maxDays: 60 },
  { label: "Mais de 2 meses", minDays: 61, maxDays: null },
];

/**
 * Reparte os hiatos de um `ShowGapsReport` já computado nas faixas canônicas de
 * duração (contagem + participação por faixa). Cada hiato tem `days >= 1` (dias
 * corridos entre dois dias-de-show distintos), então nenhum escapa das faixas. A
 * `busiest` é a faixa com mais hiatos (desempate: a mais curta, pela ordem
 * canônica) — a "cara" da cadência do músico. Pura; não faz I/O nem muta a
 * entrada.
 */
export function gapDistribution(report: ShowGapsReport): GapDistribution {
  const buckets: GapBucket[] = GAP_BUCKET_DEFS.map((def) => ({
    ...def,
    count: 0,
    share: 0,
  }));

  for (const gap of report.gaps) {
    const bucket = buckets.find(
      (b) => gap.days >= b.minDays && (b.maxDays == null || gap.days <= b.maxDays),
    );
    if (bucket) bucket.count += 1;
  }

  const total = report.gaps.length;
  if (total > 0) {
    for (const b of buckets) b.share = b.count / total;
  }

  // Faixa mais cheia; empate resolvido pela mais curta (ordem canônica), via
  // `>` estrito na varredura. Null quando não há hiato algum.
  let busiest: GapBucket | null = null;
  for (const b of buckets) {
    if (b.count > 0 && (busiest == null || b.count > busiest.count)) busiest = b;
  }

  return { buckets, total, busiest };
}

// ── Antecedência de agendamento (booking lead time) ─────────────────────────
// Quantos dias de antecedência, na prática, você fecha os shows: a diferença
// (em dias UTC) entre quando o show entrou na agenda (`createdAt`) e a data em
// que acontece. Um lead maior = mais previsibilidade de caixa e menos correria
// para preencher a semana; um lead curto sinaliza agenda reativa. Só shows não
// cancelados contam (um cancelado nunca aconteceu). Lançamentos **retroativos**
// (o registro entrou depois da data do show — típico de back-fill de histórico)
// não são "antecedência": são contados à parte e não entram na mediana nem na
// distribuição, para não puxar a leitura para baixo com ruído de importação.
// Pura.

/** Um show visto pela ótica da antecedência de agendamento. */
export interface LeadTimeShowLike {
  status: string;
  date: Date | string;
  createdAt: Date | string;
  fee: number;
}

/** Uma faixa de antecedência (ex.: "1 a 4 semanas") e quantos shows caem nela. */
export interface LeadTimeBucket {
  /** Rótulo legível da faixa. */
  label: string;
  /** Limite inferior em dias (inclusivo). */
  minDays: number;
  /** Limite superior em dias (inclusivo), ou null para "sem teto". */
  maxDays: number | null;
  /** Shows com antecedência nesta faixa. */
  count: number;
  /** Cachê somado dos shows da faixa (centavos). */
  totalFee: number;
  /** Participação da faixa no total de shows com antecedência (0..1). */
  share: number;
}

export interface BookingLeadTime {
  /** Shows com antecedência mensurável (não cancelados, lead >= 0). */
  sample: number;
  /** Antecedência mediana em dias (robusta a outlier); 0 se amostra vazia. */
  medianDays: number;
  /** Antecedência média em dias (arredondada); 0 se amostra vazia. */
  avgDays: number;
  /** Menor antecedência observada (dias); null se amostra vazia. */
  shortestDays: number | null;
  /** Maior antecedência observada (dias); null se amostra vazia. */
  longestDays: number | null;
  /** Distribuição por faixa, na ordem canônica (curta → longa). */
  buckets: LeadTimeBucket[];
  /** Lançamentos retroativos ignorados (createdAt depois da data do show). */
  retroactiveCount: number;
  /** True quando a amostra alcança `MIN_LEAD_TIME_SAMPLE` (mediana confiável). */
  reliable: boolean;
}

/**
 * Mínimo de shows para a antecedência mediana ser uma leitura confiável. Com
 * 1–2 shows a mediana vira o próprio dado bruto e não representa um "hábito" de
 * agendamento — a UI mostra o número, mas marca a amostra como pequena.
 */
export const MIN_LEAD_TIME_SAMPLE = 3;

/**
 * Escopo da amostra de antecedência (ver D190):
 * - `all`: todos os shows não cancelados (leads + bookings) — a leitura padrão,
 *   "com quanta antecedência algo entra na agenda", incluindo propostas que
 *   ainda podem cair;
 * - `firm`: só compromissos **firmes** (CONFIRMED + PLAYED) — "com quanta
 *   antecedência um show que de fato aconteceu/vai acontecer foi fechado",
 *   sem o ruído das propostas em aberto (adiado na D185(a)).
 */
export type BookingLeadTimeScope = "all" | "firm";

/** Status que contam como compromisso firme no escopo `firm`. */
const FIRM_LEAD_STATUSES = new Set(["CONFIRMED", "PLAYED"]);

/**
 * Decide se um show entra na amostra de antecedência conforme o escopo. Em ambos
 * os escopos o cancelado fica de fora (um cancelado nunca aconteceu); no escopo
 * `firm` também ficam de fora os propostos (ainda não são um booking de fato).
 */
function leadShowInScope(status: string, scope: BookingLeadTimeScope): boolean {
  if (scope === "firm") return FIRM_LEAD_STATUSES.has(status);
  return status !== "CANCELLED";
}

/**
 * Normaliza o parâmetro `?escopo=` da tela de antecedência num
 * `BookingLeadTimeScope`. Só `firm` liga o recorte de compromissos firmes;
 * qualquer outro valor (ausente, vazio, desconhecido) cai no padrão `all`.
 * Pura.
 */
export function parseLeadTimeScope(
  raw: string | string[] | undefined,
): BookingLeadTimeScope {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim().toLowerCase() === "firm" ? "firm" : "all";
}

/** Faixas de antecedência (dias), da mais curta à mais longa. */
const LEAD_TIME_BUCKET_DEFS: { label: string; minDays: number; maxDays: number | null }[] = [
  { label: "Até 1 semana", minDays: 0, maxDays: 7 },
  { label: "1 a 4 semanas", minDays: 8, maxDays: 30 },
  { label: "1 a 3 meses", minDays: 31, maxDays: 90 },
  { label: "Mais de 3 meses", minDays: 91, maxDays: null },
];

/** Meia-noite UTC (ms) do dia da data — diferença por dia inteiro, sem fuso. */
function leadUtcMidnight(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Mediana de uma lista de inteiros; vazia → 0. Não muta a entrada. */
function leadMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Antecedência de agendamento sobre os shows do usuário. Para cada show no
 * escopo (ver `leadShowInScope`/`BookingLeadTimeScope`) calcula
 * `leadDays = dia(date) - dia(createdAt)` (dias UTC inteiros): >= 0 entra na
 * amostra; < 0 é um lançamento retroativo (contado à parte). A mediana e as
 * médias são sobre a amostra; a distribuição reparte a amostra nas faixas
 * canônicas (com o cachê somado de cada faixa, para pesar em receita). O
 * `scope` padrão (`all`) mantém o comportamento histórico (todos os não
 * cancelados); `firm` restringe a CONFIRMED+PLAYED. Pura.
 */
export function bookingLeadTime<T extends LeadTimeShowLike>(
  shows: T[],
  scope: BookingLeadTimeScope = "all",
): BookingLeadTime {
  const leads: number[] = [];
  let retroactiveCount = 0;

  for (const s of shows) {
    if (!leadShowInScope(s.status, scope)) continue;
    const leadDays = Math.round(
      (leadUtcMidnight(s.date) - leadUtcMidnight(s.createdAt)) / DAY_MS,
    );
    if (leadDays < 0) {
      retroactiveCount += 1;
      continue;
    }
    leads.push(leadDays);
  }

  const buckets: LeadTimeBucket[] = LEAD_TIME_BUCKET_DEFS.map((def) => ({
    ...def,
    count: 0,
    totalFee: 0,
    share: 0,
  }));

  // Segunda passada para o cachê por faixa (precisa do fee junto do lead).
  for (const s of shows) {
    if (!leadShowInScope(s.status, scope)) continue;
    const leadDays = Math.round(
      (leadUtcMidnight(s.date) - leadUtcMidnight(s.createdAt)) / DAY_MS,
    );
    if (leadDays < 0) continue;
    const bucket = buckets.find(
      (b) => leadDays >= b.minDays && (b.maxDays == null || leadDays <= b.maxDays),
    );
    if (bucket) {
      bucket.count += 1;
      bucket.totalFee += s.fee;
    }
  }

  const sample = leads.length;
  for (const b of buckets) {
    b.share = sample > 0 ? b.count / sample : 0;
  }

  return {
    sample,
    medianDays: leadMedian(leads),
    avgDays: sample > 0 ? Math.round(leads.reduce((a, b) => a + b, 0) / sample) : 0,
    shortestDays: sample > 0 ? Math.min(...leads) : null,
    longestDays: sample > 0 ? Math.max(...leads) : null,
    buckets,
    retroactiveCount,
    reliable: sample >= MIN_LEAD_TIME_SAMPLE,
  };
}

/**
 * Anos (UTC, decrescente) dos shows que entram na leitura de antecedência —
 * para montar o seletor de período de `/shows/antecedencia`. Considera só os
 * shows com antecedência **mensurável** (não cancelados e com `leadDays >= 0`,
 * a mesma amostra de `bookingLeadTime`): um ano que tenha apenas cancelados ou
 * lançamentos retroativos não mede antecedência e não deve virar uma opção
 * vazia no seletor (mesmo cuidado de `cancelledShowYears`, que se ancora no
 * sinal da tela e não nos shows ativos). O ano é o da `date` do show — o mesmo
 * eixo de `filterShowsByYear`, que recorta a lista antes de `bookingLeadTime`.
 * O `scope` é o mesmo de `bookingLeadTime`: no escopo `firm` os anos vêm só dos
 * compromissos firmes, para o seletor não oferecer um ano que renderiza vazio.
 */
export function bookingLeadTimeYears<T extends LeadTimeShowLike>(
  shows: T[],
  scope: BookingLeadTimeScope = "all",
): number[] {
  const years = new Set<number>();
  for (const s of shows) {
    if (!leadShowInScope(s.status, scope)) continue;
    const leadDays = Math.round(
      (leadUtcMidnight(s.date) - leadUtcMidnight(s.createdAt)) / DAY_MS,
    );
    if (leadDays < 0) continue;
    const d = typeof s.date === "string" ? new Date(s.date) : s.date;
    years.add(d.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Limiar (em dias) abaixo do qual a variação da antecedência **mediana** entre
 * dois períodos é ruído ("stable"). Uma semana — grande o bastante para não
 * oscilar a cada show isolado, pequeno o bastante para captar uma mudança real
 * de hábito de agendamento (fechar a agenda com mais folga × mais em cima da
 * hora). Espelha `CANCELLATION_TREND_EPSILON`/`GEO_TREND_EPSILON` no eixo de
 * antecedência.
 */
export const LEAD_TIME_TREND_EPSILON = 7;

export interface BookingLeadTimeComparison {
  /** Antecedência do período atual (tipicamente o ano selecionado). */
  current: BookingLeadTime;
  /** Antecedência do período de comparação (tipicamente o ano anterior). */
  previous: BookingLeadTime;
  /**
   * Variação da antecedência mediana (atual − anterior, em dias). Positivo =
   * agendando com **mais** folga agora (melhora); negativo = mais em cima da
   * hora (piora). Ao contrário do cancelamento, aqui **subir** é a melhora.
   */
  medianDaysDelta: number;
  /** Variação da antecedência média (atual − anterior, em dias). */
  avgDaysDelta: number;
  /**
   * Direção do hábito de agendamento entre os dois períodos, decidida pela
   * variação da **mediana** contra `LEAD_TIME_TREND_EPSILON`:
   * - "improved": mediana subiu além do limiar (agendando com mais antecedência);
   * - "worsened": mediana caiu além do limiar (agendando mais em cima da hora);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **antecedência de agendamento** entre dois períodos (atual ×
 * anterior), espelhando o comparativo ano a ano de `compareCancellationRate`/
 * `compareGeoConcentration` (D181/D120) no eixo de runway. Pura, sem I/O: recebe
 * duas `bookingLeadTime` já computadas (cada uma sobre os shows do seu período) e
 * devolve a variação da mediana e da média, além de um veredito de tendência.
 * Ao contrário da concentração/cancelamento, aqui **subir** a mediana é a
 * melhora (mais folga para fechar caixa e preencher a agenda). O chamador decide
 * quando exibir (tipicamente só com um ano específico e ambos os períodos tendo
 * amostra mensurável — caso contrário a comparação de medianas seria enganosa).
 */
export function compareBookingLeadTime(
  current: BookingLeadTime,
  previous: BookingLeadTime,
): BookingLeadTimeComparison {
  const medianDaysDelta = current.medianDays - previous.medianDays;
  return {
    current,
    previous,
    medianDaysDelta,
    avgDaysDelta: current.avgDays - previous.avgDays,
    trend:
      medianDaysDelta >= LEAD_TIME_TREND_EPSILON
        ? "improved"
        : medianDaysDelta <= -LEAD_TIME_TREND_EPSILON
          ? "worsened"
          : "stable",
  };
}

export interface BookingLeadTimeScopeComparison {
  /** Antecedência do escopo amplo (todos os não cancelados). */
  all: BookingLeadTime;
  /** Antecedência do escopo firme (só CONFIRMED + PLAYED). */
  firm: BookingLeadTime;
  /**
   * Variação da antecedência mediana (firme − todos, em dias). Positivo = os
   * compromissos firmes entram com **mais** folga que o conjunto (as propostas
   * em aberto puxam a mediana geral para baixo); negativo = os shows que de
   * fato fecham entram **mais em cima da hora** que o conjunto (as propostas
   * distantes ainda não confirmadas inflam a mediana geral).
   */
  medianDaysDelta: number;
  /** Variação da antecedência média (firme − todos, em dias). */
  avgDaysDelta: number;
  /**
   * Shows com antecedência mensurável que são propostas em aberto (a diferença
   * de amostra entre os dois escopos: `all.sample − firm.sample`). Zero quando
   * não há proposta em aberto e os dois escopos coincidem (nada a comparar).
   */
  openProposalCount: number;
  /**
   * Como o recorte firme muda a leitura, decidido pela variação da **mediana**
   * contra `LEAD_TIME_TREND_EPSILON` (o mesmo limiar do comparativo ano a ano):
   * - "firm-more-lead": os firmes entram com mais folga (mediana firme sobe além do limiar);
   * - "firm-less-lead": os firmes entram mais em cima da hora (mediana firme cai além do limiar);
   * - "similar": a mediana muda pouco ao restringir aos firmes (as propostas não distorcem a leitura).
   */
  gap: "firm-more-lead" | "firm-less-lead" | "similar";
}

/**
 * Compara a antecedência de agendamento entre os dois **escopos** de amostra
 * (todos os não cancelados × só compromissos firmes) sobre o **mesmo** conjunto
 * de shows — o eco lado a lado do `ScopePicker` (D190), para o músico ver o
 * quanto as propostas em aberto distorcem a leitura sem alternar a tela. Pura,
 * sem I/O: recebe duas `bookingLeadTime` já computadas (o escopo amplo e o
 * firme) e devolve a variação da mediana/média (firme − todos), quantas
 * propostas em aberto separam os dois escopos e um veredito de gap.
 *
 * Ao contrário do comparativo ano a ano (`compareBookingLeadTime`, um eixo de
 * tempo), aqui não há "melhora": subir a mediana ao restringir aos firmes só
 * revela que as propostas em aberto é que estavam puxando a leitura geral para
 * baixo (interpretação positiva), e cair revela que os shows que fecham vêm em
 * cima da hora enquanto as propostas distantes inflam a média (um alerta de
 * runway). O chamador decide quando exibir (tipicamente só quando há proposta
 * em aberto separando os escopos e o escopo firme tem amostra mensurável — caso
 * contrário os dois escopos coincidem e não há gap a mostrar).
 */
export function compareBookingLeadTimeScopes(
  all: BookingLeadTime,
  firm: BookingLeadTime,
): BookingLeadTimeScopeComparison {
  const medianDaysDelta = firm.medianDays - all.medianDays;
  return {
    all,
    firm,
    medianDaysDelta,
    avgDaysDelta: firm.avgDays - all.avgDays,
    openProposalCount: all.sample - firm.sample,
    gap:
      medianDaysDelta >= LEAD_TIME_TREND_EPSILON
        ? "firm-more-lead"
        : medianDaysDelta <= -LEAD_TIME_TREND_EPSILON
          ? "firm-less-lead"
          : "similar",
  };
}

// ── Antecedência de agendamento por contratante ───────────────────────────────
// Enquanto `bookingLeadTime` (D190) mede com quanta antecedência os shows entram
// na agenda no AGREGADO, esta quebra a mesma leitura POR contratante — quem te
// fecha com folga (dá runway para prospectar/precificar) × quem só chama em cima
// da hora (agenda reativa, correria). Espelha `paymentLagByContact` (D194) no eixo
// da antecedência: reaproveita `bookingLeadTime` por grupo (mesma regra de escopo,
// mediana e faixas — sem duplicar a lógica), atribuindo cada show ao seu
// contratante via um `getBooker` (tipicamente `pickPayerContact`, o mesmo eixo de
// "quem responde pelo show" dos recebíveis). Pura e determinística.

/** Um show na leitura de antecedência por contratante, com o lead já resolvido. */
export interface LeadTimeShowReading<S> {
  show: S;
  /** Antecedência do show em dias (>= 0; retroativos não entram aqui). */
  leadDays: number;
}

/** Linha da antecedência por contratante: o contato + a sua leitura de antecedência. */
export interface ContactBookingLeadTimeRow<
  C,
  S extends LeadTimeShowLike = LeadTimeShowLike,
> {
  /** Contratante do grupo; `null` agrega os shows sem contato vinculado. */
  contact: C | null;
  /** Leitura de antecedência restrita aos shows deste contratante (reusa `bookingLeadTime`). */
  leadTime: BookingLeadTime;
  /** Cachê somado dos shows com antecedência mensurável do contratante (centavos). */
  totalFee: number;
  /** Participação do contratante na amostra mensurável total (0..1). */
  share: number;
  /** Shows mensuráveis do contratante, do maior lead ao menor (empate pela data desc). */
  shows: LeadTimeShowReading<S>[];
}

/** Antecedência de agendamento agregada por contratante. */
export interface BookingLeadTimeByContact<
  C,
  S extends LeadTimeShowLike = LeadTimeShowLike,
> {
  /**
   * Grupos por contratante, do MENOR lead mediano ao maior (o mais "em cima da
   * hora" primeiro — a ponta que dói); o grupo `null` (sem contratante) vai
   * sempre por último.
   */
  rows: ContactBookingLeadTimeRow<C, S>[];
  /** Nº de contratantes identificados (exclui o grupo `null`). */
  contactCount: number;
  /** Shows com antecedência mensurável somando todos os grupos. */
  sample: number;
  /** Leitura da carteira inteira (o mesmo número da tela-mãe `/shows/antecedencia`). */
  overall: BookingLeadTime;
  /**
   * Contratante que te fecha com MAIS antecedência (maior lead mediano), entre os
   * grupos identificados com amostra confiável (`reliable`); `null` se nenhum
   * alcança o piso. Restringe à amostra confiável para o destaque não celebrar
   * um único show de sorte.
   */
  mostLeadTime: ContactBookingLeadTimeRow<C, S> | null;
  /** Contratante que te fecha em cima da hora (menor lead mediano), mesmo critério de confiança. */
  leastLeadTime: ContactBookingLeadTimeRow<C, S> | null;
}

/** Antecedência (dias UTC inteiros) de um show; negativo = lançamento retroativo. */
function leadDaysOf(s: LeadTimeShowLike): number {
  return Math.round(
    (leadUtcMidnight(s.date) - leadUtcMidnight(s.createdAt)) / DAY_MS,
  );
}

/**
 * Antecedência de agendamento por contratante. Para cada contato (via
 * `getBooker`; `null` cai no grupo "sem contratante") monta a sublista dos seus
 * shows e roda `bookingLeadTime` sobre ela — herdando escopo, mediana, faixas e
 * confiabilidade sem reimplementar a regra. `overall` roda `bookingLeadTime` sobre
 * a lista inteira (o número da tela-mãe). Os grupos saem ordenados do MENOR lead
 * mediano ao maior (o mais "em cima da hora" primeiro), com o grupo `null` por
 * último; dentro de cada grupo os shows vêm do maior lead ao menor. Os destaques
 * `mostLeadTime`/`leastLeadTime` só consideram grupos identificados e confiáveis
 * (`reliable`), para não elevar amostras de 1–2 shows. Pura.
 */
export function bookingLeadTimeByContact<
  C extends { id: string },
  S extends LeadTimeShowLike,
>(
  shows: S[],
  getBooker: (show: S) => C | null,
  scope: BookingLeadTimeScope = "all",
): BookingLeadTimeByContact<C, S> {
  interface Group {
    contact: C | null;
    shows: S[];
  }
  const NO_CONTACT = " "; // chave reservada para o grupo sem contratante
  const groups = new Map<string, Group>();

  for (const s of shows) {
    const contact = getBooker(s);
    const key = contact ? contact.id : NO_CONTACT;
    const g = groups.get(key) ?? { contact, shows: [] };
    g.shows.push(s);
    groups.set(key, g);
  }

  const rows: ContactBookingLeadTimeRow<C, S>[] = [];
  for (const g of groups.values()) {
    const leadTime = bookingLeadTime(g.shows, scope);
    // Readings dos shows mensuráveis (no escopo, lead >= 0), do maior lead ao menor.
    const readings: LeadTimeShowReading<S>[] = g.shows
      .filter((s) => leadShowInScope(s.status, scope) && leadDaysOf(s) >= 0)
      .map((s) => ({ show: s, leadDays: leadDaysOf(s) }))
      .sort(
        (a, b) =>
          b.leadDays - a.leadDays ||
          leadUtcMidnight(b.show.date) - leadUtcMidnight(a.show.date),
      );
    rows.push({
      contact: g.contact,
      leadTime,
      totalFee: readings.reduce((sum, r) => sum + r.show.fee, 0),
      share: 0, // preenchido depois, quando a amostra total é conhecida
      shows: readings,
    });
  }

  const sample = rows.reduce((sum, r) => sum + r.leadTime.sample, 0);
  for (const r of rows) {
    r.share = sample > 0 ? r.leadTime.sample / sample : 0;
  }

  // Menor lead mediano → maior (o mais em cima da hora primeiro); grupos sem
  // amostra mensurável ao fim; o grupo sem contratante sempre por último.
  rows.sort((a, b) => {
    if (!a.contact !== !b.contact) return a.contact ? -1 : 1;
    if ((a.leadTime.sample === 0) !== (b.leadTime.sample === 0)) {
      return a.leadTime.sample === 0 ? 1 : -1;
    }
    return (
      a.leadTime.medianDays - b.leadTime.medianDays ||
      b.leadTime.sample - a.leadTime.sample ||
      (a.contact?.id ?? "").localeCompare(b.contact?.id ?? "")
    );
  });

  const reliableIdentified = rows.filter((r) => r.contact && r.leadTime.reliable);
  let mostLeadTime: ContactBookingLeadTimeRow<C, S> | null = null;
  let leastLeadTime: ContactBookingLeadTimeRow<C, S> | null = null;
  for (const r of reliableIdentified) {
    if (!mostLeadTime || r.leadTime.medianDays > mostLeadTime.leadTime.medianDays) {
      mostLeadTime = r;
    }
    if (!leastLeadTime || r.leadTime.medianDays < leastLeadTime.leadTime.medianDays) {
      leastLeadTime = r;
    }
  }

  return {
    rows,
    contactCount: rows.filter((r) => r.contact).length,
    sample,
    overall: bookingLeadTime(shows, scope),
    mostLeadTime,
    leastLeadTime,
  };
}

// ── Comparativo ano a ano da antecedência por contratante ─────────────────────
// Espelha `comparePaymentLagByContact`/`indexContactPaymentLagChanges` (D194/D195)
// no eixo da antecedência: casa os contratantes entre dois períodos (o ano
// selecionado × o anterior) para revelar quem passou a te fechar com MAIS folga /
// quem começou a chamar em cima da hora, além de quem entrou e quem sumiu da
// carteira. Ao contrário do prazo de recebimento (descer o prazo é a melhora),
// aqui **subir** a antecedência é a melhora (mais runway para prospectar/precificar).
// O veredito ancora na antecedência **MEDIANA** — o mesmo eixo por que a página
// ordena e destaca (`mostLeadTime`/`leastLeadTime`) e por que o comparativo
// agregado da tela-mãe (`compareBookingLeadTime`) decide a tendência, reusando o
// mesmo `LEAD_TIME_TREND_EPSILON` (=7 dias). Puro e determinístico.

/**
 * Variação da antecedência de UM contratante entre dois períodos (o ano
 * selecionado × o anterior). Espelha `ContactPaymentLagChange` no eixo da
 * antecedência. `medianDaysDelta` positivo = o contratante passou a te fechar
 * com **mais** folga (melhora); negativo = mais em cima da hora (piora).
 */
export interface ContactBookingLeadTimeChange<
  C,
  S extends LeadTimeShowLike = LeadTimeShowLike,
> {
  /** Contratante comparado — sempre identificado (o grupo "sem contratante" fica de fora). */
  contact: C;
  /** Linha do contratante no período atual. */
  current: ContactBookingLeadTimeRow<C, S>;
  /** Linha do contratante no período anterior. */
  previous: ContactBookingLeadTimeRow<C, S>;
  /**
   * Variação da antecedência MEDIANA (atual − anterior, em dias). Positivo =
   * fechando com mais folga agora; negativo = mais em cima da hora. Ancora o
   * veredito (o mesmo eixo por que a página ordena/destaca).
   */
  medianDaysDelta: number;
  /** Variação da antecedência MÉDIA (atual − anterior, em dias) — só informativo. */
  avgDaysDelta: number;
  /**
   * Direção do hábito de agendamento do contratante, pela variação da **mediana**
   * contra `LEAD_TIME_TREND_EPSILON`:
   * - "improved": a mediana subiu além do limiar (fecha com mais folga);
   * - "worsened": caiu além do limiar (fecha mais em cima da hora);
   * - "stable": dentro do limiar (ruído).
   */
  trend: "improved" | "worsened" | "stable";
}

export interface BookingLeadTimeByContactComparison<
  C,
  S extends LeadTimeShowLike = LeadTimeShowLike,
> {
  /**
   * Contratantes presentes nos DOIS períodos, com a variação da antecedência.
   * Ordenados da maior piora à maior melhora (quem passou a fechar mais em cima
   * da hora primeiro), para o "mover" de cima do card ser o que mais merece atenção.
   */
  changes: ContactBookingLeadTimeChange<C, S>[];
  /** Quem mais ganhou folga (variação de mediana mais positiva entre os "improved"). */
  biggestImprovement: ContactBookingLeadTimeChange<C, S> | null;
  /** Quem mais perdeu folga (variação de mediana mais negativa entre os "worsened"). */
  biggestWorsening: ContactBookingLeadTimeChange<C, S> | null;
  /** Contratantes que só fecharam show mensurável no período atual (novos na carteira). */
  newContacts: ContactBookingLeadTimeRow<C, S>[];
  /** Contratantes que fecharam no anterior mas não no atual (sumiram da carteira). */
  droppedContacts: ContactBookingLeadTimeRow<C, S>[];
}

/**
 * Compara a **antecedência por contratante** entre dois períodos (atual ×
 * anterior), casando os contratantes por `contact.id`. Para cada um presente nos
 * dois períodos devolve a variação da antecedência (quem passou a fechar com mais
 * folga / mais em cima da hora); os que aparecem só num período viram
 * `newContacts`/`droppedContacts`.
 *
 * Pura, sem I/O: recebe dois `bookingLeadTimeByContact` já computados (cada um
 * sobre os shows do seu período). Ao contrário do prazo de recebimento (descer é
 * melhora), aqui **subir** a antecedência é a melhora — mais runway de agenda,
 * como no comparativo agregado da tela-mãe (`compareBookingLeadTime`/D188).
 *
 * O veredito por contratante ancora na **mediana** (`leadTime.medianDays`), o
 * mesmo eixo por que a página ordena e destaca e por que o comparativo agregado
 * decide a tendência; reusa `LEAD_TIME_TREND_EPSILON` (=7 dias) como limiar. Por
 * contratante a amostra costuma ser pequena, então o chamador tipicamente marca os
 * destaques abaixo de `MIN_LEAD_TIME_SAMPLE` como amostra fina (como faz o irmão
 * `comparePaymentLagByContact`). O chamador decide quando exibir (tipicamente só
 * com um ano específico e ambos os períodos com amostra mensurável).
 */
export function compareBookingLeadTimeByContact<
  C extends { id: string },
  S extends LeadTimeShowLike,
>(
  current: BookingLeadTimeByContact<C, S>,
  previous: BookingLeadTimeByContact<C, S>,
): BookingLeadTimeByContactComparison<C, S> {
  const prevById = new Map<string, ContactBookingLeadTimeRow<C, S>>();
  for (const r of previous.rows) {
    if (r.contact) prevById.set(r.contact.id, r);
  }

  const currentIds = new Set<string>();
  const changes: ContactBookingLeadTimeChange<C, S>[] = [];
  const newContacts: ContactBookingLeadTimeRow<C, S>[] = [];

  for (const cur of current.rows) {
    if (!cur.contact) continue; // grupo "sem contratante" não é comparável
    currentIds.add(cur.contact.id);
    const prev = prevById.get(cur.contact.id);
    if (!prev) {
      newContacts.push(cur);
      continue;
    }
    const medianDaysDelta = cur.leadTime.medianDays - prev.leadTime.medianDays;
    changes.push({
      contact: cur.contact,
      current: cur,
      previous: prev,
      medianDaysDelta,
      avgDaysDelta: cur.leadTime.avgDays - prev.leadTime.avgDays,
      trend:
        medianDaysDelta >= LEAD_TIME_TREND_EPSILON
          ? "improved"
          : medianDaysDelta <= -LEAD_TIME_TREND_EPSILON
            ? "worsened"
            : "stable",
    });
  }

  const droppedContacts = previous.rows.filter(
    (r): r is ContactBookingLeadTimeRow<C, S> & { contact: C } =>
      !!r.contact && !currentIds.has(r.contact.id),
  );

  // Maior piora no topo (perda de folga primeiro): variação de mediana asc;
  // empate estável pelo id.
  changes.sort(
    (a, b) =>
      a.medianDaysDelta - b.medianDaysDelta ||
      a.contact.id.localeCompare(b.contact.id),
  );

  let biggestImprovement: ContactBookingLeadTimeChange<C, S> | null = null;
  let biggestWorsening: ContactBookingLeadTimeChange<C, S> | null = null;
  for (const c of changes) {
    if (
      c.trend === "improved" &&
      (!biggestImprovement || c.medianDaysDelta > biggestImprovement.medianDaysDelta)
    ) {
      biggestImprovement = c;
    }
    if (
      c.trend === "worsened" &&
      (!biggestWorsening || c.medianDaysDelta < biggestWorsening.medianDaysDelta)
    ) {
      biggestWorsening = c;
    }
  }

  return { changes, biggestImprovement, biggestWorsening, newContacts, droppedContacts };
}

/**
 * Situação de uma linha da tabela por contratante (período atual) frente ao
 * período anterior, para a coluna "vs. {ano-1}" (espelha
 * `ContactPaymentLagRowStatus`/D195):
 * - "changed": o contratante existia nos dois períodos — traz a variação da antecedência;
 * - "new": só apareceu no período atual (começou a fechar agora);
 * - "none": o grupo "sem contratante" (não é comparável).
 */
export type ContactBookingLeadTimeRowStatus<
  C,
  S extends LeadTimeShowLike = LeadTimeShowLike,
> =
  | { kind: "changed"; change: ContactBookingLeadTimeChange<C, S> }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da tabela por contratante (período atual) com sua situação no
 * comparativo `compareBookingLeadTimeByContact`, indexando por `contact.id` para o
 * consumidor resolver a coluna "vs. {ano-1}" em O(1) — sem repetir a varredura na
 * apresentação. Puro: recebe o comparativo já computado e devolve uma função de
 * lookup. Um contratante presente nos dois períodos vira "changed"; um que só está
 * no atual (em `newContacts`) vira "new"; qualquer outro id (incluindo o grupo sem
 * contratante) vira "none". Espelha `indexContactPaymentLagChanges`.
 */
export function indexContactBookingLeadTimeChanges<
  C extends { id: string },
  S extends LeadTimeShowLike,
>(
  comparison: BookingLeadTimeByContactComparison<C, S>,
): (contactId: string | null | undefined) => ContactBookingLeadTimeRowStatus<C, S> {
  const changedById = new Map<string, ContactBookingLeadTimeChange<C, S>>();
  for (const c of comparison.changes) changedById.set(c.contact.id, c);
  const newIds = new Set<string>();
  for (const r of comparison.newContacts) if (r.contact) newIds.add(r.contact.id);

  return (contactId) => {
    if (!contactId) return { kind: "none" };
    const change = changedById.get(contactId);
    if (change) return { kind: "changed", change };
    if (newIds.has(contactId)) return { kind: "new" };
    return { kind: "none" };
  };
}

/**
 * Antecedência mediana (em dias) a partir da qual a agenda é considerada
 * apertada — "fecha shows em cima da hora". Duas semanas de folga é o piso
 * confortável para prospectar/precificar sem correria.
 */
export const LEAD_TIME_SHORT_DAYS = 14;

/**
 * Antecedência mediana (em dias) que dispara o alerta crítico — uma semana ou
 * menos entre fechar e tocar deixa quase nenhum runway de agenda.
 */
export const LEAD_TIME_CRITICAL_DAYS = 7;

/** Manchete de antecedência para o Painel (nudge de runway de agenda). */
export interface BookingLeadTimeHeadline {
  /** True quando o nudge deve aparecer (amostra confiável + mediana curta). */
  show: boolean;
  /** True quando a mediana entra na faixa crítica (≤ `criticalDays`). */
  critical: boolean;
  /** Antecedência mediana em dias (a métrica que decide o nudge). */
  medianDays: number;
  /** Antecedência média em dias (informativa no banner). */
  avgDays: number;
  /** Shows com antecedência mensurável na leitura. */
  sample: number;
}

/**
 * Decide se o Painel deve alertar que os shows vêm entrando na agenda em cima
 * da hora — o eco de `bookingLeadTime` no dashboard, espelho de
 * `paymentLagHeadline` (D70) no eixo de runway. Recebe uma `bookingLeadTime` já
 * computada e não faz I/O. `show` só quando a amostra é **confiável**
 * (`reliable` → mediana representa um hábito, não 1–2 shows) **e** a mediana cai
 * a `shortDays` ou menos; `critical` quando desce a `criticalDays` ou menos.
 *
 * Ao contrário do card ano-a-ano (`compareBookingLeadTime`, onde subir a mediana
 * é a melhora), aqui o alarme é a ponta **baixa**: uma antecedência mediana
 * curta significa pouco fôlego para prospectar, precificar e encaixar a agenda —
 * a mesma tese de planejar com folga que sustenta os nudges de fins de semana
 * livres e de sazonalidade. Só dispara na faixa apertada, então fica raro
 * (mesma disciplina de gate dos nudges irmãos). Pura.
 */
export function bookingLeadTimeHeadline(
  report: BookingLeadTime,
  shortDays: number = LEAD_TIME_SHORT_DAYS,
  criticalDays: number = LEAD_TIME_CRITICAL_DAYS,
): BookingLeadTimeHeadline {
  const show = report.reliable && report.medianDays <= shortDays;
  return {
    show,
    critical: show && report.medianDays <= criticalDays,
    medianDays: report.medianDays,
    avgDays: report.avgDays,
    sample: report.sample,
  };
}

// ── Manchete de antecedência POR CONTRATANTE para o Painel (quem passou a fechar em cima da hora?) ──
// Enquanto `bookingLeadTimeHeadline` (D185/D189) alerta que a agenda INTEIRA vem
// entrando em cima da hora (mediana curta em ABSOLUTO), este destila QUAL
// contratante recorrente passou a te fechar com materialmente MENOS antecedência de
// um ano para o outro — o eco de `compareBookingLeadTimeByContact` (D196) no
// dashboard, irmão no eixo da antecedência de `contactConversionDropHeadline`
// (D248, eixo da conversão). É mais acionável (diz DE QUEM renegociar prazo/pedir
// reserva antecipada) e pega o caso que o nudge absoluto perde: a carteira segue com
// folga na média, mas um parceiro específico começou a chamar em cima da hora.
// Reusa o mesmo gate de confiança dos destaques irmãos (amostra ≥ `MIN_LEAD_TIME_SAMPLE`
// nas DUAS coortes) e um piso de queda material (≥ `LEAD_TIME_DROP_DAYS`, o dobro do
// `LEAD_TIME_TREND_EPSILON` do veredito do card — o Painel só alerta com uma perda de
// folga de fato relevante, não qualquer variação). Só a ponta de PIORA (perda de
// folga) vira nudge; ganhar antecedência é boa notícia. Pura, sem I/O.

/**
 * Queda mínima da antecedência mediana (em dias) para o nudge por contratante
 * disparar. Duas semanas — o dobro de `LEAD_TIME_TREND_EPSILON` (=7, o limiar do
 * veredito do card): espelha `CONVERSION_DROP_POINTS` (2× o epsilon do card) para
 * o Painel só alertar com uma perda de folga material, não qualquer oscilação.
 */
export const LEAD_TIME_DROP_DAYS = 14;
/** Queda da antecedência mediana (em dias) que escala o nudge para crítico (um mês de folga perdida). */
export const LEAD_TIME_DROP_CRITICAL_DAYS = 30;

/** Manchete de antecedência por contratante para o Painel (nudge de perda de folga ano a ano). */
export interface ContactBookingLeadTimeDropHeadline<C> {
  /** True quando o nudge deve aparecer (um contratante com queda confiável e material). */
  show: boolean;
  /** True quando a queda desse contratante entra na faixa crítica (≥ `criticalDays`). */
  critical: boolean;
  /** O contratante que mais perdeu folga (dentre os que passam no gate), ou `null`. */
  contact: C | null;
  /** Queda da antecedência mediana em dias (anterior − atual); ≥ 0 quando `show`. */
  dropDays: number;
  /** Antecedência mediana do contratante na coorte atual (dias). */
  currentMedianDays: number;
  /** Antecedência mediana do contratante na coorte anterior (dias). */
  previousMedianDays: number;
  /** Shows mensuráveis do contratante na coorte atual (a amostra da mediana). */
  sample: number;
  /**
   * Quantos OUTROS contratantes também passaram no gate de queda material e
   * confiável (para o banner: "+N esfriaram"). 0 quando só um qualifica.
   */
  others: number;
}

/**
 * Decide se o Painel deve alertar que UM contratante específico passou a te fechar
 * shows com materialmente menos antecedência de um ano para o outro — o eco de
 * `compareBookingLeadTimeByContact` (D196) no dashboard, irmão por-contratante de
 * `bookingLeadTimeHeadline` no eixo relativo e espelho de
 * `contactConversionDropHeadline` (D248) no eixo da antecedência. Recebe um
 * comparativo já computado (dois `bookingLeadTimeByContact`, cada um sobre a coorte
 * do seu ano) e não faz I/O.
 *
 * Varre os `changes` (já ordenados da maior piora à maior melhora) e escolhe o
 * contratante de MAIOR perda de folga que ainda tenha amostra confiável — ao menos
 * `minSample` shows mensuráveis em CADA coorte, para a mediana não se apoiar em 1–2
 * shows — e queda de ao menos `dropDays`. `critical` quando essa queda chega a
 * `criticalDays` ou mais; `others` conta quantos outros contratantes também
 * passariam no mesmo gate (o banner os resume). Como os nudges irmãos, só a ponta de
 * PIORA vira alerta e o gate o mantém raro. Pura.
 */
export function contactBookingLeadTimeDropHeadline<C extends { id: string; name: string }>(
  comparison: BookingLeadTimeByContactComparison<C>,
  minSample: number = MIN_LEAD_TIME_SAMPLE,
  dropDays: number = LEAD_TIME_DROP_DAYS,
  criticalDays: number = LEAD_TIME_DROP_CRITICAL_DAYS,
): ContactBookingLeadTimeDropHeadline<C> {
  const qualifies = (c: ContactBookingLeadTimeChange<C>): boolean => {
    const reliable =
      c.current.leadTime.sample >= minSample &&
      c.previous.leadTime.sample >= minSample;
    return reliable && -c.medianDaysDelta >= dropDays;
  };

  // `changes` já vem ordenado por `medianDaysDelta` asc (maior perda de folga
  // primeiro), então o primeiro que passa no gate é o de maior queda.
  const worst = comparison.changes.find(qualifies) ?? null;
  if (!worst) {
    return {
      show: false,
      critical: false,
      contact: null,
      dropDays: 0,
      currentMedianDays: 0,
      previousMedianDays: 0,
      sample: 0,
      others: 0,
    };
  }

  const drop = -worst.medianDaysDelta;
  const others = comparison.changes.reduce(
    (n, c) => (c !== worst && qualifies(c) ? n + 1 : n),
    0,
  );
  return {
    show: true,
    critical: drop >= criticalDays,
    contact: worst.contact,
    dropDays: drop,
    currentMedianDays: worst.current.leadTime.medianDays,
    previousMedianDays: worst.previous.leadTime.medianDays,
    sample: worst.current.leadTime.sample,
    others,
  };
}

// ── Resumo do mês exibido no calendário ─────────────────────────────────────
// O calendário (`/shows/calendario`) mostra a grade do mês mas não responde, num
// relance, "quanto este mês vale?" — quantos shows tenho, quanto de cachê já está
// confirmado (CONFIRMED+PLAYED) e quanto ainda depende de fechar proposta
// (PROPOSED). Este helper destila os shows do mês **exibido** nesse resumo, para
// uma faixa no topo da agenda. Pura: recebe os shows já carregados (a página os
// busca para a grade, incluindo as bordas das semanas vizinhas) e recorta pela
// data LOCAL ao mês em questão — a mesma convenção da grade (ver `calendar.ts`),
// não o dia UTC das leituras de rentabilidade. Cancelados não entram na contagem
// nem no cachê (não são compromisso), mas são contados à parte para contexto.

/** Show mínimo para o resumo mensal do calendário. */
export interface MonthSummaryShowLike {
  date: Date | string;
  status: string;
  fee?: number;
}

export interface MonthShowsSummary {
  /** Shows do mês exibido, exceto cancelados. */
  total: number;
  /** Shows cancelados no mês (contexto, fora de `total`/cachês). */
  cancelled: number;
  /** Cachê já firmado no mês: soma de `fee` de CONFIRMED+PLAYED, em centavos. */
  confirmedFee: number;
  /** Cachê ainda a confirmar: soma de `fee` de PROPOSED, em centavos. */
  pendingFee: number;
  /** `confirmedFee + pendingFee` (cachê total em jogo no mês), em centavos. */
  totalFee: number;
  /** Contagem por status (inclui CANCELLED), para detalhamento. */
  byStatus: Record<ShowStatus, number>;
}

/**
 * Resume os shows do mês do calendário (`year`, `month` 1-12) a partir de uma
 * lista que pode conter dias de bordas de outros meses (como a grade carrega).
 * Recorta pela data LOCAL — `getFullYear()`/`getMonth()` — casando exatamente o
 * que a grade marca como "do mês" (`inMonth`). Status desconhecido é ignorado
 * (não conta em `total`, `cancelled` nem nos cachês), preservando a robustez do
 * resto do módulo a dados fora do domínio. Pura.
 */
export function summarizeMonthShows<T extends MonthSummaryShowLike>(
  shows: T[],
  year: number,
  month: number,
): MonthShowsSummary {
  const byStatus: Record<ShowStatus, number> = {
    PROPOSED: 0,
    CONFIRMED: 0,
    PLAYED: 0,
    CANCELLED: 0,
  };
  let confirmedFee = 0;
  let pendingFee = 0;

  for (const s of shows) {
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1) continue;
    if (!isValidShowStatus(s.status)) continue;
    byStatus[s.status] += 1;
    const fee = s.fee ?? 0;
    if (s.status === "CONFIRMED" || s.status === "PLAYED") confirmedFee += fee;
    else if (s.status === "PROPOSED") pendingFee += fee;
  }

  const cancelled = byStatus.CANCELLED;
  const total = byStatus.PROPOSED + byStatus.CONFIRMED + byStatus.PLAYED;
  return {
    total,
    cancelled,
    confirmedFee,
    pendingFee,
    totalFee: confirmedFee + pendingFee,
    byStatus,
  };
}

/**
 * Resume uma lista de shows JÁ recortada a um período contíguo — o chamador
 * passa exatamente os shows da janela (p.ex. a semana exibida em `/shows/semana`,
 * carregada por `weekRange`). Ao contrário de `summarizeMonthShows`, **não**
 * recorta por data (a janela já veio filtrada da consulta), então serve qualquer
 * período. Mesma semântica: cancelados ficam fora de `total` e dos cachês (não
 * são compromisso), mas são contados à parte; status desconhecido é ignorado.
 * Devolve o mesmo shape (`MonthShowsSummary`) usado no calendário. Pura.
 */
export function summarizeWeekShows<T extends MonthSummaryShowLike>(
  shows: T[],
): MonthShowsSummary {
  const byStatus: Record<ShowStatus, number> = {
    PROPOSED: 0,
    CONFIRMED: 0,
    PLAYED: 0,
    CANCELLED: 0,
  };
  let confirmedFee = 0;
  let pendingFee = 0;

  for (const s of shows) {
    if (!isValidShowStatus(s.status)) continue;
    byStatus[s.status] += 1;
    const fee = s.fee ?? 0;
    if (s.status === "CONFIRMED" || s.status === "PLAYED") confirmedFee += fee;
    else if (s.status === "PROPOSED") pendingFee += fee;
  }

  const cancelled = byStatus.CANCELLED;
  const total = byStatus.PROPOSED + byStatus.CONFIRMED + byStatus.PLAYED;
  return {
    total,
    cancelled,
    confirmedFee,
    pendingFee,
    totalFee: confirmedFee + pendingFee,
    byStatus,
  };
}

// ── Duplicar show (residências / eventos recorrentes) ───────────────────────

/** Campos de um show que a duplicação lê. */
export interface DuplicableShow {
  title: string;
  date: Date | string;
  venue?: string | null;
  city?: string | null;
  fee?: number | null;
  notes?: string | null;
}

/** Dados prontos para criar o show duplicado (sem `userId`). */
export interface DuplicatedShowData {
  title: string;
  date: Date;
  venue: string | null;
  city: string | null;
  status: ShowStatus;
  fee: number;
  notes: string | null;
}

/** Semanas somadas por padrão ao duplicar — uma residência semanal cai na
 *  próxima semana, no mesmo dia e horário. */
export const DUPLICATE_SHOW_WEEKS_AHEAD = 1;

/** Intervalos oferecidos ao duplicar um show recorrente. Cada opção mapeia
 *  direto no parâmetro `weeksAhead` de `buildDuplicatedShow` — em semanas
 *  inteiras, para a cópia cair sempre no mesmo dia da semana (o que define uma
 *  residência). "Mensal" ≈ 4 semanas (28 dias): preserva o dia da semana, ao
 *  contrário de +1 mês de calendário, que o deslocaria. */
export type DuplicateInterval = "weekly" | "biweekly" | "monthly";

/** Semanas somadas por opção de intervalo (fonte única de verdade). */
export const DUPLICATE_INTERVAL_WEEKS: Record<DuplicateInterval, number> = {
  weekly: 1,
  biweekly: 2,
  monthly: 4,
};

/** Intervalo padrão do seletor de duplicação (uma semana). */
export const DEFAULT_DUPLICATE_INTERVAL: DuplicateInterval = "weekly";

/**
 * Converte a escolha de intervalo (string do formulário) no número de semanas a
 * somar na duplicação. Valor desconhecido/ausente cai no padrão semanal. Pura.
 */
export function parseDuplicateInterval(value: unknown): number {
  if (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(DUPLICATE_INTERVAL_WEEKS, value)
  ) {
    return DUPLICATE_INTERVAL_WEEKS[value as DuplicateInterval];
  }
  return DUPLICATE_INTERVAL_WEEKS[DEFAULT_DUPLICATE_INTERVAL];
}

/**
 * Deriva os dados de um show duplicado a partir de um show existente. Copia o
 * conteúdo "de forma" do evento (título, local, cidade, cachê acordado, notas)
 * e desloca a data em `weeksAhead` semanas inteiras — preservando o instante do
 * dia (soma múltiplos de 7 dias em ms), de modo que a cópia caia no mesmo dia da
 * semana. O status volta sempre a `PROPOSED` (a cópia é um evento novo, ainda não
 * confirmado, sem cachê recebido). `weeksAhead` não-inteiro/< 1/NaN cai no padrão
 * (1 semana). Não copia transações (são realizados do evento passado) nem estado
 * de cobrança (promessa/contato de cobrança) — isso é responsabilidade da ação.
 * Pura.
 */
export function buildDuplicatedShow(
  show: DuplicableShow,
  weeksAhead: number = DUPLICATE_SHOW_WEEKS_AHEAD,
): DuplicatedShowData {
  const base = show.date instanceof Date ? show.date : new Date(show.date);
  const weeks =
    Number.isFinite(weeksAhead) && weeksAhead >= 1
      ? Math.floor(weeksAhead)
      : DUPLICATE_SHOW_WEEKS_AHEAD;
  const date = new Date(base.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return {
    title: show.title,
    date,
    venue: show.venue ?? null,
    city: show.city ?? null,
    status: "PROPOSED",
    fee: show.fee ?? 0,
    notes: show.notes ?? null,
  };
}

/** Quantas cópias a duplicação cria por padrão (uma — o comportamento da D218). */
export const DEFAULT_DUPLICATE_COUNT = 1;

/** Teto de cópias criadas numa única duplicação em lote — um trimestre de uma
 *  residência semanal (12 datas) cobre o horizonte de planejamento realista sem
 *  poluir a agenda com dezenas de propostas de uma vez. */
export const MAX_DUPLICATE_COUNT = 12;

/** Opções de quantidade oferecidas no seletor de duplicação em lote. */
export const DUPLICATE_COUNT_PRESETS = [1, 2, 4, 8, 12] as const;

/**
 * Converte a escolha de quantidade (string do formulário) no nº de cópias a
 * criar. Não-numérico/ausente/< 1 cai no padrão (1); acima do teto satura em
 * `MAX_DUPLICATE_COUNT`; fracionário é truncado. Pura.
 */
export function parseDuplicateCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DUPLICATE_COUNT;
  return Math.min(Math.floor(n), MAX_DUPLICATE_COUNT);
}

/**
 * Deriva uma série de shows duplicados para agendar de uma vez as próximas `count`
 * ocorrências de uma residência. Cada cópia k (1..count) cai `weeksAhead * k`
 * semanas à frente da data original — ou seja, espaçadas pela cadência escolhida
 * (`weekly`/`biweekly`/`monthly`), todas no mesmo dia da semana e horário. Reusa
 * `buildDuplicatedShow` (mesmo reset de status/cachê/vínculos de forma). `count`
 * inválido/< 1 vira 1; acima do teto satura em `MAX_DUPLICATE_COUNT`. Pura.
 */
export function buildDuplicatedShowSeries(
  show: DuplicableShow,
  weeksAhead: number = DUPLICATE_SHOW_WEEKS_AHEAD,
  count: number = DEFAULT_DUPLICATE_COUNT,
): DuplicatedShowData[] {
  const total =
    Number.isFinite(count) && count >= 1
      ? Math.min(Math.floor(count), MAX_DUPLICATE_COUNT)
      : DEFAULT_DUPLICATE_COUNT;
  const step =
    Number.isFinite(weeksAhead) && weeksAhead >= 1
      ? Math.floor(weeksAhead)
      : DUPLICATE_SHOW_WEEKS_AHEAD;
  const series: DuplicatedShowData[] = [];
  for (let k = 1; k <= total; k++) {
    series.push(buildDuplicatedShow(show, step * k));
  }
  return series;
}

// ── Histórico de status (linha do tempo do funil) ─────────────────────────────
// Cada mudança de status de um show (criação, PROPOSED → CONFIRMED → PLAYED, …)
// vira um `ShowStatusEvent`. Estes helpers puros montam a linha do tempo para a
// tela de detalhe do show — inclusive quanto tempo o show ficou em cada etapa —
// e são a base para futuras métricas de conversão/tempo-em-etapa. Ver D234.

/** Evento de mudança de status como o helper precisa vê-lo (subset do modelo). */
export interface StatusEventLike {
  /** Status anterior; `null` no evento de criação do show. */
  fromStatus: string | null;
  /** Status para o qual o show mudou. */
  toStatus: string;
  /** Momento da mudança. */
  createdAt: Date | string;
}

/** Uma entrada da linha do tempo, já ordenada e com o tempo de permanência. */
export interface StatusTimelineEntry {
  fromStatus: string | null;
  toStatus: string;
  at: Date;
  /**
   * Dias inteiros decorridos desde o evento anterior — quanto tempo o show ficou
   * no status `fromStatus` antes desta mudança. `null` no primeiro evento (não há
   * etapa anterior a cronometrar). Nunca negativo (piso em 0).
   */
  daysInPrevious: number | null;
}

/**
 * Monta a linha do tempo de status de um show a partir dos seus eventos. Ordena
 * cronologicamente (mais antigo primeiro, desempate estável preservando a ordem
 * de entrada) e calcula, para cada evento a partir do segundo, quantos dias
 * inteiros o show passou no status anterior (`daysInPrevious`). Pura e
 * determinística; não depende de "agora" (a permanência no status atual, ainda em
 * aberto, é responsabilidade da apresentação, se quiser exibi-la).
 */
export function buildStatusTimeline(events: StatusEventLike[]): StatusTimelineEntry[] {
  const sorted = events
    .map((e, i) => ({ e, i, ms: new Date(e.createdAt).getTime() }))
    .sort((a, b) => a.ms - b.ms || a.i - b.i);

  const out: StatusTimelineEntry[] = [];
  let prevMs: number | null = null;
  for (const { e, ms } of sorted) {
    out.push({
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: new Date(ms),
      daysInPrevious: prevMs === null ? null : Math.max(0, Math.floor((ms - prevMs) / DAY_MS)),
    });
    prevMs = ms;
  }
  return out;
}

// ── Atividade do funil (feed de transições de status) ─────────────────────────
// Enquanto `buildStatusTimeline` (D234) monta a linha do tempo de UM show, este
// helper agrega os eventos de VÁRIOS shows num feed reverso-cronológico: as
// últimas mudanças de status na carteira inteira (criações, avanços, recuos,
// cancelamentos e reaberturas). Responde, num relance, "o que se moveu no funil
// ultimamente" — o log de transições que a página de detalhe só mostra por show.
// Pura e determinística; a classificação (`kind`) segue a ordem canônica de
// `SHOW_STATUSES`, com CANCELLED tratado à parte (não é o "fim" do funil, é uma
// saída lateral).

/** Uma transição de status como o feed precisa vê-la (evento + o show a que pertence). */
export interface FunnelActivityInput {
  showId: string;
  showTitle: string;
  /** Data do show (não do evento); `null` se indisponível. */
  showDate: Date | string | null;
  /** Status anterior; `null` no evento de criação do show. */
  fromStatus: string | null;
  toStatus: string;
  /** Momento da mudança de status. */
  at: Date | string;
}

/**
 * Natureza de uma transição, para leitura/cor no feed:
 * - `create`  — cadastro do show (sem status anterior).
 * - `advance` — avançou no funil (ex.: PROPOSED → CONFIRMED → PLAYED).
 * - `regress` — recuou no funil (ex.: CONFIRMED → PROPOSED).
 * - `cancel`  — foi cancelado (qualquer etapa → CANCELLED).
 * - `reopen`  — voltou a ativa depois de cancelado (CANCELLED → qualquer etapa).
 */
export type FunnelActivityKind = "create" | "advance" | "regress" | "cancel" | "reopen";

/** Uma entrada do feed, classificada e com o momento já resolvido em `Date`. */
export interface FunnelActivityEntry {
  showId: string;
  showTitle: string;
  showDate: Date | null;
  fromStatus: string | null;
  toStatus: string;
  at: Date;
  kind: FunnelActivityKind;
}

/**
 * Classifica uma transição pela ordem canônica de `SHOW_STATUSES`. CANCELLED,
 * embora seja o último elemento do array, NÃO é o topo do funil — é uma saída
 * lateral, então cancelamento e reabertura são detectados antes de comparar
 * posições (as demais transições ficam entre PROPOSED/CONFIRMED/PLAYED, cujos
 * índices 0/1/2 já ordenam avanço × recuo). Status desconhecido cai em `advance`.
 */
function classifyFunnelTransition(
  fromStatus: string | null,
  toStatus: string,
): FunnelActivityKind {
  if (fromStatus === null) return "create";
  if (toStatus === "CANCELLED") return "cancel";
  if (fromStatus === "CANCELLED") return "reopen";
  const fromIdx = SHOW_STATUSES.indexOf(fromStatus as ShowStatus);
  const toIdx = SHOW_STATUSES.indexOf(toStatus as ShowStatus);
  if (fromIdx < 0 || toIdx < 0) return "advance";
  return toIdx < fromIdx ? "regress" : "advance";
}

/**
 * Monta o feed de atividade do funil a partir das transições de vários shows.
 * Ordena da mais recente para a mais antiga (desempate estável preservando a
 * ordem de entrada), opcionalmente limita a `opts.limit` entradas e classifica
 * cada transição. Não depende de "agora".
 */
export function buildFunnelActivityFeed(
  items: FunnelActivityInput[],
  opts: { limit?: number } = {},
): FunnelActivityEntry[] {
  const sorted = items
    .map((item, i) => ({ item, i, ms: new Date(item.at).getTime() }))
    .sort((a, b) => b.ms - a.ms || a.i - b.i);

  const limited =
    opts.limit != null && opts.limit >= 0 ? sorted.slice(0, opts.limit) : sorted;

  return limited.map(({ item, ms }) => ({
    showId: item.showId,
    showTitle: item.showTitle,
    showDate: item.showDate == null ? null : new Date(item.showDate),
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    at: new Date(ms),
    kind: classifyFunnelTransition(item.fromStatus, item.toStatus),
  }));
}

/**
 * As cinco naturezas de transição, na ordem canônica do funil (cadastro →
 * avanço → recuo → cancelamento → reabertura). Fonte única para iterar chips de
 * filtro, validar o parâmetro `?natureza=` e montar o mapa de contagens.
 */
export const FUNNEL_ACTIVITY_KINDS: readonly FunnelActivityKind[] = [
  "create",
  "advance",
  "regress",
  "cancel",
  "reopen",
];

/**
 * Valida um valor cru (query string `?natureza=`) contra as naturezas
 * conhecidas. Retorna a natureza quando reconhecida, ou `null` (sem filtro) para
 * ausente/vazia/desconhecida — o chamador trata `null` como "todas".
 */
export function parseFunnelActivityKind(
  value: string | string[] | null | undefined,
): FunnelActivityKind | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return FUNNEL_ACTIVITY_KINDS.includes(raw as FunnelActivityKind)
    ? (raw as FunnelActivityKind)
    : null;
}

/**
 * Restringe o feed a uma natureza. `null` devolve o feed inteiro (sem filtro),
 * preservando ordem e identidade — não recalcula nada, só filtra.
 */
export function filterFunnelActivityByKind(
  feed: FunnelActivityEntry[],
  kind: FunnelActivityKind | null,
): FunnelActivityEntry[] {
  return kind === null ? feed : feed.filter((entry) => entry.kind === kind);
}

/**
 * Conta quantas entradas o feed tem de cada natureza. Sempre inclui as cinco
 * chaves (zeradas quando ausentes) para os chips de filtro exibirem o total.
 */
export function countFunnelActivityByKind(
  feed: FunnelActivityEntry[],
): Record<FunnelActivityKind, number> {
  const counts: Record<FunnelActivityKind, number> = {
    create: 0,
    advance: 0,
    regress: 0,
    cancel: 0,
    reopen: 0,
  };
  for (const entry of feed) counts[entry.kind] += 1;
  return counts;
}

/** Um dia do feed de atividade e as transições que caíram nele. */
export interface FunnelActivityDayGroup {
  /** Chave do dia "YYYY-MM-DD" (UTC, mesma convenção de `dayKey`/CSV). */
  day: string;
  entries: FunnelActivityEntry[];
}

/**
 * Agrupa o feed por dia da transição (`entry.at`), preservando a ordem
 * recente→antigo: os dias saem na ordem em que aparecem no feed (o mais recente
 * primeiro, já que `buildFunnelActivityFeed` ordena desc) e as entradas dentro
 * de cada dia mantêm a ordem do feed. Usa `dayKey` (UTC) — a mesma chave de dia
 * do restante do app, estável em testes. Não recalcula nada além de rebaldear.
 */
export function groupFunnelActivityByDay(
  feed: FunnelActivityEntry[],
): FunnelActivityDayGroup[] {
  const groups: FunnelActivityDayGroup[] = [];
  const byDay = new Map<string, FunnelActivityDayGroup>();
  for (const entry of feed) {
    const day = dayKey(entry.at);
    let group = byDay.get(day);
    if (group === undefined) {
      group = { day, entries: [] };
      byDay.set(day, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

/** Um mês do feed de atividade: total de transições e quebra por natureza. */
export interface FunnelActivityMonthGroup {
  /** Chave do mês "YYYY-MM" (UTC, mesma convenção de `monthKey`). */
  month: string;
  /** Total de transições no mês (soma das cinco naturezas). */
  total: number;
  /** Contagem por natureza — sempre as cinco chaves (zeradas quando ausentes). */
  byKind: Record<FunnelActivityKind, number>;
}

/**
 * Agrupa o feed por mês da transição (`entry.at`), preservando a ordem
 * recente→antigo: os meses saem na ordem em que aparecem no feed (o mais recente
 * primeiro, já que `buildFunnelActivityFeed` ordena desc). Usa `monthKey` (UTC),
 * a mesma chave de mês do restante do app. Cada grupo traz o total e a quebra por
 * natureza (sempre as cinco chaves) — o "pulso" mensal do funil, não um log.
 * Não recalcula nada além de rebaldear e contar; não depende de "agora".
 */
export function groupFunnelActivityByMonth(
  feed: FunnelActivityEntry[],
): FunnelActivityMonthGroup[] {
  const groups: FunnelActivityMonthGroup[] = [];
  const byMonth = new Map<string, FunnelActivityMonthGroup>();
  for (const entry of feed) {
    const month = monthKey(entry.at);
    let group = byMonth.get(month);
    if (group === undefined) {
      group = {
        month,
        total: 0,
        byKind: { create: 0, advance: 0, regress: 0, cancel: 0, reopen: 0 },
      };
      byMonth.set(month, group);
      groups.push(group);
    }
    group.total += 1;
    group.byKind[entry.kind] += 1;
  }
  return groups;
}

/** Leitura de uma linha do tempo de ritmo mensal (`groupFunnelActivityByMonth`). */
export interface FunnelActivityMonthsSummary {
  /** Quantos meses têm ao menos uma transição. */
  monthCount: number;
  /** Soma das transições de todos os meses (= tamanho do feed). */
  totalTransitions: number;
  /**
   * Média de transições por mês (total ÷ meses ativos), `0` quando não há mês.
   * Ratio cru — o chamador arredonda; não conta meses vazios entre extremos.
   */
  averagePerMonth: number;
  /** Mês mais movimentado (empate → o mais recente); `null` sem meses. */
  busiest: FunnelActivityMonthGroup | null;
  /** Mês menos movimentado (empate → o mais recente); `null` sem meses. */
  quietest: FunnelActivityMonthGroup | null;
  /** Total geral por natureza (sempre as cinco chaves, zeradas quando ausentes). */
  byKind: Record<FunnelActivityKind, number>;
  /**
   * Natureza mais frequente no período inteiro (empate → ordem canônica de
   * `FUNNEL_ACTIVITY_KINDS`); `null` quando não há nenhuma transição.
   */
  dominantKind: FunnelActivityKind | null;
}

/**
 * Resume a linha do tempo de ritmo mensal (`groupFunnelActivityByMonth`) num
 * punhado de leituras acionáveis: quantos meses ativos, total e média por mês,
 * o mês mais e o menos movimentado, o total por natureza e a natureza
 * predominante. Pura e determinística — não depende de "agora" e assume a ordem
 * recente→antigo que `groupFunnelActivityByMonth` já garante, então os empates
 * (mês mais/menos movimentado) caem no mês MAIS RECENTE. Não recalcula o feed:
 * agrega só sobre os meses já contados.
 */
export function summarizeFunnelActivityMonths(
  months: FunnelActivityMonthGroup[],
): FunnelActivityMonthsSummary {
  const byKind: Record<FunnelActivityKind, number> = {
    create: 0,
    advance: 0,
    regress: 0,
    cancel: 0,
    reopen: 0,
  };
  let totalTransitions = 0;
  let busiest: FunnelActivityMonthGroup | null = null;
  let quietest: FunnelActivityMonthGroup | null = null;
  for (const month of months) {
    totalTransitions += month.total;
    for (const kind of FUNNEL_ACTIVITY_KINDS) byKind[kind] += month.byKind[kind];
    // `>`/`<` estritos preservam o primeiro em empate — e, como os meses vêm em
    // ordem recente→antigo, o primeiro é sempre o mais recente.
    if (busiest === null || month.total > busiest.total) busiest = month;
    if (quietest === null || month.total < quietest.total) quietest = month;
  }
  const monthCount = months.length;
  let dominantKind: FunnelActivityKind | null = null;
  for (const kind of FUNNEL_ACTIVITY_KINDS) {
    if (byKind[kind] === 0) continue;
    if (dominantKind === null || byKind[kind] > byKind[dominantKind]) {
      dominantKind = kind;
    }
  }
  return {
    monthCount,
    totalTransitions,
    averagePerMonth: monthCount === 0 ? 0 : totalTransitions / monthCount,
    busiest,
    quietest,
    byKind,
    dominantKind,
  };
}

/** Uma leitura sazonal de um mês do calendário na atividade do funil. */
export interface FunnelActivitySeasonMonth {
  /** Mês do ano: 0 = janeiro .. 11 = dezembro (UTC). */
  month: number;
  /** Rótulo longo ("Janeiro", "Fevereiro"…). */
  label: string;
  /** Total de transições neste mês do calendário, somadas todas as edições anuais. */
  total: number;
  /** Quebra por natureza — sempre as cinco chaves (zeradas quando ausentes). */
  byKind: Record<FunnelActivityKind, number>;
  /** Nº de anos distintos com ao menos uma transição neste mês do calendário. */
  years: number;
  /**
   * Média por ano-ativo: total ÷ years (ratio cru, `0` se years === 0) — um
   * "fevereiro típico". O denominador são os anos COM movimento naquele mês, não a
   * amplitude total do histórico, para a média não ser diluída por edições vazias
   * de um histórico curto (mesmo critério de `monthlySeasonality`, ver D35). O
   * chamador arredonda.
   */
  avgPerYear: number;
  /** Participação no total geral de transições = total ÷ totalTransitions (0..1). */
  share: number;
  /**
   * Natureza predominante neste mês (empate → ordem canônica de
   * `FUNNEL_ACTIVITY_KINDS`); `null` quando o mês não teve transições.
   */
  dominantKind: FunnelActivityKind | null;
}

/** Leitura sazonal da atividade do funil por mês do ano (`funnelActivitySeasonality`). */
export interface FunnelActivitySeasonality {
  /** Sempre 12 entradas, de janeiro (0) a dezembro (11), inclusive meses zerados. */
  months: FunnelActivitySeasonMonth[];
  /** Total de transições consideradas (= tamanho do feed). */
  totalTransitions: number;
  /** Nº de anos distintos com qualquer transição (amplitude do histórico). */
  yearsObserved: number;
  /**
   * Mês do calendário mais movimentado — maior total (empate → mês mais cedo);
   * `null` quando não há transição. Onde a temporada de agendamento esquenta.
   */
  busiest: FunnelActivitySeasonMonth | null;
  /**
   * Mês mais calmo entre os que tiveram alguma transição (`total > 0`; empate →
   * mês mais cedo); `null` quando não há transição. Um mês historicamente vazio
   * não é "calmo", é ausência de dado.
   */
  quietest: FunnelActivitySeasonMonth | null;
  /** Total geral por natureza (sempre as cinco chaves, zeradas quando ausentes). */
  byKind: Record<FunnelActivityKind, number>;
  /**
   * Natureza predominante no ano inteiro (empate → ordem canônica de
   * `FUNNEL_ACTIVITY_KINDS`); `null` quando não há nenhuma transição.
   */
  dominantKind: FunnelActivityKind | null;
}

/** Natureza dominante de um mapa de contagens (empate → ordem de `FUNNEL_ACTIVITY_KINDS`). */
function dominantFunnelActivityKind(
  counts: Record<FunnelActivityKind, number>,
): FunnelActivityKind | null {
  let dominant: FunnelActivityKind | null = null;
  for (const kind of FUNNEL_ACTIVITY_KINDS) {
    if (counts[kind] === 0) continue;
    if (dominant === null || counts[kind] > counts[dominant]) dominant = kind;
  }
  return dominant;
}

/**
 * Agrega a atividade do funil por MÊS DO CALENDÁRIO (jan→dez), somando todos os
 * anos do histórico — respondendo "em que época do ano você costuma fazer o
 * trabalho de agendamento (cadastros, avanços, negociação)?". Distinto do RITMO
 * (`groupFunnelActivityByMonth`), que é a série temporal absoluta ("YYYY-MM"): aqui
 * os anos colapsam num único calendário de 12 meses (fev/2024 e fev/2025 caem no
 * mesmo balde "Fevereiro"), revelando a sua sazonalidade de prospecção — quando o
 * telefone costuma tocar e quando é hora de correr atrás.
 *
 * - `months` traz sempre os 12 meses, mesmo os zerados, para o gráfico não pular
 *   meses e expor os vales da temporada.
 * - `avgPerYear` usa como denominador os anos COM movimento naquele mês, medindo
 *   "um fevereiro típico em que houve trabalho" (mesmo critério de
 *   `monthlySeasonality`, D35).
 * - Mais movimentado / mais calmo saem por `total`, entre os meses com transições;
 *   os empates caem no mês mais cedo (iteração jan→dez com `>`/`<` estritos).
 * - O mês é extraído em UTC (`getUTCMonth`), estável em teste. Pura; não depende de
 *   "agora" (o feed já traz `at` resolvido).
 */
export function funnelActivitySeasonality(
  feed: FunnelActivityEntry[],
): FunnelActivitySeasonality {
  const byMonth: Array<Record<FunnelActivityKind, number>> = Array.from(
    { length: 12 },
    () => ({ create: 0, advance: 0, regress: 0, cancel: 0, reopen: 0 }),
  );
  const monthYears: Array<Set<number>> = Array.from({ length: 12 }, () => new Set());
  const allYears = new Set<number>();
  const grandByKind: Record<FunnelActivityKind, number> = {
    create: 0,
    advance: 0,
    regress: 0,
    cancel: 0,
    reopen: 0,
  };

  for (const entry of feed) {
    const idx = entry.at.getUTCMonth();
    const year = entry.at.getUTCFullYear();
    byMonth[idx][entry.kind] += 1;
    grandByKind[entry.kind] += 1;
    monthYears[idx].add(year);
    allYears.add(year);
  }

  const totalTransitions = feed.length;

  const months: FunnelActivitySeasonMonth[] = byMonth.map((counts, month) => {
    const total = FUNNEL_ACTIVITY_KINDS.reduce((acc, k) => acc + counts[k], 0);
    const years = monthYears[month].size;
    return {
      month,
      label: MONTH_NAMES_LONG[month],
      total,
      byKind: { ...counts },
      years,
      avgPerYear: years > 0 ? total / years : 0,
      share: totalTransitions > 0 ? total / totalTransitions : 0,
      dominantKind: dominantFunnelActivityKind(counts),
    };
  });

  // Mais movimentado / mais calmo por total, entre os meses COM transições —
  // um mês historicamente vazio é ausência de dado, não "calmo". Iteramos jan→dez
  // com `>`/`<` estritos → o empate cai no mês mais cedo.
  const active = months.filter((m) => m.total > 0);
  let busiest: FunnelActivitySeasonMonth | null = null;
  let quietest: FunnelActivitySeasonMonth | null = null;
  for (const m of active) {
    if (busiest === null || m.total > busiest.total) busiest = m;
    if (quietest === null || m.total < quietest.total) quietest = m;
  }

  return {
    months,
    totalTransitions,
    yearsObserved: allYears.size,
    busiest,
    quietest,
    byKind: grandByKind,
    dominantKind: dominantFunnelActivityKind(grandByKind),
  };
}

/**
 * Quantos meses do calendário à frente o Painel varre em busca do próximo mês
 * forte de agendamento. Inclui o mês seguinte (`monthsAhead` 1) e **exclui o mês
 * corrente** — o valor do nudge é a antecedência para começar a prospectar antes
 * da temporada esquentar. 4 = uma janela de preparação realista (~um trimestre).
 * Espelha `STRONG_MONTH_HORIZON` da sazonalidade de shows (D134).
 */
export const FUNNEL_ACTIVITY_SEASON_HORIZON = 4;

/**
 * Mínimo de transições no histórico para a sazonalidade da atividade ser
 * confiável o bastante para virar nudge no Painel. Abaixo disso a "temporada" é
 * só ruído amostral e o aviso enganaria mais do que ajudaria. Um show costuma
 * gerar várias transições (cadastro, avanço, negociação), então o piso é mais
 * alto que os 6 SHOWS da sazonalidade de faturamento (`STRONG_MONTH_MIN_SHOWS`).
 * **Hipótese** a validar (ver DECISIONS.md).
 */
export const FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS = 12;

/**
 * Um mês conta como "forte" (temporada de agendamento) quando sua participação no
 * total histórico de transições (`share`) supera a média uniforme (1/12) por este
 * fator. 1.25 = pelo menos 25% acima do mês médio — alto o bastante para ser de
 * fato um pico de atividade, não uma flutuação qualquer. Espelha
 * `STRONG_MONTH_FACTOR` da sazonalidade de shows.
 */
export const FUNNEL_ACTIVITY_STRONG_SEASON_FACTOR = 1.25;

/** Resumo de Painel da sazonalidade da atividade do funil (`funnelActivitySeasonalityHeadline`). */
export interface FunnelActivitySeasonalityHeadline {
  /**
   * Deve aparecer no Painel? Só quando há amostra suficiente
   * (`totalTransitions >= FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS`) **e** existe um
   * mês forte de agendamento dentro da janela à frente — caso contrário o nudge
   * seria ruído (mesma disciplina de `gigSeasonalityHeadline`).
   */
  show: boolean;
  /** O próximo mês forte de agendamento na janela (o mais cedo que qualifica), ou null. */
  month: FunnelActivitySeasonMonth | null;
  /** Quantos meses à frente está (1 = mês que vem … HORIZON); 0 se nenhum. */
  monthsAhead: number;
  /**
   * Quantas vezes o `share` do mês supera a média uniforme (1/12), i.e.
   * `share * 12`. Ex.: 1.8 = esse mês historicamente concentra 80% mais atividade
   * de funil que o mês médio. 0 quando não há mês forte à frente.
   */
  lift: number;
}

/**
 * Resumo de Painel da **sazonalidade da atividade do funil**: deriva, de uma
 * `funnelActivitySeasonality` já computada, o **próximo mês forte de agendamento**
 * que se aproxima — o mais cedo, dentro de `FUNNEL_ACTIVITY_SEASON_HORIZON` meses,
 * cuja participação histórica no total de transições está acima da média
 * (≥ `FUNNEL_ACTIVITY_STRONG_SEASON_FACTOR`× o mês médio). Pura, com `now`
 * injetável — espelha `gigSeasonalityHeadline` (D134) no eixo do TRABALHO de
 * agendamento (cadastros, avanços, negociação), não do faturamento dos shows.
 *
 * Enquanto a sazonalidade de faturamento (`gigSeasonalityHeadline`) diz "seu mês
 * caro chegando — precifique", esta diz "sua temporada de prospecção chegando —
 * comece a correr atrás antes de o funil esfriar" (responde ao "estamos em janeiro
 * e o funil está parado, mas você costuma agendar em fev–mar"). Olha **só para
 * frente** (a partir do mês que vem) porque o valor do aviso é a antecedência; e
 * exige amostra mínima (`FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS`) para não tratar
 * um punhado de transições como "temporada". O detalhe completo está em
 * `/shows/funil/atividade/sazonalidade`.
 */
export function funnelActivitySeasonalityHeadline(
  seasonality: FunnelActivitySeasonality,
  opts: { now?: Date | string } = {},
): FunnelActivitySeasonalityHeadline {
  const none: FunnelActivitySeasonalityHeadline = {
    show: false,
    month: null,
    monthsAhead: 0,
    lift: 0,
  };
  if (seasonality.totalTransitions < FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS) {
    return none;
  }

  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const currentMonth = nowDate.getUTCMonth();
  const threshold = FUNNEL_ACTIVITY_STRONG_SEASON_FACTOR / 12;

  for (let ahead = 1; ahead <= FUNNEL_ACTIVITY_SEASON_HORIZON; ahead++) {
    const m = seasonality.months[(currentMonth + ahead) % 12];
    if (m.total > 0 && m.share >= threshold) {
      return { show: true, month: m, monthsAhead: ahead, lift: m.share * 12 };
    }
  }
  return none;
}

/**
 * Um mês conta como "fraco" (vale de agendamento) quando sua participação no
 * total histórico de transições (`share`) fica abaixo da média uniforme (1/12)
 * por este fator. 0.75 = pelo menos 25% abaixo do mês médio — fundo o bastante
 * para ser de fato um vale de temporada, não uma flutuação qualquer. Espelha
 * `FUNNEL_ACTIVITY_STRONG_SEASON_FACTOR` no sentido oposto; o horizonte e a
 * amostra mínima são os mesmos do mês forte
 * (`FUNNEL_ACTIVITY_SEASON_HORIZON`/`FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS`) e
 * casa com `WEAK_MONTH_FACTOR` da sazonalidade de faturamento (D135).
 */
export const FUNNEL_ACTIVITY_WEAK_SEASON_FACTOR = 0.75;

/** Resumo de Painel do vale da sazonalidade da atividade do funil (`funnelActivitySeasonalityLull`). */
export interface FunnelActivitySeasonalityLull {
  /**
   * Deve aparecer no Painel? Só quando há amostra suficiente
   * (`totalTransitions >= FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS`) **e** existe um
   * mês fraco de agendamento dentro da janela à frente — caso contrário o nudge
   * seria ruído (mesma disciplina de `funnelActivitySeasonalityHeadline`).
   */
  show: boolean;
  /** O próximo mês fraco de agendamento na janela (o mais cedo que qualifica), ou null. */
  month: FunnelActivitySeasonMonth | null;
  /** Quantos meses à frente está (1 = mês que vem … HORIZON); 0 se nenhum. */
  monthsAhead: number;
  /**
   * Quão abaixo da média uniforme (1/12) o `share` do mês fica, como fração:
   * `1 - share * 12`. Ex.: 0.4 = esse mês historicamente concentra 40% menos
   * atividade de funil que o mês médio. 0 quando não há mês fraco à frente.
   */
  shortfall: number;
}

/**
 * Resumo de Painel da **sazonalidade da atividade do funil**, do lado do vale:
 * deriva, de uma `funnelActivitySeasonality` já computada, o **próximo mês fraco
 * de agendamento** que se aproxima — o mais cedo, dentro de
 * `FUNNEL_ACTIVITY_SEASON_HORIZON` meses, cuja participação histórica no total de
 * transições fica abaixo da média (≤ `FUNNEL_ACTIVITY_WEAK_SEASON_FACTOR`× o mês
 * médio). Espelho exato de `funnelActivitySeasonalityHeadline` (mesma janela,
 * mesma amostra mínima, mesmo `now` injetável), no sentido oposto: enquanto o mês
 * forte é a temporada de prospecção chegando, o mês fraco é antecedência para
 * **não deixar o funil esfriar** num mês em que você historicamente afrouxa o
 * trabalho de agendamento.
 *
 * Enquanto `gigSeasonalityLull` (D135) diz "seu mês magro de faturamento chegando —
 * encha a agenda antes", este diz "seu mês parado de prospecção chegando — mantenha
 * o pipeline em movimento". Exige `total > 0` no mês candidato (simétrico ao mês
 * forte): o sinal é "neste mês, em que você historicamente trabalha o funil, costuma
 * afrouxar" — não "você ainda não tem dados desse mês". O detalhe completo está em
 * `/shows/funil/atividade/sazonalidade`.
 */
export function funnelActivitySeasonalityLull(
  seasonality: FunnelActivitySeasonality,
  opts: { now?: Date | string } = {},
): FunnelActivitySeasonalityLull {
  const none: FunnelActivitySeasonalityLull = {
    show: false,
    month: null,
    monthsAhead: 0,
    shortfall: 0,
  };
  if (seasonality.totalTransitions < FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS) {
    return none;
  }

  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const currentMonth = nowDate.getUTCMonth();
  const threshold = FUNNEL_ACTIVITY_WEAK_SEASON_FACTOR / 12;

  for (let ahead = 1; ahead <= FUNNEL_ACTIVITY_SEASON_HORIZON; ahead++) {
    const m = seasonality.months[(currentMonth + ahead) % 12];
    if (m.total > 0 && m.share <= threshold) {
      return {
        show: true,
        month: m,
        monthsAhead: ahead,
        shortfall: 1 - m.share * 12,
      };
    }
  }
  return none;
}

/**
 * Fração mínima do mês corrente que precisa ter decorrido antes de o nudge de
 * "funil parado" disparar. Cedo demais (dia 1–2) a atividade ainda não teve tempo
 * de acontecer e o aviso choraria lobo; ~1/4 do mês dá margem para o ritmo se
 * revelar. Baseado no dia do mês em UTC (`getUTCDate` ÷ dias do mês).
 */
export const FUNNEL_ACTIVITY_STALL_MIN_ELAPSED_FRACTION = 0.25;

/**
 * Quão abaixo do ritmo sazonal esperado (proporcional ao trecho já decorrido do
 * mês) a atividade real precisa estar para o mês contar como "parado". 0.5 = a
 * menos da metade do que um mês típico teria acumulado a esta altura — fundo o
 * bastante para ser de fato uma parada, não uma flutuação. Espelha a disciplina
 * conservadora dos demais nudges sazonais.
 */
export const FUNNEL_ACTIVITY_STALL_FACTOR = 0.5;

/** Resumo de Painel do "funil parado num mês historicamente forte" (`funnelActivitySeasonalityStall`). */
export interface FunnelActivitySeasonalityStall {
  /**
   * Deve aparecer no Painel? Só quando há amostra suficiente
   * (`totalTransitions >= FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS`), o mês CORRENTE
   * é historicamente forte de agendamento (`share` ≥ o mesmo piso da manchete), já
   * decorreu o bastante do mês (`>= FUNNEL_ACTIVITY_STALL_MIN_ELAPSED_FRACTION`) e a
   * atividade real do mês está abaixo do ritmo esperado
   * (`< esperado × FUNNEL_ACTIVITY_STALL_FACTOR`). Caso contrário o nudge seria ruído.
   */
  show: boolean;
  /** O mês do calendário CORRENTE (a leitura sazonal dele), ou null quando não dispara. */
  month: FunnelActivitySeasonMonth | null;
  /**
   * Transições que um mês típico teria acumulado ATÉ AQUI: a média por ano dos ANOS
   * ANTERIORES neste mês (exclui o próprio ano corrente do denominador, ver D335)
   * proporcional à fração já decorrida do mês. Sem histórico anterior recai no
   * `avgPerYear`. 0 quando não dispara.
   */
  expected: number;
  /** Transições REAIS registradas neste mês do ano corrente até agora. */
  actual: number;
  /**
   * Quão atrás do ritmo esperado a atividade está, como fração (`1 - actual/expected`,
   * limitada a 0..1). Ex.: 0.7 = 70% abaixo do que um mês típico teria a esta altura.
   * 0 quando não dispara.
   */
  shortfall: number;
  /**
   * Quantas vezes o `share` do mês corrente supera a média uniforme (1/12), i.e.
   * `share * 12` — o quanto esse mês historicamente concentra atividade. 0 quando
   * não dispara.
   */
  lift: number;
}

/**
 * Resumo de Painel do **funil parado**: cruza o pico histórico da atividade com o
 * estado ATUAL do mês corrente — dispara "você costuma agendar agora, mas o funil
 * está parado este mês". Enquanto `funnelActivitySeasonalityHeadline` (D329) é
 * antecedência ("sua temporada de prospecção está CHEGANDO"), este é o presente
 * ("sua temporada de prospecção é AGORA e você não está trabalhando o funil").
 * Fecha o "próximo possível" que a D329/D332 deixaram explícito.
 *
 * Só dispara quando TODOS valem:
 * - amostra mínima (`FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS`), como os irmãos;
 * - o mês CORRENTE é historicamente forte (`share` ≥ `FUNNEL_ACTIVITY_STRONG_SEASON_FACTOR`/12)
 *   e teve movimento antes (`avgPerYear > 0`) — "você costuma agendar agora";
 * - já decorreu ao menos `FUNNEL_ACTIVITY_STALL_MIN_ELAPSED_FRACTION` do mês, para
 *   não chorar lobo nos primeiros dias;
 * - a atividade real do mês (`currentMonthTransitions`) está abaixo do ritmo
 *   esperado proporcional ao trecho decorrido (`< esperado × FUNNEL_ACTIVITY_STALL_FACTOR`).
 *
 * `expected` proporcionaliza pela fração já decorrida do mês (assumindo atividade
 * uniforme dentro do mês — uma aproximação documentada) uma média por ano que
 * EXCLUI o próprio ano corrente do denominador: como a `seasonality` inclui o ano
 * corrente (parcial e, num mês parado, deprimido), medir o realizado contra uma
 * média que já embute esse número baixo diluiria o baseline com o próprio déficit
 * que se quer diagnosticar. Usa-se então a média dos ANOS ANTERIORES neste mês
 * (`(total − corrente) / (anos − ano corrente)`); sem histórico anterior recai no
 * `avgPerYear`, que aí iguala o realizado e não dispara (ver D335, que revê a
 * antiga postura "conservador de propósito" da D333).
 * Puro, com `now` injetável (`getUTCMonth`/`getUTCDate`, default `new Date()`).
 */
export function funnelActivitySeasonalityStall(
  seasonality: FunnelActivitySeasonality,
  currentMonthTransitions: number,
  opts: { now?: Date | string } = {},
): FunnelActivitySeasonalityStall {
  const none: FunnelActivitySeasonalityStall = {
    show: false,
    month: null,
    expected: 0,
    actual: currentMonthTransitions,
    shortfall: 0,
    lift: 0,
  };
  if (seasonality.totalTransitions < FUNNEL_ACTIVITY_SEASON_MIN_TRANSITIONS) {
    return none;
  }

  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const currentMonth = nowDate.getUTCMonth();
  const month = seasonality.months[currentMonth];

  // "Você costuma agendar AGORA": o mês corrente precisa ser historicamente forte
  // (mesmo piso da manchete) e ter tido movimento antes.
  const strongThreshold = FUNNEL_ACTIVITY_STRONG_SEASON_FACTOR / 12;
  if (month.avgPerYear <= 0 || month.share < strongThreshold) return none;

  // Fração decorrida do mês corrente, pelo dia UTC (1..dias do mês).
  const daysInMonth = new Date(
    Date.UTC(nowDate.getUTCFullYear(), currentMonth + 1, 0),
  ).getUTCDate();
  const elapsedFraction = nowDate.getUTCDate() / daysInMonth;
  if (elapsedFraction < FUNNEL_ACTIVITY_STALL_MIN_ELAPSED_FRACTION) return none;

  // Base do ritmo esperado: a média por ano dos ANOS ANTERIORES neste mês —
  // exclui o próprio ano corrente (parcial e, num mês parado, deprimido) do
  // denominador, para não diluir o baseline com o número baixo que estamos
  // justamente diagnosticando (fecha o "próximo possível" da D333/D334, revendo
  // a postura "conservador de propósito" — ver D335). Deriva dos agregados que já
  // temos: `month.total`/`month.years` incluem o ano corrente, pois vêm do MESMO
  // feed que alimenta `currentMonthTransitions`; subtraímos as transições do mês
  // corrente do total e, quando elas existem (o ano corrente teve movimento neste
  // mês), o próprio ano da contagem de anos. Sem histórico anterior (só o ano
  // corrente com movimento) recai no `avgPerYear` — que aí iguala o realizado e
  // nunca dispara, o guard natural "sem baseline não há parada".
  const priorYears = month.years - (currentMonthTransitions > 0 ? 1 : 0);
  const priorTotal = month.total - currentMonthTransitions;
  const baselinePerYear =
    priorYears > 0 && priorTotal > 0 ? priorTotal / priorYears : month.avgPerYear;
  const expected = baselinePerYear * elapsedFraction;
  if (currentMonthTransitions >= expected * FUNNEL_ACTIVITY_STALL_FACTOR) {
    return none;
  }

  const shortfall =
    expected > 0
      ? Math.min(1, Math.max(0, 1 - currentMonthTransitions / expected))
      : 0;
  return {
    show: true,
    month,
    expected,
    actual: currentMonthTransitions,
    shortfall,
    lift: month.share * 12,
  };
}

/**
 * Conta as transições do funil no MÊS corrente do ANO corrente dentro de um feed
 * de atividade já montado (`buildFunnelActivityFeed`), pelo `at` em UTC. É o
 * `currentMonthTransitions` que `funnelActivitySeasonalityStall` cruza com o ritmo
 * sazonal esperado — extraído para reuso entre o Painel e a página de sazonalidade
 * (mesma contagem, uma definição só, em vez de repetir o filtro em cada tela).
 * Puro, com `now` injetável (`getUTCFullYear`/`getUTCMonth`, default `new Date()`).
 */
export function countCurrentMonthFunnelActivity(
  feed: Pick<FunnelActivityEntry, "at">[],
  opts: { now?: Date | string } = {},
): number {
  const nowDate =
    opts.now == null
      ? new Date()
      : typeof opts.now === "string"
        ? new Date(opts.now)
        : opts.now;
  const year = nowDate.getUTCFullYear();
  const month = nowDate.getUTCMonth();
  return feed.filter(
    (e) => e.at.getUTCFullYear() === year && e.at.getUTCMonth() === month,
  ).length;
}

/** Variação de um mês do calendário na sazonalidade da atividade, entre dois períodos. */
export interface FunnelActivitySeasonMonthChange {
  /** Mês do ano: 0 = janeiro .. 11 = dezembro (UTC). */
  month: number;
  /** Rótulo longo ("Janeiro", "Fevereiro"…). */
  label: string;
  /** Transições deste mês do calendário no período atual. */
  currentTotal: number;
  /** Transições deste mês do calendário no período anterior. */
  previousTotal: number;
  /** Variação (`current − previous`); pode ser negativa. */
  totalDelta: number;
}

/**
 * Comparativo da **sazonalidade da atividade do funil** entre dois períodos
 * (tipicamente um ano × o ano anterior), mês a mês do calendário — respondendo
 * "em que meses do ano meu trabalho de agendamento esquentou ou esfriou em
 * relação ao ano passado?". Irmão de `compareGigSeasonality` no eixo da atividade
 * do funil.
 */
export interface FunnelActivitySeasonalityComparison {
  /** Sempre 12 meses (janeiro→dezembro), inclusive os sem mudança. */
  months: FunnelActivitySeasonMonthChange[];
  /** Variação do total de transições (atual − anterior). */
  totalDelta: number;
  /**
   * Mês que mais GANHOU transições (maior `totalDelta > 0`; empate → mês mais
   * cedo); `null` se nenhum mês subiu.
   */
  biggestGain: FunnelActivitySeasonMonthChange | null;
  /**
   * Mês que mais PERDEU transições (menor `totalDelta < 0`; empate → mês mais
   * cedo); `null` se nenhum mês caiu.
   */
  biggestDrop: FunnelActivitySeasonMonthChange | null;
}

/**
 * Compara a **sazonalidade da atividade do funil** entre dois períodos, mês a mês
 * do calendário. Irmão de `compareGigSeasonality` (D215) no eixo da atividade do
 * funil: onde aquele casa a forma mensal dos SHOWS, este casa a forma mensal do
 * TRABALHO de agendamento (cadastros, avanços, negociação). Como a sazonalidade já
 * colapsa os anos num calendário de 12 meses em ordem (jan→dez), o índice `i` casa
 * o mesmo mês nos dois períodos sem lookup.
 *
 * Ancora no **total de transições** do mês (o eixo primário da tela — o `busiest`),
 * destilando os dois **movers**: o mês que mais cresceu e o que mais caiu, mantendo
 * a tela enxuta (os 12 `months` ficam disponíveis para detalhar). Distinto do
 * comparativo do RITMO (`compareFunnelActivityMonths`), que destila agregados do
 * período por natureza porque o ritmo não tem calendário comum entre anos; aqui há
 * calendário comum, então casamos mês a mês.
 *
 * Puro, sem I/O: recebe duas `funnelActivitySeasonality` já computadas (cada uma
 * sobre o feed do seu período). Iteramos jan→dez com `>`/`<` estrito no desempate,
 * então o mês mais cedo vence empates — mesma disciplina determinística de
 * `funnelActivitySeasonality`. O chamador decide quando exibir (tipicamente só com
 * um ano específico e ambos os períodos com transições).
 */
export function compareFunnelActivitySeasonality(
  current: FunnelActivitySeasonality,
  previous: FunnelActivitySeasonality,
): FunnelActivitySeasonalityComparison {
  const months: FunnelActivitySeasonMonthChange[] = current.months.map((cur, i) => {
    const prev = previous.months[i];
    return {
      month: cur.month,
      label: cur.label,
      currentTotal: cur.total,
      previousTotal: prev.total,
      totalDelta: cur.total - prev.total,
    };
  });

  let biggestGain: FunnelActivitySeasonMonthChange | null = null;
  let biggestDrop: FunnelActivitySeasonMonthChange | null = null;
  for (const m of months) {
    if (m.totalDelta > 0 && (biggestGain === null || m.totalDelta > biggestGain.totalDelta)) {
      biggestGain = m;
    }
    if (m.totalDelta < 0 && (biggestDrop === null || m.totalDelta < biggestDrop.totalDelta)) {
      biggestDrop = m;
    }
  }

  return {
    months,
    totalDelta: current.totalTransitions - previous.totalTransitions,
    biggestGain,
    biggestDrop,
  };
}

/** Tendência de um mês no comparativo de sazonalidade da atividade: subiu, caiu ou estável. */
export type FunnelActivitySeasonMonthTrend = "up" | "down" | "flat";

/**
 * Classifica um mês do comparativo (`FunnelActivitySeasonMonthChange`) em
 * `up`/`down`/`flat` pelo `totalDelta`, para colorir a tabela de detalhe dos 12
 * meses de forma consistente com os movers. Espelha
 * `classifyGigSeasonalityMonthChange`, sem o eixo de faturamento (a atividade só
 * tem contagem). Puro, sem I/O.
 */
export function classifyFunnelActivitySeasonMonthChange(
  change: FunnelActivitySeasonMonthChange,
): FunnelActivitySeasonMonthTrend {
  if (change.totalDelta > 0) return "up";
  if (change.totalDelta < 0) return "down";
  return "flat";
}

/** Variação de uma natureza entre dois períodos do ritmo (atual − anterior). */
export interface FunnelActivityKindChange {
  kind: FunnelActivityKind;
  /** Transições desta natureza no período atual. */
  current: number;
  /** Transições desta natureza no período anterior. */
  previous: number;
  /** `current − previous`: positivo cresceu, negativo caiu. */
  delta: number;
}

/**
 * Comparativo do ritmo de atividade do funil entre dois períodos (tipicamente um
 * ano × o ano anterior): quanto o funil se moveu mais/menos e QUAL natureza puxou
 * a mudança.
 */
export interface FunnelActivityYearComparison {
  /** Total de transições no período atual. */
  totalCurrent: number;
  /** Total de transições no período anterior. */
  totalPrevious: number;
  /** Variação do total (atual − anterior). */
  totalDelta: number;
  /** Meses ativos (com ao menos uma transição) no período atual. */
  monthCountCurrent: number;
  /** Meses ativos no período anterior. */
  monthCountPrevious: number;
  /** Média por mês ativo — atual (ratio cru; o chamador arredonda). */
  averageCurrent: number;
  /** Média por mês ativo — anterior. */
  averagePrevious: number;
  /** Variação por natureza — sempre as cinco, na ordem canônica. */
  byKind: FunnelActivityKindChange[];
  /** Natureza que mais CRESCEU (maior `delta > 0`; empate → ordem canônica); `null` se nenhuma subiu. */
  biggestGain: FunnelActivityKindChange | null;
  /** Natureza que mais CAIU (menor `delta < 0`; empate → ordem canônica); `null` se nenhuma caiu. */
  biggestDrop: FunnelActivityKindChange | null;
}

/**
 * Compara o **ritmo de atividade do funil** entre dois períodos, respondendo "meu
 * funil se movimentou mais ou menos do que no ano passado, e qual natureza
 * (cadastros/avanços/recuos/cancelamentos/reaberturas) explica a mudança?".
 *
 * Distinto do comparativo de sazonalidade (`compareGigSeasonality`), cujo valor é
 * a **forma mensal** (jan→dez); aqui o ritmo é keyed por mês absoluto "YYYY-MM" e
 * não há um calendário comum entre os anos, então o comparativo destila os
 * agregados do período — total, média por mês ativo e a quebra por natureza — em
 * vez de casar mês a mês. Os dois **movers** são a natureza que mais cresceu e a
 * que mais caiu, no espírito dos movers de `compareGigSeasonality`.
 *
 * Puro, sem I/O: recebe duas linhas do tempo já agrupadas por
 * `groupFunnelActivityByMonth` (cada uma sobre os eventos do seu período) e as
 * resume via `summarizeFunnelActivityMonths` — reuso, sem recontar. Os empates de
 * mover quebram na ordem canônica de `FUNNEL_ACTIVITY_KINDS` (o `>`/`<` estrito
 * preserva a natureza vista primeiro), a mesma disciplina determinística do
 * `dominantKind`. O chamador decide quando exibir (tipicamente só com um ano
 * específico e ambos os períodos com transições).
 */
export function compareFunnelActivityMonths(
  current: FunnelActivityMonthGroup[],
  previous: FunnelActivityMonthGroup[],
): FunnelActivityYearComparison {
  const cur = summarizeFunnelActivityMonths(current);
  const prev = summarizeFunnelActivityMonths(previous);

  const byKind: FunnelActivityKindChange[] = FUNNEL_ACTIVITY_KINDS.map((kind) => ({
    kind,
    current: cur.byKind[kind],
    previous: prev.byKind[kind],
    delta: cur.byKind[kind] - prev.byKind[kind],
  }));

  let biggestGain: FunnelActivityKindChange | null = null;
  let biggestDrop: FunnelActivityKindChange | null = null;
  for (const change of byKind) {
    if (
      change.delta > 0 &&
      (biggestGain === null || change.delta > biggestGain.delta)
    ) {
      biggestGain = change;
    }
    if (
      change.delta < 0 &&
      (biggestDrop === null || change.delta < biggestDrop.delta)
    ) {
      biggestDrop = change;
    }
  }

  return {
    totalCurrent: cur.totalTransitions,
    totalPrevious: prev.totalTransitions,
    totalDelta: cur.totalTransitions - prev.totalTransitions,
    monthCountCurrent: cur.monthCount,
    monthCountPrevious: prev.monthCount,
    averageCurrent: cur.averagePerMonth,
    averagePrevious: prev.averagePerMonth,
    byKind,
    biggestGain,
    biggestDrop,
  };
}

/**
 * Rótulo relativo de um dia do feed em relação a "hoje": "Hoje" para o próprio
 * dia, "Ontem" para o dia imediatamente anterior, `null` para qualquer outro (o
 * chamador cai no rótulo por extenso). Ambos os argumentos são chaves
 * "YYYY-MM-DD" em UTC (a mesma convenção de `dayKey`/`groupFunnelActivityByDay`);
 * a distância é medida entre as meias-noites UTC, então não há deriva de fuso e o
 * helper é puro (o relógio entra só na chave `today` que o chamador injeta).
 */
export function relativeDayLabel(day: string, today: string): string | null {
  if (day === today) return "Hoje";
  const MS_PER_DAY = 86_400_000;
  const diffDays = (dayKeyToUtcMs(today) - dayKeyToUtcMs(day)) / MS_PER_DAY;
  return diffDays === 1 ? "Ontem" : null;
}

/**
 * Converte o parâmetro cru `?pagina=` num número de página inteiro `>= 1` (1 = a
 * primeira, com as transições mais recentes). Qualquer coisa que não seja um
 * inteiro `>= 1` — ausente, vazio, "0", negativo, fracionário, texto — cai em 1.
 * Aceita `string` ou `string[]` (usa o primeiro), a mesma convenção dos outros
 * parsers de query desta linha (`parseFunnelActivityKind`).
 */
export function parseFeedPage(
  value: string | string[] | null | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Recorta uma página do feed a partir de um lote buscado com UM item extra
 * (`pageSize + 1`): esse item-sentinela não é exibido — sua mera presença indica
 * que ainda há uma página mais antiga adiante (`hasNext`). Devolve os itens da
 * página (no máximo `pageSize`, preservando a ordem recebida) sem o sentinela.
 * Genérico e puro; serve à página e à rota de export, que fazem a mesma consulta.
 */
export function sliceFeedPage<T>(
  fetched: T[],
  pageSize: number,
): { items: T[]; hasNext: boolean } {
  const hasNext = fetched.length > pageSize;
  return { items: hasNext ? fetched.slice(0, pageSize) : fetched, hasNext };
}

/**
 * Converte o parâmetro cru `?ano=` num ano inteiro de 4 dígitos (recorte por
 * ano do feed de atividade) ou `null` (= todos os anos). Só aceita inteiros no
 * intervalo `[2000, 2100]` — ausente, vazio, negativo, fracionário, fora da
 * faixa ou texto caem em `null`. Aceita `string` ou `string[]` (usa o
 * primeiro), a mesma convenção dos parsers irmãos (`parseFeedPage`).
 */
export function parseFeedYear(
  value: string | string[] | null | undefined,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
}

/**
 * Limites UTC `[gte, lt)` de um ano civil, para recortar o stream de eventos por
 * `createdAt` no banco. Usa o ano **UTC** (`Date.UTC`), a mesma convenção de
 * `dayKey`/`groupFunnelActivityByDay`, para o recorte casar exatamente com os
 * cabeçalhos por dia do feed sem deriva de fuso. Meia-aberto à direita: o 1º
 * instante do ano seguinte não entra.
 */
export function feedYearRangeUtc(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/**
 * Anos (decrescente) a oferecer no seletor de período do feed, derivados só do
 * evento mais antigo e do mais novo da carteira (dois pontos indexados, sem
 * varrer o stream) — cobre todo o intervalo contínuo entre eles, mesmo anos sem
 * atividade, para o seletor não ter buracos. Ano **UTC** (bate com
 * `feedYearRangeUtc`). Devolve `[]` se não houver eventos (qualquer ponta nula).
 */
export function feedActivityYears(
  oldest: Date | null,
  newest: Date | null,
): number[] {
  if (!oldest || !newest) return [];
  const from = oldest.getUTCFullYear();
  const to = newest.getUTCFullYear();
  const years: number[] = [];
  for (let y = to; y >= from; y--) years.push(y);
  return years;
}

// ── Tempo médio em cada etapa do funil (residence time) ───────────────────────
// Agregado sobre o histórico de status (`ShowStatusEvent`) de VÁRIOS shows: para
// cada etapa (PROPOSED, CONFIRMED, …) quanto tempo, tipicamente, um show fica
// nela antes de sair (avançar OU ser cancelado). É a primeira métrica de
// conversão de verdade que a linha do tempo da D234 habilita: enquanto o funil
// (`showPipeline`) fotografa ONDE os shows estão hoje, isto mede A VELOCIDADE com
// que atravessam cada etapa. Ver D235.

/** Show, como o agregador de tempo-em-etapa precisa vê-lo (só os eventos). */
export interface StageDurationShowLike {
  statusEvents: StatusEventLike[];
}

/** Permanência típica numa etapa do funil, em dias inteiros. */
export interface StageDurationStat {
  /** Etapa medida — o `fromStatus` das transições que a deixaram. */
  status: string;
  /** Nº de transições cronometradas que saíram desta etapa (amostra). */
  count: number;
  /** Mediana dos dias na etapa (resistente a outlier; leitura principal). */
  medianDays: number;
  /** Média dos dias na etapa (informativa). */
  averageDays: number;
  /** Menor permanência observada nesta etapa. */
  shortestDays: number;
  /** Maior permanência observada nesta etapa. */
  longestDays: number;
}

/** Resultado de `funnelStageDurations`. */
export interface FunnelStageDurations {
  /** Etapas com amostra, na ordem canônica do funil (`SHOW_STATUSES`). */
  stages: StageDurationStat[];
  /** Total de transições cronometradas (soma dos `count`). */
  totalSamples: number;
  /** Nº de shows que contribuíram ao menos uma transição cronometrada. */
  showCount: number;
}

/**
 * Tempo de permanência por etapa do funil, agregando a linha do tempo de status
 * de vários shows. Para cada show monta `buildStatusTimeline` e, em cada
 * transição a partir da segunda (as que têm `daysInPrevious`), credita esse
 * número de dias à etapa de ORIGEM (`fromStatus`) — o tempo que o show passou ali
 * antes de sair. Uma etapa acumula tanto as saídas por avanço quanto por
 * cancelamento (é a residência honesta: "quanto tempo isto costuma ficar
 * parado?"). Etapas terminais sem transição de saída (tipicamente PLAYED,
 * CANCELLED) não aparecem. Devolve as etapas na ordem canônica do funil, com
 * mediana/média/mín/máx. Pura e determinística — não depende de "agora" (a
 * permanência na etapa atual, ainda em aberto, fica de fora, coerente com
 * `buildStatusTimeline`). Ver D235.
 *
 * Com `opts.year` (ano UTC) recorta aos shows cuja proposta ENTROU no funil
 * naquele ano — o mesmo eixo de coorte de `proposalOutcomes`/D243 (primeiro
 * `toStatus === PROPOSED`), não a data do show —, espelhando o recorte que a
 * quebra por contratante já faz (`proposalDeliberationByContact`/D276). Shows
 * sem entrada em PROPOSED (sem coorte) ficam de fora de qualquer ano específico,
 * mas contam em `"all"`. Filtra antes de agregar, mantendo o motor agnóstico ao
 * recorte. Ver D281.
 */
export function funnelStageDurations(
  shows: StageDurationShowLike[],
  opts: ProposalOutcomesOptions = {},
): FunnelStageDurations {
  const year = opts.year ?? "all";
  const scoped =
    year === "all"
      ? shows
      : shows.filter((show) => {
          const proposedAt = firstProposedAt(show.statusEvents);
          return proposedAt !== null && new Date(proposedAt).getUTCFullYear() === year;
        });

  const samplesByStage = new Map<string, number[]>();
  let showCount = 0;

  for (const show of scoped) {
    const timeline = buildStatusTimeline(show.statusEvents);
    let contributed = false;
    for (const entry of timeline) {
      if (entry.daysInPrevious === null || entry.fromStatus === null) continue;
      const arr = samplesByStage.get(entry.fromStatus);
      if (arr) arr.push(entry.daysInPrevious);
      else samplesByStage.set(entry.fromStatus, [entry.daysInPrevious]);
      contributed = true;
    }
    if (contributed) showCount += 1;
  }

  // Ordem canônica do funil primeiro; qualquer status fora do canônico (dado
  // inesperado) vai ao fim em ordem alfabética, sem sumir da agregação.
  const canonical = SHOW_STATUSES.filter((s) => samplesByStage.has(s));
  const extra = [...samplesByStage.keys()]
    .filter((s) => !SHOW_STATUSES.includes(s as ShowStatus))
    .sort();

  const stages: StageDurationStat[] = [];
  let totalSamples = 0;
  for (const status of [...canonical, ...extra]) {
    const nums = samplesByStage.get(status)!;
    totalSamples += nums.length;
    stages.push({
      status,
      count: nums.length,
      medianDays: leadMedian(nums),
      averageDays: Math.round(nums.reduce((a, b) => a + b, 0) / nums.length),
      shortestDays: Math.min(...nums),
      longestDays: Math.max(...nums),
    });
  }

  return { stages, totalSamples, showCount };
}

// ── Onde o tempo se concentra ao longo do funil ──────────────────────────────
// `funnelStageDurations` mede a mediana de permanência POR etapa; esta leitura
// derivada responde à pergunta de COMPOSIÇÃO: de todo o tempo que um show leva
// atravessando o funil, que naco fica em cada etapa? É o gargalo de tempo num
// relance. Ver D283.

/** Participação de uma etapa no tempo típico de percurso do funil. */
export interface StageTimeShare {
  /** Etapa medida (mesmo `status` de `StageDurationStat`). */
  status: string;
  /** Mediana de permanência da etapa (dias inteiros). */
  medianDays: number;
  /** `medianDays` ÷ soma das medianas de todas as etapas (0..1). */
  share: number;
}

/** Onde o tempo se concentra ao longo do funil (composição das medianas). */
export interface StageTimeConcentration {
  /** Uma entrada por etapa, na ordem canônica de `durations.stages`. */
  shares: StageTimeShare[];
  /** Soma das medianas de permanência de todas as etapas (denominador do share). */
  totalMedianDays: number;
  /** A etapa que concentra o maior naco do tempo, ou `null` sem base. */
  dominant: StageTimeShare | null;
}

/**
 * Onde o tempo se concentra ao longo do funil: cada etapa como fração do tempo
 * TÍPICO de percurso, isto é, sua mediana de permanência sobre a SOMA das medianas
 * de todas as etapas. NÃO é a mediana do percurso inteiro (que não se recompõe das
 * medianas por etapa) — é uma leitura de COMPOSIÇÃO, o mesmo espírito de
 * `incomeMix`/`expenseMix`, respondendo "de todo o tempo que um show leva
 * atravessando o funil, que naco fica em cada etapa?". Preserva a ordem canônica de
 * `durations.stages`. `dominant` é a etapa de maior naco (o maior gargalo de tempo);
 * empate resolve pela primeira na ordem do funil (comparação estrita). Sem medianas
 * positivas (`totalMedianDays === 0`) devolve shares zerados e `dominant` nulo. Pura
 * e determinística. Ver D283.
 */
export function stageTimeConcentration(
  durations: FunnelStageDurations,
): StageTimeConcentration {
  const totalMedianDays = durations.stages.reduce((sum, s) => sum + s.medianDays, 0);
  const shares: StageTimeShare[] = durations.stages.map((s) => ({
    status: s.status,
    medianDays: s.medianDays,
    share: totalMedianDays > 0 ? s.medianDays / totalMedianDays : 0,
  }));
  let dominant: StageTimeShare | null = null;
  if (totalMedianDays > 0) {
    for (const entry of shares) {
      if (!dominant || entry.share > dominant.share) dominant = entry;
    }
  }
  return { shares, totalMedianDays, dominant };
}

/** Um segmento VISÍVEL da barra de composição do tempo do funil (naco positivo). */
export interface StageTimeSegment {
  /** Etapa do segmento (mesmo `status` de `StageTimeShare`). */
  status: string;
  /** Mediana de permanência da etapa (dias inteiros). */
  medianDays: number;
  /** Naco da etapa no tempo típico de percurso (0..1). */
  share: number;
  /** True para a etapa dominante (o maior naco — o gargalo de tempo). */
  dominant: boolean;
}

/**
 * Achata a composição do tempo do funil (`stageTimeConcentration`) nos segmentos
 * VISÍVEIS de uma barra empilhada: só as etapas com naco positivo (`share > 0`), na
 * ordem canônica de `concentration.shares`, cada uma marcada `dominant` quando é a
 * etapa de maior naco. Etapas de mediana zero não ocupam largura e ficam de fora
 * (nada a desenhar); sem base (`totalMedianDays === 0`) devolve lista vazia. É o
 * complemento visual do `dominant` de `stageTimeConcentration` (D283): em vez de só
 * NOMEAR o gargalo, mostra a FORMA inteira de onde o tempo se concentra num relance,
 * o mesmo espírito das barras de composição de renda/despesa. Pura e determinística.
 * Ver D286.
 */
export function stageTimeConcentrationSegments(
  concentration: StageTimeConcentration,
): StageTimeSegment[] {
  const dominantStatus = concentration.dominant?.status ?? null;
  return concentration.shares
    .filter((s) => s.share > 0)
    .map((s) => ({
      status: s.status,
      medianDays: s.medianDays,
      share: s.share,
      dominant: s.status === dominantStatus,
    }));
}

// ── Manchete de gargalo de TEMPO no funil para o Painel (o percurso empaca na decisão?) ──
// `stageTimeConcentration` (D283) já diz, de todo o tempo típico de travessia do
// funil, que naco fica em cada etapa. Este headline destila o caso ACIONÁVEL disso
// para o Painel: quando a MAIOR fatia desse tempo se concentra na etapa PROPOSED —
// as propostas passam o grosso do percurso apenas esperando decisão —, é hora de
// cobrar resposta. SÓ a etapa PROPOSED vira nudge: se o gargalo é CONFIRMED (a espera
// entre confirmar e o show) isso é esperado e nada há a cobrar; PLAYED/CANCELLED são
// terminais e sequer aparecem como etapa de ORIGEM. Diferente dos irmãos de proposta:
// `staleProposalsHeadline` (D240) aponta propostas paradas AGORA (presente, por deal);
// `slowDeliberatorHeadline` (D275) aponta QUEM decide devagar (por contratante). Este é
// a leitura ESTRUTURAL da carteira inteira (a composição HISTÓRICA do tempo) e por isso
// CEDE a vez a eles no Painel. Espelha o gate de composição de
// `clientConcentrationHeadline`/`geoConcentrationHeadline`: só dispara acima de um piso
// de participação e com amostra confiável. Puro, sem I/O. Ver D285.

/** Etapa do funil cujo gargalo de tempo é acionável no Painel (esperar decisão da proposta). */
const STAGE_BOTTLENECK_STAGE: ShowStatus = "PROPOSED";
/**
 * Participação mínima do tempo típico de percurso concentrada em PROPOSED para o
 * nudge disparar. Metade — a maior parte do percurso apenas aguardando decisão já
 * é um gargalo material, não a distribuição natural de um funil saudável.
 */
export const STAGE_BOTTLENECK_SHARE = 0.5;
/** Participação que escala o nudge para crítico (o grosso do percurso numa etapa só). */
export const STAGE_BOTTLENECK_CRITICAL_SHARE = 0.7;
/**
 * Mínimo de shows com transição cronometrada para a composição ser um hábito, não
 * 1–2 casos. Reusa a mesma escala de amostra confiável dos nudges de conversão
 * (`CONVERSION_DROP_MIN_DECIDED`=4).
 */
export const STAGE_BOTTLENECK_MIN_SHOWS = 4;

/** Manchete de gargalo de tempo no funil para o Painel (concentração em PROPOSED). */
export interface StageTimeBottleneckHeadline {
  /** True quando o Painel deve alertar (gargalo em PROPOSED acima do piso, amostra confiável). */
  show: boolean;
  /** True quando a concentração entra na faixa crítica (≥ `criticalShare`). */
  critical: boolean;
  /** Fração do tempo típico de percurso que fica na etapa PROPOSED (0..1). */
  share: number;
  /** Mediana de permanência em PROPOSED (dias) — informativa no banner. */
  medianDays: number;
  /** Soma das medianas de todas as etapas (o percurso típico total, dias). */
  totalMedianDays: number;
  /** Shows que contribuíram transição cronometrada (amostra da composição). */
  sample: number;
}

/**
 * Decide se o Painel deve alertar que o tempo de percurso do funil se concentra na
 * DECISÃO (etapa PROPOSED) — as propostas passam o grosso do caminho até o palco
 * apenas esperando resposta. Recebe uma `funnelStageDurations` já computada (dela
 * extrai a composição via `stageTimeConcentration` e a amostra via `showCount`) e
 * não faz I/O. `show` só quando a etapa DOMINANTE do tempo é PROPOSED, sua fatia é
 * ≥ `minShare` e há amostra confiável (`showCount >= minShows`); `critical` quando a
 * fatia atinge `criticalShare`. Fora do caso PROPOSED (gargalo em CONFIRMED = espera
 * esperada; sem base) não dispara. Puro e determinístico. Ver D285.
 */
export function stageTimeBottleneckHeadline(
  durations: FunnelStageDurations,
  minShare: number = STAGE_BOTTLENECK_SHARE,
  criticalShare: number = STAGE_BOTTLENECK_CRITICAL_SHARE,
  minShows: number = STAGE_BOTTLENECK_MIN_SHOWS,
): StageTimeBottleneckHeadline {
  const concentration = stageTimeConcentration(durations);
  const proposed =
    concentration.shares.find((s) => s.status === STAGE_BOTTLENECK_STAGE) ?? null;
  const dominantIsProposed =
    concentration.dominant?.status === STAGE_BOTTLENECK_STAGE;
  const share = proposed?.share ?? 0;
  const reliable = durations.showCount >= minShows;
  const show = dominantIsProposed && reliable && share >= minShare;
  return {
    show,
    critical: show && share >= criticalShare,
    share,
    medianDays: proposed?.medianDays ?? 0,
    totalMedianDays: concentration.totalMedianDays,
    sample: durations.showCount,
  };
}

// ── Comparativo ano a ano do tempo em cada etapa ─────────────────────────────
// `funnelStageDurations` já recorta por ano (D281); este comparativo casa DUAS
// leituras (o ano selecionado × o anterior) por etapa (`status`) e destila a
// variação da mediana de permanência — quais etapas o funil passou a atravessar
// mais rápido / mais devagar. Espelho por-etapa de `compareProposalDeliberationByContact`
// (D278, deliberação por contratante), aqui no eixo do funil inteiro. Como na
// deliberação, **descer** a mediana é o sinal saudável (o show fica menos tempo
// parado na etapa); subir é a etapa emperrando. Puro, sem I/O: recebe dois
// `funnelStageDurations` já computados. Ver D282.

/**
 * Limiar (dias) da variação da mediana de permanência numa etapa para virar
 * tendência (não ruído). Reusa a mesma escala da deliberação
 * (`DELIBERATION_TREND_EPSILON`=3): uma etapa que atravessa 2 dias mais
 * rápido/devagar de um ano para o outro é rotina; a partir de ~3 dias já é um
 * ritmo diferente. Constante própria para poder ser afinada sem mexer no eixo da
 * deliberação por contratante.
 */
export const STAGE_DURATION_TREND_EPSILON = 3;

/**
 * Variação da permanência de UMA etapa do funil entre dois períodos (o ano
 * selecionado × o anterior). Espelha `ContactProposalDeliberationChange` no eixo
 * da etapa. `medianDaysDelta` negativo = a etapa passou a ser atravessada **mais
 * rápido** (o show fica menos tempo parado ali); positivo = passou a demorar mais.
 */
export interface StageDurationChange {
  /** Etapa comparada (`fromStatus`), presente nos dois períodos. */
  status: string;
  /** Estatística da etapa no período atual. */
  current: StageDurationStat;
  /** Estatística da etapa no período anterior. */
  previous: StageDurationStat;
  /**
   * Variação da mediana de permanência (atual − anterior, em dias). Negativo =
   * atravessa mais rápido agora; positivo = demora mais. Ancora o veredito (a
   * mediana é a leitura principal da página).
   */
  medianDaysDelta: number;
  /** Variação da média de permanência (atual − anterior, em dias) — só informativo. */
  avgDaysDelta: number;
  /**
   * Direção do ritmo da etapa, pela variação da **mediana** contra
   * `STAGE_DURATION_TREND_EPSILON`:
   * - "faster": a mediana caiu além do limiar (atravessa mais rápido);
   * - "slower": subiu além do limiar (fica mais tempo parado);
   * - "stable": dentro do limiar (ruído).
   */
  trend: "faster" | "slower" | "stable";
}

export interface FunnelStageDurationsComparison {
  /**
   * Etapas presentes nos DOIS períodos, com a variação da permanência, na ordem
   * canônica do funil (a mesma ordem em que a página lista as etapas) — para a
   * coluna "vs. {ano-1}" casar linha a linha sem reordenar a tabela.
   */
  changes: StageDurationChange[];
  /** Etapa que mais acelerou (variação de mediana mais negativa entre as "faster"). */
  biggestSpeedup: StageDurationChange | null;
  /** Etapa que mais desacelerou (variação de mediana mais positiva entre as "slower"). */
  biggestSlowdown: StageDurationChange | null;
  /** Etapas com amostra só no período atual (novas no recorte). */
  newStages: StageDurationStat[];
  /** Etapas com amostra só no anterior (sumiram do recorte atual). */
  droppedStages: StageDurationStat[];
}

/**
 * Compara o **tempo em cada etapa** entre dois períodos (atual × anterior),
 * casando as etapas por `status`. Para cada etapa presente nos dois períodos
 * devolve a variação da mediana de permanência (quais etapas passaram a ser
 * atravessadas mais rápido / mais devagar); as que têm amostra só num período
 * viram `newStages`/`droppedStages`.
 *
 * Puro, sem I/O: recebe dois `funnelStageDurations` já computados (cada um
 * recortado ao seu ano via `opts.year`, o eixo de coorte da entrada da proposta no
 * funil — D281). Como na deliberação (D278), aqui **descer** a mediana é o sinal
 * saudável — o show fica menos tempo parado na etapa —; reusa
 * `STAGE_DURATION_TREND_EPSILON` como limiar. Mantém a ORDEM canônica do funil em
 * `changes` (a mesma da página), para a coluna "vs. {ano-1}" alinhar sem reordenar.
 * O chamador decide quando exibir (tipicamente só com um ano específico e ambos os
 * períodos com amostra). Ver D282.
 */
export function compareFunnelStageDurations(
  current: FunnelStageDurations,
  previous: FunnelStageDurations,
): FunnelStageDurationsComparison {
  const prevByStatus = new Map<string, StageDurationStat>();
  for (const s of previous.stages) prevByStatus.set(s.status, s);

  const currentStatuses = new Set<string>();
  const changes: StageDurationChange[] = [];
  const newStages: StageDurationStat[] = [];

  // Preserva a ordem canônica do funil (`current.stages` já vem ordenado).
  for (const cur of current.stages) {
    currentStatuses.add(cur.status);
    const prev = prevByStatus.get(cur.status);
    if (!prev) {
      newStages.push(cur);
      continue;
    }
    const medianDaysDelta = cur.medianDays - prev.medianDays;
    changes.push({
      status: cur.status,
      current: cur,
      previous: prev,
      medianDaysDelta,
      avgDaysDelta: cur.averageDays - prev.averageDays,
      trend:
        medianDaysDelta <= -STAGE_DURATION_TREND_EPSILON
          ? "faster"
          : medianDaysDelta >= STAGE_DURATION_TREND_EPSILON
            ? "slower"
            : "stable",
    });
  }

  const droppedStages = previous.stages.filter((s) => !currentStatuses.has(s.status));

  let biggestSpeedup: StageDurationChange | null = null;
  let biggestSlowdown: StageDurationChange | null = null;
  for (const c of changes) {
    if (
      c.trend === "faster" &&
      (!biggestSpeedup || c.medianDaysDelta < biggestSpeedup.medianDaysDelta)
    ) {
      biggestSpeedup = c;
    }
    if (
      c.trend === "slower" &&
      (!biggestSlowdown || c.medianDaysDelta > biggestSlowdown.medianDaysDelta)
    ) {
      biggestSlowdown = c;
    }
  }

  return { changes, biggestSpeedup, biggestSlowdown, newStages, droppedStages };
}

/**
 * Situação de uma linha da tabela por etapa (período atual) frente ao anterior,
 * para a coluna "vs. {ano-1}" (espelha `ContactProposalDeliberationRowStatus`/D278
 * no eixo da etapa):
 * - "changed": a etapa tinha amostra nos dois períodos — traz a variação;
 * - "new": só tem amostra no período atual (nova no recorte);
 * - "none": status não comparável (não presente no comparativo).
 */
export type StageDurationRowStatus =
  | { kind: "changed"; change: StageDurationChange }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da tabela por etapa (período atual) com sua situação no
 * comparativo `compareFunnelStageDurations`, indexando por `status` para o
 * consumidor resolver a coluna "vs. {ano-1}" em O(1). Puro: recebe o comparativo
 * já computado e devolve uma função de lookup. Uma etapa presente nos dois
 * períodos vira "changed"; uma só no atual (em `newStages`) vira "new"; qualquer
 * outro status vira "none". Espelha `indexContactProposalDeliberationChanges`.
 */
export function indexStageDurationChanges(
  comparison: FunnelStageDurationsComparison,
): (status: string | null | undefined) => StageDurationRowStatus {
  const changedByStatus = new Map<string, StageDurationChange>();
  for (const c of comparison.changes) changedByStatus.set(c.status, c);
  const newStatuses = new Set<string>();
  for (const s of comparison.newStages) newStatuses.add(s.status);

  return (status) => {
    if (!status) return { kind: "none" };
    const change = changedByStatus.get(status);
    if (change) return { kind: "changed", change };
    if (newStatuses.has(status)) return { kind: "new" };
    return { kind: "none" };
  };
}

// ── Tempo de decisão da proposta por contratante ─────────────────────────────
// O tempo-em-etapa (`funnelStageDurations`/D235) mede a velocidade típica de
// travessia do funil somando TODOS os shows. Esta leitura recorta uma etapa só —
// PROPOSTA — e a quebra por contratante: quanto cada contratante costuma demorar
// para DECIDIR uma proposta (avançá-la ou cancelá-la) depois de ela entrar na
// mesa. Reaproveita o mesmo motor: para cada contratante roda
// `funnelStageDurations` sobre os shows dele e destila a estatística da etapa
// PROPOSED. Como o motor credita o tempo à etapa de ORIGEM só quando o show SAI
// dela, propostas ainda em aberto (sem desfecho) não entram na conta — a leitura
// é honesta sobre decisões já tomadas. Espelho por contratante de `paymentLagByContact`
// (prazo de recebimento) e `bookingLeadTimeByContact` (antecedência), aqui no eixo
// da deliberação. Ver D275.

/** Show, como o agregador de deliberação por contratante precisa vê-lo (só eventos). */
export interface ProposalDeliberationShowLike {
  statusEvents: StatusEventLike[];
}

/** Um contratante + os shows a que está vinculado, para a agregação por contratante. */
export interface ContactProposalDeliberationItem<C> {
  contact: C;
  shows: ProposalDeliberationShowLike[];
}

/**
 * Amostra mínima de propostas decididas para a mediana de deliberação de um
 * contratante ser considerada confiável. Alinhado a `MIN_LEAD_TIME_SAMPLE` /
 * `MIN_SHOW_GAP_SAMPLE`: abaixo disso a mediana vira ruído (um caso fora da curva
 * distorce), então a página/CSV suprimem-na (mas o contratante ainda é listado).
 */
export const MIN_DELIBERATION_SAMPLE = 3;

/** Deliberação da proposta de um contratante (a etapa PROPOSED do seu funil). */
export interface ContactProposalDeliberationRow<C> {
  /** Contratante do grupo. */
  contact: C;
  /** Estatística da etapa PROPOSED dos shows dele (mediana/média/mín/máx/amostra). */
  stat: StageDurationStat;
  /** `stat.count >= MIN_DELIBERATION_SAMPLE`: gate de confiança da mediana. */
  reliable: boolean;
  /** Participação deste contratante na amostra total de decisões (0..1). */
  share: number;
}

/** Resultado de `proposalDeliberationByContact`. */
export interface ProposalDeliberationByContact<C> {
  /**
   * Contratantes com ao menos uma proposta decidida (transição de saída de
   * PROPOSED), ordenados da menor mediana de deliberação à maior (decide rápido
   * primeiro), depois maior amostra, nome pt-BR e id.
   */
  rows: ContactProposalDeliberationRow<C>[];
  /** Nº de contratantes na lista (= `rows.length`). */
  contactCount: number;
  /**
   * Deliberação da carteira inteira: a etapa PROPOSED sobre TODAS as relações
   * achatadas (um show com N contatos conta N vezes, como `overall` de
   * `proposalOutcomesByContact`), ou `null` se ninguém decidiu proposta ainda.
   */
  overall: StageDurationStat | null;
  /** Total de decisões cronometradas (soma dos `stat.count` por relação). */
  totalSamples: number;
  /**
   * O contratante que mais te deixa esperando: maior mediana de deliberação
   * entre os com amostra confiável (`reliable`), ou `null` se nenhum a tem. Só
   * vira destaque quando há mais de um contratante confiável (senão a "comparação"
   * seria consigo mesmo).
   */
  slowest: ContactProposalDeliberationRow<C> | null;
}

/**
 * Tempo de decisão da proposta por contratante: para cada contratante, roda
 * `funnelStageDurations` sobre os shows dele e extrai a estatística da etapa
 * PROPOSED — quanto tempo suas propostas costumam ficar na mesa antes de virar
 * confirmação ou cancelamento. Só viram linha os contratantes com ao menos uma
 * decisão cronometrada (proposta que já saiu de PROPOSED); os que só têm proposta
 * ainda em aberto ficam de fora (sem número honesto a mostrar). O agregado
 * `overall` roda o mesmo motor sobre as relações achatadas (por relação, como o
 * funil por contratante). Ordena da menor mediana à maior (decide rápido primeiro),
 * com maior amostra, nome pt-BR e id como desempate. Pura e determinística — não
 * depende de "agora".
 *
 * Com `opts.year` (ano UTC) recorta às propostas que ENTRARAM no funil naquele ano
 * — o mesmo eixo de coorte de `proposalOutcomes`/D243 (primeiro `toStatus ===
 * PROPOSED`), não a data do show —, espelhando o recorte de
 * `proposalOutcomesByContact`. Filtra os shows de cada contratante antes de
 * `funnelStageDurations`, mantendo o motor agnóstico ao recorte. Ver D275/D276.
 */
export function proposalDeliberationByContact<C extends { id: string; name: string }>(
  items: ContactProposalDeliberationItem<C>[],
  opts: ProposalOutcomesOptions = {},
): ProposalDeliberationByContact<C> {
  const year = opts.year ?? "all";
  const inYear = (show: ProposalDeliberationShowLike): boolean => {
    if (year === "all") return true;
    const proposedAt = firstProposedAt(show.statusEvents);
    return proposedAt !== null && new Date(proposedAt).getUTCFullYear() === year;
  };
  const scope = (shows: ProposalDeliberationShowLike[]): ProposalDeliberationShowLike[] =>
    year === "all" ? shows : shows.filter(inYear);

  const rows: ContactProposalDeliberationRow<C>[] = [];
  let totalSamples = 0;

  for (const { contact, shows } of items) {
    const stat = funnelStageDurations(scope(shows)).stages.find((s) => s.status === "PROPOSED");
    if (!stat) continue; // nenhuma proposta decidida deste contratante → fora da lista
    totalSamples += stat.count;
    rows.push({ contact, stat, reliable: stat.count >= MIN_DELIBERATION_SAMPLE, share: 0 });
  }

  // Participação só faz sentido depois de conhecer o total (por relação).
  for (const row of rows) {
    row.share = totalSamples > 0 ? row.stat.count / totalSamples : 0;
  }

  rows.sort((a, b) => {
    if (a.stat.medianDays !== b.stat.medianDays) return a.stat.medianDays - b.stat.medianDays;
    if (a.stat.count !== b.stat.count) return b.stat.count - a.stat.count;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  const overall =
    funnelStageDurations(scope(items.flatMap((i) => i.shows))).stages.find(
      (s) => s.status === "PROPOSED",
    ) ?? null;

  // "Quem mais te deixa esperando": maior mediana entre os confiáveis, mas só
  // quando há mais de um confiável (senão o destaque seria trivial).
  const reliableRows = rows.filter((r) => r.reliable);
  let slowest: ContactProposalDeliberationRow<C> | null = null;
  if (reliableRows.length > 1) {
    slowest = reliableRows.reduce((best, r) =>
      r.stat.medianDays > best.stat.medianDays ? r : best,
    );
  }

  return { rows, contactCount: rows.length, overall, totalSamples, slowest };
}

// ── Comparativo ano a ano do tempo de decisão por contratante ────────────────
// Espelha `comparePaymentLagByContact`/`compareBookingLeadTimeByContact`
// (D194/D196) no eixo da deliberação: casa os contratantes entre dois períodos
// (o ano selecionado × o anterior) para revelar quem passou a DECIDIR mais rápido
// / mais devagar uma proposta, além de quem entrou e quem sumiu da carteira. Como
// no prazo de recebimento (descer o prazo é a melhora), aqui **descer** a mediana
// de deliberação é a melhora (a proposta fica menos tempo parada na mesa). O
// veredito ancora na mediana — o mesmo eixo por que a página ordena (menor
// primeiro) e destaca (`slowest`). Puro e determinístico. Ver D278.

/**
 * Limiar (dias) da variação da mediana de deliberação para virar tendência (não
 * ruído). Uma proposta que decide 2 dias mais rápido/devagar de um ano para o
 * outro é rotina; a partir de ~3 dias já é um hábito diferente. Menor que o
 * `PAYMENT_LAG_TREND_EPSILON`/`LEAD_TIME_TREND_EPSILON` (=7) porque a deliberação
 * costuma ser mais curta que o prazo de recebimento ou a antecedência de agenda.
 */
export const DELIBERATION_TREND_EPSILON = 3;

/**
 * Variação da deliberação de UM contratante entre dois períodos (o ano
 * selecionado × o anterior). Espelha `ContactPaymentLagChange` no eixo da
 * decisão. `medianDaysDelta` negativo = o contratante passou a decidir **mais
 * rápido** (melhora); positivo = passou a demorar mais (piora).
 */
export interface ContactProposalDeliberationChange<C> {
  /** Contratante comparado — sempre identificado (a deliberação não tem grupo "sem contratante"). */
  contact: C;
  /** Linha do contratante no período atual. */
  current: ContactProposalDeliberationRow<C>;
  /** Linha do contratante no período anterior. */
  previous: ContactProposalDeliberationRow<C>;
  /**
   * Variação da mediana de deliberação (atual − anterior, em dias). Negativo =
   * decide mais rápido agora (melhora); positivo = demora mais (piora). Ancora o
   * veredito (o mesmo eixo por que a página ordena/destaca).
   */
  medianDaysDelta: number;
  /** Variação da média de deliberação (atual − anterior, em dias) — só informativo. */
  avgDaysDelta: number;
  /**
   * Direção do hábito de decisão do contratante, pela variação da **mediana**
   * contra `DELIBERATION_TREND_EPSILON`:
   * - "improved": a mediana caiu além do limiar (decide mais rápido);
   * - "worsened": subiu além do limiar (demora mais para decidir);
   * - "stable": dentro do limiar (ruído).
   */
  trend: "improved" | "worsened" | "stable";
}

export interface ProposalDeliberationByContactComparison<C> {
  /**
   * Contratantes presentes nos DOIS períodos, com a variação da deliberação.
   * Ordenados da maior piora à maior melhora (quem passou a demorar mais para
   * decidir primeiro), para o "mover" de cima do card ser o que mais merece atenção.
   */
  changes: ContactProposalDeliberationChange<C>[];
  /** Quem mais acelerou a decisão (variação de mediana mais negativa entre os "improved"). */
  biggestImprovement: ContactProposalDeliberationChange<C> | null;
  /** Quem mais desacelerou (variação de mediana mais positiva entre os "worsened"). */
  biggestWorsening: ContactProposalDeliberationChange<C> | null;
  /** Contratantes que só decidiram proposta no período atual (novos na carteira). */
  newContacts: ContactProposalDeliberationRow<C>[];
  /** Contratantes que decidiram no anterior mas não no atual (sumiram da carteira). */
  droppedContacts: ContactProposalDeliberationRow<C>[];
}

/**
 * Compara o **tempo de decisão por contratante** entre dois períodos (atual ×
 * anterior), casando os contratantes por `contact.id`. Para cada um presente nos
 * dois períodos devolve a variação da deliberação (quem passou a decidir mais
 * rápido / mais devagar); os que aparecem só num período viram
 * `newContacts`/`droppedContacts`.
 *
 * Puro, sem I/O: recebe dois `proposalDeliberationByContact` já computados (cada
 * um recortado ao seu ano via `opts.year`, o eixo de coorte da entrada da
 * proposta no funil — D276). Como no prazo de recebimento (D194), aqui **descer**
 * a mediana é a melhora — a proposta sai mais rápido da mesa —, ao contrário da
 * antecedência (D196, onde subir é a melhora); reusa `DELIBERATION_TREND_EPSILON`
 * como limiar. Por contratante a amostra costuma ser pequena, então o chamador
 * tipicamente marca os destaques abaixo de `MIN_DELIBERATION_SAMPLE` como amostra
 * fina. O chamador decide quando exibir (tipicamente só com um ano específico e
 * ambos os períodos com decisão cronometrada).
 */
export function compareProposalDeliberationByContact<C extends { id: string }>(
  current: ProposalDeliberationByContact<C>,
  previous: ProposalDeliberationByContact<C>,
): ProposalDeliberationByContactComparison<C> {
  const prevById = new Map<string, ContactProposalDeliberationRow<C>>();
  for (const r of previous.rows) prevById.set(r.contact.id, r);

  const currentIds = new Set<string>();
  const changes: ContactProposalDeliberationChange<C>[] = [];
  const newContacts: ContactProposalDeliberationRow<C>[] = [];

  for (const cur of current.rows) {
    currentIds.add(cur.contact.id);
    const prev = prevById.get(cur.contact.id);
    if (!prev) {
      newContacts.push(cur);
      continue;
    }
    const medianDaysDelta = cur.stat.medianDays - prev.stat.medianDays;
    changes.push({
      contact: cur.contact,
      current: cur,
      previous: prev,
      medianDaysDelta,
      avgDaysDelta: cur.stat.averageDays - prev.stat.averageDays,
      trend:
        medianDaysDelta <= -DELIBERATION_TREND_EPSILON
          ? "improved"
          : medianDaysDelta >= DELIBERATION_TREND_EPSILON
            ? "worsened"
            : "stable",
    });
  }

  const droppedContacts = previous.rows.filter((r) => !currentIds.has(r.contact.id));

  // Maior piora no topo (demora crescendo primeiro): variação de mediana desc;
  // empate estável pelo id.
  changes.sort(
    (a, b) =>
      b.medianDaysDelta - a.medianDaysDelta ||
      a.contact.id.localeCompare(b.contact.id),
  );

  let biggestImprovement: ContactProposalDeliberationChange<C> | null = null;
  let biggestWorsening: ContactProposalDeliberationChange<C> | null = null;
  for (const c of changes) {
    if (
      c.trend === "improved" &&
      (!biggestImprovement || c.medianDaysDelta < biggestImprovement.medianDaysDelta)
    ) {
      biggestImprovement = c;
    }
    if (
      c.trend === "worsened" &&
      (!biggestWorsening || c.medianDaysDelta > biggestWorsening.medianDaysDelta)
    ) {
      biggestWorsening = c;
    }
  }

  return { changes, biggestImprovement, biggestWorsening, newContacts, droppedContacts };
}

/**
 * Situação de uma linha da tabela por contratante (período atual) frente ao
 * período anterior, para a coluna "vs. {ano-1}" (espelha
 * `ContactBookingLeadTimeRowStatus`/D196 no eixo da deliberação):
 * - "changed": o contratante existia nos dois períodos — traz a variação da deliberação;
 * - "new": só apareceu no período atual (começou a decidir agora);
 * - "none": id não comparável (não presente no comparativo).
 */
export type ContactProposalDeliberationRowStatus<C> =
  | { kind: "changed"; change: ContactProposalDeliberationChange<C> }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da tabela por contratante (período atual) com sua situação no
 * comparativo `compareProposalDeliberationByContact`, indexando por `contact.id`
 * para o consumidor resolver a coluna "vs. {ano-1}" em O(1) — sem repetir a
 * varredura na apresentação. Puro: recebe o comparativo já computado e devolve uma
 * função de lookup. Um contratante presente nos dois períodos vira "changed"; um
 * que só está no atual (em `newContacts`) vira "new"; qualquer outro id vira
 * "none". Espelha `indexContactBookingLeadTimeChanges`.
 */
export function indexContactProposalDeliberationChanges<C extends { id: string }>(
  comparison: ProposalDeliberationByContactComparison<C>,
): (contactId: string | null | undefined) => ContactProposalDeliberationRowStatus<C> {
  const changedById = new Map<string, ContactProposalDeliberationChange<C>>();
  for (const c of comparison.changes) changedById.set(c.contact.id, c);
  const newIds = new Set<string>();
  for (const r of comparison.newContacts) newIds.add(r.contact.id);

  return (contactId) => {
    if (!contactId) return { kind: "none" };
    const change = changedById.get(contactId);
    if (change) return { kind: "changed", change };
    if (newIds.has(contactId)) return { kind: "new" };
    return { kind: "none" };
  };
}

// ── Nudge do Painel: o contratante mais lento a decidir ──────────────────────
// `proposalDeliberationByContact` (D275) já sabe QUEM te deixa mais tempo com a
// proposta na mesa (o `slowest`), mas esse sinal só vivia na página dedicada
// `/shows/funil/tempo-em-etapa/por-contratante`. Uma deliberação que se arrasta é
// tão acionável quanto a conversão caindo (D248) ou a antecedência encolhendo
// (D272): se um parceiro leva semanas para decidir, propostas suas ficam reféns
// dele — vale cobrar a decisão / propor prazo. Este helper destila o relatório num
// nudge, espelho dos headlines irmãos por-contratante: parte do `slowest` (que já
// exige >1 contratante confiável) e só morde quando a demora dele é materialmente
// pior que a TÍPICA da carteira, em termos relativos E absolutos. Pura, sem I/O.

/**
 * Fator mínimo sobre a deliberação TÍPICA da carteira para o Painel destacar um
 * contratante lento. 2× o mediano geral — abaixo disso a demora dele é a própria
 * rotina do funil e o aviso viraria ruído (mesma disciplina de `DRY_SPELL_UNUSUAL_RATIO`).
 */
export const DELIBERATION_SLOW_RATIO = 2;
/** Fator que escala o nudge para crítico (o contratante decide num ritmo ≥ 3× o típico). */
export const DELIBERATION_SLOW_CRITICAL_RATIO = 3;
/**
 * Piso absoluto (dias) da mediana do contratante para o nudge disparar. Sem ele,
 * "2× de 1 dia = 2 dias" viraria alerta — a demora precisa ser material em ABSOLUTO
 * além de relativa. Uma semana: o mesmo horizonte sensato de "proposta parada há tempo".
 */
export const DELIBERATION_SLOW_MIN_DAYS = 7;

/** Manchete do contratante mais lento a decidir, para o Painel (nudge de "cobre a decisão"). */
export interface SlowDeliberatorHeadline<C> {
  /** True quando o nudge deve aparecer (um contratante confiável decide bem mais devagar que o típico). */
  show: boolean;
  /** True quando o ritmo dele chega a `criticalRatio`× o típico (outlier de deliberação). */
  critical: boolean;
  /** O contratante mais lento (o `slowest` do relatório) quando dispara, ou `null`. */
  contact: C | null;
  /** Mediana de dias que as propostas dele passam na mesa antes da decisão. */
  medianDays: number;
  /** Deliberação típica da carteira (mediana geral, dias) — a base da comparação. */
  typicalDays: number;
  /** Quantas vezes o típico a mediana dele representa (`medianDays / typicalDays`). */
  ratio: number;
  /** Decisões cronometradas do contratante (a amostra da mediana dele). */
  sample: number;
}

/**
 * Decide se o Painel deve destacar o contratante que mais te deixa esperando uma
 * decisão — o eco de `proposalDeliberationByContact` (D275) no dashboard, irmão de
 * `contactBookingLeadTimeDropHeadline`/`contactConversionDropHeadline` no eixo da
 * deliberação. Recebe um relatório já computado e não faz I/O.
 *
 * Parte do `slowest` (que já exige >1 contratante confiável, senão o "mais lento"
 * seria trivial) e só vira nudge quando a mediana dele é materialmente pior que a
 * TÍPICA da carteira: ao menos `slowRatio`× o mediano geral **e** ao menos `minDays`
 * em ABSOLUTO (para "2× de 1 dia" não alertar). `critical` quando o ritmo chega a
 * `criticalRatio`× o típico. Sem um mediano geral positivo não há base de comparação
 * (o gate não dispara). Como os nudges irmãos, só a ponta ruim vira alerta e o gate
 * o mantém raro. Pura.
 */
export function slowDeliberatorHeadline<C extends { id: string; name: string }>(
  report: ProposalDeliberationByContact<C>,
  slowRatio: number = DELIBERATION_SLOW_RATIO,
  minDays: number = DELIBERATION_SLOW_MIN_DAYS,
  criticalRatio: number = DELIBERATION_SLOW_CRITICAL_RATIO,
): SlowDeliberatorHeadline<C> {
  const slowest = report.slowest;
  const typical = report.overall?.medianDays ?? 0;
  if (!slowest || typical <= 0) {
    return {
      show: false,
      critical: false,
      contact: null,
      medianDays: 0,
      typicalDays: 0,
      ratio: 0,
      sample: 0,
    };
  }
  const median = slowest.stat.medianDays;
  const ratio = median / typical;
  const show = median >= minDays && ratio >= slowRatio;
  return {
    show,
    critical: show && ratio >= criticalRatio,
    contact: show ? slowest.contact : null,
    medianDays: median,
    typicalDays: typical,
    ratio,
    sample: slowest.stat.count,
  };
}

// ── Manchete de deliberação POR CONTRATANTE para o Painel (quem passou a decidir mais devagar?) ──
// Enquanto `slowDeliberatorHeadline` (D277) destaca quem, HOJE, decide bem mais
// devagar que a TÍPICA da carteira (retrato absoluto vs. mediano geral), este destila
// QUAL contratante recorrente passou a te deixar materialmente MAIS tempo com a
// proposta na mesa de um ano para o outro — o eco de `compareProposalDeliberationByContact`
// (D278) no dashboard, espelho de `contactPaymentLagRiseHeadline` (D279) e
// `contactBookingLeadTimeDropHeadline` (D272) no eixo da deliberação. Pega o caso que o
// nudge absoluto perde: a carteira decide num ritmo saudável na média, mas um parceiro
// específico começou a arrastar a decisão. Reusa o gate de confiança dos irmãos
// (amostra ≥ `MIN_DELIBERATION_SAMPLE` nas DUAS coortes) e um piso de piora material
// (≥ `DELIBERATION_RISE_DAYS`, o dobro do `DELIBERATION_TREND_EPSILON` do veredito do
// card). Ancora na MEDIANA — o mesmo eixo por que a página ordena/destaca e o comparativo
// decide a tendência. Só a ponta de PIORA (decisão mais lenta) vira nudge; acelerar a
// decisão é boa notícia. Pura, sem I/O.

/**
 * Alta mínima da deliberação mediana (em dias) para o nudge por contratante
 * disparar. Uma semana — o dobro de `DELIBERATION_TREND_EPSILON` (=3, o limiar do
 * veredito do card): espelha a regra "2× o epsilon do card" de `LEAD_TIME_DROP_DAYS`
 * e `PAYMENT_LAG_RISE_DAYS` para o Painel só alertar com uma piora material, não
 * qualquer oscilação. Menor que os irmãos (14) porque a deliberação costuma ser mais
 * curta que o prazo de recebimento ou a antecedência de agenda.
 */
export const DELIBERATION_RISE_DAYS = 6;
/** Alta da deliberação mediana (em dias) que escala o nudge para crítico (duas semanas a mais na mesa). */
export const DELIBERATION_RISE_CRITICAL_DAYS = 14;

/** Manchete de deliberação por contratante para o Painel (nudge de decisão mais lenta ano a ano). */
export interface ContactDeliberationRiseHeadline<C> {
  /** True quando o nudge deve aparecer (um contratante com piora confiável e material). */
  show: boolean;
  /** True quando a piora desse contratante entra na faixa crítica (≥ `criticalDays`). */
  critical: boolean;
  /** O contratante que mais desacelerou a decisão (dentre os que passam no gate), ou `null`. */
  contact: C | null;
  /** Aumento da deliberação mediana em dias (atual − anterior); ≥ 0 quando `show`. */
  riseDays: number;
  /** Deliberação mediana do contratante na coorte atual (dias). */
  currentMedianDays: number;
  /** Deliberação mediana do contratante na coorte anterior (dias). */
  previousMedianDays: number;
  /** Decisões cronometradas do contratante na coorte atual (a amostra da mediana). */
  sample: number;
  /**
   * Quantos OUTROS contratantes também passaram no gate de piora material e
   * confiável (para o banner: "+N desaceleraram"). 0 quando só um qualifica.
   */
  others: number;
}

/**
 * Decide se o Painel deve alertar que UM contratante específico passou a demorar
 * materialmente MAIS para decidir uma proposta de um ano para o outro — o eco de
 * `compareProposalDeliberationByContact` (D278) no dashboard, irmão por-contratante de
 * `slowDeliberatorHeadline` no eixo absoluto e espelho de `contactPaymentLagRiseHeadline`
 * (D279)/`contactBookingLeadTimeDropHeadline` (D272) no eixo da deliberação. Recebe um
 * comparativo já computado (dois `proposalDeliberationByContact`, cada um sobre a coorte
 * do seu ano) e não faz I/O.
 *
 * Varre os `changes` (já ordenados da maior piora à maior melhora, por `medianDaysDelta`
 * desc) e escolhe o contratante de MAIOR alta de deliberação que ainda tenha amostra
 * confiável — ao menos `minSample` decisões cronometradas em CADA coorte, para a mediana
 * não se apoiar em 1–2 propostas — e alta de ao menos `riseDays` dias. `critical` quando
 * essa alta chega a `criticalDays` ou mais; `others` conta quantos outros contratantes
 * também passariam no mesmo gate (o banner os resume). Como os nudges irmãos, só a ponta de
 * PIORA vira alerta e o gate o mantém raro. Ancora na MEDIANA, como o comparativo. Pura.
 */
export function contactDeliberationRiseHeadline<C extends { id: string; name: string }>(
  comparison: ProposalDeliberationByContactComparison<C>,
  minSample: number = MIN_DELIBERATION_SAMPLE,
  riseDays: number = DELIBERATION_RISE_DAYS,
  criticalDays: number = DELIBERATION_RISE_CRITICAL_DAYS,
): ContactDeliberationRiseHeadline<C> {
  const qualifies = (c: ContactProposalDeliberationChange<C>): boolean => {
    const reliable =
      c.current.stat.count >= minSample && c.previous.stat.count >= minSample;
    return reliable && c.medianDaysDelta >= riseDays;
  };

  // `changes` já vem ordenado por `medianDaysDelta` desc (maior piora de decisão
  // primeiro), então o primeiro que passa no gate é o de maior alta.
  const worst = comparison.changes.find(qualifies) ?? null;
  if (!worst) {
    return {
      show: false,
      critical: false,
      contact: null,
      riseDays: 0,
      currentMedianDays: 0,
      previousMedianDays: 0,
      sample: 0,
      others: 0,
    };
  }

  const rise = worst.medianDaysDelta;
  const others = comparison.changes.reduce(
    (n, c) => (c !== worst && qualifies(c) ? n + 1 : n),
    0,
  );
  return {
    show: true,
    critical: rise >= criticalDays,
    contact: worst.contact,
    riseDays: rise,
    currentMedianDays: worst.current.stat.medianDays,
    previousMedianDays: worst.previous.stat.medianDays,
    sample: worst.current.stat.count,
    others,
  };
}

// ── Conversão real proposta → realizado (coorte, pela linha do tempo) ─────────
// A "taxa de concretização" do funil (`showPipeline`) é um retrato do estado
// ATUAL: dos shows que hoje estão PLAYED ou CANCELLED, quantos foram tocados. Ela
// não sabe QUANDO cada proposta entrou no funil — só onde o show está agora, e o
// recorte por período usa a data do SHOW (quando ele acontece), não a data da
// PROPOSTA. Esta leitura é diferente: monta a COORTE das propostas pela data em
// que entraram no funil (o primeiro evento `toStatus === PROPOSED`, da D234) e
// acompanha o desfecho de cada uma — virou palco (chegou a PLAYED), foi perdida
// (chegou a CANCELLED sem tocar) ou ainda está em andamento. Responde "das
// propostas que fiz em {ano}, quantas viraram show?", que o retrato de estado não
// alcança. Só existe sobre o histórico de status (sem backfill dos shows antigos,
// como o tempo-em-etapa/D235). Ver D243.

/** Show, como o rastreador de conversão de propostas precisa vê-lo (só eventos). */
export interface ProposalOutcomeShowLike {
  statusEvents: StatusEventLike[];
}

/** Desfecho de uma proposta ao longo da sua vida no funil. */
export type ProposalOutcome = "won" | "lost" | "open";

/** Conversão real das propostas (coorte pela data de entrada no funil). */
export interface ProposalConversion {
  /** Nº de propostas na coorte (shows que entraram em PROPOSED no recorte). */
  total: number;
  /** Chegaram a PLAYED em algum momento (ganhas). */
  wonCount: number;
  /** Chegaram a CANCELLED sem nunca ter tocado (perdidas). */
  lostCount: number;
  /** Ainda em andamento — nem PLAYED nem CANCELLED (em aberto). */
  openCount: number;
  /** `wonCount + lostCount`: propostas com desfecho definido. */
  decidedCount: number;
  /**
   * Taxa de conversão real: `wonCount / decidedCount` (0..1), ou `null` sem
   * nenhuma proposta decidida. É a leitura principal — das que tiveram desfecho,
   * a fração que virou palco.
   */
  conversionRate: number | null;
  /**
   * Fração da coorte inteira que já virou palco: `wonCount / total` (0..1), ou
   * `null` sem coorte. Informativa (penaliza propostas ainda em andamento).
   */
  winRate: number | null;
}

/** Opções de `proposalOutcomes`/`proposalOutcomeYears`. */
export interface ProposalOutcomesOptions {
  /**
   * Recorte por ano (UTC) da entrada da proposta no funil; `"all"` (ou omitido)
   * não recorta. Diferente do funil, o eixo é a data da PROPOSTA, não a do show.
   */
  year?: number | "all";
}

/**
 * Momento (ms) em que o show entrou em PROPOSED pela primeira vez, ou `null` se
 * nunca houve um evento `toStatus === PROPOSED` registrado (fora da coorte —
 * shows antigos sem histórico, ou que nasceram já em outro status). Puro.
 */
function firstProposedAt(events: StatusEventLike[]): number | null {
  let earliest: number | null = null;
  for (const e of events) {
    if (e.toStatus !== "PROPOSED") continue;
    const ms = new Date(e.createdAt).getTime();
    if (earliest === null || ms < earliest) earliest = ms;
  }
  return earliest;
}

/** Desfecho de uma proposta a partir dos seus eventos: PLAYED vence CANCELLED. */
function proposalOutcome(events: StatusEventLike[]): ProposalOutcome {
  let cancelled = false;
  for (const e of events) {
    if (e.toStatus === "PLAYED") return "won";
    if (e.toStatus === "CANCELLED") cancelled = true;
  }
  return cancelled ? "lost" : "open";
}

/**
 * Conversão real das propostas ao longo do tempo, agregando a linha do tempo de
 * status (`ShowStatusEvent`/D234) de vários shows. Monta a coorte dos shows que
 * entraram em PROPOSED (primeiro evento `toStatus === PROPOSED`) e classifica o
 * desfecho de cada um: ganho (chegou a PLAYED), perdido (chegou a CANCELLED sem
 * tocar) ou em aberto. Distinta da taxa de concretização do funil
 * (`showPipeline`), que é um retrato do estado atual recortado pela data do show:
 * aqui a coorte é pela data da PROPOSTA e acompanha a jornada completa.
 *
 * Com `opts.year` (ano UTC) restringe a coorte às propostas que entraram no funil
 * naquele ano — o recorte que o retrato de estado não sabe fazer. Pura e
 * determinística (não depende de "agora"; propostas em aberto ficam em
 * `openCount`, fora do denominador da taxa). Ver D243.
 */
export function proposalOutcomes(
  shows: ProposalOutcomeShowLike[],
  opts: ProposalOutcomesOptions = {},
): ProposalConversion {
  const year = opts.year ?? "all";
  let wonCount = 0;
  let lostCount = 0;
  let openCount = 0;

  for (const show of shows) {
    const proposedAt = firstProposedAt(show.statusEvents);
    if (proposedAt === null) continue; // fora da coorte
    if (year !== "all" && new Date(proposedAt).getUTCFullYear() !== year) continue;

    switch (proposalOutcome(show.statusEvents)) {
      case "won":
        wonCount += 1;
        break;
      case "lost":
        lostCount += 1;
        break;
      default:
        openCount += 1;
    }
  }

  const total = wonCount + lostCount + openCount;
  const decidedCount = wonCount + lostCount;
  return {
    total,
    wonCount,
    lostCount,
    openCount,
    decidedCount,
    conversionRate: decidedCount > 0 ? wonCount / decidedCount : null,
    winRate: total > 0 ? wonCount / total : null,
  };
}

/**
 * Anos (UTC, decrescente) em que houve entrada de proposta no funil — alimenta o
 * seletor de período de `/shows/funil/conversao` sem oferecer anos sem coorte.
 * Espelha `showProfitYears`/`gigSeasonalityYears` no eixo da data da proposta
 * (primeiro `toStatus === PROPOSED`), não da data do show. Puro; deduplica.
 */
export function proposalOutcomeYears(shows: ProposalOutcomeShowLike[]): number[] {
  const years = new Set<number>();
  for (const show of shows) {
    const proposedAt = firstProposedAt(show.statusEvents);
    if (proposedAt !== null) years.add(new Date(proposedAt).getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

// ── Conversão real por contratante (de quem minhas propostas viram show?) ─────
// Enquanto `proposalOutcomes` (D243) mede a conversão real da coorte INTEIRA (das
// propostas de {ano}, quantas viraram palco), esta quebra a mesma leitura POR
// contratante — para quais deles minhas propostas de fato fecham. Distinta do
// funil por contratante (`pipelineByContact`/D184, um retrato do estado atual
// pelo cachê aberto): aqui o eixo é a COORTE pela data da proposta e a jornada
// completa via eventos de status (D234). Reaproveita `proposalOutcomes` por grupo
// (mesma classificação de desfecho), sem duplicar a regra. A contagem é por
// relação (um show com vários contatos conta para cada um, como o funil por
// contratante). Pura e determinística.

/** Um contratante e os shows a ele vinculados, para a conversão por contratante. */
export interface ContactProposalConversionItem<C> {
  contact: C;
  shows: ProposalOutcomeShowLike[];
}

/** Linha da conversão por contratante: o contato + a conversão da sua coorte. */
export interface ContactProposalConversionRow<C> {
  contact: C;
  conversion: ProposalConversion;
}

/** Conversão real das propostas agregada por contratante. */
export interface ContactProposalConversion<C> {
  /**
   * Contratantes com ao menos uma proposta na coorte do recorte
   * (`conversion.total >= 1`), ordenados por taxa de conversão desc (indefinida
   * ao fim), depois nº de decididas / ganhas / coorte desc, nome pt-BR e id.
   */
  rows: ContactProposalConversionRow<C>[];
  /** Nº de contratantes com coorte não-vazia (= `rows.length`). */
  contactCount: number;
  /**
   * Conversão da carteira inteira somando as coortes por relação (um show com N
   * contatos conta N vezes, como o funil por contratante). É um agregado por
   * relação, não a coorte deduplicada — coerente com a contagem por-relação das
   * linhas; a leitura deduplicada global vive em `/shows/funil/conversao`.
   */
  overall: ProposalConversion;
}

/**
 * Conversão real das propostas por contratante: para cada contato, monta a coorte
 * das suas propostas (via `proposalOutcomes`, o mesmo desfecho ganho/perdido/aberto
 * da D243) e destila a taxa de conversão. Só viram linha os contatos com coorte
 * não-vazia no recorte; o agregado `overall` soma por relação (um show partilhado
 * conta para cada contato, como `pipelineByContact`). `opts.year` recorta a coorte
 * pela data da PROPOSTA (repassado a `proposalOutcomes`). Pura e determinística.
 * Ordena por taxa de conversão desc (indefinida ao fim), depois nº de decididas,
 * ganhas e coorte desc, nome pt-BR e id — a taxa lidera, mas o volume de decididas
 * desempata para não colocar amostras finas (1/1) acima de conversões robustas.
 */
export function proposalOutcomesByContact<C extends { id: string; name: string }>(
  items: ContactProposalConversionItem<C>[],
  opts: ProposalOutcomesOptions = {},
): ContactProposalConversion<C> {
  const rows: ContactProposalConversionRow<C>[] = [];
  let won = 0;
  let lost = 0;
  let open = 0;

  for (const { contact, shows } of items) {
    const conversion = proposalOutcomes(shows, opts);
    won += conversion.wonCount;
    lost += conversion.lostCount;
    open += conversion.openCount;
    if (conversion.total === 0) continue; // sem coorte no recorte → fora da lista
    rows.push({ contact, conversion });
  }

  rows.sort((a, b) => {
    const ac = a.conversion;
    const bc = b.conversion;
    // Taxa de conversão desc, com indefinida (null) sempre ao fim.
    const ar = ac.conversionRate;
    const br = bc.conversionRate;
    if (ar == null && br != null) return 1;
    if (ar != null && br == null) return -1;
    if (ar != null && br != null && ar !== br) return br - ar;
    if (bc.decidedCount !== ac.decidedCount) return bc.decidedCount - ac.decidedCount;
    if (bc.wonCount !== ac.wonCount) return bc.wonCount - ac.wonCount;
    if (bc.total !== ac.total) return bc.total - ac.total;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  const total = won + lost + open;
  const decidedCount = won + lost;
  const overall: ProposalConversion = {
    total,
    wonCount: won,
    lostCount: lost,
    openCount: open,
    decidedCount,
    conversionRate: decidedCount > 0 ? won / decidedCount : null,
    winRate: total > 0 ? won / total : null,
  };

  return { rows, contactCount: rows.length, overall };
}

// ── Comparativo ano a ano da conversão real (fechei mais das que propus?) ─────
// Enquanto `proposalOutcomes` (D243) mede a conversão real de UMA coorte (das
// propostas de {ano}, quantas viraram palco), este compara a taxa de conversão
// entre duas coortes — a do ano selecionado × a do ano anterior. Espelha
// `compareShowPipelines` (D209, funil geral) e `compareContactPipelines` (D236,
// por contratante) no eixo da COORTE (data da proposta), não do estado atual:
// reusa o mesmo `CONVERSION_TREND_EPSILON` (=0.05) e a mesma direção (subir a
// taxa é melhora). Fecha o "próximo possível (a)" da D243.

/** Comparativo ano a ano da conversão real de propostas (duas coortes). */
export interface ProposalConversionComparison {
  /** Conversão da coorte do período atual (tipicamente o ano selecionado). */
  current: ProposalConversion;
  /** Conversão da coorte do período de comparação (tipicamente o ano anterior). */
  previous: ProposalConversion;
  /**
   * Variação da taxa de conversão real (atual − anterior, em pontos 0..1).
   * `null` quando algum dos períodos não tem proposta decidida (taxa indefinida)
   * — aí não há comparação possível. Positivo = fechando uma fração maior das
   * propostas agora (melhora); negativo = mais propostas viraram perda (piora).
   */
  conversionRateDelta: number | null;
  /**
   * Variação da taxa de vazão da coorte inteira: `winRate` atual − anterior (em
   * pontos 0..1), ou `null` quando algum dos períodos não tem coorte (sem
   * proposta). Diferente de `conversionRateDelta`, o denominador aqui é a coorte
   * TODA (inclui as em aberto), então penaliza propostas ainda paradas — as duas
   * variações podem apontar em sentidos opostos (a taxa das decididas sobe
   * enquanto a vazão cai porque muita proposta ficou em aberto, e vice-versa).
   * Leitura complementar de throughput proposta→palco. Ver D243.
   */
  winRateDelta: number | null;
  /** Variação da contagem de propostas ganhas — viraram palco (atual − anterior). */
  wonCountDelta: number;
  /** Variação da contagem de propostas decididas — ganhas+perdidas (atual − anterior). */
  decidedCountDelta: number;
  /**
   * Direção da conversão entre as duas coortes, decidida pela variação da taxa
   * contra `CONVERSION_TREND_EPSILON`:
   * - "improved": taxa subiu além do limiar (fechando mais do que propõe);
   * - "worsened": taxa caiu além do limiar (perdendo mais do que propõe);
   * - "stable": variação dentro do limiar, ou taxa indefinida em algum período.
   * Como no funil geral, **subir** a taxa é a melhora.
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **taxa de conversão real** de propostas entre duas coortes (atual ×
 * anterior), espelhando `compareShowPipelines` (D209) no eixo da data da
 * proposta. Pura, sem I/O: recebe dois `proposalOutcomes` já computados (cada um
 * sobre a coorte do seu ano) e devolve a variação da taxa de conversão real, da
 * taxa de vazão da coorte (`winRateDelta`) e das contagens de ganhas/decididas +
 * um veredito de tendência (ancorado na taxa de conversão real). Quando algum
 * período não tem proposta decidida a taxa é indefinida: `conversionRateDelta`
 * fica `null` e o veredito é "stable" (sem base para ler tendência). O chamador
 * decide quando exibir (tipicamente só com um ano específico e ambas as coortes
 * tendo propostas decididas). Ver D243.
 */
export function compareProposalOutcomes(
  current: ProposalConversion,
  previous: ProposalConversion,
): ProposalConversionComparison {
  const conversionRateDelta =
    current.conversionRate == null || previous.conversionRate == null
      ? null
      : current.conversionRate - previous.conversionRate;
  const winRateDelta =
    current.winRate == null || previous.winRate == null
      ? null
      : current.winRate - previous.winRate;
  return {
    current,
    previous,
    conversionRateDelta,
    winRateDelta,
    wonCountDelta: current.wonCount - previous.wonCount,
    decidedCountDelta: current.decidedCount - previous.decidedCount,
    trend:
      conversionRateDelta == null
        ? "stable"
        : conversionRateDelta >= CONVERSION_TREND_EPSILON
          ? "improved"
          : conversionRateDelta <= -CONVERSION_TREND_EPSILON
            ? "worsened"
            : "stable",
  };
}

// ── Comparativo ano a ano da conversão real POR contratante ───────────────────
// Enquanto `compareProposalOutcomes` (D244) compara a conversão real da coorte
// INTEIRA entre dois anos, este casa os contratantes de dois
// `proposalOutcomesByContact` (D247) por `contact.id` e destila os dois movers —
// para quem minhas propostas passaram a fechar MAIS / MENOS de um ano para o
// outro. É a mesma leitura do card de movers do funil por contratante
// (`compareContactPipelines`/D236), mas no eixo da COORTE (data da proposta) e
// sobre o desfecho real (realizada/perdida), não sobre o cachê em aberto do
// estado atual. Reusa o mesmo `CONVERSION_TREND_EPSILON` (=0.05) e a mesma
// direção (subir a taxa é melhora). Pura, sem I/O.

/** Variação da conversão real de um contratante entre duas coortes (atual × anterior). */
export interface ContactProposalConversionChange<C> {
  /** Contratante comparado (com coorte não-vazia nos dois períodos). */
  contact: C;
  /** Linha do contratante na coorte atual. */
  current: ContactProposalConversionRow<C>;
  /** Linha do contratante na coorte anterior. */
  previous: ContactProposalConversionRow<C>;
  /**
   * Variação da taxa de conversão real (atual − anterior, em pontos 0..1).
   * `null` quando algum período não tem proposta decidida (taxa indefinida) — sem
   * base para comparar. Positivo = fechando uma fração maior das propostas agora
   * (melhora); negativo = mais propostas viraram perda (piora).
   */
  conversionRateDelta: number | null;
  /**
   * Variação da taxa de vazão da coorte deste contratante: `winRate` atual −
   * anterior (em pontos 0..1), ou `null` quando algum período não tem coorte (sem
   * proposta). Espelho por-contratante do `winRateDelta` do comparativo geral
   * (D243): o denominador aqui é a coorte TODA (inclui as em aberto), então
   * penaliza propostas paradas — pode divergir de `conversionRateDelta` (a taxa
   * das decididas sobe enquanto a vazão cai porque sobrou proposta em aberto, e
   * vice-versa). Leitura complementar de throughput proposta→palco por contratante.
   */
  winRateDelta: number | null;
  /** Variação da contagem de propostas ganhas — viraram palco (atual − anterior). */
  wonCountDelta: number;
  /** Variação da contagem de propostas decididas — ganhas+perdidas (atual − anterior). */
  decidedCountDelta: number;
  /**
   * Direção da conversão entre as duas coortes, pela variação da taxa contra
   * `CONVERSION_TREND_EPSILON`:
   * - "improved": a taxa subiu além do limiar (fechando mais do que propõe);
   * - "worsened": a taxa caiu além do limiar (perdendo mais do que propõe);
   * - "stable": variação dentro do limiar, ou taxa indefinida em algum período.
   * Como no funil geral/por contratante, **subir** a taxa é a melhora.
   */
  trend: "improved" | "worsened" | "stable";
}

/** Comparativo ano a ano da conversão real por contratante (dois `proposalOutcomesByContact`). */
export interface ContactProposalConversionComparison<C> {
  /**
   * Contratantes com coorte não-vazia nos DOIS períodos, com a variação da taxa.
   * Ordenados da maior piora à maior melhora (quem passou a converter menos
   * primeiro), para o mover de cima ser o que mais merece atenção; taxa indefinida
   * em algum período vai ao fim.
   */
  changes: ContactProposalConversionChange<C>[];
  /** Quem mais melhorou a conversão (maior variação positiva entre os "improved"). */
  biggestImprovement: ContactProposalConversionChange<C> | null;
  /** Quem mais piorou a conversão (variação mais negativa entre os "worsened"). */
  biggestWorsening: ContactProposalConversionChange<C> | null;
  /** Contratantes com coorte só no período atual (novas propostas na mesa). */
  newContacts: ContactProposalConversionRow<C>[];
  /** Contratantes com coorte no anterior mas não no atual (sumiram da mesa). */
  droppedContacts: ContactProposalConversionRow<C>[];
}

/**
 * Compara a **conversão real por contratante** entre dois períodos (atual ×
 * anterior), casando os contratantes por `contact.id`. Espelha
 * `compareContactPipelines` (D236) no eixo da coorte (data da proposta): para cada
 * contratante com coorte não-vazia nos dois períodos devolve a variação da taxa de
 * conversão real (quem passou a fechar mais / menos das que propõe); os que só têm
 * coorte num período viram `newContacts`/`droppedContacts`. Pura, sem I/O: recebe
 * dois `proposalOutcomesByContact` já computados (cada um sobre a coorte do seu
 * ano). O chamador decide quando exibir (tipicamente só com um ano específico e
 * ambas as coortes não-vazias). Ver D247.
 */
export function compareContactProposalOutcomes<C extends { id: string; name: string }>(
  current: ContactProposalConversion<C>,
  previous: ContactProposalConversion<C>,
): ContactProposalConversionComparison<C> {
  const prevById = new Map<string, ContactProposalConversionRow<C>>();
  for (const r of previous.rows) prevById.set(r.contact.id, r);

  const currentIds = new Set<string>();
  const changes: ContactProposalConversionChange<C>[] = [];
  const newContacts: ContactProposalConversionRow<C>[] = [];

  for (const cur of current.rows) {
    currentIds.add(cur.contact.id);
    const prev = prevById.get(cur.contact.id);
    if (!prev) {
      newContacts.push(cur);
      continue;
    }
    const conversionRateDelta =
      cur.conversion.conversionRate == null || prev.conversion.conversionRate == null
        ? null
        : cur.conversion.conversionRate - prev.conversion.conversionRate;
    const winRateDelta =
      cur.conversion.winRate == null || prev.conversion.winRate == null
        ? null
        : cur.conversion.winRate - prev.conversion.winRate;
    changes.push({
      contact: cur.contact,
      current: cur,
      previous: prev,
      conversionRateDelta,
      winRateDelta,
      wonCountDelta: cur.conversion.wonCount - prev.conversion.wonCount,
      decidedCountDelta: cur.conversion.decidedCount - prev.conversion.decidedCount,
      trend:
        conversionRateDelta == null
          ? "stable"
          : conversionRateDelta >= CONVERSION_TREND_EPSILON
            ? "improved"
            : conversionRateDelta <= -CONVERSION_TREND_EPSILON
              ? "worsened"
              : "stable",
    });
  }

  const droppedContacts = previous.rows.filter(
    (r) => !currentIds.has(r.contact.id),
  );

  // Maior piora no topo: variação da taxa asc (mais negativa primeiro). Taxa
  // indefinida (delta null) vai ao fim; empate estável pelo id.
  changes.sort((a, b) => {
    const av = a.conversionRateDelta;
    const bv = b.conversionRateDelta;
    if (av == null && bv == null) return a.contact.id.localeCompare(b.contact.id);
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv || a.contact.id.localeCompare(b.contact.id);
  });

  let biggestImprovement: ContactProposalConversionChange<C> | null = null;
  let biggestWorsening: ContactProposalConversionChange<C> | null = null;
  for (const c of changes) {
    if (c.conversionRateDelta == null) continue;
    if (
      c.trend === "improved" &&
      (!biggestImprovement ||
        c.conversionRateDelta > biggestImprovement.conversionRateDelta!)
    ) {
      biggestImprovement = c;
    }
    if (
      c.trend === "worsened" &&
      (!biggestWorsening ||
        c.conversionRateDelta < biggestWorsening.conversionRateDelta!)
    ) {
      biggestWorsening = c;
    }
  }

  return {
    changes,
    biggestImprovement,
    biggestWorsening,
    newContacts,
    droppedContacts,
  };
}

/**
 * Situação de uma linha da tabela de conversão por contratante (período atual)
 * frente ao período anterior, para a coluna "vs. {ano-1}":
 * - "changed": o contratante tinha coorte não-vazia nos dois períodos — traz a
 *   variação da taxa de conversão real (`conversionRateDelta` pode ser `null`
 *   quando algum período não tem proposta decidida);
 * - "new": só apareceu no período atual (proposta nova na mesa);
 * - "none": não é comparável (não está na coorte atual).
 */
export type ContactProposalConversionRowStatus<C> =
  | { kind: "changed"; change: ContactProposalConversionChange<C> }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da tabela de conversão por contratante (período atual) com sua
 * situação no comparativo `compareContactProposalOutcomes`, indexando por
 * `contact.id` para o consumidor resolver a coluna "vs. {ano-1}" em O(1) — sem
 * repetir a varredura na apresentação. Puro: recebe o comparativo já computado e
 * devolve uma função de lookup. Um contratante presente nos dois períodos vira
 * "changed"; um que só está no atual (em `newContacts`) vira "new"; qualquer outro
 * id vira "none". Espelha `indexContactPipelineChanges` (D238) no eixo da coorte.
 */
export function indexContactProposalConversionChanges<C extends { id: string }>(
  comparison: ContactProposalConversionComparison<C>,
): (contactId: string | null | undefined) => ContactProposalConversionRowStatus<C> {
  const changedById = new Map<string, ContactProposalConversionChange<C>>();
  for (const c of comparison.changes) changedById.set(c.contact.id, c);
  const newIds = new Set<string>();
  for (const r of comparison.newContacts) newIds.add(r.contact.id);

  return (contactId) => {
    if (!contactId) return { kind: "none" };
    const change = changedById.get(contactId);
    if (change) return { kind: "changed", change };
    if (newIds.has(contactId)) return { kind: "new" };
    return { kind: "none" };
  };
}

// ── Manchete de conversão para o Painel (a conversão real está caindo?) ───────
// Eco de `compareProposalOutcomes` (D244) no dashboard, na mesma disciplina de
// gate dos nudges irmãos (`bookingLeadTimeHeadline`, `cancellationHeadline`,
// `pipelineByContactHeadline`…): a regra de EXIBIÇÃO vive num helper puro que
// recebe o comparativo já computado e destila só o subconjunto que aperta.
// Aqui o alarme é a queda ano a ano da taxa de conversão real das propostas —
// das que decidi neste ano, uma fração menor virou palco que na coorte do ano
// anterior. Rara por design: só com amostra confiável em AMBAS as coortes e uma
// queda materialmente maior que o epsilon do veredito de tendência (que só
// separa "melhorou/piorou/estável" no card, sem gate de amostra nem de
// magnitude). Ao contrário do card ano-a-ano, aqui o Painel só se manifesta na
// ponta ruim (piora): subir a conversão é boa notícia, não vira nudge.

/** Mínimo de propostas DECIDIDAS em cada coorte para o nudge confiar na queda. */
export const CONVERSION_DROP_MIN_DECIDED = 4;
/**
 * Queda mínima da taxa de conversão (em pontos 0..1) para o nudge disparar.
 * Maior que `CONVERSION_TREND_EPSILON` (=0.05, o limiar do veredito do card):
 * o Painel só alerta com uma queda de fato material, não qualquer variação.
 */
export const CONVERSION_DROP_POINTS = 0.1;
/** Queda da taxa (em pontos 0..1) que escala o nudge para crítico. */
export const CONVERSION_DROP_CRITICAL_POINTS = 0.25;

/** Manchete de conversão para o Painel (nudge de queda ano a ano). */
export interface ProposalConversionHeadline {
  /** True quando o nudge deve aparecer (amostra confiável + queda material). */
  show: boolean;
  /** True quando a queda entra na faixa crítica (≥ `criticalPoints`). */
  critical: boolean;
  /** Queda da taxa em pontos (0..1): anterior − atual; ≥ 0 quando `show`. */
  drop: number;
  /** Taxa de conversão real da coorte atual (0..1). */
  currentRate: number;
  /** Taxa de conversão real da coorte anterior (0..1). */
  previousRate: number;
  /** Propostas ganhas na coorte atual (para o banner: "N de M"). */
  won: number;
  /** Propostas decididas na coorte atual (denominador da taxa). */
  decided: number;
}

/**
 * Decide se o Painel deve alertar que a conversão real das propostas caiu de um
 * ano para o outro — o eco de `compareProposalOutcomes` (D244) no dashboard.
 * Recebe um comparativo já computado (as duas coortes) e não faz I/O. `show` só
 * quando AMBAS as coortes têm taxa definida (≥ `minDecided` propostas decididas
 * cada, para a leitura não se apoiar em 1–2 desfechos) **e** a taxa caiu ao menos
 * `dropPoints`; `critical` quando a queda chega a `criticalPoints` ou mais.
 *
 * Só a ponta de PIORA vira nudge (queda da conversão = mais do que propus virou
 * perda, sinal para revisar preço/disponibilidade/follow-up); uma melhora é boa
 * notícia e não precisa de alerta. Como os nudges irmãos, fica raro por gate.
 * Pura.
 */
export function proposalConversionHeadline(
  comparison: ProposalConversionComparison,
  minDecided: number = CONVERSION_DROP_MIN_DECIDED,
  dropPoints: number = CONVERSION_DROP_POINTS,
  criticalPoints: number = CONVERSION_DROP_CRITICAL_POINTS,
): ProposalConversionHeadline {
  const { current, previous, conversionRateDelta } = comparison;
  // `conversionRateDelta` só é não-null com taxa definida (decidedCount>0) nas
  // duas coortes; o gate de amostra reforça com o mínimo de decididas.
  const reliable =
    conversionRateDelta != null &&
    current.decidedCount >= minDecided &&
    previous.decidedCount >= minDecided;
  const drop = conversionRateDelta != null ? -conversionRateDelta : 0;
  const show = reliable && drop >= dropPoints;
  return {
    show,
    critical: show && drop >= criticalPoints,
    drop,
    currentRate: current.conversionRate ?? 0,
    previousRate: previous.conversionRate ?? 0,
    won: current.wonCount,
    decided: current.decidedCount,
  };
}

// ── Manchete de conversão POR CONTRATANTE para o Painel (quem esfriou?) ────────
// Enquanto `proposalConversionHeadline` (D245) alerta que a conversão real da
// carteira INTEIRA caiu ano a ano, este destila QUAL contratante específico
// passou a fechar uma fração materialmente menor das propostas que você lhe
// propõe — o eco de `compareContactProposalOutcomes` (D248) no dashboard. É mais
// acionável (diz de quem revisar preço/disponibilidade/relação) e pega o caso que
// o nudge geral perde: a carteira empata (um contratante piora enquanto outro
// melhora), mas uma relação específica azedou. Reusa o mesmo gate dos nudges
// irmãos (amostra confiável nas DUAS coortes + queda material > epsilon do
// veredito), aplicado por contratante. Só a ponta de PIORA vira nudge; subir a
// conversão de um contratante é boa notícia. Pura, sem I/O.

/** Manchete de conversão por contratante para o Painel (nudge de queda ano a ano). */
export interface ContactConversionDropHeadline<C> {
  /** True quando o nudge deve aparecer (um contratante com queda confiável e material). */
  show: boolean;
  /** True quando a queda desse contratante entra na faixa crítica (≥ `criticalPoints`). */
  critical: boolean;
  /** O contratante que mais esfriou (dentre os que passam no gate), ou `null`. */
  contact: C | null;
  /** Queda da taxa em pontos (0..1): anterior − atual; ≥ 0 quando `show`. */
  drop: number;
  /** Taxa de conversão real do contratante na coorte atual (0..1). */
  currentRate: number;
  /** Taxa de conversão real do contratante na coorte anterior (0..1). */
  previousRate: number;
  /** Propostas ganhas do contratante na coorte atual (para o banner: "N de M"). */
  won: number;
  /** Propostas decididas do contratante na coorte atual (denominador da taxa). */
  decided: number;
  /**
   * Quantos OUTROS contratantes também passaram no gate de queda material e
   * confiável (para o banner: "+N esfriaram"). 0 quando só um qualifica.
   */
  others: number;
}

/**
 * Decide se o Painel deve alertar que a conversão real com UM contratante
 * específico caiu de um ano para o outro — o eco de
 * `compareContactProposalOutcomes` (D248) no dashboard, irmão por-contratante de
 * `proposalConversionHeadline` (D245). Recebe um comparativo já computado (dois
 * `proposalOutcomesByContact`, cada um sobre a coorte do seu ano) e não faz I/O.
 *
 * Varre os `changes` (já ordenados da maior piora à maior melhora) e escolhe o
 * contratante de MAIOR queda que ainda tenha amostra confiável — ao menos
 * `minDecided` propostas decididas em CADA coorte, para a leitura não se apoiar em
 * 1–2 desfechos — e queda de ao menos `dropPoints`. `critical` quando essa queda
 * chega a `criticalPoints` ou mais; `others` conta quantos outros contratantes
 * também passariam no mesmo gate (o banner os resume). Como os nudges irmãos, só a
 * ponta de PIORA vira alerta e o gate o mantém raro. Pura.
 */
export function contactConversionDropHeadline<C extends { id: string; name: string }>(
  comparison: ContactProposalConversionComparison<C>,
  minDecided: number = CONVERSION_DROP_MIN_DECIDED,
  dropPoints: number = CONVERSION_DROP_POINTS,
  criticalPoints: number = CONVERSION_DROP_CRITICAL_POINTS,
): ContactConversionDropHeadline<C> {
  const qualifies = (c: ContactProposalConversionChange<C>): boolean => {
    if (c.conversionRateDelta == null) return false;
    const reliable =
      c.current.conversion.decidedCount >= minDecided &&
      c.previous.conversion.decidedCount >= minDecided;
    return reliable && -c.conversionRateDelta >= dropPoints;
  };

  // `changes` já vem ordenado por `conversionRateDelta` asc (maior queda primeiro,
  // taxa indefinida ao fim), então o primeiro que passa no gate é o de maior queda.
  const worst = comparison.changes.find(qualifies) ?? null;
  if (!worst) {
    return {
      show: false,
      critical: false,
      contact: null,
      drop: 0,
      currentRate: 0,
      previousRate: 0,
      won: 0,
      decided: 0,
      others: 0,
    };
  }

  const drop = -(worst.conversionRateDelta as number);
  const others = comparison.changes.reduce(
    (n, c) => (c !== worst && qualifies(c) ? n + 1 : n),
    0,
  );
  return {
    show: true,
    critical: drop >= criticalPoints,
    contact: worst.contact,
    drop,
    currentRate: worst.current.conversion.conversionRate ?? 0,
    previousRate: worst.previous.conversion.conversionRate ?? 0,
    won: worst.current.conversion.wonCount,
    decided: worst.current.conversion.decidedCount,
    others,
  };
}

// ── Propostas paradas (follow-up de deals esquecidos) ─────────────────────────
// Enquanto o funil (`showPipeline`) fotografa ONDE os shows estão e o tempo em
// etapa (`funnelStageDurations`/D235) mede a VELOCIDADE típica de travessia, esta
// leitura é operacional: QUAIS propostas específicas estão paradas e pedem uma
// decisão agora — cobrar resposta, confirmar ou descartar. Olha só os shows ainda
// em PROPOSED (a etapa aberta e acionável; CONFIRMED já é booking fechado, só
// esperando a data). Ver D240.

/** Status aberto/acionável cujas propostas podem "esfriar" sem resposta. */
export const STALE_PROPOSAL_STATUS = "PROPOSED";
/** Dias sem movimento em PROPOSED para uma proposta virar "parada" (heurística). */
export const STALE_PROPOSAL_DAYS = 21;
/** Dias até a data do show para classificá-lo como decisão iminente. */
export const STALE_PROPOSAL_IMMINENT_DAYS = 14;

/** Urgência de uma proposta parada, da mais para a menos crítica. */
export type StaleProposalUrgency = "overdue" | "imminent" | "cold";

/** Show como o detector de propostas paradas precisa vê-lo. */
export interface StaleProposalShowLike {
  id: string;
  title: string;
  date: Date | string;
  venue?: string | null;
  city?: string | null;
  fee: number;
  status: string;
  createdAt: Date | string;
  /** Histórico de status; usado só para achar quando entrou no status atual. */
  statusEvents?: StatusEventLike[];
}

/** Uma proposta parada, já classificada. */
export interface StaleProposal {
  id: string;
  title: string;
  date: Date;
  venue: string | null;
  city: string | null;
  fee: number;
  /** Dias inteiros (UTC) parado no status atual (desde que entrou em PROPOSED). */
  daysInStatus: number;
  /** Dias inteiros (UTC) até a data do show; negativo = a data já passou. */
  daysUntilShow: number;
  urgency: StaleProposalUrgency;
}

/** Resultado de `findStaleProposals`. */
export interface StaleProposalsReport {
  /** Propostas paradas, da mais urgente para a menos (ver ordenação). */
  proposals: StaleProposal[];
  count: number;
  /** Cachê acordado somado das propostas paradas (centavos) — receita em risco. */
  totalFee: number;
  overdueCount: number;
  imminentCount: number;
  coldCount: number;
}

/** Opções de `findStaleProposals` (todas injetáveis para testes determinísticos). */
export interface StaleProposalsOptions {
  /** "Agora" de referência; default `new Date()`. */
  now?: Date;
  /** Dias sem movimento para virar "parada"; default `STALE_PROPOSAL_DAYS`. */
  staleDays?: number;
  /** Dias até a data para classificar como "iminente"; default `STALE_PROPOSAL_IMMINENT_DAYS`. */
  imminentDays?: number;
}

/** Momento (ms) em que o show entrou no status atual: último evento, ou a criação. */
function enteredStatusAt(show: StaleProposalShowLike): number {
  let latest: number | null = null;
  for (const e of show.statusEvents ?? []) {
    const ms = new Date(e.createdAt).getTime();
    if (latest === null || ms > latest) latest = ms;
  }
  return latest ?? new Date(show.createdAt).getTime();
}

const URGENCY_RANK: Record<StaleProposalUrgency, number> = {
  overdue: 0,
  imminent: 1,
  cold: 2,
};

/**
 * Propostas paradas que pedem follow-up. Considera só os shows em PROPOSED (a
 * etapa aberta) e marca como "parada" a proposta que OU está há `staleDays` dias
 * sem movimento no status OU tem a data do show já vencida (`date < now`) — uma
 * proposta para um dia que passou está, por definição, sem resolução.
 *
 * A urgência classifica a fila:
 * - `overdue`  — a data do show já passou (nunca virou confirmado/realizado/cancelado);
 * - `imminent` — a data cai dentro dos próximos `imminentDays` dias (decisão logo);
 * - `cold`     — nenhuma pressão de data, mas parada por inatividade.
 *
 * Ordena por urgência (overdue → imminent → cold); dentro de overdue/imminent pela
 * data (mais vencida / mais próxima primeiro), dentro de cold pelo maior tempo
 * parado; desempate estável por título e id. O tempo no status usa o último evento
 * de status (quando entrou no status atual), caindo para `createdAt` nos shows sem
 * histórico (anteriores ao registro de eventos, D234). Datas por dia inteiro UTC,
 * coerente com os demais helpers de recência. Pura; `now`/limiares injetáveis.
 */
export function findStaleProposals(
  shows: StaleProposalShowLike[],
  opts: StaleProposalsOptions = {},
): StaleProposalsReport {
  const now = opts.now ?? new Date();
  const staleDays = opts.staleDays ?? STALE_PROPOSAL_DAYS;
  const imminentDays = opts.imminentDays ?? STALE_PROPOSAL_IMMINENT_DAYS;
  const nowMidnight = leadUtcMidnight(now);

  const proposals: StaleProposal[] = [];
  for (const show of shows) {
    if (show.status !== STALE_PROPOSAL_STATUS) continue;

    const daysInStatus = Math.max(
      0,
      Math.floor((nowMidnight - leadUtcMidnight(new Date(enteredStatusAt(show)))) / DAY_MS),
    );
    const daysUntilShow = Math.floor((leadUtcMidnight(show.date) - nowMidnight) / DAY_MS);
    const overdue = daysUntilShow < 0;

    // "Parada" = sem movimento há tempo demais OU já com a data vencida.
    if (daysInStatus < staleDays && !overdue) continue;

    const urgency: StaleProposalUrgency = overdue
      ? "overdue"
      : daysUntilShow <= imminentDays
        ? "imminent"
        : "cold";

    proposals.push({
      id: show.id,
      title: show.title,
      date: new Date(show.date),
      venue: show.venue ?? null,
      city: show.city ?? null,
      fee: show.fee,
      daysInStatus,
      daysUntilShow,
      urgency,
    });
  }

  proposals.sort((a, b) => {
    const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rank !== 0) return rank;
    // overdue/imminent: pela data (mais vencida / mais próxima primeiro).
    // cold: pelo maior tempo parado primeiro.
    if (a.urgency === "cold") {
      if (b.daysInStatus !== a.daysInStatus) return b.daysInStatus - a.daysInStatus;
    } else if (a.daysUntilShow !== b.daysUntilShow) {
      return a.daysUntilShow - b.daysUntilShow;
    }
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });

  let totalFee = 0;
  let overdueCount = 0;
  let imminentCount = 0;
  let coldCount = 0;
  for (const p of proposals) {
    totalFee += p.fee;
    if (p.urgency === "overdue") overdueCount += 1;
    else if (p.urgency === "imminent") imminentCount += 1;
    else coldCount += 1;
  }

  return {
    proposals,
    count: proposals.length,
    totalFee,
    overdueCount,
    imminentCount,
    coldCount,
  };
}

// ── Nudge do Painel: propostas paradas que pedem decisão agora ────────────────
//
// Espelha os headlines de Painel já existentes (cancellationHeadline,
// pipelineByContactHeadline, bookingLeadTimeHeadline…): a regra de EXIBIÇÃO vive
// aqui, na lógica pura, e o Painel só consome o veredito. Deriva de uma
// `StaleProposalsReport` já computada (zero recomputação) o subconjunto que de
// fato morde: as propostas **vencidas** (data passou ainda em PROPOSED) ou
// **iminentes** (data logo à frente e já parada). As "cold" — paradas por
// inatividade, mas com a data distante — NÃO viram nudge: são acompanhamento de
// funil, não urgência de decisão; ficam para a página `/shows/funil/paradas`, que
// legitimamente lista tudo (mesma disciplina anti-ruído dos demais nudges: o
// Painel só alerta quando aperta).

/** Resumo de Painel de `findStaleProposals`. */
export interface StaleProposalsHeadline {
  /**
   * Aparecer no Painel? Só quando há ao menos uma proposta que pede decisão
   * AGORA (vencida ou iminente). Só propostas "cold" à frente não disparam o
   * nudge — são follow-up, não urgência.
   */
  show: boolean;
  /**
   * Ao menos uma proposta **vencida** (a data do show já passou e ela nunca saiu
   * de PROPOSED). Permite ao Painel subir o tom (🔴 vs 🟠).
   */
  critical: boolean;
  /** A proposta mais urgente (topo da fila do report), ou null se não há nudge. */
  top: StaleProposal | null;
  /** Propostas vencidas. */
  overdueCount: number;
  /** Propostas iminentes. */
  imminentCount: number;
  /** Vencidas + iminentes — as que pedem decisão agora. */
  actionableCount: number;
  /** Cachê somado das propostas acionáveis (vencidas + iminentes), centavos. */
  actionableFee: number;
  /** Total de propostas paradas, inclusive as "cold" (para o "+N" secundário). */
  totalStale: number;
}

/**
 * Deriva o nudge de Painel de `findStaleProposals`. Puro, sem I/O: recebe o
 * report já computado sobre os shows carregados. `proposals` já vem ordenado por
 * urgência (overdue → imminent → cold), então a primeira proposta não-cold é a
 * mais urgente. Só dispara com proposta vencida ou iminente; `critical` quando há
 * ao menos uma vencida.
 */
export function staleProposalsHeadline(
  report: StaleProposalsReport,
): StaleProposalsHeadline {
  const actionableCount = report.overdueCount + report.imminentCount;
  let actionableFee = 0;
  let top: StaleProposal | null = null;
  for (const p of report.proposals) {
    if (p.urgency === "cold") continue;
    if (top === null) top = p;
    actionableFee += p.fee;
  }
  return {
    show: actionableCount > 0,
    critical: report.overdueCount > 0,
    top,
    overdueCount: report.overdueCount,
    imminentCount: report.imminentCount,
    actionableCount,
    actionableFee,
    totalStale: report.count,
  };
}
