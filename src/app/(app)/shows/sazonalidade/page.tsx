import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  gigSeasonality,
  gigSeasonalityYears,
  compareGigSeasonality,
  parseProfitYear,
  filterShowsByYear,
  GIG_MONTH_SHORT,
  type ReceivableShowLike,
  type GigMonthStat,
  type GigSeasonalityComparison,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function GigSeasonalityPage({
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

  const shows: ReceivableShowLike[] = rows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  // Recorte por período opcional (`?ano=`): o padrão segue "todos os anos"
  // (a sazonalidade ganha sentido somando anos, D133b), mas um ano específico
  // revela o padrão recente. Os anos do seletor vêm só dos shows que a
  // sazonalidade conta (`gigSeasonalityYears`), para nenhuma pílula abrir vazia.
  const availableYears = gigSeasonalityYears(shows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  // Filtra as `rows` (com `date: Date`) antes de mapear — `ReceivableShowLike`
  // tem `date: string | Date`, incompatível com o `{ date: Date }` do helper.
  const periodShows: ReceivableShowLike[] = filterShowsByYear(rows, yearFilter).map(
    (s) => ({ id: s.id, fee: s.fee, status: s.status, date: s.date }),
  );
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;
  const exportHref =
    yearFilter === "all"
      ? "/shows/sazonalidade/export"
      : `/shows/sazonalidade/export?ano=${yearFilter}`;

  const season = gigSeasonality(periodShows);

  // Comparativo ano a ano dos "movers" da temporada: só com um ano específico
  // selecionado e ambos os períodos com shows realizados. O ano anterior sai do
  // mesmo acervo já carregado (zero I/O extra), recortado por `filterShowsByYear`.
  let comparison: GigSeasonalityComparison | null = null;
  if (yearFilter !== "all") {
    const prevShows: ReceivableShowLike[] = filterShowsByYear(
      rows,
      yearFilter - 1,
    ).map((s) => ({ id: s.id, fee: s.fee, status: s.status, date: s.date }));
    const prevSeason = gigSeasonality(prevShows);
    if (season.totalShows > 0 && prevSeason.totalShows > 0) {
      comparison = compareGigSeasonality(season, prevSeason);
    }
  }

  // Escala das barras: maior nº de shows entre os meses.
  const peakCount = Math.max(1, ...season.months.map((m) => m.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sazonalidade de shows</h1>
          <p className="text-sm text-gray-500">
            Quais meses do ano historicamente rendem mais shows e maiores cachês
            {yearFilter === "all" ? " — somando todos os anos — " : ` em ${yearFilter} `}
            para planejar prospecção e preço pela temporada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {season.totalShows > 0 && (
            <a href={exportHref} className="btn-secondary text-sm" download>
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
          basePath="/shows/sazonalidade"
        />
      )}

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Highlight
              label="Mês mais fraco"
              month={season.quietest}
              value={
                season.quietest
                  ? `${season.quietest.count} ${season.quietest.count === 1 ? "show" : "shows"}`
                  : "—"
              }
              tone="amber"
            />
          </div>

          {/* Comparativo ano a ano — os meses que mais mudaram */}
          {comparison && yearFilter !== "all" && (
            <SeasonComparison
              comparison={comparison}
              year={yearFilter}
              previousYear={yearFilter - 1}
            />
          )}

          {/* Shows por mês do ano */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Shows por mês do ano</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera apenas shows já realizados (PLAYED, ou confirmados com
              data passada) que tenham cachê registrado. Cada mês soma{" "}
              {yearFilter === "all" ? "todos os anos do histórico" : `o ano de ${yearFilter}`}.
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
                  const isQuietest =
                    season.quietest?.month === m.month &&
                    m.count > 0 &&
                    season.busiest?.month !== m.month;
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
                        {isQuietest && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600">
                            mais fraco
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

function SeasonComparison({
  comparison,
  year,
  previousYear,
}: {
  comparison: GigSeasonalityComparison;
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
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          Temporada {year} vs. {previousYear}
        </h2>
        <span className={"text-sm font-semibold " + totalTone}>
          {signedShows(totalShowsDelta)} · {signedMoney(totalFeeDelta)}
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Em que meses você agendou mais ou menos shows do que no ano anterior — se a
        forma da temporada mudou, onde prospectar ou rever o preço.
      </p>

      {!biggestGain && !biggestDrop ? (
        <p className="text-sm text-gray-500">
          Os dois anos têm a mesma distribuição de shows por mês — nenhum mês subiu
          ou caiu.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <MoverCard
            label="Mês que mais cresceu"
            change={biggestGain}
            tone="emerald"
          />
          <MoverCard label="Mês que mais caiu" change={biggestDrop} tone="red" />
        </div>
      )}
    </section>
  );
}

function MoverCard({
  label,
  change,
  tone,
}: {
  label: string;
  change: GigSeasonalityComparison["biggestGain"];
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
        <p className="mt-1 text-sm text-gray-400">Nenhum mês {tone === "emerald" ? "subiu" : "caiu"}.</p>
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
  tone?: "emerald" | "brand" | "gray" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    brand: "text-brand-700",
    amber: "text-amber-600",
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
