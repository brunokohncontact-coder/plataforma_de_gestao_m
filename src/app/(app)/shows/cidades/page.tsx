import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankCitiesByProfit,
  geoConcentration,
  compareGeoConcentration,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  MIN_MEDIAN_FEE_SAMPLE,
  type TxLike,
  type VenueShowLike,
  type GeoConcentration,
  type GeoConcentrationComparison,
  type DiversificationLevel,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const CANCELLED = "CANCELLED";

export default async function CityProfitabilityPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      select: { id: true, fee: true, status: true, venue: true, city: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  // Inclui `date` para recortar por ano antes de agregar (mesmo padrão da
  // rentabilidade por local, ver D108/D111). O recorte é só uma filtragem
  // prévia — a regra de agrupamento por cidade e o P&L seguem intocados, e a
  // concentração geográfica (D113) recompõe sobre as linhas já filtradas.
  const cityShows: (VenueShowLike & { date: Date })[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    venue: s.venue,
    city: s.city,
    date: s.date,
  }));

  // Anos disponíveis no seletor: apenas dos shows que entram na agregação
  // (não cancelados), para não oferecer um ano que ficaria vazio.
  const availableYears = showProfitYears(
    cityShows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(cityShows, yearFilter);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  const report = rankCitiesByProfit(periodShows, txs);
  // Maior resultado positivo, para dimensionar as barras de participação.
  const maxNet = Math.max(0, ...report.rows.map((r) => r.totalNet));
  // Risco de depender de poucas cidades (sobre a receita bruta, ignora "Sem cidade").
  const concentration = geoConcentration(report.rows);

  // Comparativo ano a ano da concentração (espelha computeDelta/D33): só faz
  // sentido com um ano específico selecionado e o ano anterior tendo receita —
  // caso contrário a leitura "melhorou/piorou" seria enganosa. Reaproveita o
  // mesmo recorte por ano UTC (D108) sobre os shows já carregados.
  let geoComparison: GeoConcentrationComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousConcentration = geoConcentration(
      rankCitiesByProfit(filterShowsByYear(cityShows, previousYear), txs).rows,
    );
    // Exige praça identificada nos DOIS períodos para comparar de verdade.
    if (concentration.placeCount > 0 && previousConcentration.placeCount > 0) {
      geoComparison = compareGeoConcentration(concentration, previousConcentration);
    }
  }

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Atuação por cidade</h1>
          <p className="text-sm text-gray-500">
            Quais cidades valem a turnê — soma do resultado (cachê + extras − despesas) de todos os
            shows na mesma cidade, reunindo as várias casas. Shows cancelados são ignorados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.count > 0 && (
            <a
              href={`/shows/cidades/export${yearFilter === "all" ? "" : `?ano=${yearFilter}`}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/cidades/revisitar" className="btn-secondary">
            📍 Revisitar
          </Link>
          <Link href="/shows/locais" className="btn-secondary">
            Por local
          </Link>
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker years={availableYears} active={yearFilter} basePath="/shows/cidades" />
      )}

      {report.count === 0 ? (
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
                Escolha outro período acima para ver a atuação por cidade.
              </p>
              <Link
                href="/shows/cidades"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver todos os anos
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Cidades analisadas" value={String(report.count)} />
            <Stat
              label="Resultado líquido total"
              value={formatMoney(report.totalNet)}
              tone={report.totalNet >= 0 ? "brand" : "red"}
            />
            <Stat
              label="Cidade mais rentável"
              value={report.best ? report.best.name : "—"}
              tone="emerald"
            />
          </div>

          {report.best && report.worst && report.best.key !== report.worst.key && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Highlight
                label="Mais rentável"
                title={report.best.name}
                subtitle={`${report.best.showCount} ${report.best.showCount === 1 ? "show" : "shows"}`}
                value={formatMoney(report.best.totalNet)}
                tone="emerald"
              />
              <Highlight
                label="Menos rentável"
                title={report.worst.name}
                subtitle={`${report.worst.showCount} ${report.worst.showCount === 1 ? "show" : "shows"}`}
                value={formatMoney(report.worst.totalNet)}
                tone={report.worst.totalNet >= 0 ? "brand" : "red"}
              />
            </div>
          )}

          {concentration.placeCount > 0 && (
            <GeoConcentrationCard concentration={concentration} />
          )}

          {geoComparison && (
            <GeoComparisonCard
              comparison={geoComparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Cidade</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê mediano</th>
                  <th className="px-4 py-3 text-right font-medium">Extras</th>
                  <th className="px-4 py-3 text-right font-medium">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium">Resultado</th>
                  <th className="px-4 py-3 text-right font-medium">Média/show</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((row) => (
                  <tr key={row.key || "__sem_cidade__"} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={
                          "font-medium " +
                          (row.key === "" ? "italic text-gray-400" : "text-gray-900")
                        }
                      >
                        {row.name}
                      </span>
                      {maxNet > 0 && row.totalNet > 0 && (
                        <div className="mt-1 h-1.5 w-full max-w-[10rem] overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${(row.totalNet / maxNet) * 100}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.showCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatMoney(row.totalFee)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.showCount >= MIN_MEDIAN_FEE_SAMPLE ? (
                        formatMoney(row.medianFee)
                      ) : (
                        <span
                          className="text-gray-400"
                          title={`Precisa de ao menos ${MIN_MEDIAN_FEE_SAMPLE} shows para a mediana ser confiável`}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.totalExtra > 0 ? formatMoney(row.totalExtra) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.totalExpenses > 0 ? "−" + formatMoney(row.totalExpenses) : "—"}
                    </td>
                    <td
                      className={
                        "px-4 py-3 text-right font-semibold " +
                        (row.totalNet >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {formatMoney(row.totalNet)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatMoney(row.avgNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Os shows são agrupados pela cidade (uma cidade reúne todas as casas nela). Shows sem
            cidade informada aparecem como “Sem cidade”. O <strong>cachê mediano</strong> é o preço
            típico da praça (metade dos shows acima, metade abaixo), robusto a um show fora da curva;
            aparece só com {MIN_MEDIAN_FEE_SAMPLE} shows ou mais (com poucos, a mediana não é
            confiável). Para o detalhe por casa, veja{" "}
            <Link href="/shows/locais" className="text-brand-700 hover:underline">
              Por local
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom (cor/emoji) do veredito de concentração geográfica. */
const GEO_VERDICT: Record<
  DiversificationLevel,
  { label: string; emoji: string; classes: string; note: string }
> = {
  concentrated: {
    label: "Concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "Boa parte da receita vem de poucas cidades — se a cena de uma esfriar, o baque é grande. Vale abrir praças novas.",
  },
  moderate: {
    label: "Moderada",
    emoji: "🟡",
    classes: "border-amber-200 bg-amber-50 text-amber-800",
    note: "A receita depende de um punhado de cidades. Tocar em novas praças reduz o risco geográfico.",
  },
  diversified: {
    label: "Diversificada",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A atuação está bem espalhada entre várias cidades — pouca dependência de uma única praça.",
  },
};

/** Formata uma participação 0..1 como porcentagem inteira (ex.: 0,6 → "60%"). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Card "Concentração geográfica": mede o risco de a carreira depender de poucas
 * cidades (sobre a receita bruta, distinto da rentabilidade líquida). Espelha o
 * card de concentração de clientes em /contatos/rentabilidade, num eixo de praça.
 */
function GeoConcentrationCard({
  concentration,
}: {
  concentration: GeoConcentration;
}) {
  const verdict = GEO_VERDICT[concentration.level];
  const { top, placeCount } = concentration;
  return (
    <div className={"card border " + verdict.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração geográfica
        </p>
        <span className="badge bg-white/70 font-semibold">
          {verdict.emoji} {verdict.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold">{pct(concentration.topShare)}</p>
          <p className="text-xs opacity-80">
            da receita vem de {top ? top.name : "—"} (maior praça)
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{pct(concentration.top3Share)}</p>
          <p className="text-xs opacity-80">
            nas 3 maiores de {placeCount} {placeCount === 1 ? "cidade" : "cidades"}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {concentration.effectivePlaces.toFixed(1)}
          </p>
          <p className="text-xs opacity-80">
            cidades efetivas (como se fossem N de mesmo tamanho)
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{verdict.note}</p>
    </div>
  );
}

/** Rótulo + tom do veredito de tendência da concentração entre dois anos. */
const GEO_TREND: Record<
  GeoConcentrationComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Mais espalhada",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A receita ficou menos dependente de uma única praça em relação ao ano anterior — risco geográfico em queda.",
  },
  worsened: {
    label: "Mais concentrada",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A receita passou a depender mais de poucas praças que no ano anterior — vale abrir cidades novas para reduzir o risco.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A dependência de praças ficou praticamente igual à do ano anterior.",
  },
};

/** Formata uma variação em pontos percentuais com sinal (ex.: −0,12 → "−12 p.p."). */
function deltaPp(delta: number): string {
  const points = Math.round(delta * 100);
  if (points === 0) return "0 p.p.";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} p.p.`;
}

/** Formata a variação de cidades efetivas com sinal (ex.: 1,3 → "+1,3"). */
function deltaPlaces(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}`;
}

/**
 * Card "vs. {ano-1}": compara a concentração geográfica do ano selecionado com a
 * do ano anterior (espelha o comparativo ano a ano de computeDelta/D33 num eixo
 * de risco de praça). Mostra a variação da maior praça e das cidades efetivas,
 * com um veredito de tendência (mais espalhada × mais concentrada).
 */
function GeoComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: GeoConcentrationComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = GEO_TREND[comparison.trend];
  const { current, previous } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concentração {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">{deltaPp(comparison.topShareDelta)}</p>
          <p className="text-xs opacity-80">
            na maior praça: {pct(previous.topShare)} ({previousYear}) →{" "}
            {pct(current.topShare)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {deltaPlaces(comparison.effectivePlacesDelta)}
          </p>
          <p className="text-xs opacity-80">
            cidades efetivas: {previous.effectivePlaces.toFixed(1)} →{" "}
            {current.effectivePlaces.toFixed(1)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
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
      <p className={"mt-1 truncate text-xl font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}

function Highlight({
  label,
  title,
  subtitle,
  value,
  tone,
}: {
  label: string;
  title: string;
  subtitle: string;
  value: string;
  tone: "emerald" | "red" | "brand";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 truncate font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
      <p className={"mt-1 text-lg font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}
