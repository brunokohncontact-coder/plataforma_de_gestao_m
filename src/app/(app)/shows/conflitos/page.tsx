import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findScheduleConflicts, type ConflictShowLike } from "@/lib/shows";
import { formatMoney } from "@/lib/money";
import { SHOW_STATUS_DOT, SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

// Formata a chave "YYYY-MM-DD" como data legível em pt-BR (em UTC, coerente com
// `dayKey`, para não escorregar de dia por fuso).
function formatDayKey(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default async function ScheduleConflictsPage() {
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

  const conflictShows: ConflictShowLike[] = shows.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    venue: s.venue,
    city: s.city,
    status: s.status,
    fee: s.fee,
  }));

  const report = findScheduleConflicts(conflictShows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conflitos de agenda</h1>
          <p className="text-sm text-gray-500">
            Dias com mais de um show marcado (fora os cancelados). Pode ser intencional — uma
            matinê e um show à noite —, mas vale revisar para não ter fechado dois compromissos no
            mesmo dia sem querer.
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

      {report.dayCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p className="text-emerald-600">Nenhum conflito de agenda. 👍</p>
          <p className="mt-1 text-sm">
            Cada dia tem no máximo um show marcado. Tudo certo.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Dias em conflito" value={String(report.dayCount)} tone="amber" />
            <Stat
              label="A resolver (hoje ou depois)"
              value={String(report.upcomingDayCount)}
              tone={report.upcomingDayCount > 0 ? "red" : "gray"}
            />
            <Stat label="Shows envolvidos" value={String(report.showCount)} tone="gray" />
          </div>

          <div className="space-y-4">
            {report.days.map((d) => (
              <div
                key={d.day}
                className={
                  "card " + (d.upcoming ? "border-l-4 border-l-amber-400" : "")
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold capitalize text-gray-900">
                    {formatDayKey(d.day)}
                  </h2>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (d.upcoming
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-500")
                    }
                  >
                    {d.count} shows{d.upcoming ? "" : " (passado)"}
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-gray-100">
                  {d.shows.map((s) => {
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
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            Os horários aparecem em UTC; um dia reúne todos os shows na mesma data do calendário.
            Shows cancelados não entram na conta. Para remarcar, abra o show e edite a data.
          </p>
        </>
      )}
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
