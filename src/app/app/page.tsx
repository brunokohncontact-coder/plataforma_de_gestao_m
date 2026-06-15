import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { summarize, aggregateByMonth, calcShowPnL } from "@/lib/finance";
import type { TransactionType, TransactionStatus } from "@/lib/enums";
import { formatBRL, formatDate, formatMonthLabel } from "@/lib/format";
import { ShowStatusBadge } from "@/components/badges";

export default async function DashboardPage() {
  const user = await requireUser();

  const [transactions, upcomingShows, recentShows] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id, date: { gte: startOfToday() }, status: { not: "cancelado" } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const txLike = transactions.map((t) => ({
    type: t.type as TransactionType,
    amount: t.amount,
    date: t.date,
    status: t.status as TransactionStatus,
    showId: t.showId,
  }));

  const summary = summarize(txLike);
  const months = aggregateByMonth(txLike).slice(-6);

  // Top shows por resultado (cachê − despesas vinculadas).
  const showPnls = recentShows
    .map((s) => ({ show: s, pnl: calcShowPnL({ id: s.id, fee: s.fee }, txLike) }))
    .sort((a, b) => b.pnl.result - a.pnl.result)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-600">Sua carreira em um relance.</p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receitas" value={formatBRL(summary.totalIncome)} tone="positive" />
        <StatCard label="Despesas" value={formatBRL(summary.totalExpense)} tone="negative" />
        <StatCard
          label="Resultado"
          value={formatBRL(summary.net)}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
        <StatCard label="A receber" value={formatBRL(summary.pendingIncome)} tone="neutral" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Próximos shows</h2>
            <Link href="/app/shows" className="text-sm font-medium text-brand-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {upcomingShows.length === 0 ? (
            <EmptyHint
              text="Nenhum show agendado."
              href="/app/shows/new"
              cta="Agendar show"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingShows.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/app/shows/${s.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {s.title || s.venue}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formatDate(s.date)} · {s.city}
                    </p>
                  </div>
                  <ShowStatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold text-slate-900">Resultado mensal</h2>
          {months.length === 0 ? (
            <EmptyHint
              text="Sem transações ainda."
              href="/app/financas/new"
              cta="Lançar transação"
            />
          ) : (
            <ul className="space-y-2">
              {months.map((m) => (
                <li key={m.month} className="flex items-center justify-between text-sm">
                  <span className="w-20 text-slate-600">{formatMonthLabel(m.month)}</span>
                  <div className="mx-3 h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${m.net >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{ width: barWidth(m.net, months) }}
                    />
                  </div>
                  <span
                    className={`w-28 text-right font-medium ${
                      m.net >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {formatBRL(m.net)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold text-slate-900">Shows mais rentáveis</h2>
        {showPnls.length === 0 ? (
          <EmptyHint text="Cadastre shows e vincule despesas para ver a rentabilidade." href="/app/shows/new" cta="Agendar show" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2">Show</th>
                  <th className="py-2 text-right">Cachê</th>
                  <th className="py-2 text-right">Despesas</th>
                  <th className="py-2 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {showPnls.map(({ show, pnl }) => (
                  <tr key={show.id} className="border-b border-slate-50">
                    <td className="py-2">
                      <Link
                        href={`/app/shows/${show.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {show.title || show.venue}
                      </Link>
                      <span className="ml-2 text-xs text-slate-400">{formatDate(show.date)}</span>
                    </td>
                    <td className="py-2 text-right">{formatBRL(pnl.agreedFee)}</td>
                    <td className="py-2 text-right text-red-600">{formatBRL(pnl.expenses)}</td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        pnl.result >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {formatBRL(pnl.result)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function EmptyHint({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      <Link href={href} className="btn-primary mt-3">
        {cta}
      </Link>
    </div>
  );
}

function barWidth(net: number, months: { net: number }[]): string {
  const max = Math.max(...months.map((m) => Math.abs(m.net)), 1);
  return `${Math.round((Math.abs(net) / max) * 100)}%`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
