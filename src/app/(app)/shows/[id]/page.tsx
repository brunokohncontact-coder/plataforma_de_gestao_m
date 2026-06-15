import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { showProfitability } from "@/lib/finance";
import { formatMoney, formatDate } from "@/lib/format";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_BADGE,
  SETTLEMENT_LABELS,
  TX_TYPE_LABELS,
} from "@/lib/labels";
import { deleteShow } from "../actions";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const show = await prisma.show.findFirst({
    where: { id, userId: user.id },
    include: {
      transactions: { orderBy: { date: "asc" } },
      contact: { select: { name: true } },
    },
  });

  if (!show) notFound();

  const pnl = showProfitability(show, show.transactions);
  const deleteThis = deleteShow.bind(null, show.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/shows" className="text-sm text-slate-500 hover:text-slate-700">
            ← Shows
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{show.title}</h1>
          <p className="text-slate-500">
            {formatDate(show.date)}
            {show.venue ? ` · ${show.venue}` : ""}
            {show.city ? ` · ${show.city}` : ""}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              SHOW_STATUS_BADGE[show.status] ?? ""
            }`}
          >
            {SHOW_STATUS_LABELS[show.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/shows/${show.id}/edit`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Editar
          </Link>
          <form action={deleteThis}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Excluir
            </button>
          </form>
        </div>
      </div>

      {/* Rentabilidade — o diferencial do produto */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Rentabilidade</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <PnlItem label="Cachê" value={pnl.fee} />
          <PnlItem label="+ Receitas" value={pnl.linkedIncome} />
          <PnlItem label="− Despesas" value={pnl.linkedExpense} negative />
          <PnlItem label="= Resultado" value={pnl.net} bold />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Margem: {Math.round(pnl.margin * 100)}% · Em caixa (liquidado):{" "}
          <span className="font-medium text-slate-700">
            {formatMoney(pnl.realizedNet)}
          </span>{" "}
          · Cachê: {SETTLEMENT_LABELS[show.feeStatus]}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">
          Transações vinculadas
        </h2>
        {show.transactions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma despesa ou receita vinculada a este show ainda.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {show.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium text-slate-900">{t.category}</span>
                  {t.description && (
                    <span className="text-slate-500"> · {t.description}</span>
                  )}
                  <span className="ml-2 text-xs text-slate-400">
                    {SETTLEMENT_LABELS[t.status]}
                  </span>
                </div>
                <span
                  className={
                    t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                  }
                >
                  {t.type === "INCOME" ? "+" : "−"}
                  {formatMoney(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {show.notes && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{show.notes}</p>
        </section>
      )}
    </div>
  );
}

function PnlItem({
  label,
  value,
  negative,
  bold,
}: {
  label: string;
  value: number;
  negative?: boolean;
  bold?: boolean;
}) {
  const color = bold
    ? value >= 0
      ? "text-emerald-600"
      : "text-red-600"
    : negative
      ? "text-red-600"
      : "text-slate-900";
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`${bold ? "text-lg font-bold" : "font-medium"} ${color}`}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
