import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { summarize, totalsByCategory } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/enums";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  deleteTransactionAction,
  toggleSettledAction,
} from "@/app/actions/transactions";

export default async function FinancasPage() {
  const user = await requireUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true } } },
  });

  const summary = summarize(transactions);
  const byCategory = totalsByCategory(transactions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanças</h1>
        <Link href="/financas/new" className="btn-primary">
          + Transação
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Receitas</p>
          <p className="mt-1 text-xl font-bold text-green-600">
            {formatCents(summary.incomeCents)}
          </p>
          {summary.pendingIncomeCents > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              {formatCents(summary.pendingIncomeCents)} a receber
            </p>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Despesas</p>
          <p className="mt-1 text-xl font-bold text-red-600">
            {formatCents(summary.expenseCents)}
          </p>
          {summary.pendingExpenseCents > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              {formatCents(summary.pendingExpenseCents)} a pagar
            </p>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Saldo</p>
          <p
            className={`mt-1 text-xl font-bold ${
              summary.balanceCents >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCents(summary.balanceCents)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Transações</h2>
          {transactions.length === 0 ? (
            <div className="card text-center text-slate-500">
              Nenhuma transação.{" "}
              <Link href="/financas/new" className="font-medium text-brand-600">
                Lance a primeira
              </Link>
              .
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.category}</p>
                        <p className="text-xs text-slate-400">
                          {formatDate(t.date)}
                          {t.description ? ` · ${t.description}` : ""}
                          {t.show ? (
                            <>
                              {" · "}
                              <Link
                                href={`/shows/${t.show.id}`}
                                className="text-brand-600"
                              >
                                {t.show.title}
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <form action={toggleSettledAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            className={`badge ${
                              t.settled
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                            title="Alternar status"
                          >
                            {t.settled
                              ? t.type === "INCOME"
                                ? "Recebido"
                                : "Pago"
                              : "Pendente"}
                          </button>
                        </form>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          t.type === "INCOME" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "−"}{" "}
                        {formatCents(t.amountCents)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/financas/${t.id}/edit`}
                            className="text-xs text-slate-400 hover:text-brand-600"
                          >
                            editar
                          </Link>
                          <form action={deleteTransactionAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <ConfirmButton
                              confirmMessage="Excluir esta transação?"
                              className="text-xs text-slate-400 hover:text-red-600"
                            >
                              excluir
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Por categoria</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-500">Sem dados.</p>
          ) : (
            <div className="card space-y-2">
              {byCategory.map((c) => (
                <div
                  key={`${c.type}-${c.category}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">
                    {c.category}
                    <span className="ml-1 text-xs text-slate-400">
                      ({TRANSACTION_TYPE_LABELS[c.type]})
                    </span>
                  </span>
                  <span
                    className={
                      c.type === "INCOME" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatCents(c.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
