import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  summarizeFinances,
  categoryReport,
  filterTransactions,
  compareSummaries,
  averageSummaries,
  type TxLike,
  type FinanceSummary,
  type CategorySlice,
  type MetricDelta,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import {
  parseMonthKey,
  shiftMonth,
  monthKey as monthKeyOf,
  formatMonthTitle,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

/** Janela (em meses) da média móvel comparada ao mês corrente. */
const AVERAGE_WINDOW = 3;

type SearchParams = { [key: string]: string | string[] | undefined };

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};

  // Mês de referência (fallback: mês atual). Reaproveita os helpers do calendário.
  const { year, month } = parseMonthKey(readParam(params, "mes"));
  const key = monthKeyOf(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const allTxs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  // Recorte do mês reaproveitando a lógica de filtro testada (uma fonte de verdade).
  const visible = filterTransactions(allTxs, { month: key });
  const summary = summarizeFinances(visible);
  const report = categoryReport(visible);

  // Comparativo com o mês anterior ("estou melhor que o mês passado?").
  const prevKey = monthKeyOf(prev.year, prev.month);
  const prevVisible = filterTransactions(allTxs, { month: prevKey });
  const prevSummary = summarizeFinances(prevVisible);
  const comparison = compareSummaries(summary, prevSummary);
  const hasPrevData = prevVisible.length > 0;

  // Comparativo com a média dos últimos meses ("vs minha tendência"): suaviza um
  // mês anterior atípico. Considera só os meses com movimento na janela (denominador
  // = meses ativos) e só aparece quando há ≥2 deles — com 1 a média = o mês anterior.
  const trailingSummaries: FinanceSummary[] = [];
  for (let i = 1; i <= AVERAGE_WINDOW; i++) {
    const s = shiftMonth(year, month, -i);
    const monthTxs = filterTransactions(allTxs, { month: monthKeyOf(s.year, s.month) });
    if (monthTxs.length > 0) trailingSummaries.push(summarizeFinances(monthTxs));
  }
  const averageComparison = compareSummaries(summary, averageSummaries(trailingSummaries));
  const hasAverageData = trailingSummaries.length >= 2;

  const transactionsExportHref = `/financas/export?mes=${key}`;
  const reportExportHref = `/financas/relatorio/export?mes=${key}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatório mensal</h1>
          <p className="text-sm text-gray-500">{formatMonthTitle(year, month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
          {visible.length > 0 && (
            <>
              <a href={reportExportHref} className="btn-secondary" download>
                ⬇ Relatório (CSV)
              </a>
              <a href={transactionsExportHref} className="btn-secondary" download>
                ⬇ Transações (CSV)
              </a>
            </>
          )}
        </div>
      </div>

      {/* Navegação por mês */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/relatorio?mes=${monthKeyOf(prev.year, prev.month)}`}
          className="btn-secondary"
          aria-label="Mês anterior"
        >
          ←
        </Link>
        <Link
          href="/financas/relatorio"
          className="text-sm text-brand-700 hover:underline"
        >
          Mês atual
        </Link>
        <Link
          href={`/financas/relatorio?mes=${monthKeyOf(next.year, next.month)}`}
          className="btn-secondary"
          aria-label="Próximo mês"
        >
          →
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma transação em {formatMonthTitle(year, month)}.</p>
        </div>
      ) : (
        <>
          {/* Resumo do mês (comparado ao mês anterior e à média recente, quando houver) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Receitas"
              value={summary.totalIncome}
              tone="emerald"
              upIsGood
              monthDelta={hasPrevData ? comparison.totalIncome : undefined}
              averageDelta={hasAverageData ? averageComparison.totalIncome : undefined}
            />
            <Stat
              label="Despesas"
              value={summary.totalExpense}
              tone="red"
              upIsGood={false}
              monthDelta={hasPrevData ? comparison.totalExpense : undefined}
              averageDelta={hasAverageData ? averageComparison.totalExpense : undefined}
            />
            <Stat
              label="Saldo do mês"
              value={summary.balance}
              tone="brand"
              upIsGood
              monthDelta={hasPrevData ? comparison.balance : undefined}
              averageDelta={hasAverageData ? averageComparison.balance : undefined}
            />
            <Stat
              label="Caixa realizado"
              value={summary.cashBalance}
              tone="gray"
              upIsGood
              monthDelta={hasPrevData ? comparison.cashBalance : undefined}
              averageDelta={hasAverageData ? averageComparison.cashBalance : undefined}
            />
          </div>
          {(hasPrevData || hasAverageData) && (
            <p className="-mt-2 text-xs text-gray-400">
              {hasPrevData && <>vs. mês ant. = {formatMonthTitle(prev.year, prev.month)}. </>}
              {hasAverageData && (
                <>vs. média = média dos últimos {trailingSummaries.length} meses com movimento.</>
              )}
            </p>
          )}

          {(summary.pendingIncome > 0 || summary.pendingExpense > 0) && (
            <div className="flex flex-wrap gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {summary.pendingIncome > 0 && (
                <span>
                  A receber no mês: <strong>{formatMoney(summary.pendingIncome)}</strong>
                </span>
              )}
              {summary.pendingExpense > 0 && (
                <span>
                  A pagar no mês: <strong>{formatMoney(summary.pendingExpense)}</strong>
                </span>
              )}
            </div>
          )}

          {/* Quebra por categoria */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryCard
              title="Receitas por categoria"
              slices={report.income}
              total={report.totalIncome}
              tone="emerald"
            />
            <CategoryCard
              title="Despesas por categoria"
              slices={report.expense}
              total={report.totalExpense}
              tone="red"
            />
          </div>
        </>
      )}
    </div>
  );
}

function CategoryCard({
  title,
  slices,
  total,
  tone,
}: {
  title: string;
  slices: CategorySlice[];
  total: number;
  tone: "emerald" | "red";
}) {
  const barTone = tone === "emerald" ? "bg-emerald-400" : "bg-red-400";
  const textTone = tone === "emerald" ? "text-emerald-600" : "text-red-600";

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className={"font-semibold " + textTone}>{formatMoney(total)}</span>
      </div>
      {slices.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">Nada neste mês.</p>
      ) : (
        <ul className="space-y-3">
          {slices.map((s) => (
            <li key={s.category}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{s.category}</span>
                <span className="whitespace-nowrap text-gray-500">
                  {formatMoney(s.amount)}
                  <span className="ml-1 text-xs text-gray-400">
                    ({Math.round(s.share * 100)}%)
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-gray-100">
                <div
                  className={"h-full rounded " + barTone}
                  style={{ width: `${Math.max(2, Math.round(s.share * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  monthDelta,
  averageDelta,
  upIsGood = true,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "brand" | "gray";
  /** Variação frente ao mês anterior. */
  monthDelta?: MetricDelta;
  /** Variação frente à média dos últimos meses (tendência). */
  averageDelta?: MetricDelta;
  upIsGood?: boolean;
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
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
      {monthDelta && <DeltaLine delta={monthDelta} upIsGood={upIsGood} caption="mês ant." />}
      {averageDelta && <DeltaLine delta={averageDelta} upIsGood={upIsGood} caption="média" />}
    </div>
  );
}

/** Linha de variação: rótulo da base + seta + valor absoluto + porcentagem. */
function DeltaLine({
  delta,
  upIsGood,
  caption,
}: {
  delta: MetricDelta;
  upIsGood: boolean;
  caption: string;
}) {
  const prefix = <span className="font-normal text-gray-400">vs. {caption}: </span>;

  if (delta.direction === "flat") {
    return (
      <p className="mt-1 text-xs text-gray-400">
        {prefix}→ sem variação
      </p>
    );
  }

  const isGood = delta.direction === "up" ? upIsGood : !upIsGood;
  const colorClass = isGood ? "text-emerald-600" : "text-red-600";
  const arrow = delta.direction === "up" ? "▲" : "▼";
  const pctLabel =
    delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;

  return (
    <p className={"mt-1 text-xs font-medium " + colorClass}>
      {prefix}
      {arrow} {formatMoney(Math.abs(delta.delta))} <span className="opacity-70">({pctLabel})</span>
    </p>
  );
}
