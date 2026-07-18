import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankShowsByProfit,
  showResultDistribution,
  compareShowResultDistribution,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type ShowResultBandKey,
  type ShowResultBandStat,
  type ShowResultDistributionComparison,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const CANCELLED = "CANCELLED";

/** Cor da barra/rótulo de cada faixa (do vermelho ao verde). */
const BAND_TONE: Record<ShowResultBandKey, { bar: string; text: string }> = {
  loss: { bar: "bg-red-500", text: "text-red-600" },
  even: { bar: "bg-gray-400", text: "text-gray-600" },
  thin: { bar: "bg-amber-500", text: "text-amber-600" },
  healthy: { bar: "bg-emerald-500", text: "text-emerald-600" },
  high: { bar: "bg-brand-600", text: "text-brand-700" },
};

export default async function ShowResultDistributionPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, title: true, date: true, status: true, fee: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  // Mesmo recorte por período (ano) da página-mãe `/shows/rentabilidade`
  // (D108/D118): filtra antes de agregar, oferecendo só os anos dos shows não
  // cancelados. `rankShowsByProfit` segue excluindo CANCELLED.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(shows, yearFilter);

  const report = rankShowsByProfit(periodShows, txs);
  const dist = showResultDistribution(report);

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;
  const maxCount = Math.max(1, ...dist.bands.map((b) => b.count));

  // Comparativo ano a ano da saúde da carteira (só com um ano específico e ambos
  // os períodos tendo shows — senão a fração no vermelho do ano vazio seria 0 e a
  // comparação enganosa). Reaproveita o mesmo recorte por ano (D108) sobre os
  // registros já carregados, sem nova consulta.
  let comparison: ShowResultDistributionComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = rankShowsByProfit(filterShowsByYear(shows, previousYear), txs);
    if (report.count > 0 && previousReport.count > 0) {
      comparison = compareShowResultDistribution(
        dist,
        showResultDistribution(previousReport),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Distribuição de resultado</h1>
          <p className="text-sm text-gray-500">
            Quantos dos seus shows rodam no vermelho, com margem magra ou com margem
            saudável — a saúde da carteira de gigs por resultado líquido. Shows cancelados
            são ignorados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dist.count > 0 && (
            <a
              href={`/shows/rentabilidade/distribuicao/export${
                yearFilter === "all" ? "" : `?ano=${yearFilter}`
              }`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          {comparison && (
            <a
              href={`/shows/rentabilidade/distribuicao/comparativo/export?ano=${yearFilter}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV vs {previousYear}
            </a>
          )}
          <Link href="/shows/rentabilidade" className="btn-secondary">
            ← Rentabilidade
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/shows/rentabilidade/distribuicao"
        />
      )}

      {dist.count === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Nenhum show para analisar.</p>
              <Link
                href="/shows/novo"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Cadastrar um show
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum show em {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver a distribuição de resultado.
              </p>
              <Link
                href="/shows/rentabilidade/distribuicao"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver todos os anos
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Recorte acionável: quantos shows e quanto R$ estão no vermelho. */}
          {dist.lossCount > 0 ? (
            <div className="card border border-red-200 bg-red-50">
              <p className="text-sm font-semibold text-red-800">
                {dist.lossCount} de {dist.count}{" "}
                {dist.count === 1 ? "show deu" : "shows deram"} prejuízo (
                {Math.round(dist.lossShare * 100)}%)
              </p>
              <p className="mt-1 text-sm text-red-700">
                Somam {formatMoney(dist.lossNet)} no vermelho. Vale rever cachês e despesas
                vinculadas dessas casas antes de repetir.
              </p>
            </div>
          ) : (
            <div className="card border border-emerald-200 bg-emerald-50">
              <p className="text-sm font-semibold text-emerald-800">
                Nenhum show no vermelho em {periodLabel}.
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Todos os {dist.count} shows analisados fecharam pelo menos empatados.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Shows analisados" value={String(dist.count)} />
            <Stat
              label="Resultado somado"
              value={formatMoney(dist.totalNet)}
              tone={dist.totalNet >= 0 ? "brand" : "red"}
            />
            <Stat
              label="No vermelho"
              value={`${Math.round(dist.lossShare * 100)}%`}
              tone={dist.lossCount > 0 ? "red" : "emerald"}
            />
          </div>

          {comparison && (
            <ComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          <div className="card space-y-4">
            {dist.bands.map((band) => (
              <BandBar key={band.key} band={band} maxCount={maxCount} total={dist.count} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Veredito ano a ano da saúde da carteira, ancorado na fração no vermelho. */
const TREND_TONE: Record<
  ShowResultDistributionComparison["trend"],
  { border: string; bg: string; head: string; body: string; label: string }
> = {
  improved: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    head: "text-emerald-800",
    body: "text-emerald-700",
    label: "Carteira mais saudável",
  },
  worsened: {
    border: "border-red-200",
    bg: "bg-red-50",
    head: "text-red-800",
    body: "text-red-700",
    label: "Mais shows no vermelho",
  },
  stable: {
    border: "border-gray-200",
    bg: "bg-gray-50",
    head: "text-gray-800",
    body: "text-gray-600",
    label: "Estável",
  },
};

function ComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ShowResultDistributionComparison;
  currentYear: number;
  previousYear: number;
}) {
  const tone = TREND_TONE[comparison.trend];
  const prevPct = Math.round(comparison.previous.lossShare * 100);
  const curPct = Math.round(comparison.current.lossShare * 100);
  return (
    <div className={`card border ${tone.border} ${tone.bg}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-sm font-semibold ${tone.head}`}>
          Distribuição {currentYear} vs. {previousYear}
        </p>
        <span className={`text-xs font-semibold uppercase tracking-wide ${tone.head}`}>
          {tone.label}
        </span>
      </div>
      <p className={`mt-1 text-sm ${tone.body}`}>
        Shows no vermelho: {prevPct}% em {previousYear} → {curPct}% em {currentYear} (
        {comparison.previous.lossCount} → {comparison.current.lossCount} de{" "}
        {comparison.previous.count} → {comparison.current.count} shows).
      </p>
    </div>
  );
}

/** Uma linha do histograma: rótulo, barra proporcional, contagem/% e resultado. */
function BandBar({
  band,
  maxCount,
  total,
}: {
  band: ShowResultBandStat;
  maxCount: number;
  total: number;
}) {
  const tone = BAND_TONE[band.key];
  const widthPct = band.count === 0 ? 0 : Math.max(4, (band.count / maxCount) * 100);
  const sharePct = total === 0 ? 0 : Math.round(band.share * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-gray-900">{band.label}</span>
        <span className="text-gray-500">
          {band.count === 0 ? (
            "—"
          ) : (
            <>
              {band.count} {band.count === 1 ? "show" : "shows"} · {sharePct}% ·{" "}
              <span className={"font-medium " + tone.text}>{formatMoney(band.totalNet)}</span>
            </>
          )}
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={"h-full rounded-full " + tone.bar}
          style={{ width: `${widthPct}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">{band.hint}</p>
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
  tone?: "emerald" | "red" | "brand" | "gray";
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
    </div>
  );
}
