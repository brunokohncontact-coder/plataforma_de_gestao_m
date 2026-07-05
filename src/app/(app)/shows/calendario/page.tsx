import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowsViewToggle } from "@/components/ShowsViewToggle";
import {
  buildMonthGrid,
  monthGridRange,
  monthKey,
  parseMonthKey,
  shiftMonth,
  formatMonthTitle,
  toDayParam,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { SHOW_STATUS_DOT, SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";
import { summarizeMonthShows } from "@/lib/shows";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ShowsCalendarPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const user = await requireUser();
  const { year, month } = parseMonthKey(searchParams.mes);

  // Carrega apenas os shows que aparecem na grade exibida (inclui bordas).
  const { start, endExclusive } = monthGridRange(year, month);
  const shows = await prisma.show.findMany({
    where: { userId: user.id, date: { gte: start, lt: endExclusive } },
    orderBy: { date: "asc" },
    select: { id: true, title: true, date: true, venue: true, status: true, fee: true },
  });

  const grid = buildMonthGrid(year, month, shows);
  const summary = summarizeMonthShows(shows, year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrentMonth =
    new Date().getFullYear() === year && new Date().getMonth() + 1 === month;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shows</h1>
        <div className="flex items-center gap-3">
          <ShowsViewToggle active="calendario" />
          <a
            href={`/shows/calendario/export?mes=${monthKey(year, month)}`}
            className="text-sm text-brand-700 hover:underline"
            title={`Baixar os shows de ${formatMonthTitle(year, month)} em CSV`}
          >
            ⬇ CSV
          </a>
          <a
            href="/shows/agenda.ics"
            className="text-sm text-brand-700 hover:underline"
            title="Baixar a agenda para Google/Apple Calendar"
          >
            Exportar .ics
          </a>
          <Link href="/shows/novo" className="btn-primary">
            + Novo show
          </Link>
        </div>
      </div>

      {/* Resumo do mês exibido: quanto este mês vale, num relance. */}
      <div className="card">
        {summary.total === 0 && summary.cancelled === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum show em {formatMonthTitle(year, month)}.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Shows no mês
              </p>
              <p className="text-xl font-bold">{summary.total}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cachê confirmado
              </p>
              <p className="text-xl font-bold text-emerald-700">
                {formatMoney(summary.confirmedFee)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                A confirmar
              </p>
              <p className="text-xl font-bold text-amber-700">
                {formatMoney(summary.pendingFee)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cachê total
              </p>
              <p className="text-xl font-bold">{formatMoney(summary.totalFee)}</p>
            </div>
            {summary.cancelled > 0 && (
              <p className="text-xs text-gray-400">
                {summary.cancelled} cancelado{summary.cancelled > 1 ? "s" : ""} (fora
                da soma)
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card p-0">
        {/* Cabeçalho de navegação do mês */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <Link
            href={`/shows/calendario?mes=${monthKey(prev.year, prev.month)}`}
            className="btn-secondary py-1.5"
            aria-label="Mês anterior"
          >
            ←
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {formatMonthTitle(year, month)}
            </h2>
            {!isCurrentMonth && (
              <Link
                href="/shows/calendario"
                className="text-sm text-brand-700 hover:underline"
              >
                Hoje
              </Link>
            )}
          </div>
          <Link
            href={`/shows/calendario?mes=${monthKey(next.year, next.month)}`}
            className="btn-secondary py-1.5"
            aria-label="Próximo mês"
          >
            →
          </Link>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-medium text-gray-500">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>

        {/* Grade */}
        <div className="grid grid-cols-7">
          {grid.flat().map((cell) => {
            const key = cell.date.toISOString();
            const dayParam = toDayParam(cell.date);
            return (
              <div
                key={key}
                className={
                  "group min-h-[6rem] border-b border-r border-gray-100 p-1.5 align-top " +
                  (cell.inMonth ? "bg-white" : "bg-gray-50/60")
                }
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                      (cell.isToday
                        ? "bg-brand-700 font-semibold text-white"
                        : cell.inMonth
                          ? "text-gray-700"
                          : "text-gray-400")
                    }
                  >
                    {cell.date.getDate()}
                  </span>
                  <Link
                    href={`/shows/novo?data=${dayParam}`}
                    title="Novo show neste dia"
                    aria-label={`Novo show em ${cell.date.toLocaleDateString("pt-BR")}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-gray-400 opacity-0 transition hover:bg-brand-50 hover:text-brand-700 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    +
                  </Link>
                </div>
                <div className="space-y-1">
                  {cell.items.map((s) => {
                    const status = s.status as ShowStatus;
                    const time = s.date.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <Link
                        key={s.id}
                        href={`/shows/${s.id}`}
                        title={`${time} · ${s.title}${s.venue ? " · " + s.venue : ""} · ${SHOW_STATUS_LABELS[status]}`}
                        className="flex items-center gap-1 rounded-md bg-gray-50 px-1.5 py-1 text-xs hover:bg-gray-100"
                      >
                        <span
                          className={
                            "h-2 w-2 shrink-0 rounded-full " + SHOW_STATUS_DOT[status]
                          }
                          aria-hidden
                        />
                        <span className="truncate">{s.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
