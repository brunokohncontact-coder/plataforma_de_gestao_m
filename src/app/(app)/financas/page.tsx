import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  computeFinancialSummary,
  computeCategoryBreakdown,
} from "@/lib/domain/finance";
import { TRANSACTION_CATEGORY_LABELS } from "@/lib/domain/constants";
import { Money, EmptyState, formatDate, toDateInputValue } from "@/components/ui";
import { Dialog } from "@/components/Dialog";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteTransaction } from "./actions";
import { ToggleReceived } from "@/components/ToggleReceived";

export default async function FinancasPage() {
  const user = await requireUser();
  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      include: { show: { select: { id: true, title: true } } },
    }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  const summary = computeFinancialSummary(transactions);
  const breakdown = computeCategoryBreakdown(transactions);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanças</h1>
          <p className="text-sm text-slate-500">
            Receitas, despesas e o que está por receber.
          </p>
        </div>
        <Dialog title="Nova transação" triggerLabel="+ Nova transação">
          <TransactionForm shows={shows} />
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Receitas (recebidas)</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">
            <Money value={summary.totalRevenue} />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Despesas (pagas)</p>
          <p className="mt-1 text-xl font-semibold text-red-600">
            <Money value={summary.totalExpenses} />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Resultado</p>
          <p className="mt-1 text-xl font-semibold">
            <Money value={summary.netResult} signed />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">A receber</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">
            <Money value={summary.pendingRevenue} />
          </p>
          {summary.pendingExpenses > 0 && (
            <p className="text-xs text-slate-400">
              <Money value={summary.pendingExpenses} /> a pagar
            </p>
          )}
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="card">
          <p className="mb-3 text-xs uppercase text-slate-400">Por categoria</p>
          <div className="flex flex-wrap gap-2">
            {breakdown.map((b) => (
              <span
                key={`${b.type}-${b.category}`}
                className={`badge ${
                  b.type === "receita"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {TRANSACTION_CATEGORY_LABELS[
                  b.category as keyof typeof TRANSACTION_CATEGORY_LABELS
                ] ?? b.category}
                : <Money value={b.total} className="ml-1" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {transactions.length === 0 ? (
        <EmptyState
          title="Nenhuma transação ainda"
          hint="Registre uma receita ou despesa para começar a acompanhar suas finanças."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Descrição</th>
                <th className="hidden px-4 py-3 sm:table-cell">Data</th>
                <th className="hidden px-4 py-3 md:table-cell">Show</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {t.description ||
                        TRANSACTION_CATEGORY_LABELS[
                          t.category as keyof typeof TRANSACTION_CATEGORY_LABELS
                        ] ||
                        t.category}
                    </div>
                    <div className="text-xs text-slate-400">
                      {TRANSACTION_CATEGORY_LABELS[
                        t.category as keyof typeof TRANSACTION_CATEGORY_LABELS
                      ] ?? t.category}
                      {!t.received && (
                        <span className="ml-1 text-amber-600">· pendente</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {formatDate(t.date)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {t.show?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Money
                      value={t.type === "despesa" ? -t.amount : t.amount}
                      signed
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ToggleReceived
                        id={t.id}
                        received={t.received}
                        type={t.type}
                      />
                      <Dialog
                        title="Editar transação"
                        triggerLabel="Editar"
                        triggerClassName="btn-secondary px-2 py-1 text-xs"
                      >
                        <TransactionForm
                          shows={shows}
                          initial={{
                            id: t.id,
                            type: t.type,
                            amount: t.amount,
                            category: t.category,
                            description: t.description,
                            date: toDateInputValue(t.date),
                            received: t.received,
                            showId: t.showId,
                          }}
                        />
                      </Dialog>
                      <DeleteButton
                        action={deleteTransaction.bind(null, t.id)}
                        label="✕"
                        className="btn-danger px-2 py-1 text-xs"
                      />
                    </div>
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
