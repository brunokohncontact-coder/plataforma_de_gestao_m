import Link from "next/link";
import {
  buildMiniMonth,
  formatMonthTitle,
  monthKey,
  shiftMonth,
  toDayParam,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

/**
 * Mini-calendário de salto rápido para a agenda semanal (`/shows/semana`).
 * Grade compacta de um mês onde clicar num dia leva a agenda para a semana
 * daquele dia; as setas ◀/▶ trocam o mês exibido no widget SEM mudar a semana
 * em foco (`selectedDayParam` é preservado). Realça a semana atual (fundo
 * suave), o dia de hoje (anel) e pinta uma bolinha nos dias com show.
 *
 * Componente de servidor puro (só monta links); a lógica de grade vem de
 * `buildMiniMonth`, testada em `src/lib/calendar.test.ts`.
 */
export function MiniCalendar({
  year,
  month,
  selectedDayParam,
  showDayKeys,
  basePath = "/shows/semana",
}: {
  year: number;
  month: number;
  /** `?semana=YYYY-MM-DD` em foco na agenda; preservado ao trocar o mês do widget. */
  selectedDayParam: string;
  /** Dias com pelo menos um show ("YYYY-MM-DD"), para a bolinha. */
  showDayKeys: Set<string>;
  basePath?: string;
}) {
  const selectedWeekRef = new Date(`${selectedDayParam}T00:00:00`);
  const weeks = buildMiniMonth(year, month, { selectedWeekRef, showDayKeys });
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const monthNavHref = (m: { year: number; month: number }) =>
    `${basePath}?semana=${selectedDayParam}&cal=${monthKey(m.year, m.month)}`;

  return (
    <div className="card p-3" aria-label="Mini-calendário de salto rápido">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={monthNavHref(prev)}
          className="rounded px-1.5 py-0.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-brand-700"
          aria-label={`Mês anterior (${formatMonthTitle(prev.year, prev.month)})`}
        >
          ◀
        </Link>
        <span className="text-sm font-semibold text-gray-800">
          {formatMonthTitle(year, month)}
        </span>
        <Link
          href={monthNavHref(next)}
          className="rounded px-1.5 py-0.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-brand-700"
          aria-label={`Próximo mês (${formatMonthTitle(next.year, next.month)})`}
        >
          ▶
        </Link>
      </div>

      <div className="grid grid-cols-7 text-center text-[0.65rem] font-medium uppercase tracking-wide text-gray-400">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="py-1">
            {w[0]}
          </span>
        ))}
      </div>

      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className={
              "grid grid-cols-7 rounded " +
              (week.some((c) => c.inSelectedWeek) ? "bg-brand-50/60" : "")
            }
          >
            {week.map((cell) => {
              const dayParam = toDayParam(cell.date);
              const num = cell.date.getDate();
              if (!cell.inMonth) {
                return (
                  <span
                    key={dayParam}
                    className="py-1 text-center text-xs text-gray-300"
                    aria-hidden
                  >
                    {num}
                  </span>
                );
              }
              return (
                <Link
                  key={dayParam}
                  href={`${basePath}?semana=${dayParam}`}
                  aria-label={`Ir para a semana de ${cell.date.toLocaleDateString("pt-BR")}${
                    cell.hasShows ? " (tem show)" : ""
                  }`}
                  aria-current={cell.isToday ? "date" : undefined}
                  className={
                    "relative flex flex-col items-center justify-center py-1 text-xs transition hover:bg-brand-100/70 " +
                    (cell.isToday
                      ? "font-bold text-brand-700 ring-1 ring-inset ring-brand-400 rounded"
                      : "text-gray-700")
                  }
                >
                  {num}
                  <span
                    className={
                      "mt-0.5 h-1 w-1 rounded-full " +
                      (cell.hasShows ? "bg-brand-500" : "bg-transparent")
                    }
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
