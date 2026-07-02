// Lógica pura de filtragem da lista de shows. Espelha o padrão já estabelecido
// nas Finanças (`filterTransactions`): critérios via query string, filtragem em
// memória sobre o recorte já carregado do usuário (ver DECISIONS.md D9). Mantida
// separada de `finance.ts` por ser outro domínio, mas reaproveita os helpers
// puros de texto/data de lá (uma fonte de verdade para normalização e chaves).

import { dayKey, isValidDateKey, normalizeText } from "./finance";
import { SHOW_STATUSES, type ShowStatus } from "./domain";
import { MONTH_NAMES_LONG } from "./calendar";

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
 * Antecedência de agendamento sobre os shows do usuário. Para cada show não
 * cancelado calcula `leadDays = dia(date) - dia(createdAt)` (dias UTC inteiros):
 * >= 0 entra na amostra; < 0 é um lançamento retroativo (contado à parte). A
 * mediana e as médias são sobre a amostra; a distribuição reparte a amostra nas
 * faixas canônicas (com o cachê somado de cada faixa, para pesar em receita).
 * Pura.
 */
export function bookingLeadTime<T extends LeadTimeShowLike>(shows: T[]): BookingLeadTime {
  const leads: number[] = [];
  let retroactiveCount = 0;

  for (const s of shows) {
    if (s.status === "CANCELLED") continue;
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
    if (s.status === "CANCELLED") continue;
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
 */
export function bookingLeadTimeYears<T extends LeadTimeShowLike>(shows: T[]): number[] {
  const years = new Set<number>();
  for (const s of shows) {
    if (s.status === "CANCELLED") continue;
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
