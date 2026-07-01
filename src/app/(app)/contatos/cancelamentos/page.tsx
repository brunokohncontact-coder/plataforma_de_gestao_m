import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  cancellationByContact,
  cancelledShowYears,
  compareCancellationRate,
  type ContactRankLike,
  type CancellationComparison,
} from "@/lib/contacts";
import { parseProfitYear, filterShowsByYear } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { PeriodPicker } from "@/components/PeriodPicker";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

interface CancellationContact extends ContactRankLike {
  role: string;
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default async function ContatosCancelamentosPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      shows: {
        select: {
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as CancellationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  // Recorte por período (ano): só oferece os anos com ao menos um cancelamento
  // (`cancelledShowYears`), para o seletor nunca cair numa lista vazia. Filtra os
  // shows de cada contato antes de agregar — a taxa e o cachê perdido do ano
  // saem intactos porque `cancellationByContact` opera sobre o recorte.
  const availableYears = cancelledShowYears(items);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodItems = items.map((it) => ({
    contact: it.contact,
    shows: filterShowsByYear(it.shows, yearFilter),
  }));

  const report = cancellationByContact(periodItems);
  const hasData = report.contactCount > 0;
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  // Comparativo ano a ano da taxa de cancelamento da carteira (espelha o card de
  // concentração ano a ano, D120/D122): só faz sentido com um ano específico e o
  // ano anterior tendo shows vinculados — caso contrário "melhorou/piorou" é
  // enganoso. Reaproveita o mesmo recorte por ano UTC (D108) sobre os itens já
  // carregados, sem nova consulta.
  let comparison: CancellationComparison<CancellationContact> | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = cancellationByContact(
      items.map((it) => ({
        contact: it.contact,
        shows: filterShowsByYear(it.shows, previousYear),
      })),
    );
    // Exige shows vinculados nos DOIS períodos para comparar taxas de verdade.
    if (report.totalShows > 0 && previousReport.totalShows > 0) {
      comparison = compareCancellationRate(report, previousReport);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cancelamentos por contratante</h1>
          <p className="text-sm text-gray-500">
            Quem mais fura o combinado — a fração dos shows marcados que acabou
            cancelada e o cachê que caiu junto. Um sinal de confiabilidade de
            quem te contrata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <a
              href={`/contatos/cancelamentos/export${yearFilter === "all" ? "" : `?ano=${yearFilter}`}`}
              className="btn-secondary"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/contatos/retencao" className="btn-secondary">
            Fidelização
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/contatos/cancelamentos"
        />
      )}

      {!hasData ? (
        <div className="card text-center text-gray-500">
          {yearFilter === "all" ? (
            <>
              <p>Nenhum show cancelado vinculado a um contratante até agora.</p>
              <p className="mt-1 text-sm">
                Sinal bom: os combinados que você marcou vêm se mantendo. Os
                cancelamentos aparecem aqui conforme surgirem.
              </p>
              <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
                Ver shows
              </Link>
            </>
          ) : (
            <>
              <p>Nenhum cancelamento em {periodLabel}.</p>
              <p className="mt-1 text-sm">
                Escolha outro período acima para ver os cancelamentos por
                contratante.
              </p>
              <Link
                href="/contatos/cancelamentos"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver todos os anos
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Taxa de cancelamento"
              value={pct(report.overallRate)}
              hint={`${report.totalCancelled} de ${report.totalShows} shows vinculados`}
            />
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cachê perdido
              </p>
              <p className="mt-1 text-xl font-bold text-red-600">
                {formatMoney(report.totalLostFee)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                combinado que caiu com os cancelamentos
              </p>
            </div>
            <Stat
              label="Contratantes que cancelaram"
              value={String(report.contactCount)}
              hint="com ao menos um show cancelado"
            />
          </div>

          {/* Comparativo ano a ano da taxa de cancelamento */}
          {comparison && (
            <CancellationComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {/* Lista por contratante */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Cancelados</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 font-medium">Taxa</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê perdido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((r) => (
                  <tr key={r.contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/contatos/${r.contact.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {r.contact.name}
                      </Link>
                      <div className="mt-0.5">
                        <span className="badge bg-brand-50 text-brand-700">
                          {CONTACT_ROLE_LABELS[r.contact.role as ContactRole] ??
                            r.contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {r.cancelledShows}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.totalShows}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-gray-500">
                          {pct(r.cancellationRate)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-red-400"
                            style={{
                              width: `${Math.max(2, Math.round(r.cancellationRate * 100))}%`,
                            }}
                          />
                        </div>
                        {!r.reliable && (
                          <span
                            className="shrink-0 text-xs text-gray-400"
                            title={`Amostra pequena (menos de ${report.minSample} shows) — taxa pouco confiável.`}
                          >
                            amostra pequena
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {r.lostFee > 0 ? formatMoney(r.lostFee) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            A contagem é por contato: um show com vários contatos conta para cada
            um. A taxa é os cancelados sobre o total de shows vinculados (todos os
            status). Contratantes com poucos shows aparecem marcados como
            &quot;amostra pequena&quot; — uma taxa alta ali pode ser só azar
            pontual, não um padrão.
          </p>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom do veredito de tendência da taxa de cancelamento entre dois anos. */
const CANCELLATION_TREND: Record<
  CancellationComparison<CancellationContact>["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  improved: {
    label: "Cancelando menos",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "A carteira furou menos combinados que no ano anterior — os contratantes vêm honrando mais o que marcam.",
  },
  worsened: {
    label: "Cancelando mais",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "A taxa de cancelamento subiu em relação ao ano anterior — vale olhar quem está furando e reforçar a confirmação dos combinados.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "A taxa de cancelamento ficou praticamente igual à do ano anterior.",
  },
};

/** Formata uma variação em pontos percentuais com sinal (ex.: 0,12 → "+12 p.p."). */
function deltaPp(delta: number): string {
  const points = Math.round(delta * 100);
  if (points === 0) return "0 p.p.";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} p.p.`;
}

/**
 * Card "Taxa de cancelamento {ano} vs. {ano-1}": compara a taxa de cancelamento
 * da carteira do ano selecionado com a do ano anterior (espelha o comparativo de
 * concentração ano a ano, D120/D122, no eixo de confiabilidade dos combinados).
 * Mostra a variação da taxa e do cachê perdido, com um veredito de tendência
 * (cancelando menos × cancelando mais).
 */
function CancellationComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: CancellationComparison<CancellationContact>;
  currentYear: number;
  previousYear: number;
}) {
  const trend = CANCELLATION_TREND[comparison.trend];
  const { current, previous } = comparison;
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Taxa de cancelamento {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">{deltaPp(comparison.overallRateDelta)}</p>
          <p className="text-xs opacity-80">
            taxa da carteira: {pct(previous.overallRate)} ({previousYear}) →{" "}
            {pct(current.overallRate)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {comparison.lostFeeDelta === 0
              ? "R$ 0"
              : `${comparison.lostFeeDelta > 0 ? "+" : "−"}${formatMoney(Math.abs(comparison.lostFeeDelta))}`}
          </p>
          <p className="text-xs opacity-80">
            cachê perdido: {formatMoney(previous.totalLostFee)} →{" "}
            {formatMoney(current.totalLostFee)}
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
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
