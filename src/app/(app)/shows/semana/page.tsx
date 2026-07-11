import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowsViewToggle } from "@/components/ShowsViewToggle";
import { MiniCalendar } from "@/components/MiniCalendar";
import { IcsExportButton } from "@/components/IcsExportButton";
import {
  buildWeekGrid,
  weekRange,
  monthGridRange,
  parseMonthKey,
  parseDayParam,
  shiftWeek,
  startOfWeek,
  formatWeekTitle,
  findAdjacentShowDate,
  toDayParam,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { SHOW_STATUS_DOT, SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ShowsWeekPage({
  searchParams,
}: {
  searchParams: { semana?: string; cal?: string };
}) {
  const user = await requireUser();
  const reference = parseDayParam(searchParams.semana);
  const selectedDayParam = toDayParam(reference);

  // Mês exibido no mini-calendário de salto rápido: por padrão, o mês da semana
  // em foco; `?cal=YYYY-MM` deixa navegar meses no widget sem trocar a semana.
  const miniMonth = parseMonthKey(searchParams.cal, reference);

  // Carrega apenas os shows da semana exibida.
  const { start, endExclusive } = weekRange(reference);
  const shows = await prisma.show.findMany({
    where: { userId: user.id, date: { gte: start, lt: endExclusive } },
    orderBy: { date: "asc" },
    select: { id: true, title: true, date: true, venue: true, city: true, status: true },
  });

  // Datas (só o campo `date`) dos shows que caem na grade do mini-calendário,
  // para pintar as bolinhas de "dia com show". Consulta enxuta e separada da
  // semana exibida (o widget cobre um mês inteiro, com bordas).
  const miniRange = monthGridRange(miniMonth.year, miniMonth.month);
  const miniShows = await prisma.show.findMany({
    where: {
      userId: user.id,
      date: { gte: miniRange.start, lt: miniRange.endExclusive },
    },
    select: { date: true },
  });
  const showDayKeys = new Set(miniShows.map((s) => toDayParam(s.date)));

  // Salto direto para a semana do show mais próximo (para trás / para frente),
  // pulando de uma vez as semanas vazias. Duas consultas enxutas e indexadas
  // (só a `date` do vizinho imediato fora da semana em foco) alimentam a função
  // pura `findAdjacentShowDate` — que reconfirma a fronteira de semana.
  const [prevShow, nextShow] = await Promise.all([
    prisma.show.findFirst({
      where: { userId: user.id, date: { lt: start } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.show.findFirst({
      where: { userId: user.id, date: { gte: endExclusive } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  const neighborDates = [prevShow?.date, nextShow?.date].filter(
    (d): d is Date => d != null,
  );
  const prevShowDate = findAdjacentShowDate(neighborDates, reference, "prev");
  const nextShowDate = findAdjacentShowDate(neighborDates, reference, "next");
  const jumpPrev = prevShowDate ? toDayParam(prevShowDate) : null;
  const jumpNext = nextShowDate ? toDayParam(nextShowDate) : null;
  const jumpDateLabel = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

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
          <IcsExportButton />
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

      <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
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

        {/* Saltos para a semana do show mais próximo (pula semanas vazias) */}
        {(jumpPrev || jumpNext) && (
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-sm">
            {jumpPrev && prevShowDate ? (
              <Link
                href={`/shows/semana?semana=${jumpPrev}`}
                className="text-brand-700 hover:underline"
                title={`Ir para a semana do show anterior (${jumpDateLabel(prevShowDate)})`}
              >
                ← Show anterior{" "}
                <span className="text-gray-400">({jumpDateLabel(prevShowDate)})</span>
              </Link>
            ) : (
              <span />
            )}
            {jumpNext && nextShowDate ? (
              <Link
                href={`/shows/semana?semana=${jumpNext}`}
                className="text-brand-700 hover:underline"
                title={`Ir para a semana do próximo show (${jumpDateLabel(nextShowDate)})`}
              >
                <span className="text-gray-400">({jumpDateLabel(nextShowDate)})</span>{" "}
                Próximo show →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}

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

      {/* Mini-calendário de salto rápido (aparece ao lado em telas largas) */}
      <aside className="order-first lg:order-none">
        <MiniCalendar
          year={miniMonth.year}
          month={miniMonth.month}
          selectedDayParam={selectedDayParam}
          showDayKeys={showDayKeys}
        />
      </aside>
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
