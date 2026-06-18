import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { forecastBookedRevenue, type BookedRevenueShowLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatMonthKey } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookedRevenuePage() {
  const user = await requireUser();

  // Só os shows ainda por acontecer (a partir de hoje) entram na projeção; já
  // restringimos no banco para reduzir o volume lido. A regra fina de "futuro"
  // (dia >= hoje em UTC) e a exclusão de cancelados ficam na lógica pura.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const shows = await prisma.show.findMany({
    where: { userId: user.id, date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    select: { fee: true, status: true, date: true },
  });

  const forecast = forecastBookedRevenue(shows as BookedRevenueShowLike[]);

  const confirmedShare =
    forecast.total > 0 ? Math.round((forecast.confirmedTotal / forecast.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Receita agendada</h1>
          <p className="text-sm text-gray-500">
            Quanto você já tem agendado para receber nos próximos meses, a partir dos
            cachês dos shows futuros. Cancelados são ignorados.
          </p>
        </div>
        <Link href="/shows" className="btn-secondary">
          ← Shows
        </Link>
      </div>

      {forecast.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum show agendado para os próximos meses.</p>
          <Link
            href="/shows/novo"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Agendar um show
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total agendado" value={formatMoney(forecast.total)} tone="brand" />
            <Stat
              label="Confirmado"
              value={formatMoney(forecast.confirmedTotal)}
              tone="emerald"
            />
            <Stat
              label="A confirmar"
              value={formatMoney(forecast.tentativeTotal)}
              tone="amber"
            />
            <Stat
              label="Shows agendados"
              value={String(forecast.count)}
              hint={`${confirmedShare}% confirmado`}
            />
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Confirmado</th>
                  <th className="px-4 py-3 text-right font-medium">A confirmar</th>
                  <th className="px-4 py-3 text-right font-medium">Total do mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forecast.months.map((m) => {
                  const confirmedPct = m.total > 0 ? (m.confirmed / m.total) * 100 : 0;
                  return (
                    <tr key={m.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/shows/calendario?mes=${m.month}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {formatMonthKey(m.month)}
                        </Link>
                        <div
                          className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-amber-200"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${confirmedPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{m.count}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {m.confirmed > 0 ? formatMoney(m.confirmed) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600">
                        {m.tentative > 0 ? formatMoney(m.tentative) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatMoney(m.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-sm font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{forecast.count}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatMoney(forecast.confirmedTotal)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600">
                    {formatMoney(forecast.tentativeTotal)}
                  </td>
                  <td className="px-4 py-3 text-right text-brand-700">
                    {formatMoney(forecast.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Confirmado = shows com status Confirmado ou Realizado. A confirmar = shows
            Propostos. O valor é o cachê acordado de cada show (não inclui receitas
            extras nem descontos de despesas).
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
  hint,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "brand" | "gray";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
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
