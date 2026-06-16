import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  computeFinancialSummary,
  computeShowPnL,
  computeMonthlyTimeline,
} from "@/lib/domain/finance";
import { StatusBadge, Money, formatDate } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [transactions, shows, upcoming] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id },
      include: { transactions: true },
    }),
    prisma.show.findMany({
      where: {
        userId: user.id,
        date: { gte: now },
        status: { in: ["proposto", "confirmado"] },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const summary = computeFinancialSummary(transactions);
  const timeline = computeMonthlyTimeline(transactions).slice(-6);

  const showsWithPnL = shows
    .map((s) => ({ show: s, pnl: computeShowPnL(s, s.transactions) }))
    .sort((a, b) => b.pnl.plannedResult - a.pnl.plannedResult);
  const topShows = showsWithPnL.slice(0, 5);

  const maxNet = Math.max(1, ...timeline.map((t) => Math.max(t.revenue, t.expenses)));
  const display = user.artistName || user.name;
  const isEmpty = shows.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {display} 👋</h1>
        <p className="text-sm text-slate-500">Seu painel de carreira.</p>
      </div>

      {isEmpty && (
        <div className="card bg-brand-50">
          <p className="font-medium text-brand-700">Bem-vindo ao Palco!</p>
          <p className="mt-1 text-sm text-slate-600">
            Comece cadastrando seu primeiro{" "}
            <Link href="/shows" className="font-medium text-brand-600">
              show
            </Link>{" "}
            ou lançando uma{" "}
            <Link href="/financas" className="font-medium text-brand-600">
              transação
            </Link>
            .
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Resultado líquido</p>
          <p className="mt-1 text-2xl font-bold">
            <Money value={summary.netResult} signed />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">A receber</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            <Money value={summary.pendingRevenue} />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Shows cadastrados</p>
          <p className="mt-1 text-2xl font-bold">{shows.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">A pagar</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            <Money value={summary.pendingExpenses} />
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline mensal */}
        <div className="card">
          <h2 className="mb-4 font-semibold">Últimos meses</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados financeiros ainda.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((t) => (
                <div key={t.month}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{t.month}</span>
                    <span>
                      <Money value={t.net} signed />
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${(t.revenue / maxNet) * 100}%` }}
                      />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-red-300"
                        style={{ width: `${(t.expenses / maxNet) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-1 text-xs text-slate-400">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Receitas
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-300" />
                  Despesas
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Próximos shows */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Próximos shows</h2>
            <Link href="/shows" className="text-sm text-brand-600">
              Ver todos →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum show agendado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <Link href={`/shows/${s.id}`} className="text-sm font-medium text-brand-700">
                    {s.title}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {formatDate(s.date)}
                    </span>
                  </Link>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Rentabilidade por show */}
      {topShows.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Rentabilidade por show</h2>
            <Link href="/shows" className="text-sm text-brand-600">
              Ver todos →
            </Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {topShows.map(({ show, pnl }) => (
                <tr key={show.id}>
                  <td className="py-2">
                    <Link href={`/shows/${show.id}`} className="font-medium text-brand-700">
                      {show.title}
                    </Link>
                  </td>
                  <td className="py-2 text-right text-slate-500">
                    cachê <Money value={pnl.feeAgreed} />
                  </td>
                  <td className="py-2 text-right">
                    <Money value={pnl.plannedResult} signed />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
