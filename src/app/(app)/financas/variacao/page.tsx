import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  compareCategoryReports,
  filterTransactions,
  type TxLike,
  type CategoryDelta,
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

type SearchParams = { [key: string]: string | string[] | undefined };

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

function pct(delta: MetricDelta): string {
  return delta.pct == null ? "novo" : `${Math.round(Math.abs(delta.pct) * 100)}%`;
}

export default async function FinanceCategoryVariationPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};

  // Mês de referência (fallback: mês atual) — mesmos helpers do relatório mensal.
  const { year, month } = parseMonthKey(readParam(params, "mes"));
  const key = monthKeyOf(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const prevKey = monthKeyOf(prev.year, prev.month);

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

  const current = filterTransactions(allTxs, { month: key });
  const previous = filterTransactions(allTxs, { month: prevKey });
  const cmp = compareCategoryReports(current, previous);

  const hasData = current.length > 0 || previous.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Variação por categoria</h1>
          <p className="text-sm text-gray-500">
            {formatMonthTitle(year, month)} vs. {formatMonthTitle(prev.year, prev.month)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
          <Link
            href={`/financas/relatorio?mes=${key}`}
            className="text-sm text-brand-700 hover:underline"
          >
            Relatório do mês
          </Link>
        </div>
      </div>

      {/* Navegação por mês */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/variacao?mes=${monthKeyOf(prev.year, prev.month)}`}
          className="btn-secondary"
          aria-label="Mês anterior"
        >
          ←
        </Link>
        <Link href="/financas/variacao" className="text-sm text-brand-700 hover:underline">
          Mês atual
        </Link>
        <Link
          href={`/financas/variacao?mes=${monthKeyOf(next.year, next.month)}`}
          className="btn-secondary"
          aria-label="Próximo mês"
        >
          →
        </Link>
      </div>

      {!hasData ? (
        <div className="card text-center text-gray-500">
          <p>
            Nenhuma transação em {formatMonthTitle(year, month)} nem em{" "}
            {formatMonthTitle(prev.year, prev.month)} para comparar.
          </p>
        </div>
      ) : (
        <>
          {/* Resumo: total de receita e despesa vs mês anterior */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TotalCard
              label="Receitas"
              value={cmp.totalIncome}
              delta={cmp.incomeDelta}
              upIsGood
            />
            <TotalCard
              label="Despesas"
              value={cmp.totalExpense}
              delta={cmp.expenseDelta}
              upIsGood={false}
            />
          </div>

          {/* Destaques: o que mais mudou */}
          {(cmp.topExpenseRise || cmp.topExpenseDrop || cmp.topIncomeRise) && (
            <div className="grid gap-3 sm:grid-cols-3">
              {cmp.topExpenseRise && (
                <Highlight
                  tone="red"
                  label="Maior alta de gasto"
                  row={cmp.topExpenseRise}
                />
              )}
              {cmp.topExpenseDrop && (
                <Highlight
                  tone="emerald"
                  label="Maior economia"
                  row={cmp.topExpenseDrop}
                />
              )}
              {cmp.topIncomeRise && (
                <Highlight
                  tone="emerald"
                  label="Maior alta de receita"
                  row={cmp.topIncomeRise}
                />
              )}
            </div>
          )}

          {/* Tabelas de variação por categoria */}
          <div className="grid gap-6 lg:grid-cols-2">
            <VariationCard
              title="Despesas por categoria"
              rows={cmp.expense}
              upIsGood={false}
            />
            <VariationCard
              title="Receitas por categoria"
              rows={cmp.income}
              upIsGood
            />
          </div>

          <p className="text-xs text-gray-400">
            Compara as transações lançadas (pagas e a pagar) de cada categoria entre os
            dois meses. As categorias vêm ordenadas pelo maior movimento — quem mais mudou,
            para cima ou para baixo, aparece primeiro. Uma categoria que sumiu de um mês para
            o outro aparece com o lado vazio contando como R$ 0.
          </p>
        </>
      )}
    </div>
  );
}

function toneFor(direction: MetricDelta["direction"], upIsGood: boolean): string {
  if (direction === "flat") return "text-gray-400";
  const isGood = direction === "up" ? upIsGood : !upIsGood;
  return isGood ? "text-emerald-600" : "text-red-600";
}

function arrowFor(direction: MetricDelta["direction"]): string {
  return direction === "up" ? "▲" : direction === "down" ? "▼" : "→";
}

function TotalCard({
  label,
  value,
  delta,
  upIsGood,
}: {
  label: string;
  value: number;
  delta: MetricDelta;
  upIsGood: boolean;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{formatMoney(value)}</p>
      {delta.direction === "flat" ? (
        <p className="mt-1 text-xs text-gray-400">→ sem variação vs. mês anterior</p>
      ) : (
        <p className={"mt-1 text-xs font-medium " + toneFor(delta.direction, upIsGood)}>
          {arrowFor(delta.direction)} {formatMoney(Math.abs(delta.delta))}{" "}
          <span className="opacity-70">({pct(delta)})</span>{" "}
          <span className="font-normal text-gray-400">vs. mês anterior</span>
        </p>
      )}
    </div>
  );
}

function Highlight({
  tone,
  label,
  row,
}: {
  tone: "red" | "emerald";
  label: string;
  row: CategoryDelta;
}) {
  const toneClass = tone === "red" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800";
  const sign = row.delta.delta > 0 ? "+" : "−";
  return (
    <div className={"rounded-lg px-4 py-3 " + toneClass}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 truncate font-semibold">{row.category}</p>
      <p className="mt-0.5 text-sm">
        {sign}
        {formatMoney(Math.abs(row.delta.delta))}{" "}
        <span className="opacity-70">({pct(row.delta)})</span>
      </p>
    </div>
  );
}

function VariationCard({
  title,
  rows,
  upIsGood,
}: {
  title: string;
  rows: CategoryDelta[];
  upIsGood: boolean;
}) {
  return (
    <section className="card overflow-x-auto p-0">
      <h2 className="border-b border-gray-100 px-4 py-3 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Nada nestes dois meses.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 text-right font-medium">Mês ant.</th>
              <th className="px-4 py-2 text-right font-medium">Este mês</th>
              <th className="px-4 py-2 text-right font-medium">Variação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.category} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{r.category}</td>
                <td className="px-4 py-2 text-right text-gray-500">
                  {formatMoney(r.previousAmount)}
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">
                  {formatMoney(r.amount)}
                </td>
                <td
                  className={
                    "px-4 py-2 text-right font-medium " +
                    toneFor(r.delta.direction, upIsGood)
                  }
                >
                  {r.delta.direction === "flat" ? (
                    "→"
                  ) : (
                    <>
                      {arrowFor(r.delta.direction)} {formatMoney(Math.abs(r.delta.delta))}{" "}
                      <span className="opacity-70">({pct(r.delta)})</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
