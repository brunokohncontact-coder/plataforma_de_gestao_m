import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  summarizeTransactions,
  computeShowPnL,
  type TxLike,
} from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
    }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      include: { transactions: true },
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

  const upcoming = shows
    .filter((s) => s.date >= now && s.status !== "CANCELED")
    .slice(0, 5);

  // Rentabilidade dos shows já realizados.
  const completed = shows.filter((s) => s.status === "COMPLETED");
  const completedPnL = completed.map((s) => ({
    show: s,
    pnl: computeShowPnL(s, s.transactions),
  }));
  const totalShowProfit = completedPnL.reduce((acc, x) => acc + x.pnl.netResult, 0);
  const bestShow = [...completedPnL].sort((a, b) => b.pnl.netResult - a.pnl.netResult)[0];

  const empty = shows.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Olá{user.name ? `, ${user.name}` : ""} 👋
        </h1>
      </div>

      {empty ? (
        <div className="card">
          <h2 className="mb-2 font-semibold">Bem-vindo ao Palco</h2>
          <p className="mb-4 text-sm text-slate-600">
            Comece cadastrando seus shows e lançando suas receitas e despesas. O Palco
            calcula a rentabilidade de cada show e mostra para onde vai o seu dinheiro.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/shows/new" className="btn-primary">
              Cadastrar um show
            </Link>
            <Link href="/finances" className="btn-secondary">
              Lançar finanças
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Saldo geral" value={formatBRL(summary.balance)} className={summary.balance >= 0 ? "text-green-600" : "text-red-600"} />
            <Stat label="A receber" value={formatBRL(summary.pendingIncome)} className="text-amber-600" />
            <Stat label="Lucro em shows" value={formatBRL(totalShowProfit)} className={totalShowProfit >= 0 ? "text-green-600" : "text-red-600"} />
            <Stat label="Shows realizados" value={String(completed.length)} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Próximos shows</h2>
                <Link href="/shows" className="text-sm text-brand hover:underline">
                  ver todos
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum show futuro.{" "}
                  <Link href="/shows/new" className="text-brand hover:underline">
                    Cadastrar
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/shows/${s.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand/40"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{s.title}</span>
                          <StatusBadge status={s.status} />
                        </span>
                        <span className="text-slate-500">{formatDate(s.date)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold">Rentabilidade</h2>
              {completedPnL.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Marque shows como “Realizado” e vincule despesas para ver o lucro por
                  show aqui.
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    {completed.length} show(s) realizado(s), lucro total de{" "}
                    <strong>{formatBRL(totalShowProfit)}</strong>.
                  </p>
                  {bestShow && (
                    <p className="mt-2 text-sm text-slate-600">
                      Mais lucrativo:{" "}
                      <Link
                        href={`/shows/${bestShow.show.id}`}
                        className="text-brand hover:underline"
                      >
                        {bestShow.show.title}
                      </Link>{" "}
                      ({formatBRL(bestShow.pnl.netResult)})
                    </p>
                  )}
                  <Link
                    href="/finances"
                    className="mt-3 inline-block text-sm text-brand hover:underline"
                  >
                    Ver finanças completas →
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
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
