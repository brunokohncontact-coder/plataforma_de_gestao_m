import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankShowsByProfit,
  compareShowsProfitability,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type ShowsProfitabilityComparison,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PeriodPicker } from "@/components/PeriodPicker";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  type ShowStatus,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const CANCELLED = "CANCELLED";

export default async function ShowProfitabilityPage({
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

  // Recorte por período (ano), reaproveitando os três helpers da D108
  // (mesmo padrão de /shows/locais e /shows/cidades, ver D111/D115). Os anos do
  // seletor vêm só dos shows que entram na agregação (não cancelados), para não
  // oferecer um ano que ficaria vazio. Filtra-se ANTES de `rankShowsByProfit`,
  // que segue excluindo CANCELLED e calculando o P&L sem saber do recorte.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(shows, yearFilter);

  // Exclui CANCELLED por padrão (não representam rentabilidade real).
  const report = rankShowsByProfit(periodShows, txs);

  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;

  // Comparativo ano a ano do resultado por show (só com um ano específico e
  // ambos os períodos tendo shows — senão o resultado médio por show do ano
  // vazio seria 0 e a comparação enganosa). Reaproveita o mesmo recorte por ano
  // (D108) sobre os registros já carregados, sem nova consulta.
  let comparison: ShowsProfitabilityComparison | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = rankShowsByProfit(filterShowsByYear(shows, previousYear), txs);
    if (report.count > 0 && previousReport.count > 0) {
      comparison = compareShowsProfitability(report, previousReport);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rentabilidade por show</h1>
          <p className="text-sm text-gray-500">
            Quais shows realmente deram resultado — cachê + receitas extras − despesas
            vinculadas. Shows cancelados são ignorados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.count > 0 && (
            <a
              href={`/shows/rentabilidade/export${yearFilter === "all" ? "" : `?ano=${yearFilter}`}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          {comparison && (
            <a
              href={`/shows/rentabilidade/comparativo/export?ano=${yearFilter}`}
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV vs {previousYear}
            </a>
          )}
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker years={availableYears} active={yearFilter} basePath="/shows/rentabilidade" />
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
                Escolha outro período acima para ver a rentabilidade por show.
              </p>
              <Link
                href="/shows/rentabilidade"
                className="mt-3 inline-block text-brand-700 hover:underline"
              >
                Ver todos os anos
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Shows analisados" value={String(report.count)} />
            <Stat label="Receita bruta" value={formatMoney(report.totalIncome)} tone="emerald" />
            <Stat label="Despesas" value={"−" + formatMoney(report.totalExpenses)} tone="red" />
            <Stat
              label="Resultado líquido"
              value={formatMoney(report.totalNet)}
              tone={report.totalNet >= 0 ? "brand" : "red"}
              hint={
                report.totalIncome > 0
                  ? `Margem líquida ${(report.totalMargin * 100).toFixed(0)}%`
                  : undefined
              }
            />
          </div>

          {comparison && (
            <ProfitComparisonCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          {report.best && report.worst && report.best.show.id !== report.worst.show.id && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Highlight
                label="Mais rentável"
                title={report.best.show.title}
                value={formatMoney(report.best.pnl.net)}
                tone="emerald"
              />
              <Highlight
                label="Menos rentável"
                title={report.worst.show.title}
                value={formatMoney(report.worst.pnl.net)}
                tone={report.worst.pnl.net >= 0 ? "brand" : "red"}
              />
            </div>
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Show</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Extras</th>
                  <th className="px-4 py-3 text-right font-medium">Despesas</th>
                  <th className="px-4 py-3 text-right font-medium">Resultado</th>
                  <th className="px-4 py-3 text-right font-medium">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map(({ show, pnl }) => {
                  const status = show.status as ShowStatus;
                  return (
                    <tr key={show.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/shows/${show.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {show.title}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(show.date)}</span>
                          <span className={"badge " + (SHOW_STATUS_COLORS[status] ?? "")}>
                            {SHOW_STATUS_LABELS[status] ?? show.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatMoney(pnl.fee)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {pnl.extraIncome > 0 ? formatMoney(pnl.extraIncome) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {pnl.expenses > 0 ? "−" + formatMoney(pnl.expenses) : "—"}
                      </td>
                      <td
                        className={
                          "px-4 py-3 text-right font-semibold " +
                          (pnl.net >= 0 ? "text-emerald-600" : "text-red-600")
                        }
                      >
                        {formatMoney(pnl.net)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {pnl.fee + pnl.extraIncome > 0 ? `${(pnl.margin * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Rótulo + tom do veredito do comparativo ano a ano do resultado por show. */
const PROFIT_TREND: Record<
  ShowsProfitabilityComparison["trend"],
  { label: string; emoji: string; classes: string; note: string }
> = {
  up: {
    label: "Mais rentável por show",
    emoji: "🟢",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    note: "O show típico deu mais resultado que no ano anterior — sinal de progressão: cada gig passou a render mais líquido. Bom momento para firmar o novo patamar de preço e seleção de shows.",
  },
  down: {
    label: "Menos rentável por show",
    emoji: "🔴",
    classes: "border-red-200 bg-red-50 text-red-800",
    note: "O show típico deu menos resultado que no ano anterior — cada gig vem rendendo menos líquido. Vale revisar cachês, despesas vinculadas e priorizar shows que sustentam a margem.",
  },
  stable: {
    label: "Estável",
    emoji: "⚪",
    classes: "border-gray-200 bg-gray-50 text-gray-700",
    note: "O resultado médio por show ficou praticamente igual ao do ano anterior.",
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

/**
 * Card "Resultado por show {ano} vs. {ano-1}": compara o resultado líquido médio
 * por show do ano selecionado com o do ano anterior (espelha o comparativo ano a
 * ano do cachê/antecedência, D209/D187, no eixo do RESULTADO por gig). Mostra a
 * variação do resultado médio (com %) e do total somado, com um veredito de
 * tendência. Aqui **subir** é a melhora — a leitura direta de "o show típico paga
 * mais líquido?".
 */
function ProfitComparisonCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ShowsProfitabilityComparison;
  currentYear: number;
  previousYear: number;
}) {
  const trend = PROFIT_TREND[comparison.trend];
  const { avgNet, totalNet } = comparison;
  const avgPct = pctDelta(avgNet.pct);
  return (
    <div className={"card border " + trend.classes}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Resultado por show {currentYear} vs. {previousYear}
        </p>
        <span className="badge bg-white/70 font-semibold">
          {trend.emoji} {trend.label}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-bold">
            {moneyDelta(avgNet.delta)}
            {avgPct && <span className="ml-2 text-base font-semibold opacity-80">{avgPct}</span>}
          </p>
          <p className="text-xs opacity-80">
            médio por show: {formatMoney(avgNet.previous)} ({previousYear}) →{" "}
            {formatMoney(avgNet.current)} ({currentYear})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{moneyDelta(totalNet.delta)}</p>
          <p className="text-xs opacity-80">
            total: {formatMoney(totalNet.previous)} → {formatMoney(totalNet.current)}{" "}
            ({comparison.count.previous} → {comparison.count.current} shows)
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
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Highlight({
  label,
  title,
  value,
  tone,
}: {
  label: string;
  title: string;
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
      <p className={"mt-1 text-lg font-bold " + tones[tone]}>{value}</p>
    </div>
  );
}
