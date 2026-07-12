import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  feeDistribution,
  feeDistributionYears,
  compareFeeDistribution,
  indexFeeBandShareChanges,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
  type FeeBandStat,
  type FeeBandShareChange,
  type FeeDistributionComparison,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function FeeDistributionPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, date: true, status: true, fee: true },
  });

  // Recorte por período (ano), reaproveitando os helpers da D108. Os anos do
  // seletor vêm só dos shows que de fato entram na distribuição (realizados com
  // cachê > 0), via `feeDistributionYears`, para não oferecer um ano vazio.
  // Filtra-se ANTES de mapear/`feeDistribution`, que segue aplicando o mesmo
  // gate sem saber do recorte.
  const availableYears = feeDistributionYears(rows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodRows = filterShowsByYear(rows, yearFilter);

  const shows: ReceivableShowLike[] = periodRows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const dist = feeDistribution(shows);
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  // Comparativo ano a ano do cachê mediano (espelha o card de antecedência/
  // concentração ano a ano, D187/D120, no eixo do nível de preço — "meus cachês
  // subiram?"): só faz sentido com um ano específico e ambos os períodos tendo
  // shows realizados com cachê — senão a comparação de medianas seria enganosa
  // (mediana de amostra vazia é 0). Reaproveita o mesmo recorte por ano UTC
  // (D108) sobre os registros já carregados, sem nova consulta.
  let comparison: FeeDistributionComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousDist = feeDistribution(
      filterShowsByYear(rows, previousYear).map((s) => ({
        id: s.id,
        fee: s.fee,
        status: s.status,
        date: s.date,
      })),
    );
    if (dist.totalShows > 0 && previousDist.totalShows > 0) {
      comparison = compareFeeDistribution(dist, previousDist);
    }
  }

  // Escala das barras: maior nº de shows numa faixa (distribuição por contagem).
  const peakCount = Math.max(1, ...dist.bands.map((b) => b.count));

  // Deslocamento faixa a faixa do ano anterior, para a coluna "vs. {ano-1}" da
  // tabela (só existe quando o card comparativo existe). Lookup O(1) por faixa,
  // espelho do padrão "vs. {ano-1}" por linha das telas do funil (D238/D282).
  const bandChangeByKey = comparison
    ? indexFeeBandShareChanges(comparison)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Faixas de cachê</h1>
          <p className="text-sm text-gray-500">
            Em que faixa de preço você mais toca e onde está concentrado o seu
            faturamento — o formato da sua tabela de cachês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dist.totalShows > 0 && (
            <a
              href={`/shows/faixas-de-cache/export${
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
          basePath="/shows/faixas-de-cache"
        />
      )}

      {dist.totalShows === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>
                Ainda não há shows realizados com cachê registrado para montar a
                distribuição. Marque um show como realizado e informe o cachê.
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
                Escolha outro período acima para ver a distribuição.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Cachê médio" value={formatMoney(dist.avgFee)} tone="brand" />
            <Stat
              label="Cachê mediano"
              value={formatMoney(dist.medianFee)}
              tone="emerald"
              hint="metade cobra acima, metade abaixo"
            />
            <Stat
              label="Faixa típica"
              value={dist.modalBand?.label ?? "—"}
              hint={
                dist.modalBand
                  ? `${dist.modalBand.count} ${
                      dist.modalBand.count === 1 ? "show" : "shows"
                    } · ${pct(dist.modalBand.countShare)} dos shows`
                  : undefined
              }
            />
            <Stat
              label="Onde está o faturamento"
              value={dist.topValueBand?.label ?? "—"}
              hint={
                dist.topValueBand
                  ? `${pct(dist.topValueBand.feeShare)} do total · ${formatMoney(
                      dist.topValueBand.totalFee,
                    )}`
                  : undefined
              }
            />
          </div>

          {comparison && (
            <FeeComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Distribuição por faixa */}
          <section className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Distribuição por faixa de preço</h2>
            <p className="mb-4 text-xs text-gray-500">
              Considera apenas shows já realizados (PLAYED, ou confirmados com data
              passada) com cachê registrado. As barras mostram a quantidade de shows
              em cada faixa. As faixas são uma referência do mercado e podem não
              refletir o seu segmento.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Faixa</th>
                  <th className="pb-2 px-3 text-right font-medium">Shows</th>
                  <th className="pb-2 px-3 text-right font-medium">% dos shows</th>
                  <th className="pb-2 px-3 text-right font-medium">Faturamento</th>
                  <th
                    className={
                      "pb-2 text-right font-medium " +
                      (bandChangeByKey ? "px-3" : "pl-3")
                    }
                  >
                    % do faturam.
                  </th>
                  {bandChangeByKey && (
                    <th className="pb-2 pl-3 text-right font-medium">
                      vs. {previousYear}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {dist.bands.map((b) => (
                  <BandRow
                    key={b.key}
                    band={b}
                    peakCount={peakCount}
                    isModal={dist.modalBand?.key === b.key}
                    change={bandChangeByKey?.get(b.key) ?? null}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 px-3 text-right">{dist.totalShows}</td>
                  <td className="py-2 px-3 text-right text-gray-400">100%</td>
                  <td className="py-2 px-3 text-right">{formatMoney(dist.totalFee)}</td>
                  <td
                    className={
                      "py-2 text-right text-gray-400 " +
                      (bandChangeByKey ? "px-3" : "pl-3")
                    }
                  >
                    100%
                  </td>
                  {bandChangeByKey && (
                    <td className="py-2 pl-3 text-right text-gray-400">—</td>
                  )}
                </tr>
              </tfoot>
            </table>
            {bandChangeByKey && (
              <p className="mt-3 text-xs text-gray-500">
                A coluna <strong>vs. {previousYear}</strong> mostra quantos pontos
                percentuais da agenda cada faixa ganhou (↑ +) ou perdeu (↓ −) frente
                ao ano anterior — para ONDE seus cachês migraram. A seta (↑/↓/→) só
                indica o rumo e é <strong>neutra</strong> de propósito (cinza, sem
                verde/vermelho): ganhar participação numa faixa barata não é
                necessariamente uma melhora. O rumo geral do cachê (para cima ou para
                baixo) está no cartão acima.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom do veredito do comparativo ano a ano do cachê mediano. */
const FEE_TREND: Record<
  FeeDistributionComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  up: {
    label: "Cachês em alta",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "O cachê típico (mediano) subiu em relação ao ano anterior — sinal de progressão: os shows passaram a pagar mais. Bom momento para firmar o novo patamar nas próximas propostas.",
  },
  down: {
    label: "Cachês em baixa",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "O cachê típico (mediano) caiu em relação ao ano anterior — os shows vêm pagando menos. Vale revisar a tabela de preços e priorizar contratantes/faixas que sustentam o valor.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "O cachê típico (mediano) ficou praticamente igual ao do ano anterior.",
  },
};

/** Variação em dinheiro com sinal (ex.: 20000 → "+R$ 200,00"; -5000 → "−R$ 50,00"). */
function moneyDelta(delta: number): string {
  if (delta === 0) return "R$ 0,00";
  return `${delta > 0 ? "+" : "−"}${formatMoney(Math.abs(delta))}`;
}

/** Variação relativa (0..1) com sinal (ex.: 0.2 → "+20%"); null → "". */
function pctDelta(pct: number | null): string {
  if (pct == null) return "";
  const rounded = Math.round(pct * 100);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}

/** Variação de participação (0..1) em pontos percentuais, com sinal (ex.: 0.15 → "+15 p.p."). */
function pointsDelta(delta: number): string {
  const rounded = Math.round(delta * 100);
  if (rounded === 0) return "0 p.p.";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)} p.p.`;
}

/**
 * Seta NEUTRA de direção para a coluna "vs. {ano-1}" das faixas de cachê. Ao
 * contrário da "seta de tendência" colorida das telas por cidade/local/dia da
 * semana (`CITY_PROFIT_TREND`/`TREND_ARROW`, D302/D303 — onde subir é "bom"),
 * aqui a leitura é intencionalmente **neutra** por faixa: ganhar participação
 * numa faixa barata não é uma melhora, então a seta só nomeia o RUMO (↑/↓/→)
 * sem verde/vermelho — o rumo geral do cachê vive no cartão comparativo acima.
 * A direção espelha o mesmo arredondamento em p.p. do texto exibido, para seta
 * e número nunca se contradizerem (um Δ que arredonda a 0 p.p. sai como "→").
 */
const NEUTRAL_TREND_ARROW: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

/** Direção da variação de participação a partir do delta arredondado em p.p. */
function bandShareDirection(delta: number): "up" | "down" | "flat" {
  const rounded = Math.round(delta * 100);
  if (rounded > 0) return "up";
  if (rounded < 0) return "down";
  return "flat";
}

/**
 * Card "Cachê {ano} vs. {ano-1}": compara o cachê mediano do ano selecionado com
 * o do ano anterior (espelha o comparativo ano a ano de antecedência/concentração,
 * D187/D120, no eixo do nível de preço). Mostra a variação do mediano (com %) e da
 * média, com um veredito de tendência (em alta × em baixa). Aqui **subir** é a
 * melhora — a leitura direta de progressão de carreira.
 */
function FeeComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: FeeDistributionComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = FEE_TREND[comparison.trend];
  const { current, previous } = comparison;
  const medianPct = pctDelta(comparison.medianFeePct);
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Cachê {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">
            {moneyDelta(comparison.medianFeeDelta)}
            {medianPct && (
              <span className="ml-2 text-base font-semibold opacity-80">{medianPct}</span>
            )}
          </p>
          <p className="text-xs opacity-80">
            mediano: {formatMoney(previous.medianFee)} ({previousYear}) →{" "}
            {formatMoney(current.medianFee)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{moneyDelta(comparison.avgFeeDelta)}</p>
          <p className="text-xs opacity-80">
            médio: {formatMoney(previous.avgFee)} → {formatMoney(current.avgFee)}
          </p>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-xs opacity-80">
        <span className="font-semibold uppercase tracking-wide">Faixa premium (acima de R$ 5.000)</span>
        <span>
          {pct(comparison.premiumSharePrevious)} → {pct(comparison.premiumShareCurrent)} dos shows
        </span>
        <span className="font-semibold">{pointsDelta(comparison.premiumShareDelta)}</span>
      </p>
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
    </div>
  );
}

function BandRow({
  band,
  peakCount,
  isModal,
  change,
}: {
  band: FeeBandStat;
  peakCount: number;
  isModal: boolean;
  change: FeeBandShareChange | null;
}) {
  const empty = band.count === 0;
  return (
    <tr className="border-b last:border-0">
      <td className={"py-2 pr-3 " + (empty ? "text-gray-400" : "font-medium")}>
        {band.label}
        {isModal && (
          <span className="ml-2 rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">
            típica
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-right">
        <span className={empty ? "text-gray-300" : "text-gray-900"}>{band.count}</span>
        <Bar value={band.count} peak={peakCount} />
      </td>
      <td className="py-2 px-3 text-right text-xs text-gray-500">
        {empty ? "—" : pct(band.countShare)}
      </td>
      <td className="py-2 px-3 text-right text-xs text-gray-500">
        {empty ? "—" : formatMoney(band.totalFee)}
      </td>
      <td
        className={
          "py-2 text-right text-xs text-gray-500 " + (change ? "px-3" : "pl-3")
        }
      >
        {empty ? "—" : pct(band.feeShare)}
      </td>
      {change && (
        <td className="py-2 pl-3 text-right text-xs text-gray-500">
          {change.countShareDelta === 0 && change.currentCount === 0 ? (
            "—"
          ) : (
            <>
              <span aria-hidden="true">
                {NEUTRAL_TREND_ARROW[bandShareDirection(change.countShareDelta)]}
              </span>{" "}
              {pointsDelta(change.countShareDelta)}
            </>
          )}
        </td>
      )}
    </tr>
  );
}

/** Participação 0..1 → "42%" (inteiro). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
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
