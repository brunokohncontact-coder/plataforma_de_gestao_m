// Lógica pura de filtragem da lista de shows. Espelha o padrão já estabelecido
// nas Finanças (`filterTransactions`): critérios via query string, filtragem em
// memória sobre o recorte já carregado do usuário (ver DECISIONS.md D9). Mantida
// separada de `finance.ts` por ser outro domínio, mas reaproveita os helpers
// puros de texto/data de lá (uma fonte de verdade para normalização e chaves).

import { CONVERSION_TREND_EPSILON, dayKey, isValidDateKey, normalizeText } from "./finance";
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
 */
export function funnelStageDurations(
  shows: StageDurationShowLike[],
): FunnelStageDurations {
  const samplesByStage = new Map<string, number[]>();
  let showCount = 0;

  for (const show of shows) {
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
 * sobre a coorte do seu ano) e devolve a variação da taxa de conversão (e das
 * contagens de ganhas/decididas) + um veredito de tendência. Quando algum
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
  return {
    current,
    previous,
    conversionRateDelta,
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
    changes.push({
      contact: cur.contact,
      current: cur,
      previous: prev,
      conversionRateDelta,
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
