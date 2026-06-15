import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { formatDateTime, formatMonthKey } from "@/lib/dates";
import {
  summarize,
  aggregateByMonth,
  calcShowProfitability,
} from "@/lib/finance";
import { SHOW_STATUS_BADGE, SHOW_STATUS_LABELS } from "@/lib/labels";

export default async function DashboardPage() {
  const user = await requireUser();

  const [transactions, shows, upcoming] = await Promise.all([
    prisma.transaction.findMany({ where: { userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id },
      include: { transactions: true },
      orderBy: { date: "desc" },
    }),
    prisma.show.findMany({
      where: { userId: user.id, date: { gte: new Date() }, status: { not: "cancelled" } },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const s = summarize(transactions);
  const monthly = aggregateByMonth(transactions).slice(-6);
  const maxAbs = Math.max(
    1,
    ...monthly.map((m) => Math.max(m.incomeCents, m.expenseCents)),
  );

  // Rentabilidade por show (somente os com cachê ou transações), top por resultado.
  const profitability = shows
    .map((show) =>
      calcShowProfitability(
        { id: show.id, feeCents: show.feeCents, status: show.status },
        show.transactions,
      ),
    )
    .filter((p) => p.grossCents !== 0 || p.linkedExpenseCents !== 0);

  const showTitle = new Map(shows.map((sh) => [sh.id, sh.title]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Olá, {user.artistName}</h1>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Receitas" value={formatCents(s.incomeCents)} className="text-green-600" />
        <Stat label="Despesas" value={formatCents(s.expenseCents)} className="text-red-600" />
        <Stat
          label="Saldo"
          value={formatCents(s.balanceCents)}
          className={s.balanceCents >= 0 ? "text-green-600" : "text-red-600"}
        />
        <Stat label="A receber" value={formatCents(s.pendingIncomeCents)} className="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos shows */}
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos shows</h2>
            <Link href="/shows" className="text-sm text-brand-600 hover:underline">ver todos</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum show futuro. <Link href="/shows/new" className="text-brand-600 hover:underline">Cadastrar</Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((show) => (
                <li key={show.id}>
                  <Link href={`/shows/${show.id}`} className="flex items-center justify-between rounded-md p-2 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{show.title}</span>
                        <span className={`badge ${SHOW_STATUS_BADGE[show.status] ?? ""}`}>
                          {SHOW_STATUS_LABELS[show.status] ?? show.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">{formatDateTime(show.date)}</p>
                    </div>
                    <span className="ml-2 shrink-0 text-sm text-slate-600">{formatCents(show.feeCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fluxo mensal */}
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Fluxo dos últimos meses</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-slate-500">Sem lançamentos ainda.</p>
          ) : (
            <ul className="space-y-3">
              {monthly.map((m) => (
                <li key={m.month}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{formatMonthKey(m.month)}</span>
                    <span className={m.balanceCents >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCents(m.balanceCents)}
                    </span>
                  </div>
                  <div className="flex h-2 gap-1">
                    <div className="h-2 rounded bg-green-400" style={{ width: `${(m.incomeCents / maxAbs) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex h-2 gap-1">
                    <div className="h-2 rounded bg-red-400" style={{ width: `${(m.expenseCents / maxAbs) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">
            <span className="text-green-600">■</span> receitas{" "}
            <span className="text-red-600">■</span> despesas
          </p>
        </section>
      </div>

      {/* Rentabilidade por show */}
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Rentabilidade por show</h2>
        {profitability.length === 0 ? (
          <p className="text-sm text-slate-500">
            Cadastre shows com cachê e vincule despesas para ver a rentabilidade.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {profitability.map((p) => (
              <li key={p.showId} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/shows/${p.showId}`} className="truncate text-brand-600 hover:underline">
                  {showTitle.get(p.showId)}
                </Link>
                <span className="ml-3 shrink-0 text-slate-500">
                  {formatCents(p.grossCents)} − {formatCents(p.linkedExpenseCents)} ={" "}
                  <span className={`font-semibold ${p.netCents >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCents(p.netCents)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="card py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}
