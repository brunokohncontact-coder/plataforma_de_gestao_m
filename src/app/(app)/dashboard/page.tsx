import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { financialSummary, monthlyBreakdown } from "@/lib/finance";
import { formatMoney, formatMonthKey, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.findMany({ where: { userId: user.id } }),
  ]);

  const summary = financialSummary(transactions, shows);
  const months = monthlyBreakdown(transactions, shows);

  const now = new Date();
  const upcoming = shows
    .filter((s) => s.status !== "CANCELLED" && s.date >= now)
    .slice(0, 5);

  const isEmpty = shows.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel</h1>
        <p className="text-slate-500">
          Olá, {user.artistName || user.name}. Visão geral da sua carreira.
        </p>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Saldo previsto" value={summary.balance} accent />
            <StatCard label="Recebido" value={summary.receivedIncome} />
            <StatCard label="A receber" value={summary.pendingIncome} muted />
            <StatCard label="Despesas" value={summary.totalExpense} negative />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="Receitas por categoria">
              <CategoryList items={summary.incomeByCategory} />
            </Card>
            <Card title="Despesas por categoria">
              <CategoryList items={summary.expenseByCategory} />
            </Card>
          </section>

          {months.length > 0 && (
            <Card title="Resultado mensal">
              <div className="space-y-2">
                {months.map((m) => (
                  <div key={m.month} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-slate-500">
                      {formatMonthKey(m.month)}
                    </span>
                    <MonthBar income={m.income} expense={m.expense} />
                    <span
                      className={`w-28 text-right font-medium ${
                        m.balance >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatMoney(m.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Próximos shows">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum show futuro agendado.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{s.title}</p>
                      <p className="text-slate-500">
                        {formatDate(s.date)}
                        {s.city ? ` · ${s.city}` : ""}
                      </p>
                    </div>
                    <span className="font-medium text-slate-700">
                      {formatMoney(s.fee)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">
        Tudo começa com um show
      </h2>
      <p className="mx-auto mt-2 max-w-md text-slate-500">
        Cadastre seus shows e transações para ver agenda, finanças e a
        rentabilidade de cada apresentação aqui.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/shows"
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
        >
          Adicionar show
        </Link>
        <Link
          href="/financas"
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Adicionar transação
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  muted,
  negative,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
  negative?: boolean;
}) {
  const color = accent
    ? value >= 0
      ? "text-emerald-600"
      : "text-red-600"
    : negative
      ? "text-red-600"
      : muted
        ? "text-amber-600"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{formatMoney(value)}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function CategoryList({
  items,
}: {
  items: { category: string; total: number }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados ainda.</p>;
  }
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.category} className="flex justify-between">
          <span className="text-slate-600">{i.category}</span>
          <span className="font-medium text-slate-900">
            {formatMoney(i.total)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MonthBar({ income, expense }: { income: number; expense: number }) {
  const max = Math.max(income, expense, 1);
  return (
    <div className="flex-1 space-y-1">
      <div className="h-2 rounded bg-slate-100">
        <div
          className="h-2 rounded bg-emerald-500"
          style={{ width: `${(income / max) * 100}%` }}
        />
      </div>
      <div className="h-2 rounded bg-slate-100">
        <div
          className="h-2 rounded bg-red-400"
          style={{ width: `${(expense / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
