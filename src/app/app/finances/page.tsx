import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { summarize, aggregateByCategory, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { togglePaid, deleteTransaction } from "./actions";

export default async function FinancesPage() {
  const userId = await requireUserId();
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true } } },
  });

  const txLike: TxLike[] = transactions.map((t) => ({
    type: t.type,
    amountCents: t.amountCents,
    category: t.category,
    date: t.date,
    paid: t.paid,
    showId: t.showId,
  }));
  const summary = summarize(txLike);
  const topExpenses = aggregateByCategory(txLike, "EXPENSE").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanças</h1>
        <Link href="/app/finances/new" className="btn-primary">
          Nova transação
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receitas" value={formatMoney(summary.incomeTotalCents)} tone="pos" />
        <Stat label="Despesas" value={formatMoney(summary.expenseTotalCents)} tone="neg" />
        <Stat label="A receber" value={formatMoney(summary.incomePendingCents)} />
        <Stat label="Saldo realizado" value={formatMoney(summary.realizedNetCents)} tone={summary.realizedNetCents >= 0 ? "pos" : "neg"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold">Transações</h2>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma transação.{" "}
              <Link href="/app/finances/new" className="text-brand-600 hover:underline">
                Adicionar
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t.category}
                      {t.description ? <span className="font-normal text-slate-500"> · {t.description}</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(t.date)}
                      {t.show ? (
                        <>
                          {" · "}
                          <Link href={`/app/shows/${t.show.id}`} className="text-brand-600 hover:underline">
                            {t.show.title}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatMoney(t.amountCents)}
                    </span>
                    <form action={togglePaid}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className={`badge ${
                          t.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                        title="Alternar pago/pendente"
                      >
                        {t.paid ? "pago" : "pendente"}
                      </button>
                    </form>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="text-slate-300 hover:text-red-500" title="Excluir">
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="card">
          <h2 className="mb-4 font-semibold">Maiores despesas</h2>
          {topExpenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Sem despesas.</p>
          ) : (
            <ul className="space-y-2">
              {topExpenses.map((c) => (
                <li key={c.category} className="flex justify-between text-sm">
                  <span className="text-slate-600">{c.category}</span>
                  <span className="font-medium tabular-nums">{formatMoney(c.totalCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
