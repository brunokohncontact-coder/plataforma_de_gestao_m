import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import {
  computeTotals,
  summarizeByCategory,
  type TxLike,
} from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import {
  PAYMENT_STATUS_LABELS,
  formatDate,
} from "@/lib/labels";
import {
  deleteTransactionAction,
  toggleTransactionStatusAction,
} from "@/app/actions/transactions";

export default async function FinancasPage() {
  const user = await requireUser();
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true } } },
  });

  const txLike: TxLike[] = transactions.map((t) => ({
    type: t.type,
    amountCents: t.amountCents,
    category: t.category,
    date: t.date,
    status: t.status,
    showId: t.showId,
  }));
  const totals = computeTotals(txLike);
  const byCategory = summarizeByCategory(txLike).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Finanças"
        subtitle="Receitas e despesas, com contas a receber sempre à vista."
        action={{ href: "/app/financas/nova", label: "+ Nova transação" }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receitas" value={formatBRL(totals.incomeCents)} tone="positive" />
        <StatCard label="Despesas" value={formatBRL(totals.expenseCents)} tone="negative" />
        <StatCard
          label="Saldo"
          value={formatBRL(totals.balanceCents)}
          tone={totals.balanceCents >= 0 ? "positive" : "negative"}
        />
        <StatCard label="A receber" value={formatBRL(totals.pendingIncomeCents)} hint="Pendentes" />
      </div>

      {byCategory.length > 0 && (
        <div className="card mt-6">
          <h2 className="mb-3 font-semibold text-gray-900">Por categoria</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byCategory.map((c) => (
              <li key={`${c.type}-${c.category}`} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-700">{c.category}</span>
                <span className={c.type === "INCOME" ? "text-green-600" : "text-red-600"}>
                  {formatBRL(c.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-3 mt-8 font-semibold text-gray-900">Transações</h2>
      {transactions.length === 0 ? (
        <EmptyState
          title="Nenhuma transação"
          description="Registre receitas e despesas para acompanhar a saúde financeira da sua carreira."
          action={{ href: "/app/financas/nova", label: "+ Nova transação" }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Categoria</th>
                <th className="hidden px-4 py-3 sm:table-cell">Data</th>
                <th className="hidden px-4 py-3 md:table-cell">Show</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => {
                const toggle = toggleTransactionStatusAction.bind(null, t.id);
                const del = deleteTransactionAction.bind(null, t.id);
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.category}</p>
                      {t.description && (
                        <p className="text-xs text-gray-500">{t.description}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                      {formatDate(t.date)}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {t.show ? (
                        <Link href={`/app/shows/${t.show.id}`} className="text-brand-600 hover:underline">
                          {t.show.title}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={toggle}>
                        <button
                          type="submit"
                          className={`badge ${t.status === "SETTLED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                          title="Clique para alternar"
                        >
                          {PAYMENT_STATUS_LABELS[t.status]}
                        </button>
                      </form>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${t.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatBRL(t.amountCents)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/app/financas/${t.id}/editar`} className="text-xs text-gray-500 hover:text-brand-600">
                          Editar
                        </Link>
                        <DeleteButton
                          action={del}
                          label="Excluir"
                          className="text-xs text-gray-500 hover:text-red-600"
                          confirmText="Excluir esta transação?"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
