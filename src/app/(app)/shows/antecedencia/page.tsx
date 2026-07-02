import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  bookingLeadTime,
  bookingLeadTimeYears,
  compareBookingLeadTime,
  type BookingLeadTimeComparison,
  type LeadTimeShowLike,
} from "@/lib/shows";
import { parseProfitYear, filterShowsByYear } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Texto pt-BR para uma antecedência em dias (>= 0). */
function daysLabel(days: number): string {
  if (days === 0) return "no mesmo dia";
  if (days === 1) return "1 dia";
  if (days < 60) return `${days} dias`;
  const months = Math.round(days / 30);
  return `${days} dias (~${months} ${months === 1 ? "mês" : "meses"})`;
}

const BUCKET_TONES = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-400",
] as const;

export default async function BookingLeadTimePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { status: true, date: true, createdAt: true, fee: true },
  });

  // Recorte por período (ano), reaproveitando os helpers da D108. Os anos do
  // seletor vêm só dos shows com antecedência mensurável (`bookingLeadTimeYears`),
  // para não oferecer um ano que renderiza vazio. Filtra-se os registros ANTES
  // de mapear/`bookingLeadTime`, que segue agnóstico ao recorte.
  const availableYears = bookingLeadTimeYears(rows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodRows = filterShowsByYear(rows, yearFilter);

  const shows: LeadTimeShowLike[] = periodRows.map((s) => ({
    status: s.status,
    date: s.date,
    createdAt: s.createdAt,
    fee: s.fee,
  }));

  const lead = bookingLeadTime(shows);
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;
  const peakShare = Math.max(0.0001, ...lead.buckets.map((b) => b.share));

  // Comparativo ano a ano da antecedência mediana (espelha o card de
  // cancelamentos/concentração ano a ano, D181/D120): só faz sentido com um ano
  // específico e ambos os períodos tendo amostra mensurável — caso contrário a
  // comparação de medianas seria enganosa (mediana de amostra vazia é 0).
  // Reaproveita o mesmo recorte por ano UTC (D108) sobre os registros já
  // carregados, sem nova consulta.
  let comparison: BookingLeadTimeComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousLead = bookingLeadTime(
      filterShowsByYear(rows, previousYear).map((s) => ({
        status: s.status,
        date: s.date,
        createdAt: s.createdAt,
        fee: s.fee,
      })),
    );
    if (lead.sample > 0 && previousLead.sample > 0) {
      comparison = compareBookingLeadTime(lead, previousLead);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Antecedência de agendamento</h1>
          <p className="text-sm text-gray-500">
            Com quantos dias de antecedência os shows entram na sua agenda. Um lead maior
            dá previsibilidade de caixa e menos correria para preencher a semana —
            complementa os{" "}
            <Link href="/shows/fins-de-semana-livres" className="text-brand-700 hover:underline">
              fins de semana livres
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.sample > 0 && (
            <a
              href={`/shows/antecedencia/export${
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
          basePath="/shows/antecedencia"
        />
      )}

      {lead.sample === 0 ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>
                Ainda não há shows com antecedência mensurável.
                {lead.retroactiveCount > 0
                  ? ` Os ${lead.retroactiveCount} shows lançados são todos retroativos (registrados depois da data), então não medem antecedência.`
                  : " Cadastre shows com data futura para acompanhar o seu lead de agendamento."}
              </p>
              <Link href="/shows/novo" className="mt-3 inline-block text-brand-700 hover:underline">
                Cadastrar um show
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum show com antecedência mensurável em {periodLabel}.</p>
              <p className="mt-1 text-sm">Escolha outro período acima para ver a antecedência.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Antecedência mediana
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{daysLabel(lead.medianDays)}</p>
              <p className="mt-1 text-xs text-gray-400">
                metade dos shows entrou com mais lead que isto — resiste a um caso isolado
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Antecedência média
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{daysLabel(lead.avgDays)}</p>
              <p className="mt-1 text-xs text-gray-400">
                {lead.sample} {lead.sample === 1 ? "show analisado" : "shows analisados"}
                {!lead.reliable ? " · amostra pequena" : ""}
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Menor antecedência
              </p>
              <p className="mt-1 text-xl font-bold text-orange-600">
                {lead.shortestDays == null ? "—" : daysLabel(lead.shortestDays)}
              </p>
              <p className="mt-1 text-xs text-gray-400">o show fechado mais em cima da hora</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Maior antecedência
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {lead.longestDays == null ? "—" : daysLabel(lead.longestDays)}
              </p>
              <p className="mt-1 text-xs text-gray-400">o show agendado com mais folga</p>
            </div>
          </div>

          {comparison && (
            <BookingLeadTimeComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Distribuição por faixa de antecedência */}
          <section className="card overflow-x-auto p-0">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Quantos shows entraram em cada faixa de antecedência
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Faixa</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Participação</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê da faixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lead.buckets.map((b, i) => (
                  <tr key={b.label} className={b.count === 0 ? "text-gray-400" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-700">{b.label}</td>
                    <td className="px-4 py-3 text-right">{b.count === 0 ? "—" : b.count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.count > 0 && (
                          <div className="hidden h-2 w-24 overflow-hidden rounded bg-gray-100 sm:block">
                            <div
                              className={"h-full rounded " + BUCKET_TONES[i]}
                              style={{ width: `${Math.round((b.share / peakShare) * 100)}%` }}
                            />
                          </div>
                        )}
                        <span className="w-12 text-right text-gray-500">
                          {b.count === 0 ? "—" : pct(b.share)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {b.count === 0 ? "—" : formatMoney(b.totalFee)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-semibold text-gray-900">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{lead.sample}</td>
                  <td className="px-4 py-3 text-right text-gray-500">100%</td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(lead.buckets.reduce((a, b) => a + b.totalFee, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            A antecedência de cada show é a diferença em dias entre a data em que ele entrou
            na agenda e a data em que acontece. Shows cancelados não entram.{" "}
            {lead.retroactiveCount > 0 && (
              <>
                {lead.retroactiveCount}{" "}
                {lead.retroactiveCount === 1 ? "show foi lançado" : "shows foram lançados"} de
                forma retroativa (registrados depois da data) e não{" "}
                {lead.retroactiveCount === 1 ? "entra" : "entram"} nesta leitura.{" "}
              </>
            )}
            {!lead.reliable && "Com poucos shows a mediana ainda é sensível a casos isolados. "}
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom do veredito de tendência da antecedência entre dois anos. */
const LEAD_TIME_TREND: Record<
  BookingLeadTimeComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Agendando com mais folga",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "Os shows entraram na agenda com mais antecedência que no ano anterior — mais previsibilidade de caixa e menos correria para preencher a semana.",
  },
  worsened: {
    label: "Agendando em cima da hora",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A antecedência mediana caiu em relação ao ano anterior — os shows vêm fechando mais em cima da hora. Vale antecipar a prospecção para recuperar o runway.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A antecedência mediana ficou praticamente igual à do ano anterior.",
  },
};

/** Formata uma variação em dias com sinal (ex.: 12 → "+12 dias", -1 → "−1 dia"). */
function daysDelta(delta: number): string {
  if (delta === 0) return "0 dias";
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${abs} ${abs === 1 ? "dia" : "dias"}`;
}

/**
 * Card "Antecedência {ano} vs. {ano-1}": compara a antecedência mediana de
 * agendamento do ano selecionado com a do ano anterior (espelha o comparativo
 * ano a ano de cancelamentos/concentração, D181/D120, no eixo de runway). Mostra
 * a variação da mediana e da média, com um veredito de tendência (mais folga ×
 * em cima da hora). Ao contrário daqueles, aqui **subir** é a melhora.
 */
function BookingLeadTimeComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: BookingLeadTimeComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = LEAD_TIME_TREND[comparison.trend];
  const { current, previous } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Antecedência {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">{daysDelta(comparison.medianDaysDelta)}</p>
          <p className="text-xs opacity-80">
            mediana: {daysLabel(previous.medianDays)} ({previousYear}) →{" "}
            {daysLabel(current.medianDays)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{daysDelta(comparison.avgDaysDelta)}</p>
          <p className="text-xs opacity-80">
            média: {daysLabel(previous.avgDays)} → {daysLabel(current.avgDays)}
          </p>
        </div>
      </div>
      {(!current.reliable || !previous.reliable) && (
        <p className="mt-3 text-xs opacity-90">
          Amostra pequena em ao menos um dos anos — a mediana ainda é sensível a casos isolados.
        </p>
      )}
      <p className="mt-3 text-xs opacity-90">{trend.note}</p>
    </div>
  );
}
