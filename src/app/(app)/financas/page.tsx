import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { summarizeFinances, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/domain";
import { toggleReceivedAction, deleteTransactionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const user = await requireUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true } } },
  });

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));
  const summary = summarizeFinances(txs);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanças</h1>
        <Link href="/financas/nova" className="btn-primary">
          + Nova transação
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receitas" value={summary.totalIncome} tone="emerald" />
        <Stat label="Despesas" value={summary.totalExpense} tone="red" />
        <Stat label="Saldo" value={summary.balance} tone="brand" />
        <Stat label="Caixa realizado" value={summary.cashBalance} tone="gray" />
      </div>

      {(summary.pendingIncome > 0 || summary.pendingExpense > 0) && (
        <div className="flex flex-wrap gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summary.pendingIncome > 0 && (
            <span>A receber: <strong>{formatMoney(summary.pendingIncome)}</strong></span>
          )}
          {summary.pendingExpense > 0 && (
            <span>A pagar: <strong>{formatMoney(summary.pendingExpense)}</strong></span>
          )}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma transação registrada.</p>
          <Link href="/financas/nova" className="mt-3 inline-block text-brand-700 hover:underline">
            Registrar a primeira
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <ul className="divide-y divide-gray-100">
            {transactions.map((t) => {
              const isIncome = (t.type as TransactionType) === "INCOME";
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-xs text-gray-500">
                      {t.category} · {formatDate(t.date)}
                      {t.show ? (
                        <>
                          {" · "}
                          <Link href={`/shows/${t.show.id}`} className="text-brand-700 hover:underline">
                            {t.show.title}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {!t.received && (
                      <span className="badge bg-amber-100 text-amber-800">
                        {isIncome ? "A receber" : "A pagar"}
                      </span>
                    )}
                    <span className={isIncome ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                      {isIncome ? "+" : "−"}
                      {formatMoney(t.amount)}
                    </span>
                    <Link
                      href={`/financas/${t.id}/editar`}
                      title="Editar"
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      ✎
                    </Link>
                    <form action={toggleReceivedAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        title={t.received ? "Marcar como pendente" : "Marcar como concluído"}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        {t.received ? "↺" : "✓"}
                      </button>
                    </form>
                    <form action={deleteTransactionAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        title="Excluir"
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
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
  value: number;
  tone: "emerald" | "red" | "brand" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
    </div>
  );
}
