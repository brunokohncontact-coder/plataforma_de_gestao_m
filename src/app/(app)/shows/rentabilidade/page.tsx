import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankShowsByProfit,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
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
        <Link href="/shows" className="btn-secondary">
          ← Shows
        </Link>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker years={availableYears} active={yearFilter} />
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
            />
          </div>

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

/** Seletor de período: "Todos" + uma pílula por ano com shows (mais recente primeiro). */
function PeriodPicker({
  years,
  active,
}: {
  years: number[];
  active: number | "all";
}) {
  const base = "rounded-full px-3 py-1 text-sm font-medium transition-colors";
  const on = "bg-brand-600 text-white";
  const off = "bg-gray-100 text-gray-600 hover:bg-gray-200";
  return (
    <nav aria-label="Período" className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Período
      </span>
      <Link
        href="/shows/rentabilidade"
        className={base + " " + (active === "all" ? on : off)}
        aria-current={active === "all" ? "page" : undefined}
      >
        Todos
      </Link>
      {years.map((y) => (
        <Link
          key={y}
          href={`/shows/rentabilidade?ano=${y}`}
          className={base + " " + (active === y ? on : off)}
          aria-current={active === y ? "page" : undefined}
        >
          {y}
        </Link>
      ))}
    </nav>
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
