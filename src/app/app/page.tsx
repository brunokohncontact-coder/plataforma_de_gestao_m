import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { summarize, aggregateByMonth, computeShowPnL, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { SHOW_STATUS_BADGE, SHOW_STATUS_LABEL } from "@/lib/labels";

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({ where: { userId } }),
    prisma.show.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
    }),
  ]);

  const txLike: TxLike[] = transactions.map((t) => ({
    type: t.type,
    amountCents: t.amountCents,
    category: t.category,
    date: t.date,
    paid: t.paid,
    showId: t.showId,
  }));

  const summary = summarize(txLike);
  const months = aggregateByMonth(txLike);
  const now = new Date();

  const upcoming = shows.filter((s) => s.date >= now).slice(0, 5);

  // Rentabilidade por show (projetada), maiores primeiro.
  const showPnls = shows
    .map((s) => ({ show: s, pnl: computeShowPnL({ id: s.id, feeCents: s.feeCents, status: s.status }, txLike) }))
    .sort((a, b) => b.pnl.projectedProfitCents - a.pnl.projectedProfitCents);

  const maxAbs = Math.max(1, ...months.map((m) => Math.max(m.incomeCents, m.expenseCents)));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Painel</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Saldo realizado" value={formatMoney(summary.realizedNetCents)} hint="Recebido − pago" accent={summary.realizedNetCents >= 0 ? "pos" : "neg"} />
        <Stat label="A receber" value={formatMoney(summary.incomePendingCents)} hint="Receitas pendentes" />
        <Stat label="A pagar" value={formatMoney(summary.expensePendingCents)} hint="Despesas pendentes" />
        <Stat label="Saldo projetado" value={formatMoney(summary.netCents)} hint="Tudo (receb. + pend.)" accent={summary.netCents >= 0 ? "pos" : "neg"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Fluxo por mês</h2>
          {months.length === 0 ? (
            <Empty>Sem transações ainda.</Empty>
          ) : (
            <ul className="space-y-3">
              {months.map((m) => (
                <li key={m.month}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{m.month}</span>
                    <span className={m.netCents >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {formatMoney(m.netCents)}
                    </span>
                  </div>
                  <div className="flex h-2 gap-1">
                    <div className="rounded bg-emerald-400" style={{ width: `${(m.incomeCents / maxAbs) * 100}%` }} />
                    <div className="rounded bg-red-400" style={{ width: `${(m.expenseCents / maxAbs) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex gap-4 text-xs text-slate-500">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Receita</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />Despesa</span>
          </p>
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold">Rentabilidade por show</h2>
          {showPnls.length === 0 ? (
            <Empty>
              Nenhum show.{" "}
              <Link href="/app/shows" className="text-brand-600 hover:underline">
                Adicionar
              </Link>
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {showPnls.slice(0, 6).map(({ show, pnl }) => (
                <li key={show.id} className="flex items-center justify-between py-2">
                  <Link href={`/app/shows/${show.id}`} className="truncate pr-3 text-sm hover:underline">
                    {show.title}
                  </Link>
                  <span
                    className={`text-sm font-medium ${
                      pnl.projectedProfitCents >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(pnl.projectedProfitCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Próximos shows</h2>
          <Link href="/app/shows" className="text-sm text-brand-600 hover:underline">
            Ver todos
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Empty>Nenhum show futuro.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <Link href={`/app/shows/${s.id}`} className="font-medium hover:underline">
                    {s.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {formatDate(s.date)}
                    {s.city ? ` · ${s.city}` : ""}
                  </p>
                </div>
                <span className={`badge ${SHOW_STATUS_BADGE[s.status]}`}>{SHOW_STATUS_LABEL[s.status]}</span>
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
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "pos" | "neg";
}) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent === "pos" ? "text-emerald-600" : accent === "neg" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400">{children}</p>;
}
