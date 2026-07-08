import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  showGaps,
  MIN_SHOW_GAP_SAMPLE,
  type ShowGapShowLike,
  type ShowGap,
} from "@/lib/shows";
import { MONTH_NAMES_LONG } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** "YYYY-MM-DD" → "10 mar 2026" (rótulo compacto, UTC, sem escorregar de fuso). */
function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const month = MONTH_NAMES_LONG[m - 1]?.slice(0, 3).toLowerCase() ?? "";
  return `${d} ${month} ${y}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function ShowGapsPage() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { date: true, status: true },
  });

  const shows: ShowGapShowLike[] = rows.map((s) => ({
    date: s.date,
    status: s.status,
  }));

  const report = showGaps(shows);
  const smallSample = report.showDays < MIN_SHOW_GAP_SAMPLE;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hiatos entre shows</h1>
          <p className="text-sm text-gray-500">
            Quanto tempo passa entre um gig e o outro — as maiores secas de
            agenda e há quanto tempo você não sobe ao palco.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.gaps.length > 0 && (
            <a href="/shows/hiatos/export" className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {report.showDays === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows firmes (confirmados ou realizados) para medir os
            intervalos da agenda. Confirme um show ou marque-o como realizado.
          </p>
          <Link
            href="/shows/novo"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Cadastrar um show
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Seca atual"
              value={
                report.currentGapDays == null
                  ? "—"
                  : plural(report.currentGapDays, "dia", "dias")
              }
              tone={
                report.currentGapDays != null && report.currentGapDays >= 30
                  ? "red"
                  : "brand"
              }
              hint={
                report.currentGapDays == null
                  ? "nenhum show passado ainda"
                  : report.daysUntilNext != null
                    ? `próximo show em ${plural(report.daysUntilNext, "dia", "dias")}`
                    : "desde o último show — nada agendado à frente"
              }
            />
            <Stat
              label="Maior seca"
              value={report.longest ? plural(report.longest.days, "dia", "dias") : "—"}
              tone="red"
              hint={
                report.longest
                  ? `${dayLabel(report.longest.fromDay)} → ${dayLabel(report.longest.toDay)}`
                  : "precisa de ao menos dois shows"
              }
            />
            <Stat
              label="Espaçamento típico"
              value={
                report.medianGapDays > 0
                  ? plural(report.medianGapDays, "dia", "dias")
                  : "—"
              }
              tone="brand"
              hint={
                report.averageGapDays > 0
                  ? `média de ${plural(report.averageGapDays, "dia", "dias")} entre shows`
                  : "mediana entre gigs consecutivos"
              }
            />
            <Stat
              label="Dias de show"
              value={String(report.showDays)}
              hint={
                report.firstDay && report.lastDay
                  ? `${dayLabel(report.firstDay)} → ${dayLabel(report.lastDay)}`
                  : undefined
              }
            />
          </div>

          {smallSample && (
            <div className="card border-amber-200 bg-amber-50 text-sm text-amber-800">
              Amostra pequena ({plural(report.showDays, "dia de show", "dias de show")}).
              O espaçamento típico fica mais confiável a partir de{" "}
              {MIN_SHOW_GAP_SAMPLE} dias de show.
            </div>
          )}

          {report.gaps.length > 0 && (
            <section className="card overflow-x-auto">
              <h2 className="mb-1 font-semibold">Maiores secas</h2>
              <p className="mb-4 text-xs text-gray-500">
                Considera só shows firmes (confirmados ou realizados) — propostas
                em aberto ainda podem cair e não entram. Vários shows no mesmo dia
                contam como um só dia de agenda. Cada linha é o intervalo, em dias
                corridos, entre um show e o seguinte.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-3 font-medium">Período</th>
                    <th className="pb-2 pl-3 text-right font-medium">Dias sem show</th>
                  </tr>
                </thead>
                <tbody>
                  {report.gaps.map((gap) => (
                    <GapRow
                      key={`${gap.fromDay}_${gap.toDay}`}
                      gap={gap}
                      peak={report.longest?.days ?? gap.days}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function GapRow({ gap, peak }: { gap: ShowGap; peak: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-3 font-medium">
        {dayLabel(gap.fromDay)} <span className="text-gray-400">→</span>{" "}
        {dayLabel(gap.toDay)}
      </td>
      <td className="py-2 pl-3 text-right text-gray-900">
        {gap.days}
        <Bar value={gap.days} peak={peak} />
      </td>
    </tr>
  );
}

function Bar({ value, peak }: { value: number; peak: number }) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / Math.max(1, peak)) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div className="ml-auto h-full rounded bg-brand-400" style={{ width: `${width}%` }} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
  hint,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red" | "brand" | "gray";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
