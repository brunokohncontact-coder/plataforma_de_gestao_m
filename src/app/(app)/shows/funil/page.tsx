import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  showPipeline,
  compareShowPipelines,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type ShowLike,
  type ShowPipelineComparison,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  SHOW_STATUS_DOT,
  type ShowStatus,
} from "@/lib/domain";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ShowFunnelPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, status: true, fee: true, date: true },
  });

  // Recorte por período (ano da `date` do show), reaproveitando os helpers da
  // D108. Os anos do seletor vêm de todos os shows (`showProfitYears`); filtra-se
  // ANTES de agregar, então `showPipeline` segue agnóstico ao recorte.
  const availableYears = showProfitYears(rows.map((s) => s.date));
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(rows, yearFilter);

  const pipeline = showPipeline(periodShows as ShowLike[]);
  const maxCount = Math.max(1, ...pipeline.stages.map((s) => s.count));
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  // Comparativo ano a ano da taxa de concretização (espelha o card de
  // antecedência/cachê ano a ano, D187/D209): só faz sentido com um ano
  // específico e ambos os períodos tendo shows já decididos — caso contrário a
  // taxa é indefinida e não há tendência a ler. Reaproveita o mesmo recorte por
  // ano UTC (D108) sobre os registros já carregados, sem nova consulta.
  let comparison: ShowPipelineComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousPipeline = showPipeline(
      filterShowsByYear(rows, previousYear) as ShowLike[],
    );
    if (pipeline.decidedCount > 0 && previousPipeline.decidedCount > 0) {
      comparison = compareShowPipelines(pipeline, previousPipeline);
    }
  }

  const exportHref =
    yearFilter === "all" ? "/shows/funil/export" : `/shows/funil/export?ano=${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Funil de propostas</h1>
          <p className="text-sm text-gray-500">
            Onde estão seus shows hoje — da proposta ao palco — e quanto de cachê está em
            negociação ou confirmado, mas ainda não realizado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pipeline.total > 0 && (
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
        <PeriodPicker years={availableYears} active={yearFilter} basePath="/shows/funil" />
      )}

      {pipeline.total === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum show para analisar.</p>
          <Link href="/shows/novo" className="mt-3 inline-block text-brand-700 hover:underline">
            Cadastrar um show
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Cachê em aberto"
              value={formatMoney(pipeline.openValue)}
              hint={`${pipeline.openCount} ${pipeline.openCount === 1 ? "show" : "shows"} (proposto + confirmado)`}
              tone="brand"
            />
            <Stat
              label="Em negociação"
              value={formatMoney(pipeline.proposedValue)}
              hint={`${pipeline.proposedCount} proposto${pipeline.proposedCount === 1 ? "" : "s"}`}
              tone="amber"
            />
            <Stat
              label="Confirmado"
              value={formatMoney(pipeline.confirmedValue)}
              hint={`${pipeline.confirmedCount} a tocar`}
              tone="emerald"
            />
            <Stat
              label="Taxa de concretização"
              value={
                pipeline.conversionRate == null
                  ? "—"
                  : `${(pipeline.conversionRate * 100).toFixed(0)}%`
              }
              hint={
                pipeline.conversionRate == null
                  ? "sem shows decididos"
                  : `${pipeline.playedCount} de ${pipeline.decidedCount} decididos`
              }
              tone="gray"
            />
          </div>

          {comparison && (
            <ConversionComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          <section className="card">
            <h2 className="mb-1 font-semibold">Shows por etapa</h2>
            <p className="mb-4 text-xs text-gray-500">
              Retrato do estado de cada show ({periodLabel}) — não um histórico de conversão.
            </p>
            <div className="space-y-4">
              {pipeline.stages.map((stage) => {
                const status = stage.status as ShowStatus;
                const pct = pipeline.total > 0 ? (stage.count / pipeline.total) * 100 : 0;
                return (
                  <div key={stage.status}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={"inline-block h-2.5 w-2.5 rounded-full " + SHOW_STATUS_DOT[status]}
                          aria-hidden
                        />
                        <span className="font-medium">{SHOW_STATUS_LABELS[status]}</span>
                        <span className="text-gray-400">
                          {stage.count} {stage.count === 1 ? "show" : "shows"}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        {stage.fee > 0 ? formatMoney(stage.fee) : "—"}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded bg-gray-100">
                      <div
                        className={"h-full rounded " + SHOW_STATUS_DOT[status]}
                        style={{ width: `${(stage.count / maxCount) * 100}%` }}
                        title={`${stage.count} de ${pipeline.total} (${pct.toFixed(0)}%)`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {pipeline.stages.map((stage) => {
              const status = stage.status as ShowStatus;
              return (
                <Link
                  key={stage.status}
                  href={`/shows?status=${stage.status}`}
                  className="card flex items-center justify-between transition hover:border-brand-200 hover:bg-gray-50"
                >
                  <span className={"badge " + SHOW_STATUS_COLORS[status]}>
                    {SHOW_STATUS_LABELS[status]}
                  </span>
                  <span className="text-sm text-gray-500">
                    <strong className="text-gray-900">{stage.count}</strong>{" "}
                    {stage.count === 1 ? "show" : "shows"}
                    {stage.fee > 0 && (
                      <span className="ml-2 text-gray-400">· {formatMoney(stage.fee)}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "gray",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "red" | "brand" | "amber" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    amber: "text-amber-600",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const CONVERSION_TREND: Record<
  ShowPipelineComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Fechando mais",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "De tudo que teve desfecho, você concretizou uma fração maior de shows que no ano anterior — mais do que negocia está virando palco.",
  },
  worsened: {
    label: "Perdendo mais",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A taxa de concretização caiu em relação ao ano anterior — mais propostas estão sendo canceladas. Vale revisar o que trava o fechamento (preço, disponibilidade, follow-up).",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A taxa de concretização ficou praticamente igual à do ano anterior.",
  },
};

/** Taxa de concretização (0..1) como percentual inteiro, ou "—" quando indefinida. */
function rateLabel(rate: number | null): string {
  return rate == null ? "—" : `${(rate * 100).toFixed(0)}%`;
}

/** Variação de taxa em pontos percentuais, com sinal (ex.: 0.3 → "+30 p.p."). */
function pointsDelta(delta: number): string {
  const pp = Math.round(delta * 100);
  if (pp === 0) return "0 p.p.";
  return `${pp > 0 ? "+" : "−"}${Math.abs(pp)} p.p.`;
}

/**
 * Card "Concretização {ano} vs. {ano-1}": compara a taxa de concretização
 * (realizados / decididos) do ano selecionado com a do ano anterior (espelha o
 * comparativo ano a ano de antecedência/cachê, D187/D209, no eixo de
 * fechamento). Mostra a variação em pontos percentuais + as taxas de cada ano,
 * com um veredito de tendência. Aqui **subir** é a melhora.
 */
function ConversionComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ShowPipelineComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = CONVERSION_TREND[comparison.trend];
  const { current, previous, conversionRateDelta } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Concretização {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">
          {conversionRateDelta == null ? "—" : pointsDelta(conversionRateDelta)}
        </p>
        <p className="text-xs opacity-80">
          {rateLabel(previous.conversionRate)} ({previousYear}, {previous.playedCount}/
          {previous.decidedCount}) → {rateLabel(current.conversionRate)} ({currentYear},{" "}
          {current.playedCount}/{current.decidedCount})
        </p>
      </div>
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
    </div>
  );
}
