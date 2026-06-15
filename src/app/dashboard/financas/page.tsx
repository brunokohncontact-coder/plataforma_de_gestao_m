import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWorkspaceTransactions, getWorkspaceTransactionsForCalc } from "@/lib/queries";
import { overallTotals, receivablesSummary, categoryBreakdown } from "@/lib/finance";
import { formatBRL, formatDate } from "@/lib/money";
import { Badge, Button, Card } from "@/components/ui";
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type TransactionStatus,
  type TransactionType,
} from "@/lib/domain";
import { deleteTransaction } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";

export default async function FinancasPage() {
  const user = await requireUser();
  const [txs, calcTxs] = await Promise.all([
    getWorkspaceTransactions(user.workspaceId),
    getWorkspaceTransactionsForCalc(user.workspaceId),
  ]);

  const totals = overallTotals(calcTxs);
  const recv = receivablesSummary(calcTxs);
  const byCategory = categoryBreakdown(calcTxs).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanças</h1>
        <Link href="/dashboard/financas/nova">
          <Button>+ Nova transação</Button>
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Receitas</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatBRL(totals.income)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Despesas</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatBRL(totals.expense)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">A receber</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(recv.pendingIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">A pagar</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(recv.pendingExpense)}</p>
        </Card>
      </section>

      {byCategory.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Por categoria</h2>
          <div className="flex flex-wrap gap-2">
            {byCategory.map((c) => (
              <span
                key={`${c.type}-${c.category}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <span className="text-slate-500">{c.category}: </span>
                <span className={c.type === "income" ? "text-emerald-600" : "text-red-600"}>
                  {formatBRL(c.total)}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Lançamentos</h2>
        {txs.length === 0 ? (
          <Card>
            <p className="text-slate-600">Nenhuma transação lançada ainda.</p>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Descrição</th>
                  <th className="p-3 font-medium">Categoria</th>
                  <th className="p-3 font-medium">Show</th>
                  <th className="p-3 font-medium">Situação</th>
                  <th className="p-3 text-right font-medium">Valor</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap p-3 text-slate-500">{formatDate(t.date)}</td>
                    <td className="p-3 font-medium">
                      {t.description || TRANSACTION_TYPE_LABELS[t.type as TransactionType]}
                    </td>
                    <td className="p-3 text-slate-600">{t.category}</td>
                    <td className="p-3 text-slate-600">
                      {t.show ? (
                        <Link href={`/dashboard/shows/${t.show.id}`} className="text-brand-600 hover:underline">
                          {t.show.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        value={t.status}
                        label={TRANSACTION_STATUS_LABELS[t.status as TransactionStatus]}
                      />
                    </td>
                    <td
                      className={
                        "whitespace-nowrap p-3 text-right font-medium " +
                        (t.type === "income" ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatBRL(t.amount)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/financas/${t.id}/editar`}
                          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Editar
                        </Link>
                        <form action={deleteTransaction.bind(null, t.id)}>
                          <DeleteButton label="Excluir" compact confirmText="Excluir esta transação?" />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
