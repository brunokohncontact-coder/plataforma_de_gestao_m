import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  annualSummary,
  compareAnnualSummaries,
  annualCategoryReport,
  type TxLike,
  type AnnualMonth,
  type MetricDelta,
  type CategorySlice,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const MONTH_ABBR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** "YYYY" -> ano válido (1970–2999); fallback ao ano atual. */
function parseYear(raw: string | undefined, reference: Date = new Date()): number {
  if (raw) {
    const m = /^\d{4}$/.exec(raw.trim());
    if (m) {
      const y = Number(m[0]);
      if (y >= 1970 && y <= 2999) return y;
    }
  }
  return reference.getFullYear();
}

export default async function FinanceAnnualPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const year = parseYear(readParam(params, "ano"));

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

  const summary = annualSummary(allTxs, year);
  const prevSummary = annualSummary(allTxs, year - 1);
  const comparison = compareAnnualSummaries(summary, prevSummary);
  const categories = annualCategoryReport(allTxs, year);
  const hasActivity = summary.totalIncome > 0 || summary.totalExpense > 0;
  const prevHasActivity =
    prevSummary.totalIncome > 0 || prevSummary.totalExpense > 0;

  // Mapa monthIndex → variação de resultado (para a coluna do mês a mês).
  const netDeltaByIndex = new Map(
    comparison.months.map((m) => [m.monthIndex, m.net]),
  );

  // Escala das barras: maior movimentação mensal (receita ou despesa) no ano.
  const peak = Math.max(
    1,
    ...summary.months.map((m) => Math.max(m.income, m.expense)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resumo anual</h1>
          <p className="text-sm text-gray-500">{year}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/anual?ano=${year - 1}`}
          className="btn-secondary"
          aria-label="Ano anterior"
        >
          ←
        </Link>
        <Link href="/financas/anual" className="text-sm text-brand-700 hover:underline">
          Ano atual
        </Link>
        <Link
          href={`/financas/anual?ano=${year + 1}`}
          className="btn-secondary"
          aria-label="Próximo ano"
        >
          →
        </Link>
      </div>

      {!hasActivity ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma transação em {year}.</p>
        </div>
      ) : (
        <>
          {/* Totais do ano */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Receitas do ano"
              value={summary.totalIncome}
              tone="emerald"
              delta={prevHasActivity ? comparison.totalIncome : undefined}
              upIsGood
            />
            <Stat
              label="Despesas do ano"
              value={summary.totalExpense}
              tone="red"
              delta={prevHasActivity ? comparison.totalExpense : undefined}
              upIsGood={false}
            />
            <Stat
              label="Saldo do ano"
              value={summary.net}
              tone="brand"
              delta={prevHasActivity ? comparison.net : undefined}
              upIsGood
            />
          </div>
          {prevHasActivity && (
            <p className="-mt-2 text-xs text-gray-500">
              Variação comparada a {year - 1}.
            </p>
          )}

          {/* Melhor / pior mês */}
          {(summary.best || summary.worst) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {summary.best && (
                <HighlightCard label="Melhor mês" month={summary.best} tone="emerald" />
              )}
              {summary.worst && (
                <HighlightCard label="Pior mês" month={summary.worst} tone="red" />
              )}
            </div>
          )}

          {/* Quebra mês a mês */}
          <section className="card overflow-x-auto">
            <h2 className="mb-4 font-semibold">Mês a mês</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 px-3 text-right font-medium">Receitas</th>
                  <th className="pb-2 px-3 text-right font-medium">Despesas</th>
                  <th className="pb-2 pl-3 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {summary.months.map((m) => {
                  const empty = m.income === 0 && m.expense === 0;
                  return (
                    <tr
                      key={m.month}
                      className={"border-b last:border-0 " + (empty ? "text-gray-400" : "")}
                    >
                      <td className="py-2 pr-3">
                        <Link
                          href={`/financas/relatorio?mes=${m.month}`}
                          className="hover:underline"
                        >
                          {MONTH_ABBR[m.monthIndex - 1]}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600">
                        {m.income > 0 ? formatMoney(m.income) : "—"}
                        <Bar value={m.income} peak={peak} tone="emerald" />
                      </td>
                      <td className="py-2 px-3 text-right text-red-600">
                        {m.expense > 0 ? formatMoney(m.expense) : "—"}
                        <Bar value={m.expense} peak={peak} tone="red" />
                      </td>
                      <td
                        className={
                          "py-2 pl-3 text-right font-medium " +
                          (m.net < 0 ? "text-red-600" : empty ? "" : "text-gray-900")
                        }
                      >
                        {empty ? "—" : formatMoney(m.net)}
                        {prevHasActivity && !empty && (() => {
                          const d = netDeltaByIndex.get(m.monthIndex);
                          return d && d.previous !== 0 ? (
                            <DeltaInline delta={d} upIsGood />
                          ) : null;
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right text-emerald-600">
                    {formatMoney(summary.totalIncome)}
                  </td>
                  <td className="pt-2 px-3 text-right text-red-600">
                    {formatMoney(summary.totalExpense)}
                  </td>
                  <td
                    className={
                      "pt-2 pl-3 text-right " +
                      (summary.net < 0 ? "text-red-600" : "text-gray-900")
                    }
                  >
                    {formatMoney(summary.net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Quebra por categoria do ano: "para onde foi o dinheiro?" */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryCard
              title="Receitas por categoria"
              slices={categories.income}
              total={categories.totalIncome}
              tone="emerald"
            />
            <CategoryCard
              title="Despesas por categoria"
              slices={categories.expense}
              total={categories.totalExpense}
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
        <p className="py-4 text-center text-sm text-gray-400">Nada neste ano.</p>
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

function Bar({
  value,
  peak,
  tone,
}: {
  value: number;
  peak: number;
  tone: "emerald" | "red";
}) {
  if (value <= 0) return null;
  const barTone = tone === "emerald" ? "bg-emerald-400" : "bg-red-400";
  const width = Math.max(2, Math.round((value / peak) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div className={"ml-auto h-full rounded " + barTone} style={{ width: `${width}%` }} />
    </div>
  );
}

function HighlightCard({
  label,
  month,
  tone,
}: {
  label: string;
  month: AnnualMonth;
  tone: "emerald" | "red";
}) {
  const textTone = month.net < 0 ? "text-red-600" : "text-gray-900";
  return (
    <Link href={`/financas/relatorio?mes=${month.month}`} className="card block hover:border-brand-300">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold">{MONTH_ABBR[month.monthIndex - 1]}</span>
        <span className={"text-lg font-bold " + textTone}>{formatMoney(month.net)}</span>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        <span className={tone === "emerald" ? "text-emerald-600" : ""}>
          {formatMoney(month.income)} em receitas
        </span>{" "}
        · {formatMoney(month.expense)} em despesas
      </p>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
  delta,
  upIsGood = true,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "brand";
  delta?: MetricDelta;
  upIsGood?: boolean;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: value < 0 ? "text-red-600" : "text-brand-700",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
      {delta && <DeltaLine delta={delta} upIsGood={upIsGood} />}
    </div>
  );
}

/** Linha de variação ano a ano: seta + valor absoluto + porcentagem. */
function DeltaLine({ delta, upIsGood }: { delta: MetricDelta; upIsGood: boolean }) {
  if (delta.direction === "flat") {
    return <p className="mt-1 text-xs text-gray-400">→ sem variação</p>;
  }
  const isGood = delta.direction === "up" ? upIsGood : !upIsGood;
  const colorClass = isGood ? "text-emerald-600" : "text-red-600";
  const arrow = delta.direction === "up" ? "▲" : "▼";
  const pctLabel =
    delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;
  return (
    <p className={"mt-1 text-xs font-medium " + colorClass}>
      {arrow} {formatMoney(Math.abs(delta.delta))}{" "}
      <span className="opacity-70">({pctLabel})</span>
    </p>
  );
}

/** Variação compacta para dentro de uma célula da tabela (seta + porcentagem). */
function DeltaInline({ delta, upIsGood }: { delta: MetricDelta; upIsGood: boolean }) {
  if (delta.direction === "flat") return null;
  const isGood = delta.direction === "up" ? upIsGood : !upIsGood;
  const colorClass = isGood ? "text-emerald-600" : "text-red-600";
  const arrow = delta.direction === "up" ? "▲" : "▼";
  const pctLabel =
    delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;
  return (
    <span className={"ml-2 text-xs font-normal " + colorClass}>
      {arrow} {pctLabel}
    </span>
  );
}
