import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { feeTrend, type ReceivableShowLike, type MetricDelta, type FeeTrendMonth } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { MONTH_NAMES_LONG } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** "YYYY-MM" → "Jan 2026" (rótulo compacto para tabela). */
function shortMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = MONTH_NAMES_LONG[month - 1]?.slice(0, 3) ?? key;
  return `${name} ${year}`;
}

export default async function FeeTrendPage() {
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

  const trend = feeTrend(shows);

  // Escala das barras: maior média mensal de cachê entre os meses.
  const peak = Math.max(1, ...trend.months.map((m) => m.avgFee));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Evolução do cachê</h1>
          <p className="text-sm text-gray-500">
            Como o cachê médio dos seus shows já realizados evolui ao longo do tempo —
            o sinal de que você está cobrando mais.
          </p>
        </div>
        <Link href="/shows" className="btn-secondary">
          ← Shows
        </Link>
      </div>

      {trend.totalShows === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows realizados com cachê registrado para revelar uma
            tendência. Marque um show como realizado e informe o cachê.
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
            <Stat label="Cachê médio geral" value={formatMoney(trend.avgFee)} tone="brand" />
            <Stat label="Maior cachê" value={formatMoney(trend.highestFee)} tone="emerald" />
            <Stat label="Menor cachê" value={formatMoney(trend.lowestFee)} />
            <Stat
              label="Shows considerados"
              value={String(trend.totalShows)}
              hint={`${trend.months.length} ${trend.months.length === 1 ? "mês" : "meses"}`}
            />
          </div>

          {/* Tendência: mês mais recente vs. primeiro mês */}
          {trend.trend && trend.bestMonth && (
            <TrendCard
              delta={trend.trend}
              firstMonth={trend.months[0]}
              lastMonth={trend.months[trend.months.length - 1]}
            />
          )}

          {/* Cachê médio mês a mês */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Cachê médio mês a mês</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera apenas shows já realizados (PLAYED, ou confirmados com data
              passada) que tenham cachê registrado.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 px-3 text-right font-medium">Cachê médio</th>
                  <th className="pb-2 px-3 text-right font-medium">Faixa</th>
                  <th className="pb-2 pl-3 text-right font-medium">Shows</th>
                </tr>
              </thead>
              <tbody>
                {trend.months.map((m) => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{shortMonthLabel(m.month)}</td>
                    <td className="py-2 px-3 text-right text-gray-900">
                      {formatMoney(m.avgFee)}
                      <Bar value={m.avgFee} peak={peak} />
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-gray-500">
                      {m.minFee === m.maxFee
                        ? formatMoney(m.minFee)
                        : `${formatMoney(m.minFee)} – ${formatMoney(m.maxFee)}`}
                    </td>
                    <td className="py-2 pl-3 text-right text-xs text-gray-500">{m.count}</td>
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
  firstMonth: FeeTrendMonth;
  lastMonth: FeeTrendMonth;
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
      ? "Seu cachê médio subiu"
      : delta.direction === "down"
        ? "Seu cachê médio caiu"
        : "Seu cachê médio está estável";

  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Tendência do cachê
      </p>
      <p className={"mt-1 text-xl font-bold " + colorClass}>
        {headline}{" "}
        {delta.direction !== "flat" && (
          <span>
            {arrow} {formatMoney(Math.abs(delta.delta))}{" "}
            <span className="opacity-70">({pctLabel})</span>
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Comparando {shortMonthLabel(firstMonth.month)} ({formatMoney(firstMonth.avgFee)})
        com {shortMonthLabel(lastMonth.month)} ({formatMoney(lastMonth.avgFee)}).
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
