import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import {
  SHOW_STATUSES,
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  type ShowStatus,
} from "@/lib/domain";
import {
  filterShows,
  findScheduleConflicts,
  hasActiveShowFilter,
  isValidShowStatus,
  type ShowFilter,
} from "@/lib/shows";
import { isValidDateKey } from "@/lib/finance";
import { FILTER_RESTORED_PARAM } from "@/lib/listFilter";
import { ShowsViewToggle } from "@/components/ShowsViewToggle";
import { RememberedFilterNotice } from "@/components/RememberedFilterNotice";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShowsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  // Filtros vindos da query string (validados).
  const qParam = readParam(params, "q");
  const statusParam = readParam(params, "status");
  const fromParam = readParam(params, "de");
  const toParam = readParam(params, "ate");

  const filter: ShowFilter = {
    q: qParam || null,
    status: isValidShowStatus(statusParam) ? statusParam : null,
    from: isValidDateKey(fromParam) ? fromParam : null,
    to: isValidDateKey(toParam) ? toParam : null,
  };
  const active = hasActiveShowFilter(filter);
  const restored = readParam(params, FILTER_RESTORED_PARAM) === "1";

  const visible = filterShows(shows, filter);

  // Sinaliza sobreposições na agenda (dias com 2+ shows não cancelados).
  const conflicts = findScheduleConflicts(shows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shows</h1>
        <div className="flex items-center gap-3">
          <ShowsViewToggle active="lista" />
          {shows.length > 0 && (
            <Link href="/relatorios#shows" className="btn-secondary">
              Relatórios
            </Link>
          )}
          {conflicts.dayCount > 0 && (
            <Link
              href="/shows/conflitos"
              className={
                "btn-secondary " +
                (conflicts.upcomingDayCount > 0
                  ? "!border-amber-300 !text-amber-700"
                  : "")
              }
              title="Dias com mais de um show marcado"
            >
              Conflitos
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">
                {conflicts.dayCount}
              </span>
            </Link>
          )}
          {shows.length > 0 && (
            <a
              href="/shows/agenda.ics"
              className="text-sm text-brand-700 hover:underline"
              title="Baixar a agenda para Google/Apple Calendar"
            >
              Exportar .ics
            </a>
          )}
          <Link href="/shows/novo" className="btn-primary">
            + Novo show
          </Link>
        </div>
      </div>

      <RememberedFilterNotice restored={restored} resetHref="/shows?reset=1" />

      {shows.length > 0 && (
        <form
          method="get"
          className="card flex flex-wrap items-end gap-3"
          aria-label="Filtros de shows"
        >
          <Field label="Buscar" htmlFor="f-q">
            <input
              id="f-q"
              type="search"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="Título, local ou cidade"
              className="input"
            />
          </Field>

          <Field label="Status" htmlFor="f-status">
            <select
              id="f-status"
              name="status"
              defaultValue={filter.status ?? ""}
              className="input"
            >
              <option value="">Todos</option>
              {SHOW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SHOW_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="De" htmlFor="f-de">
            <input
              id="f-de"
              type="date"
              name="de"
              defaultValue={filter.from ?? ""}
              className="input"
            />
          </Field>

          <Field label="Até" htmlFor="f-ate">
            <input
              id="f-ate"
              type="date"
              name="ate"
              defaultValue={filter.to ?? ""}
              className="input"
            />
          </Field>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary">
              Filtrar
            </button>
            {active && (
              <Link href="/shows?reset=1" className="text-sm text-gray-500 hover:underline">
                Limpar
              </Link>
            )}
          </div>
        </form>
      )}

      {shows.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Você ainda não cadastrou shows.</p>
          <Link href="/shows/novo" className="mt-3 inline-block text-brand-700 hover:underline">
            Cadastrar o primeiro
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum show corresponde aos filtros.</p>
          <Link href="/shows?reset=1" className="mt-3 inline-block text-brand-700 hover:underline">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {active
              ? `${visible.length} de ${shows.length} ${shows.length === 1 ? "show" : "shows"}`
              : `${shows.length} ${shows.length === 1 ? "show" : "shows"}`}
          </p>
          <div className="card overflow-hidden p-0">
            <ul className="divide-y divide-gray-100">
              {visible.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/shows/${s.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(s.date)}
                        {s.venue ? ` · ${s.venue}` : ""}
                        {s.city ? ` · ${s.city}` : ""}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3 whitespace-nowrap">
                      {s.fee > 0 && (
                        <span className="hidden text-sm text-gray-600 sm:inline">
                          {formatMoney(s.fee)}
                        </span>
                      )}
                      <span className={"badge " + SHOW_STATUS_COLORS[s.status as ShowStatus]}>
                        {SHOW_STATUS_LABELS[s.status as ShowStatus]}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}
