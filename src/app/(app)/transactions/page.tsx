import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import { financeSummary, totalsByCategory } from "@/lib/finance";
import { TRANSACTION_TYPE_LABELS } from "@/lib/enums";
import {
  PageHeader,
  LinkButton,
  StatCard,
  EmptyState,
} from "@/components/ui";
import { deleteTransaction, toggleSettled } from "./actions";

export default async function TransactionsPage() {
  const user = await requireUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { title: true } } },
  });

  const summary = financeSummary(transactions);
  const categories = totalsByCategory(transactions).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Finanças"
        subtitle="Receitas, despesas e contas a receber/pagar."
        action={
          <LinkButton href="/transactions/new">+ Novo lançamento</LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receitas" value={formatBRL(summary.income)} tone="positive" />
        <StatCard label="Despesas" value={formatBRL(summary.expenses)} tone="negative" />
        <StatCard
          label="Saldo"
          value={formatBRL(summary.net)}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="A receber / a pagar"
          value={formatBRL(summary.receivable)}
          hint={`A pagar: ${formatBRL(summary.payable)}`}
        />
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento"
          description="Registre receitas e despesas para acompanhar o financeiro da sua carreira."
          action={<LinkButton href="/transactions/new">+ Novo lançamento</LinkButton>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.category}</div>
                        <div className="text-xs text-slate-400">
                          {TRANSACTION_TYPE_LABELS[t.type as "INCOME" | "EXPENSE"]}
                          {t.show && ` · ${t.show.title}`}
                          {!t.settled && (
                            <span className="ml-1 text-amber-600">· pendente</span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "−"}
                        {formatBRL(t.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <form action={toggleSettled}>
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                              title={t.settled ? "Marcar como pendente" : "Marcar como liquidado"}
                            >
                              {t.settled ? "✓" : "○"}
                            </button>
                          </form>
                          <form action={deleteTransaction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                              title="Excluir"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card h-fit">
            <h2 className="mb-3 font-semibold">Por categoria</h2>
            <ul className="space-y-2 text-sm">
              {categories.map((c) => (
                <li
                  key={`${c.type}:${c.category}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-slate-600">{c.category}</span>
                  <span
                    className={
                      c.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                    }
                  >
                    {formatBRL(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
