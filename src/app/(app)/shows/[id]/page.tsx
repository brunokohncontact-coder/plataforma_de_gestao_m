import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeShowPnL } from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { TransactionForm } from "@/components/TransactionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteShowAction } from "@/app/actions/shows";
import { deleteTransactionAction } from "@/app/actions/transactions";
import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/domain/enums";

export default async function ShowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const show = await prisma.show.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      contact: true,
      transactions: { orderBy: { date: "desc" } },
    },
  });
  if (!show) notFound();

  const pnl = computeShowPnL(show, show.transactions);
  const resultColor = pnl.netResult >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-brand hover:underline">
          ← Voltar para shows
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{show.title}</h1>
            <StatusBadge status={show.status} />
          </div>
          <div className="flex gap-2">
            <Link href={`/shows/${show.id}/edit`} className="btn-secondary">
              Editar
            </Link>
            <form action={deleteShowAction}>
              <input type="hidden" name="id" value={show.id} />
              <ConfirmButton message="Excluir este show? As transações ficam, mas perdem o vínculo.">
                Excluir
              </ConfirmButton>
            </form>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {formatDate(show.date)}
          {show.venue ? ` · ${show.venue}` : ""}
          {show.city ? ` · ${show.city}` : ""}
        </p>
        {show.contact && (
          <p className="mt-1 text-sm text-slate-500">
            Contato:{" "}
            <Link href="/contacts" className="text-brand hover:underline">
              {show.contact.name}
            </Link>
          </p>
        )}
        {show.notes && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{show.notes}</p>
        )}
      </div>

      {/* F4 — Rentabilidade por show */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Rentabilidade
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Cachê" value={formatBRL(pnl.fee)} />
          <Metric label="Receita extra" value={formatBRL(pnl.extraIncome)} />
          <Metric label="Despesas" value={formatBRL(pnl.totalExpenses)} />
          <Metric
            label="Resultado"
            value={formatBRL(pnl.netResult)}
            valueClass={resultColor}
          />
        </div>
        {pnl.margin !== null && (
          <p className="mt-3 text-sm text-slate-500">
            Margem: {(pnl.margin * 100).toFixed(0)}% sobre a receita de{" "}
            {formatBRL(pnl.grossRevenue)}.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          O cachê é a receita base. Não lance o cachê também como transação — vincule
          aqui apenas despesas e receitas adicionais (ex.: merch).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Transações vinculadas */}
        <div>
          <h2 className="mb-3 font-semibold">Transações deste show</h2>
          {show.transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma transação vinculada. Adicione despesas (transporte, equipe…) ao
              lado para calcular o resultado real.
            </p>
          ) : (
            <ul className="space-y-2">
              {show.transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <span
                      className={
                        t.type === "INCOME" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatBRL(t.amount)}
                    </span>{" "}
                    <span className="text-slate-600">{t.category}</span>
                    <span className="block text-xs text-slate-400">
                      {formatDate(t.date)} ·{" "}
                      {TRANSACTION_TYPE_LABELS[t.type as TransactionType]}
                      {t.received ? "" : " · pendente"}
                    </span>
                  </div>
                  <form action={deleteTransactionAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmButton
                      message="Excluir esta transação?"
                      className="text-xs text-red-500 hover:underline"
                    >
                      excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Adicionar transação a este show */}
        <div className="card">
          <h2 className="mb-3 font-semibold">Lançar despesa/receita do show</h2>
          <TransactionForm shows={[]} lockedShowId={show.id} />
        </div>
      </div>

      {show.feePaid ? null : (
        <p className="text-xs text-slate-400">Cachê marcado como pendente de recebimento.</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
