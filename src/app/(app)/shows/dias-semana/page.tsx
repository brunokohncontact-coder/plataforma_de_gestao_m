import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  weekdayPerformance,
  weekdayPerformanceYears,
  weekdaySplit,
  parseProfitYear,
  filterShowsByYear,
  WEEKDAY_SHORT,
  type ReceivableShowLike,
  type WeekdayStat,
  type WeekdaySplitBucket,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function WeekdayPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { id: true, date: true, status: true, fee: true },
  });

  // Recorte por período (ano), reaproveitando os helpers da D108. Os anos do
  // seletor vêm só dos shows que de fato entram no desempenho por dia da semana
  // (realizados com cachê > 0), via `weekdayPerformanceYears`, para não oferecer
  // um ano vazio. Filtra-se ANTES de mapear/`weekdayPerformance`, que segue
  // aplicando o mesmo gate sem saber do recorte.
  const availableYears = weekdayPerformanceYears(rows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodRows = filterShowsByYear(rows, yearFilter);

  const shows: ReceivableShowLike[] = periodRows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const wp = weekdayPerformance(shows);
  const split = weekdaySplit(wp);
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  // Escala das barras: maior cachê médio entre os dias com shows.
  const peakAvg = Math.max(1, ...wp.days.map((d) => d.avgFee));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Por dia da semana</h1>
          <p className="text-sm text-gray-500">
            Em que dias da semana você toca mais e quais pagam melhor — para
            saber quais convites valem mais a pena.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wp.totalShows > 0 && (
            <a
              href={`/shows/dias-semana/export${
                yearFilter === "all" ? "" : `?ano=${yearFilter}`
              }`}
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

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/shows/dias-semana"
        />
      )}

      {wp.totalShows === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>
                Ainda não há shows realizados com cachê registrado para revelar um
                padrão por dia da semana. Marque um show como realizado e informe
                o cachê.
              </p>
              <Link
                href="/shows/novo"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Cadastrar um show
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum show realizado com cachê em {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver o padrão por dia da semana.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Highlight
              label="Melhor cachê médio"
              day={wp.bestByAvg}
              value={wp.bestByAvg ? formatMoney(wp.bestByAvg.avgFee) : "—"}
              tone="emerald"
            />
            <Highlight
              label="Mais faturamento"
              day={wp.bestByVolume}
              value={wp.bestByVolume ? formatMoney(wp.bestByVolume.totalFee) : "—"}
              tone="brand"
            />
            <Highlight
              label="Mais shows"
              day={wp.busiest}
              value={
                wp.busiest
                  ? `${wp.busiest.count} ${wp.busiest.count === 1 ? "show" : "shows"}`
                  : "—"
              }
            />
          </div>

          {/* Fim de semana × dias de semana */}
          <section className="card">
            <h2 className="mb-1 font-semibold">Fim de semana × dias de semana</h2>
            <p className="mb-4 text-xs text-gray-500">
              Sexta, sábado e domingo (as noites de casa cheia) contra segunda a
              quinta — quanto do seu faturamento e dos seus shows vem de cada bloco,
              e onde o cachê médio é maior.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SplitCard
                label="Fim de semana"
                sub="sex · sáb · dom"
                bucket={split.weekend}
                tone="brand"
              />
              <SplitCard
                label="Dias de semana"
                sub="seg · ter · qua · qui"
                bucket={split.weekday}
                tone="gray"
              />
            </div>
            {split.weekend.count > 0 && split.weekday.count > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                {split.weekend.avgFee >= split.weekday.avgFee ? (
                  <>
                    O cachê médio de fim de semana está{" "}
                    <strong className="text-brand-700">
                      {avgGapLabel(split.weekend.avgFee, split.weekday.avgFee)}
                    </strong>{" "}
                    acima do de dias de semana.
                  </>
                ) : (
                  <>
                    Curiosamente, o cachê médio de dias de semana está{" "}
                    <strong className="text-brand-700">
                      {avgGapLabel(split.weekday.avgFee, split.weekend.avgFee)}
                    </strong>{" "}
                    acima do de fim de semana.
                  </>
                )}
              </p>
            )}
          </section>

          {/* Cachê médio por dia da semana */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Cachê médio por dia da semana</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera apenas shows já realizados (PLAYED, ou confirmados com data
              passada) que tenham cachê registrado.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Dia</th>
                  <th className="pb-2 px-3 text-right font-medium">Cachê médio</th>
                  <th className="pb-2 px-3 text-right font-medium">Faturamento</th>
                  <th className="pb-2 pl-3 text-right font-medium">Shows</th>
                </tr>
              </thead>
              <tbody>
                {wp.days.map((d) => {
                  const isBest = wp.bestByAvg?.weekday === d.weekday && d.count > 0;
                  return (
                    <tr
                      key={d.weekday}
                      className={
                        "border-b last:border-0 " +
                        (d.count === 0 ? "text-gray-400" : "")
                      }
                    >
                      <td className="py-2 pr-3 font-medium">
                        {d.label}
                        {isBest && (
                          <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                            melhor
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {d.count === 0 ? "—" : formatMoney(d.avgFee)}
                        {d.count > 0 && <Bar value={d.avgFee} peak={peakAvg} />}
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-gray-500">
                        {d.count === 0 ? "—" : formatMoney(d.totalFee)}
                        {d.count > 0 && (
                          <span className="ml-1 text-gray-400">
                            ({pct(d.feeShare)})
                          </span>
                        )}
                      </td>
                      <td className="py-2 pl-3 text-right text-xs text-gray-500">
                        {d.count === 0 ? "—" : d.count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right">{formatMoney(wp.avgFee)}</td>
                  <td className="pt-2 px-3 text-right text-xs text-gray-500">
                    {formatMoney(wp.totalFee)}
                  </td>
                  <td className="pt-2 pl-3 text-right text-xs text-gray-500">
                    {wp.totalShows}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            &ldquo;Cachê médio&rdquo; é o quanto, em média, cada show daquele dia
            pagou; &ldquo;faturamento&rdquo; é a soma de todos. Dias sem shows
            realizados aparecem zerados para você ver as lacunas da agenda.
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo do quanto (%) um cachê médio maior supera o menor; "—" sem base. */
function avgGapLabel(higher: number, lower: number): string {
  if (lower <= 0) return "—";
  return `${Math.round((higher / lower - 1) * 100)}%`;
}

function SplitCard({
  label,
  sub,
  bucket,
  tone,
}: {
  label: string;
  sub: string;
  bucket: WeekdaySplitBucket;
  tone: "brand" | "gray";
}) {
  const accent = tone === "brand" ? "text-brand-700" : "text-gray-900";
  const barColor = tone === "brand" ? "bg-brand-400" : "bg-gray-300";
  const share = Math.round(bucket.feeShare * 100);
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <p className={"mt-1 text-2xl font-bold " + accent}>{share}%</p>
      <p className="text-xs text-gray-500">do faturamento do período</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-200">
        <div
          className={"h-full rounded " + barColor}
          style={{ width: `${Math.max(bucket.feeShare > 0 ? 2 : 0, share)}%` }}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
        <dt>Shows</dt>
        <dd className="text-right text-gray-700">
          {bucket.count} ({pct(bucket.countShare)})
        </dd>
        <dt>Faturamento</dt>
        <dd className="text-right text-gray-700">{formatMoney(bucket.totalFee)}</dd>
        <dt>Cachê médio</dt>
        <dd className="text-right text-gray-700">
          {bucket.count > 0 ? formatMoney(bucket.avgFee) : "—"}
        </dd>
      </dl>
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
  day,
  value,
  tone = "gray",
}: {
  label: string;
  day: WeekdayStat | null;
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
        {day ? day.label : "—"}
        {day && (
          <span className="ml-1 text-xs font-normal text-gray-400">
            ({WEEKDAY_SHORT[day.weekday]})
          </span>
        )}
      </p>
      <p className={"mt-0.5 text-sm font-semibold " + tones[tone]}>{value}</p>
    </div>
  );
}
