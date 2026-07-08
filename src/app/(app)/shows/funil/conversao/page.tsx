import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  compareProposalOutcomes,
  proposalOutcomes,
  proposalOutcomeYears,
  type ProposalConversion,
  type ProposalConversionComparison,
} from "@/lib/shows";
import { parseProfitYear, type ProfitYearFilter } from "@/lib/finance";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Taxa (0..1) como percentual inteiro, ou "—" quando indefinida. */
function rateLabel(rate: number | null): string {
  return rate == null ? "—" : `${(rate * 100).toFixed(0)}%`;
}

export default async function ProposalConversionPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Só precisamos dos eventos de status de cada show — a coorte é montada pela
  // data da PRIMEIRA entrada em PROPOSED (a agregação é pura sobre os eventos).
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Recorte por período pelo ano (UTC) da entrada da proposta no funil — eixo
  // distinto do funil (data do show). Os anos do seletor vêm só dos shows que
  // entraram em PROPOSED, para o seletor nunca oferecer um ano de coorte vazia.
  const availableYears = proposalOutcomeYears(shows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const conv = proposalOutcomes(shows, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const periodLabel = yearFilter === "all" ? "todas as propostas" : `propostas de ${yearFilter}`;

  // Comparativo ano a ano: só com um ano específico e ambas as coortes (este ano
  // e o anterior) tendo propostas decididas. A coorte do ano anterior sai do
  // mesmo acervo já carregado — zero I/O extra (o eixo é a data da proposta).
  let comparison: ProposalConversionComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousConv = proposalOutcomes(shows, { year: previousYear });
    if (conv.decidedCount > 0 && previousConv.decidedCount > 0) {
      comparison = compareProposalOutcomes(conv, previousConv);
    }
  }

  const exportHref =
    yearFilter === "all"
      ? "/shows/funil/conversao/export"
      : `/shows/funil/conversao/export?ano=${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conversão de propostas</h1>
          <p className="text-sm text-gray-500">
            Das propostas que entraram no funil ({periodLabel}), quantas viraram palco. Diferente
            do funil (um retrato de <em>onde</em> os shows estão hoje), aqui a coorte é pela data em
            que a <em>proposta</em> nasceu e acompanha o desfecho de cada uma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conv.total > 0 && (
            <a href={exportHref} className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/conversao/contratantes" className="btn-secondary text-sm">
            👥 Por contratante
          </Link>
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter as ProfitYearFilter}
          basePath="/shows/funil/conversao"
        />
      )}

      {conv.total === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Ainda não há propostas registradas para medir a conversão.</p>
          <p className="mt-2 text-sm">
            A conversão é calculada a partir do histórico de status registrado a partir de agora
            (proposta → confirmado → realizado). Conforme você cadastra e movimenta shows, esta
            leitura vai se formando — os shows antigos, sem histórico, ficam de fora.
          </p>
          <Link href="/shows/funil" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver o funil de propostas
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Taxa de conversão"
              value={rateLabel(conv.conversionRate)}
              hint={
                conv.conversionRate == null
                  ? "nenhuma proposta decidida ainda"
                  : `${conv.wonCount} de ${conv.decidedCount} decididas viraram show`
              }
              tone="brand"
            />
            <Stat
              label="Propostas na coorte"
              value={String(conv.total)}
              hint={`${conv.decidedCount} decidida${conv.decidedCount === 1 ? "" : "s"} · ${conv.openCount} em aberto`}
              tone="gray"
            />
            <Stat
              label="Já viraram palco"
              value={rateLabel(conv.winRate)}
              hint={`${conv.wonCount} de ${conv.total} da coorte (inclui as em aberto)`}
              tone="emerald"
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
            <h2 className="mb-1 font-semibold">Desfecho das propostas</h2>
            <p className="mb-4 text-xs text-gray-500">
              Como se dividiu a coorte de {conv.total} proposta{conv.total === 1 ? "" : "s"}.
            </p>
            <div className="space-y-4">
              <OutcomeBar
                label="Realizadas"
                count={conv.wonCount}
                total={conv.total}
                dot="bg-emerald-500"
              />
              <OutcomeBar
                label="Perdidas"
                count={conv.lostCount}
                total={conv.total}
                dot="bg-gray-400"
              />
              <OutcomeBar
                label="Em aberto"
                count={conv.openCount}
                total={conv.total}
                dot="bg-amber-500"
              />
            </div>
            <p className="mt-4 text-xs text-gray-400">
              A <strong>taxa de conversão</strong> olha só as propostas com desfecho (realizadas ÷
              decididas), resistente a propostas ainda em andamento. As em aberto entram na coorte,
              mas ficam fora do denominador da taxa até serem confirmadas, tocadas ou canceladas.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

const CONVERSION_TREND: Record<
  ProposalConversionComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Convertendo mais",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "Das propostas que tiveram desfecho, você converteu uma fração maior em palco que na coorte do ano anterior — mais do que propõe está virando show.",
  },
  worsened: {
    label: "Convertendo menos",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A taxa de conversão real caiu frente à coorte do ano anterior — mais propostas viraram perda. Vale revisar o que trava o fechamento (preço, disponibilidade, follow-up).",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A taxa de conversão real ficou praticamente igual à da coorte do ano anterior.",
  },
};

/** Variação de taxa em pontos percentuais, com sinal (ex.: 0.3 → "+30 p.p."). */
function pointsDelta(delta: number): string {
  const pp = Math.round(delta * 100);
  if (pp === 0) return "0 p.p.";
  return `${pp > 0 ? "+" : "−"}${Math.abs(pp)} p.p.`;
}

/**
 * Card "Conversão real {ano} vs. {ano-1}": compara a taxa de conversão real
 * (realizadas / decididas) da coorte do ano selecionado com a do ano anterior
 * (espelha o comparativo do funil geral, D209, no eixo da data da proposta).
 * Mostra a variação em pontos percentuais + as taxas de cada coorte, com um
 * veredito de tendência. Aqui **subir** é a melhora.
 */
function ConversionComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ProposalConversionComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = CONVERSION_TREND[comparison.trend];
  const { current, previous, conversionRateDelta, winRateDelta } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Conversão real {currentYear} vs. {previousYear}
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
          {rateLabel(previous.conversionRate)} ({previousYear}, {previous.wonCount}/
          {previous.decidedCount}) → {rateLabel(current.conversionRate)} ({currentYear},{" "}
          {current.wonCount}/{current.decidedCount})
        </p>
      </div>
      {winRateDelta != null && (
        <p className="mt-2 text-xs opacity-80">
          <span className="font-medium">Vazão da coorte:</span>{" "}
          {pointsDelta(winRateDelta)} — {rateLabel(previous.winRate)} → {rateLabel(current.winRate)}{" "}
          das propostas do ano já viraram palco (inclui as em aberto).
        </p>
      )}
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
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
  tone?: "emerald" | "brand" | "amber" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
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

function OutcomeBar({
  label,
  count,
  total,
  dot,
}: {
  label: string;
  count: number;
  total: number;
  dot: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={"inline-block h-2.5 w-2.5 rounded-full " + dot} aria-hidden />
          <span className="font-medium">{label}</span>
          <span className="text-gray-400">
            {count} {count === 1 ? "proposta" : "propostas"}
          </span>
        </span>
        <span className="font-semibold text-gray-700">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded bg-gray-100">
        <div
          className={"h-full rounded " + dot}
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
          title={`${count} de ${total} (${pct.toFixed(0)}%)`}
        />
      </div>
    </div>
  );
}
