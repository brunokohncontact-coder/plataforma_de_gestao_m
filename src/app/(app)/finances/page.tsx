import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { summarize } from "@/lib/finance";
import { deleteTransaction, toggleReceived } from "./actions";

export default async function FinancesPage() {
  const user = await requireUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true } } },
  });

  const s = summarize(transactions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanças</h1>
        <Link href="/finances/new" className="btn-primary">+ Lançar</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Receitas" value={formatCents(s.incomeCents)} className="text-green-600" />
        <SummaryCard label="Despesas" value={formatCents(s.expenseCents)} className="text-red-600" />
        <SummaryCard
          label="Saldo"
          value={formatCents(s.balanceCents)}
          className={s.balanceCents >= 0 ? "text-green-600" : "text-red-600"}
        />
        <SummaryCard label="A receber" value={formatCents(s.pendingIncomeCents)} className="text-amber-600" />
      </div>

      {transactions.length === 0 ? (
        <div className="card text-center text-slate-500">
          <p>Nenhuma transação ainda.</p>
          <Link href="/finances/new" className="mt-3 inline-block text-brand-600 hover:underline">
            Lançar a primeira
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {transactions.map((t) => (
            <li key={t.id} className="card flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.category}</span>
                  {t.type === "income" && !t.received && (
                    <span className="badge bg-amber-100 text-amber-800">a receber</span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">
                  {formatDate(t.date)}
                  {t.description ? ` · ${t.description}` : ""}
                  {t.show ? (
                    <>
                      {" · "}
                      <Link href={`/shows/${t.show.id}`} className="text-brand-600 hover:underline">
                        {t.show.title}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span className={`font-medium ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {t.type === "income" ? "+" : "−"}{formatCents(t.amountCents)}
                </span>
                {t.type === "income" && (
                  <form action={toggleReceived.bind(null, t.id)}>
                    <button type="submit" className="btn-secondary text-xs" title="Alternar recebido/a receber">
                      {t.received ? "✓" : "○"}
                    </button>
                  </form>
                )}
                <Link href={`/finances/${t.id}/edit`} className="btn-secondary text-xs">Editar</Link>
                <form action={deleteTransaction.bind(null, t.id)}>
                  <button type="submit" className="btn-danger text-xs">×</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
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
    <div className="card py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${className}`}>{value}</p>
    </div>
  );
}
