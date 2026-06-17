import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  summarizeFinances,
  summarizeOverdue,
  totalsByMonth,
  totalsByCategory,
  computeShowPnL,
  projectCashflow,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonthKey } from "@/lib/format";
import { SHOW_STATUS_LABELS, SHOW_STATUS_COLORS, type ShowStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const [transactions, shows, upcoming] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id, date: { gte: new Date() }, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const summary = summarizeFinances(txs);
  const overdue = summarizeOverdue(txs);
  const monthly = totalsByMonth(txs).slice(-6);
  const categories = totalsByCategory(txs).slice(0, 5);
  const cashflow = projectCashflow(txs, { months: 6 });
  const hasProjection = cashflow.months.some((m) => m.income > 0 || m.expense > 0);

  // Rentabilidade: top shows realizados por resultado
  const playedShows = shows.filter((s) => s.status === "PLAYED");
  const showPnls = playedShows
    .map((s) => ({ show: s, pnl: computeShowPnL({ id: s.id, fee: s.fee }, txs) }))
    .sort((a, b) => b.pnl.net - a.pnl.net);

  const maxMonthly = Math.max(1, ...monthly.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel</h1>
      </div>

      {/* Aviso de pendências vencidas */}
      {(overdue.income > 0 || overdue.expense > 0) && (
        <Link
          href="/financas?status=pending"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 transition hover:bg-red-100"
        >
          <span className="font-semibold">⚠ Pendências vencidas</span>
          {overdue.income > 0 && (
            <span>
              A receber: <strong>{formatMoney(overdue.income)}</strong>
              <span className="text-red-500"> ({overdue.incomeCount})</span>
            </span>
          )}
          {overdue.expense > 0 && (
            <span>
              A pagar: <strong>{formatMoney(overdue.expense)}</strong>
              <span className="text-red-500"> ({overdue.expenseCount})</span>
            </span>
          )}
        </Link>
      )}

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Saldo (competência)" value={summary.balance} tone="brand" />
        <SummaryCard label="Caixa (realizado)" value={summary.cashBalance} tone="emerald" />
        <SummaryCard label="A receber" value={summary.pendingIncome} tone="amber" />
        <SummaryCard label="A pagar" value={summary.pendingExpense} tone="red" />
      </div>

      {/* Projeção de caixa */}
      {hasProjection && (
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Projeção de caixa</h2>
            <Link href="/financas?status=pending" className="text-sm text-brand-700 hover:underline">
              Ver pendências
            </Link>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            A partir do caixa atual ({formatMoney(cashflow.startBalance)}), somando o que está
            a receber e a pagar pelo mês de vencimento.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cashflow.months.map((m) => (
              <div key={m.month} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {formatMonthKey(m.month)}
                </p>
                <p
                  className={
                    "mt-1 text-lg font-bold " +
                    (m.endBalance < 0 ? "text-red-600" : "text-gray-900")
                  }
                  title="Saldo projetado ao fim do mês"
                >
                  {formatMoney(m.endBalance)}
                </p>
                {m.net !== 0 && (
                  <p
                    className={
                      "mt-0.5 text-xs " + (m.net >= 0 ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {m.net >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(m.net))}
                  </p>
                )}
              </div>
            ))}
          </div>
          {cashflow.months.some((m) => m.endBalance < 0) && (
            <p className="mt-3 text-xs text-red-600">
              ⚠ Caixa projetado fica negativo em algum mês — revise os prazos de recebimento
              ou despesas.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos shows */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Próximos shows</h2>
            <Link
              href="/shows/calendario"
              className="text-sm text-brand-700 hover:underline"
            >
              Ver agenda
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyHint>
              Nenhum show futuro.{" "}
              <Link href="/shows/novo" className="text-brand-700 hover:underline">
                Adicionar show
              </Link>
            </EmptyHint>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/shows/${s.id}`} className="font-medium hover:underline">
                      {s.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {formatDate(s.date)}
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                  </div>
                  <span className={"badge " + SHOW_STATUS_COLORS[s.status as ShowStatus]}>
                    {SHOW_STATUS_LABELS[s.status as ShowStatus]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fluxo mensal */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Fluxo dos últimos meses</h2>
          {monthly.length === 0 ? (
            <EmptyHint>Sem transações ainda.</EmptyHint>
          ) : (
            <div className="space-y-3">
              {monthly.map((m) => (
                <div key={m.month}>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>{formatMonthKey(m.month)}</span>
                    <span className={m.net >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {formatMoney(m.net)}
                    </span>
                  </div>
                  <div className="flex h-2 gap-1">
                    <div
                      className="rounded bg-emerald-400"
                      style={{ width: `${(m.income / maxMonthly) * 50}%` }}
                      title={`Receita ${formatMoney(m.income)}`}
                    />
                    <div
                      className="rounded bg-red-400"
                      style={{ width: `${(m.expense / maxMonthly) * 50}%` }}
                      title={`Despesa ${formatMoney(m.expense)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rentabilidade por show */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Rentabilidade por show</h2>
            <span className="text-xs text-gray-400">realizados</span>
          </div>
          {showPnls.length === 0 ? (
            <EmptyHint>Marque shows como “realizado” para ver o resultado.</EmptyHint>
          ) : (
            <ul className="divide-y divide-gray-100">
              {showPnls.slice(0, 5).map(({ show, pnl }) => (
                <li key={show.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/shows/${show.id}`} className="font-medium hover:underline">
                      {show.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {formatMoney(pnl.fee)} cachê · {formatMoney(pnl.expenses)} despesas
                    </p>
                  </div>
                  <span
                    className={
                      "font-semibold " + (pnl.net >= 0 ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {formatMoney(pnl.net)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Categorias */}
        <section className="card">
          <h2 className="mb-4 font-semibold">Maiores categorias</h2>
          {categories.length === 0 ? (
            <EmptyHint>Sem dados de categoria.</EmptyHint>
          ) : (
            <ul className="divide-y divide-gray-100">
              {categories.map((c) => (
                <li key={c.category} className="flex items-center justify-between py-2 text-sm">
                  <span>{c.category}</span>
                  <span className="text-gray-500">
                    {c.income > 0 && (
                      <span className="text-emerald-600">+{formatMoney(c.income)} </span>
                    )}
                    {c.expense > 0 && (
                      <span className="text-red-600">−{formatMoney(c.expense)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "emerald" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    brand: "text-brand-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-2xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-gray-400">{children}</p>;
}
