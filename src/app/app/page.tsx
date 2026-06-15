import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  computeTotals,
  summarizeByMonth,
  computeShowPnL,
  totalProfit,
  type TxLike,
} from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { StatCard } from "@/components/ui";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  formatDate,
  formatMonthKey,
} from "@/lib/labels";

export default async function DashboardPage() {
  const user = await requireUser();

  const [transactions, shows] = await Promise.all([
    db.transaction.findMany({ where: { userId: user.id } }),
    db.show.findMany({
      where: { userId: user.id },
      include: { transactions: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const txLike: TxLike[] = transactions.map((t) => ({
    type: t.type,
    amountCents: t.amountCents,
    category: t.category,
    date: t.date,
    status: t.status,
    showId: t.showId,
  }));

  const totals = computeTotals(txLike);
  const monthly = summarizeByMonth(txLike).slice(-6);

  const now = new Date();
  const upcoming = shows
    .filter((s) => s.date >= now && s.status !== "CANCELED" && s.status !== "COMPLETED")
    .slice(0, 5);

  // Rentabilidade dos shows realizados/confirmados.
  const pnls = shows
    .filter((s) => s.status !== "CANCELED")
    .map((s) =>
      computeShowPnL(
        { id: s.id, feeCents: s.feeCents, status: s.status },
        s.transactions.map((t) => ({
          type: t.type,
          amountCents: t.amountCents,
          category: t.category,
          date: t.date,
          status: t.status,
          showId: t.showId,
        }))
      )
    );
  const showsProfit = totalProfit(pnls);

  const maxMonth = Math.max(1, ...monthly.map((m) => Math.max(m.incomeCents, m.expenseCents)));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Olá, {user.name.split(" ")[0]} 👋
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo (receitas − despesas)"
          value={formatBRL(totals.balanceCents)}
          tone={totals.balanceCents >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="A receber"
          value={formatBRL(totals.pendingIncomeCents)}
          hint="Receitas pendentes"
        />
        <StatCard
          label="A pagar"
          value={formatBRL(totals.pendingExpenseCents)}
          hint="Despesas pendentes"
        />
        <StatCard
          label="Lucro em shows"
          value={formatBRL(showsProfit)}
          tone={showsProfit >= 0 ? "positive" : "negative"}
          hint="Cachê − despesas vinculadas"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold text-gray-900">Últimos meses</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-gray-500">Sem transações ainda.</p>
          ) : (
            <ul className="space-y-3">
              {monthly.map((m) => (
                <li key={m.month}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {formatMonthKey(m.month)}
                    </span>
                    <span
                      className={
                        m.balanceCents >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatBRL(m.balanceCents)}
                    </span>
                  </div>
                  <div className="flex h-2 gap-1">
                    <div
                      className="rounded-full bg-green-400"
                      style={{ width: `${(m.incomeCents / maxMonth) * 50}%` }}
                      title={`Receita: ${formatBRL(m.incomeCents)}`}
                    />
                    <div
                      className="rounded-full bg-red-300"
                      style={{ width: `${(m.expenseCents / maxMonth) * 50}%` }}
                      title={`Despesa: ${formatBRL(m.expenseCents)}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Próximos shows</h2>
            <Link href="/app/shows" className="text-sm font-medium text-brand-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum show futuro.{" "}
              <Link href="/app/shows/novo" className="text-brand-600 hover:underline">
                Adicionar
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/shows/${s.id}`}
                    className="flex items-center justify-between py-3 hover:opacity-80"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(s.date)}
                        {s.city ? ` · ${s.city}` : ""}
                      </p>
                    </div>
                    <span className={`badge ${SHOW_STATUS_COLORS[s.status]}`}>
                      {SHOW_STATUS_LABELS[s.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
