import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowsViewToggle } from "@/components/ShowsViewToggle";
import {
  buildWeekGrid,
  weekRange,
  parseDayParam,
  shiftWeek,
  startOfWeek,
  formatWeekTitle,
  toDayParam,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { SHOW_STATUS_DOT, SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ShowsWeekPage({
  searchParams,
}: {
  searchParams: { semana?: string };
}) {
  const user = await requireUser();
  const reference = parseDayParam(searchParams.semana);

  // Carrega apenas os shows da semana exibida.
  const { start, endExclusive } = weekRange(reference);
  const shows = await prisma.show.findMany({
    where: { userId: user.id, date: { gte: start, lt: endExclusive } },
    orderBy: { date: "asc" },
    select: { id: true, title: true, date: true, venue: true, city: true, status: true },
  });

  const cells = buildWeekGrid(reference, shows);
  const prev = toDayParam(shiftWeek(reference, -1));
  const next = toDayParam(shiftWeek(reference, 1));
  const isCurrentWeek =
    startOfWeek(new Date()).getTime() === startOfWeek(reference).getTime();
  const total = shows.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shows</h1>
        <div className="flex items-center gap-3">
          <ShowsViewToggle active="semana" />
          <a
            href="/shows/agenda.ics"
            className="text-sm text-brand-700 hover:underline"
            title="Baixar a agenda para Google/Apple Calendar"
          >
            Exportar .ics
          </a>
          {total > 0 && (
            <a
              href={`/shows/semana/export${
                searchParams.semana ? `?semana=${encodeURIComponent(searchParams.semana)}` : ""
              }`}
              className="text-sm text-brand-700 hover:underline"
              title="Baixar os shows desta semana em CSV"
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/novo" className="btn-primary">
            + Novo show
          </Link>
        </div>
      </div>

      <div className="card p-0">
        {/* Cabeçalho de navegação da semana */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <Link
            href={`/shows/semana?semana=${prev}`}
            className="btn-secondary py-1.5"
            aria-label="Semana anterior"
          >
            ←
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{formatWeekTitle(start)}</h2>
            {!isCurrentWeek && (
              <Link href="/shows/semana" className="text-sm text-brand-700 hover:underline">
                Esta semana
              </Link>
            )}
          </div>
          <Link
            href={`/shows/semana?semana=${next}`}
            className="btn-secondary py-1.5"
            aria-label="Próxima semana"
          >
            →
          </Link>
        </div>

        {/* Dias da semana (lista vertical, um por dia) */}
        <ul className="divide-y divide-gray-100">
          {cells.map((cell) => {
            const dayParam = toDayParam(cell.date);
            const weekday = WEEKDAY_LABELS[cell.date.getDay()];
            return (
              <li
                key={dayParam}
                className={
                  "group flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-4 " +
                  (cell.isToday ? "bg-brand-50/50" : "")
                }
              >
                {/* Coluna do dia */}
                <div className="flex w-full items-center justify-between sm:w-28 sm:flex-col sm:items-start sm:justify-start">
                  <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {weekday}
                    </span>
                    <span
                      className={
                        "text-lg font-semibold " +
                        (cell.isToday ? "text-brand-700" : "text-gray-800")
                      }
                    >
                      {cell.date.getDate()}
                    </span>
                  </div>
                  <Link
                    href={`/shows/novo?data=${dayParam}`}
                    title="Novo show neste dia"
                    aria-label={`Novo show em ${cell.date.toLocaleDateString("pt-BR")}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-sm leading-none text-gray-400 opacity-0 transition hover:bg-brand-50 hover:text-brand-700 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    +
                  </Link>
                </div>

                {/* Shows do dia */}
                <div className="flex-1">
                  {cell.items.length === 0 ? (
                    <p className="py-1 text-sm text-gray-300">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {cell.items.map((s) => {
                        const status = s.status as ShowStatus;
                        const time = s.date.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const place = [s.venue, s.city].filter(Boolean).join(" · ");
                        return (
                          <li key={s.id}>
                            <Link
                              href={`/shows/${s.id}`}
                              className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-2 text-sm transition hover:bg-gray-100"
                            >
                              <span
                                className={
                                  "h-2.5 w-2.5 shrink-0 rounded-full " +
                                  SHOW_STATUS_DOT[status]
                                }
                                aria-hidden
                              />
                              <span className="w-12 shrink-0 tabular-nums text-gray-500">
                                {time}
                              </span>
                              <span className="font-medium">{s.title}</span>
                              {place && (
                                <span className="truncate text-gray-500">· {place}</span>
                              )}
                              <span className="ml-auto shrink-0 text-xs text-gray-400">
                                {SHOW_STATUS_LABELS[status]}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {total === 0 && (
          <p className="border-t border-gray-100 px-4 py-3 text-center text-sm text-gray-400">
            Nenhum show nesta semana.
          </p>
        )}
      </div>

      {/* Legenda de status */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        {(Object.keys(SHOW_STATUS_LABELS) as ShowStatus[]).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span className={"h-2 w-2 rounded-full " + SHOW_STATUS_DOT[st]} aria-hidden />
            {SHOW_STATUS_LABELS[st]}
          </span>
        ))}
      </div>
    </div>
  );
}
