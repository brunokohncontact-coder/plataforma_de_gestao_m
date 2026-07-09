import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  weekdayPerformance,
  weekdayPerformanceYears,
  weekdaySplit,
  compareWeekdayPerformance,
  classifyWeekdayPerformanceDayChange,
  parseProfitYear,
  filterShowsByYear,
  WEEKDAY_SHORT,
  type ReceivableShowLike,
  type WeekdayStat,
  type WeekdaySplitBucket,
  type WeekdayPerformanceComparison,
  type WeekdayPerformanceDayTrend,
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

  // Comparativo ano a ano dos "movers" da semana: só com um ano específico
  // selecionado e ambos os períodos com shows realizados. O ano anterior sai do
  // mesmo acervo já carregado (zero I/O extra), recortado por `filterShowsByYear`.
  // Espelha `/shows/sazonalidade` no eixo do dia da semana.
  let comparison: WeekdayPerformanceComparison | null = null;
  if (yearFilter !== "all") {
    const prevShows: ReceivableShowLike[] = filterShowsByYear(
      rows,
      yearFilter - 1,
    ).map((s) => ({ id: s.id, fee: s.fee, status: s.status, date: s.date }));
    const prevWp = weekdayPerformance(prevShows);
    if (wp.totalShows > 0 && prevWp.totalShows > 0) {
      comparison = compareWeekdayPerformance(wp, prevWp);
    }
  }

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

          {/* Comparativo ano a ano — os dias que mais mudaram */}
          {comparison && yearFilter !== "all" && (
            <WeekdayComparison
              comparison={comparison}
              year={yearFilter}
              previousYear={yearFilter - 1}
            />
          )}

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

function signedShows(delta: number): string {
  const abs = Math.abs(delta);
  const noun = abs === 1 ? "show" : "shows";
  if (delta > 0) return `+${abs} ${noun}`;
  if (delta < 0) return `−${abs} ${noun}`;
  return `0 ${noun}`;
}

function signedMoney(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(delta))}`;
}

function trendTone(trend: WeekdayPerformanceDayTrend): string {
  if (trend === "up") return "text-emerald-600";
  if (trend === "down") return "text-red-600";
  return "text-gray-400";
}

/**
 * Card do comparativo ano a ano: os dois movers (dia que mais cresceu / mais caiu
 * em nº de shows) e, recolhido, a tabela dos 7 dias. Espelho do `SeasonComparison`
 * de `/shows/sazonalidade`. Reusa o `comparison` já computado (zero I/O extra).
 */
function WeekdayComparison({
  comparison,
  year,
  previousYear,
}: {
  comparison: WeekdayPerformanceComparison;
  year: number;
  previousYear: number;
}) {
  const { biggestGain, biggestDrop, totalShowsDelta, totalFeeDelta } = comparison;
  const totalTone =
    totalShowsDelta > 0
      ? "text-emerald-600"
      : totalShowsDelta < 0
        ? "text-red-600"
        : "text-gray-500";

  return (
    <section className="card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          Semana {year} vs. {previousYear}
        </h2>
        <div className="flex items-center gap-3">
          <span className={"text-sm font-semibold " + totalTone}>
            {signedShows(totalShowsDelta)} · {signedMoney(totalFeeDelta)}
          </span>
          <a
            href={`/shows/dias-semana/comparativo/export?ano=${year}`}
            className="text-xs text-gray-500 hover:text-gray-900 hover:underline"
            download
          >
            ⬇ CSV
          </a>
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Em que dias da semana você agendou mais ou menos shows do que no ano
        anterior — se a agenda migrou de dia, onde há espaço para preencher.
      </p>

      {!biggestGain && !biggestDrop ? (
        <p className="text-sm text-gray-500">
          Os dois anos têm a mesma distribuição de shows por dia da semana — nenhum
          dia subiu ou caiu.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoverCard
              label="Dia que mais cresceu"
              change={biggestGain}
              tone="emerald"
            />
            <MoverCard label="Dia que mais caiu" change={biggestDrop} tone="red" />
          </div>
          <WeekdayComparisonDetail
            comparison={comparison}
            year={year}
            previousYear={previousYear}
          />
        </>
      )}
    </section>
  );
}

/**
 * Detalhe opcional (recolhido por padrão) com os 7 dias do comparativo. Os movers
 * acima entregam o sinal; esta tabela é para quem quiser conferir dia a dia sem
 * sair da tela. Reusa os `days` já computados por `compareWeekdayPerformance`.
 */
function WeekdayComparisonDetail({
  comparison,
  year,
  previousYear,
}: {
  comparison: WeekdayPerformanceComparison;
  year: number;
  previousYear: number;
}) {
  return (
    <details className="mt-4 border-t pt-3">
      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
        Ver os 7 dias
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-3 font-medium">Dia</th>
              <th className="pb-2 px-3 text-right font-medium">Shows {previousYear}</th>
              <th className="pb-2 px-3 text-right font-medium">Shows {year}</th>
              <th className="pb-2 px-3 text-right font-medium">Δ shows</th>
              <th className="pb-2 pl-3 text-right font-medium">Δ faturamento</th>
            </tr>
          </thead>
          <tbody>
            {comparison.days.map((d) => {
              const trend = classifyWeekdayPerformanceDayChange(d);
              const empty = d.currentCount === 0 && d.previousCount === 0;
              return (
                <tr
                  key={d.weekday}
                  className={
                    "border-b last:border-0 " + (empty ? "text-gray-400" : "")
                  }
                >
                  <td className="py-2 pr-3 font-medium">{d.label}</td>
                  <td className="py-2 px-3 text-right text-gray-500">
                    {d.previousCount === 0 ? "—" : d.previousCount}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-500">
                    {d.currentCount === 0 ? "—" : d.currentCount}
                  </td>
                  <td className={"py-2 px-3 text-right font-medium " + trendTone(trend)}>
                    {d.countDelta === 0 ? "—" : signedShows(d.countDelta)}
                  </td>
                  <td className={"py-2 pl-3 text-right " + trendTone(trend)}>
                    {d.feeDelta === 0 ? "—" : signedMoney(d.feeDelta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="pt-2 pr-3">Total</td>
              <td className="pt-2 px-3" />
              <td className="pt-2 px-3" />
              <td className="pt-2 px-3 text-right text-gray-600">
                {comparison.totalShowsDelta === 0
                  ? "—"
                  : signedShows(comparison.totalShowsDelta)}
              </td>
              <td className="pt-2 pl-3 text-right text-gray-600">
                {comparison.totalFeeDelta === 0
                  ? "—"
                  : signedMoney(comparison.totalFeeDelta)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  );
}

function MoverCard({
  label,
  change,
  tone,
}: {
  label: string;
  change: WeekdayPerformanceComparison["biggestGain"];
  tone: "emerald" | "red";
}) {
  const valueTone = tone === "emerald" ? "text-emerald-600" : "text-red-600";
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      {change ? (
        <>
          <p className="mt-1 text-lg font-bold text-gray-900">{change.label}</p>
          <p className={"mt-0.5 text-sm font-semibold " + valueTone}>
            {signedShows(change.countDelta)}
            <span className="ml-1 font-normal text-gray-400">
              ({change.previousCount} → {change.currentCount})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Faturamento {signedMoney(change.feeDelta)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-400">
          Nenhum dia {tone === "emerald" ? "subiu" : "caiu"}.
        </p>
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
