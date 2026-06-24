import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findOpenWeekends, type ConflictShowLike } from "@/lib/shows";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES_LONG } from "@/lib/calendar";
import { SHOW_STATUS_DOT, SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

// Janela analisada: próximos ~3 meses de fins de semana.
const WEEKS = 12;

// "YYYY-MM-DD" (UTC) → Date em UTC, para formatação sem escorregar de fuso.
function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Rótulo compacto do fim de semana, ex.: "13–15 de mar" ou "27 fev – 1 mar".
function weekendLabel(fri: string, sun: string): string {
  const f = keyToDate(fri);
  const s = keyToDate(sun);
  const fMonth = MONTH_NAMES_LONG[f.getUTCMonth()].slice(0, 3).toLowerCase();
  const sMonth = MONTH_NAMES_LONG[s.getUTCMonth()].slice(0, 3).toLowerCase();
  if (f.getUTCMonth() === s.getUTCMonth()) {
    return `${f.getUTCDate()}–${s.getUTCDate()} de ${fMonth}`;
  }
  return `${f.getUTCDate()} ${fMonth} – ${s.getUTCDate()} ${sMonth}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default async function OpenWeekendsPage() {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      status: true,
      fee: true,
    },
    orderBy: { date: "asc" },
  });

  const weekendShows: ConflictShowLike[] = shows.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    venue: s.venue,
    city: s.city,
    status: s.status,
    fee: s.fee,
  }));

  const report = findOpenWeekends(weekendShows, { weeks: WEEKS });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fins de semana livres</h1>
          <p className="text-sm text-gray-500">
            As próximas {WEEKS} noites de sexta a domingo e quais ainda estão sem nada
            marcado. Fim de semana vazio é onde mora a receita que ficou na mesa — use a
            lista para focar a prospecção nos abertos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/shows/calendario" className="btn-secondary">
            Calendário
          </Link>
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Fins de semana livres"
          value={`${report.openCount} de ${report.total}`}
          tone={report.openCount > 0 ? "amber" : "gray"}
        />
        <Stat label="Já com show" value={String(report.bookedCount)} tone="gray" />
        <Stat
          label="Próximo livre"
          value={
            report.nextOpenFriday
              ? weekendLabel(
                  report.nextOpenFriday,
                  report.weekends.find((w) => w.friday === report.nextOpenFriday)!
                    .days[2],
                )
              : "—"
          }
          tone={report.nextOpenFriday ? "amber" : "gray"}
        />
      </div>

      {report.openCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p className="text-emerald-600">
            Todos os {report.total} fins de semana têm algo marcado. 🎉
          </p>
          <p className="mt-1 text-sm">
            Agenda cheia até {weekendLabel(
              report.weekends[report.weekends.length - 1].friday,
              report.weekends[report.weekends.length - 1].days[2],
            )}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {report.weekends.map((w) => (
            <div
              key={w.friday}
              className={
                "card " + (w.open ? "border-l-4 border-l-amber-400" : "")
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold capitalize text-gray-900">
                  {weekendLabel(w.friday, w.days[2])}
                </h2>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (w.open
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800")
                  }
                >
                  {w.open ? "Livre" : `${w.shows.length} show${w.shows.length > 1 ? "s" : ""}`}
                </span>
              </div>

              {w.open ? (
                <p className="mt-2 text-sm text-gray-500">
                  Nada marcado de sexta a domingo. Oportunidade de booking.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {w.shows.map((s) => {
                    const status = s.status as ShowStatus;
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        <span
                          className={
                            "h-2.5 w-2.5 shrink-0 rounded-full " +
                            (SHOW_STATUS_DOT[status] ?? "bg-gray-300")
                          }
                          title={SHOW_STATUS_LABELS[status] ?? s.status}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/shows/${s.id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {s.title}
                          </Link>
                          <p className="truncate text-xs text-gray-500">
                            {new Date(s.date).toLocaleDateString("pt-BR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              timeZone: "UTC",
                            })}
                            {" · "}
                            {formatTime(new Date(s.date))}
                            {s.venue ? ` · ${s.venue}` : ""}
                            {s.city ? ` · ${s.city}` : ""}
                            {` · ${SHOW_STATUS_LABELS[status] ?? s.status}`}
                          </p>
                        </div>
                        {typeof s.fee === "number" && s.fee > 0 && (
                          <span className="shrink-0 text-sm text-gray-600">
                            {formatMoney(s.fee)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Um fim de semana vai de sexta a domingo; conta como ocupado se houver qualquer show
        não cancelado numa das três noites. A janela começa no fim de semana atual enquanto
        o domingo não passou. Datas e horários em UTC.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string;
  tone?: "amber" | "red" | "gray";
}) {
  const tones: Record<string, string> = {
    amber: "text-amber-600",
    red: "text-red-600",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}
