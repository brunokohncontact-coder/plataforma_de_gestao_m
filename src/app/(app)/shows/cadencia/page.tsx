import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  gigCadence,
  type ReceivableShowLike,
  type MetricDelta,
  type GigCadenceMonth,
} from "@/lib/finance";
import { MONTH_NAMES_LONG } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** "YYYY-MM" → "Jan 2026" (rótulo compacto para tabela). */
function shortMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = MONTH_NAMES_LONG[month - 1]?.slice(0, 3) ?? key;
  return `${name} ${year}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function GigCadencePage() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { id: true, date: true, status: true, fee: true },
  });

  const shows: ReceivableShowLike[] = rows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const cadence = gigCadence(shows);

  // Escala das barras: maior contagem mensal de shows.
  const peak = Math.max(1, ...cadence.months.map((m) => m.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cadência de shows</h1>
          <p className="text-sm text-gray-500">
            Quantos shows você toca por mês ao longo do tempo — o sinal de que a
            sua agenda está mais (ou menos) cheia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cadence.totalShows > 0 && (
            <a
              href="/shows/cadencia/export"
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {cadence.totalShows === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows realizados para revelar uma cadência. Marque um
            show como realizado (ou confirme um com data já passada).
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
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Shows por mês ativo"
              value={cadence.avgPerActiveMonth.toLocaleString("pt-BR")}
              tone="brand"
              hint="média nos meses em que você tocou"
            />
            <Stat
              label="Shows realizados"
              value={String(cadence.totalShows)}
              hint={`${plural(cadence.activeMonths, "mês ativo", "meses ativos")}`}
            />
            <Stat
              label="Mês mais cheio"
              value={
                cadence.busiestMonth
                  ? plural(cadence.busiestMonth.count, "show", "shows")
                  : "—"
              }
              tone="emerald"
              hint={cadence.busiestMonth ? shortMonthLabel(cadence.busiestMonth.month) : undefined}
            />
            <Stat
              label="Meses parados"
              value={String(cadence.idleMonths)}
              tone={cadence.idleMonths > 0 ? "red" : "gray"}
              hint={`na janela de ${plural(cadence.spanMonths, "mês", "meses")}`}
            />
          </div>

          {/* Tendência: contagem do mês mais recente vs. o primeiro */}
          {cadence.trend && (
            <TrendCard
              delta={cadence.trend}
              firstMonth={cadence.months[0]}
              lastMonth={cadence.months[cadence.months.length - 1]}
            />
          )}

          {/* Shows mês a mês */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Shows mês a mês</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera todos os shows já realizados (PLAYED, ou confirmados com
              data passada), inclusive os de cachê zero — o eixo aqui é atividade,
              não preço. Meses sem nenhum show não aparecem na tabela.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 pl-3 text-right font-medium">Shows</th>
                </tr>
              </thead>
              <tbody>
                {cadence.months.map((m) => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{shortMonthLabel(m.month)}</td>
                    <td className="py-2 pl-3 text-right text-gray-900">
                      {m.count}
                      <Bar value={m.count} peak={peak} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function TrendCard({
  delta,
  firstMonth,
  lastMonth,
}: {
  delta: MetricDelta;
  firstMonth: GigCadenceMonth;
  lastMonth: GigCadenceMonth;
}) {
  const colorClass =
    delta.direction === "up"
      ? "text-emerald-600"
      : delta.direction === "down"
        ? "text-red-600"
        : "text-gray-500";
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "→";
  const pctLabel = delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;
  const headline =
    delta.direction === "up"
      ? "Você está tocando mais"
      : delta.direction === "down"
        ? "Você está tocando menos"
        : "Seu ritmo de shows está estável";

  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Tendência da agenda
      </p>
      <p className={"mt-1 text-xl font-bold " + colorClass}>
        {headline}{" "}
        {delta.direction !== "flat" && (
          <span>
            {arrow} {Math.abs(delta.delta)}{" "}
            {Math.abs(delta.delta) === 1 ? "show" : "shows"}{" "}
            <span className="opacity-70">({pctLabel})</span>
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Comparando {shortMonthLabel(firstMonth.month)} ({plural(firstMonth.count, "show", "shows")})
        com {shortMonthLabel(lastMonth.month)} ({plural(lastMonth.count, "show", "shows")}).
      </p>
    </div>
  );
}

function Bar({ value, peak }: { value: number; peak: number }) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / peak) * 100));
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
