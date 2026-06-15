import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  summarizeTransactions,
  groupByMonth,
  groupByCategory,
  type TxLike,
} from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";
import { formatDate, formatMonthKey } from "@/lib/format";
import { TransactionForm } from "@/components/TransactionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  deleteTransactionAction,
  toggleReceivedAction,
} from "@/app/actions/transactions";

export default async function FinancesPage() {
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

  const txData: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const summary = summarizeTransactions(txData);
  const months = groupByMonth(txData).slice(-6).reverse();
  const expenseByCat = groupByCategory(txData, "EXPENSE").slice(0, 6);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finanças</h1>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Receitas" value={formatBRL(summary.totalIncome)} className="text-green-600" />
        <SummaryCard label="Despesas" value={formatBRL(summary.totalExpense)} className="text-red-600" />
        <SummaryCard
          label="Saldo"
          value={formatBRL(summary.balance)}
          className={summary.balance >= 0 ? "text-green-600" : "text-red-600"}
        />
        <SummaryCard label="A receber" value={formatBRL(summary.pendingIncome)} className="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lançar */}
        <div className="card lg:order-last">
          <h2 className="mb-3 font-semibold">Novo lançamento</h2>
          <TransactionForm shows={shows} />
        </div>

        {/* Listas */}
        <div className="space-y-6 lg:col-span-2">
          {months.length > 0 && (
            <div className="card">
              <h2 className="mb-3 font-semibold">Por mês</h2>
              <ul className="space-y-1 text-sm">
                {months.map((m) => (
                  <li key={m.month} className="flex justify-between border-b border-slate-100 py-1 last:border-0">
                    <span className="capitalize text-slate-600">{formatMonthKey(m.month)}</span>
                    <span className="flex gap-4">
                      <span className="text-green-600">{formatBRL(m.income)}</span>
                      <span className="text-red-600">{formatBRL(m.expense)}</span>
                      <span className={`font-medium ${m.net >= 0 ? "text-slate-900" : "text-red-600"}`}>
                        {formatBRL(m.net)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {expenseByCat.length > 0 && (
            <div className="card">
              <h2 className="mb-3 font-semibold">Maiores despesas por categoria</h2>
              <ul className="space-y-1 text-sm">
                {expenseByCat.map((c) => (
                  <li key={c.category} className="flex justify-between">
                    <span className="text-slate-600">{c.category}</span>
                    <span className="text-red-600">{formatBRL(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-3 font-semibold">Todos os lançamentos</h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum lançamento ainda.</p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className={t.type === "INCOME" ? "text-green-600" : "text-red-600"}>
                        {t.type === "INCOME" ? "+" : "−"}
                        {formatBRL(t.amount)}
                      </span>{" "}
                      <span className="text-slate-700">{t.category}</span>
                      <span className="block text-xs text-slate-400">
                        {formatDate(t.date)}
                        {t.show ? (
                          <>
                            {" · "}
                            <Link href={`/shows/${t.show.id}`} className="text-brand hover:underline">
                              {t.show.title}
                            </Link>
                          </>
                        ) : null}
                        {t.note ? ` · ${t.note}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={toggleReceivedAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className={`badge ${t.received ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                          title="Alternar status"
                        >
                          {t.received
                            ? t.type === "INCOME"
                              ? "Recebido"
                              : "Pago"
                            : "Pendente"}
                        </button>
                      </form>
                      <form action={deleteTransactionAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmButton
                          message="Excluir esta transação?"
                          className="text-xs text-red-500 hover:underline"
                        >
                          excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}
