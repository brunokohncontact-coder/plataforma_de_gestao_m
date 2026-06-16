// Lógica pura de calendário mensal (independente de UI/banco) para a visão de
// agenda dos shows. Tudo opera em horário LOCAL (a grade que o usuário vê).
// Semana começa no domingo (convenção pt-BR). Testado em src/lib/calendar.test.ts.

const MONTH_NAMES_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** { year, month(1-12) } -> "YYYY-MM". */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

/**
 * "YYYY-MM" -> { year, month(1-12) }. Para entradas inválidas, retorna o mês de
 * referência (por padrão, o mês atual), garantindo uma página sempre renderizável.
 */
export function parseMonthKey(
  key: string | undefined | null,
  reference: Date = new Date(),
): { year: number; month: number } {
  const fallback = { year: reference.getFullYear(), month: reference.getMonth() + 1 };
  if (!key) return fallback;
  const m = /^(\d{4})-(\d{1,2})$/.exec(key.trim());
  if (!m) return fallback;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return fallback;
  return { year, month };
}

/** Desloca um mês por `delta` meses, normalizando a virada de ano. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  // month é 1-12; converte para índice 0-based para usar a aritmética de Date.
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Rótulo "Junho de 2026". */
export function formatMonthTitle(year: number, month: number): string {
  return `${MONTH_NAMES_LONG[month - 1]} de ${year}`;
}

/**
 * Intervalo [start, endExclusive) que cobre TODA a grade do mês — incluindo os
 * dias das semanas vizinhas exibidos nas bordas. Útil para consultar o banco
 * uma única vez e cobrir exatamente o que a grade mostra.
 */
export function monthGridRange(
  year: number,
  month: number,
): { start: Date; endExclusive: Date } {
  const first = new Date(year, month - 1, 1);
  const leading = first.getDay(); // 0 (dom) .. 6 (sáb)
  const start = new Date(year, month - 1, 1 - leading);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = Math.ceil((leading + daysInMonth) / 7);
  const endExclusive = new Date(year, month - 1, 1 - leading + weeks * 7);
  return { start, endExclusive };
}

export type CalendarCell<T> = {
  date: Date; // dia local à meia-noite
  inMonth: boolean; // pertence ao mês exibido (não é borda)
  isToday: boolean;
  items: T[]; // itens cujo `date` cai neste dia, em ordem de horário
};

/** Data local -> chave de dia "YYYY-MM-DD" (mesma convenção da grade exibida). */
export function toDayParam(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const dayBucketKey = toDayParam;

/**
 * Converte um parâmetro de dia "YYYY-MM-DD" (ex.: vindo de um clique numa célula
 * do calendário) no valor de um `<input type="datetime-local">`, prefixando um
 * horário padrão de show. Retorna `undefined` para entradas inválidas, deixando
 * o formulário sem data pré-preenchida.
 */
export function dayParamToDateTimeLocal(
  param: string | undefined | null,
  defaultTime = "20:00",
): string | undefined {
  if (!param) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(param.trim());
  if (!m) return undefined;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${defaultTime}`;
}

/**
 * Monta a grade do mês como semanas (linhas) de 7 células (dias). Cada item é
 * distribuído no dia local correspondente ao seu `date` e ordenado por horário.
 */
export function buildMonthGrid<T extends { date: Date }>(
  year: number,
  month: number,
  items: T[],
  today: Date = new Date(),
): CalendarCell<T>[][] {
  const { start, endExclusive } = monthGridRange(year, month);

  // Agrupa itens por dia local.
  const byDay = new Map<string, T[]>();
  for (const item of items) {
    const key = dayBucketKey(item.date);
    const list = byDay.get(key);
    if (list) list.push(item);
    else byDay.set(key, [item]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const todayKey = dayBucketKey(today);

  const weeks: CalendarCell<T>[][] = [];
  const cursor = new Date(start);
  while (cursor < endExclusive) {
    const week: CalendarCell<T>[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor);
      const key = dayBucketKey(date);
      week.push({
        date,
        inMonth: date.getMonth() === month - 1,
        isToday: key === todayKey,
        items: byDay.get(key) ?? [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}
