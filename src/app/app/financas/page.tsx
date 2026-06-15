import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { summarize, aggregateByCategory } from "@/lib/finance";
import type { TransactionType, TransactionStatus } from "@/lib/enums";
import { formatBRL, formatDate } from "@/lib/format";
import { TxStatusBadge } from "@/components/badges";
import { DeleteButton } from "@/components/DeleteButton";
import {
  deleteTransactionAction,
  toggleTransactionStatusAction,
} from "@/app/actions/transactions";

export default async function FinancasPage() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true, venue: true } } },
  });

  const txLike = transactions.map((t) => ({
    type: t.type as TransactionType,
    amount: t.amount,
    date: t.date,
    category: t.category,
    status: t.status as TransactionStatus,
    showId: t.showId,
  }));

  const summary = summarize(txLike);
  const expenseByCategory = aggregateByCategory(txLike, "expense").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finanças</h1>
          <p className="mt-1 text-sm text-slate-600">Receitas, despesas e contas a receber.</p>
        </div>
        <Link href="/app/financas/new" className="btn-primary">
          + Nova transação
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receitas" value={formatBRL(summary.totalIncome)} tone="positive" />
        <Stat label="Despesas" value={formatBRL(summary.totalExpense)} tone="negative" />
        <Stat
          label="Resultado"
          value={formatBRL(summary.net)}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
        <Stat label="A receber" value={formatBRL(summary.pendingIncome)} tone="neutral" />
      </section>

      {expenseByCategory.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold text-slate-900">Despesas por categoria</h2>
          <ul className="space-y-2">
            {expenseByCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between text-sm">
                <span className="w-40 text-slate-600">{c.category}</span>
                <div className="mx-3 h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-red-400"
                    style={{
                      width: `${Math.round(
                        (c.total / Math.max(...expenseByCategory.map((x) => x.total), 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="w-28 text-right font-medium text-slate-700">
                  {formatBRL(c.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {transactions.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-slate-500">Nenhuma transação registrada ainda.</p>
          <Link href="/app/financas/new" className="btn-primary mt-4">
            Lançar primeira transação
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/financas/${t.id}/edit`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {t.category}
                    </Link>
                    {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.show ? (
                      <Link href={`/app/shows/${t.show.id}`} className="hover:text-brand-700">
                        {t.show.title || t.show.venue}
                      </Link>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleTransactionStatusAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" title="Alternar status">
                        <TxStatusBadge status={t.status} />
                      </button>
                    </form>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      t.type === "income" ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatBRL(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton
                      action={deleteTransactionAction}
                      id={t.id}
                      confirmText="Excluir esta transação?"
                    />
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

function Stat({
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
