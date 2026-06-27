import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  gigSeasonality,
  GIG_MONTH_SHORT,
  type ReceivableShowLike,
  type GigMonthStat,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function GigSeasonalityPage() {
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

  const season = gigSeasonality(shows);

  // Escala das barras: maior nº de shows entre os meses.
  const peakCount = Math.max(1, ...season.months.map((m) => m.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sazonalidade de shows</h1>
          <p className="text-sm text-gray-500">
            Quais meses do ano historicamente rendem mais shows e maiores cachês
            — somando todos os anos — para planejar prospecção e preço pela
            temporada.
          </p>
        </div>
        <Link href="/shows" className="btn-secondary">
          ← Shows
        </Link>
      </div>

      {season.totalShows === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há shows realizados com cachê registrado para revelar um
            padrão por mês do ano. Marque um show como realizado e informe o
            cachê.
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Highlight
              label="Mês mais cheio"
              month={season.busiest}
              value={
                season.busiest
                  ? `${season.busiest.count} ${season.busiest.count === 1 ? "show" : "shows"}`
                  : "—"
              }
              tone="brand"
            />
            <Highlight
              label="Mais faturamento"
              month={season.bestByVolume}
              value={
                season.bestByVolume
                  ? formatMoney(season.bestByVolume.totalFee)
                  : "—"
              }
            />
            <Highlight
              label="Melhor cachê médio"
              month={season.bestByAvg}
              value={season.bestByAvg ? formatMoney(season.bestByAvg.avgFee) : "—"}
              tone="emerald"
            />
          </div>

          {/* Shows por mês do ano */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Shows por mês do ano</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera apenas shows já realizados (PLAYED, ou confirmados com
              data passada) que tenham cachê registrado. Cada mês soma todos os
              anos do histórico.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 px-3 text-right font-medium">Shows</th>
                  <th className="pb-2 px-3 text-right font-medium">Cachê médio</th>
                  <th className="pb-2 pl-3 text-right font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {season.months.map((m) => {
                  const isBusiest =
                    season.busiest?.month === m.month && m.count > 0;
                  return (
                    <tr
                      key={m.month}
                      className={
                        "border-b last:border-0 " +
                        (m.count === 0 ? "text-gray-400" : "")
                      }
                    >
                      <td className="py-2 pr-3 font-medium">
                        {m.label}
                        {isBusiest && (
                          <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                            mais cheio
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {m.count === 0 ? "—" : m.count}
                        {m.count > 0 && <Bar value={m.count} peak={peakCount} />}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-gray-500">
                        {m.count === 0 ? "—" : formatMoney(m.avgFee)}
                      </td>
                      <td className="py-2 pl-3 text-right text-xs text-gray-500">
                        {m.count === 0 ? "—" : formatMoney(m.totalFee)}
                        {m.count > 0 && (
                          <span className="ml-1 text-gray-400">
                            ({pct(m.feeShare)})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right">{season.totalShows}</td>
                  <td className="pt-2 px-3 text-right text-xs text-gray-500">
                    {formatMoney(season.avgFee)}
                  </td>
                  <td className="pt-2 pl-3 text-right text-xs text-gray-500">
                    {formatMoney(season.totalFee)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            A barra mostra o nº de shows de cada mês; &ldquo;cachê médio&rdquo; é
            o quanto, em média, cada show daquele mês pagou. Meses sem shows
            realizados aparecem zerados para você ver os vales da temporada —
            onde prospectar mais ou ajustar o preço.
          </p>
        </>
      )}
    </div>
  );
}

function Bar({ value, peak }: { value: number; peak: number }) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / peak) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div
        className="ml-auto h-full rounded bg-brand-400"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function Highlight({
  label,
  month,
  value,
  tone = "gray",
}: {
  label: string;
  month: GigMonthStat | null;
  value: string;
  tone?: "emerald" | "brand" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-gray-900">
        {month ? month.label : "—"}
        {month && (
          <span className="ml-1 text-xs font-normal text-gray-400">
            ({GIG_MONTH_SHORT[month.month]})
          </span>
        )}
      </p>
      <p className={"mt-0.5 text-sm font-semibold " + tones[tone]}>{value}</p>
    </div>
  );
}
