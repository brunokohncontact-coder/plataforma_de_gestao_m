import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { summarize, totalsByMonth, profitByShow } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { formatDate, formatMonth } from "@/lib/format";
import { ShowStatusBadge } from "@/components/badges";

export default async function DashboardPage() {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
  ]);

  const summary = summarize(transactions);
  const byMonth = totalsByMonth(transactions).slice(-6);
  const profits = profitByShow(shows, transactions);

  const now = new Date();
  const upcoming = shows
    .filter((s) => s.date >= now && s.status !== "CANCELLED")
    .slice(0, 5);

  const topShows = profits.filter((p) => p.netCents !== 0).slice(0, 5);
  const maxAbs = Math.max(1, ...byMonth.map((m) => Math.max(m.incomeCents, m.expenseCents)));

  const isEmpty = shows.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Olá, {user.artistName || user.name} 👋</h1>
        <div className="flex gap-2">
          <Link href="/shows/new" className="btn-primary">
            + Show
          </Link>
          <Link href="/financas/new" className="btn-secondary">
            + Transação
          </Link>
        </div>
      </div>

      {isEmpty && (
        <div className="card text-center">
          <p className="text-slate-600">
            Bem-vindo ao Palco! Comece criando seu primeiro{" "}
            <Link href="/shows/new" className="font-medium text-brand-600">
              show
            </Link>{" "}
            ou{" "}
            <Link href="/financas/new" className="font-medium text-brand-600">
              transação
            </Link>
            .
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Receitas" value={formatCents(summary.incomeCents)} tone="green" />
        <Kpi label="Despesas" value={formatCents(summary.expenseCents)} tone="red" />
        <Kpi
          label="Saldo"
          value={formatCents(summary.balanceCents)}
          tone={summary.balanceCents >= 0 ? "green" : "red"}
        />
        <Kpi
          label="A receber"
          value={formatCents(summary.pendingIncomeCents)}
          tone="amber"
          sub={
            summary.pendingExpenseCents > 0
              ? `A pagar: ${formatCents(summary.pendingExpenseCents)}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos shows */}
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximos shows</h2>
            <Link href="/shows" className="text-sm text-brand-600">
              Ver todos
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum show futuro agendado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <Link href={`/shows/${s.id}`} className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(s.date)}
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                  </Link>
                  <ShowStatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Lucro por show */}
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Lucro por show</h2>
            <Link href="/shows" className="text-sm text-brand-600">
              Detalhes
            </Link>
          </div>
          {topShows.length === 0 ? (
            <p className="text-sm text-slate-500">
              Vincule despesas aos shows para ver a rentabilidade.
            </p>
          ) : (
            <ul className="space-y-2">
              {topShows.map((p) => {
                const show = shows.find((s) => s.id === p.showId)!;
                return (
                  <li key={p.showId} className="flex items-center justify-between">
                    <Link href={`/shows/${p.showId}`} className="truncate text-sm">
                      {show.title}
                    </Link>
                    <span
                      className={`text-sm font-medium ${
                        p.netCents >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCents(p.netCents)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Fluxo mensal */}
      {byMonth.length > 0 && (
        <section className="card">
          <h2 className="mb-4 font-semibold">Receitas x Despesas (últimos meses)</h2>
          <div className="space-y-3">
            {byMonth.map((m) => (
              <div key={m.month}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{formatMonth(m.month)}</span>
                  <span
                    className={
                      m.balanceCents >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatCents(m.balanceCents)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <div
                    className="h-3 rounded bg-green-400"
                    style={{ width: `${(m.incomeCents / maxAbs) * 50}%` }}
                    title={`Receita: ${formatCents(m.incomeCents)}`}
                  />
                  <div
                    className="h-3 rounded bg-red-400"
                    style={{ width: `${(m.expenseCents / maxAbs) * 50}%` }}
                    title={`Despesa: ${formatCents(m.expenseCents)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "amber";
  sub?: string;
}) {
  const toneClass = {
    green: "text-green-600",
    red: "text-red-600",
    amber: "text-amber-600",
  }[tone];
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
