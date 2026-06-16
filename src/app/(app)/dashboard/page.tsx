import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMonthLabel } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import {
  financeSummary,
  monthlyTotals,
  showProfitability,
} from "@/lib/finance";
import {
  PageHeader,
  StatCard,
  LinkButton,
  ShowStatusBadge,
  EmptyState,
} from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [transactions, upcomingShows, recentShows] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: {
        userId: user.id,
        date: { gte: now },
        status: { in: ["PROPOSED", "CONFIRMED"] },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.show.findMany({
      where: { userId: user.id, status: "DONE" },
      orderBy: { date: "desc" },
      take: 5,
      include: { transactions: true },
    }),
  ]);

  const summary = financeSummary(transactions);
  const months = monthlyTotals(transactions).slice(-6);
  const maxMonth = Math.max(
    1,
    ...months.map((m) => Math.max(m.income, m.expenses))
  );

  const displayName = user.artistName || user.name;

  return (
    <div>
      <PageHeader
        title={`Olá, ${displayName.split(" ")[0]}`}
        subtitle="Visão geral da sua carreira."
        action={<LinkButton href="/shows/new">+ Novo show</LinkButton>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receitas" value={formatBRL(summary.income)} tone="positive" />
        <StatCard label="Despesas" value={formatBRL(summary.expenses)} tone="negative" />
        <StatCard
          label="Saldo"
          value={formatBRL(summary.net)}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="A receber"
          value={formatBRL(summary.receivable)}
          hint={`A pagar: ${formatBRL(summary.payable)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos shows */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximos shows</h2>
            <Link href="/shows" className="text-sm text-brand-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {upcomingShows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhum show agendado.{" "}
              <Link href="/shows/new" className="text-brand-600 hover:underline">
                Cadastrar
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingShows.map((show) => (
                <li key={show.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/shows/${show.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {show.title}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {formatDate(show.date)}
                      {show.city && ` · ${show.city}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShowStatusBadge status={show.status} />
                    <span className="text-sm font-medium">
                      {formatBRL(show.fee)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fluxo mensal */}
        <div className="card">
          <h2 className="mb-3 font-semibold">Fluxo dos últimos meses</h2>
          {months.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Sem lançamentos financeiros ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {months.map((m) => (
                <li key={m.month}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{formatMonthLabel(m.month)}</span>
                    <span
                      className={
                        m.net >= 0 ? "text-emerald-600" : "text-red-600"
                      }
                    >
                      {formatBRL(m.net)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 flex-1 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-emerald-400"
                        style={{ width: `${(m.income / maxMonth) * 100}%` }}
                      />
                    </div>
                    <div className="h-2 flex-1 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-red-400"
                        style={{ width: `${(m.expenses / maxMonth) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Receita
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              Despesa
            </span>
          </div>
        </div>
      </div>

      {/* Rentabilidade por show (F4) */}
      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">Rentabilidade — shows realizados</h2>
        {recentShows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Marque shows como “Realizado” para ver a rentabilidade aqui.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2">Show</th>
                <th className="py-2 text-right">Receita</th>
                <th className="py-2 text-right">Despesas</th>
                <th className="py-2 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentShows.map((show) => {
                const pnl = showProfitability({ fee: show.fee }, show.transactions);
                return (
                  <tr key={show.id}>
                    <td className="py-2">
                      <Link
                        href={`/shows/${show.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {show.title}
                      </Link>
                    </td>
                    <td className="py-2 text-right">{formatBRL(pnl.revenue)}</td>
                    <td className="py-2 text-right text-red-600">
                      {formatBRL(pnl.expenses)}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        pnl.result >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatBRL(pnl.result)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
