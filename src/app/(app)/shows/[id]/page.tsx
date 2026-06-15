import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { calcShowProfitability } from "@/lib/finance";
import {
  SHOW_STATUS_BADGE,
  SHOW_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
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
      contact: true,
      transactions: { orderBy: { date: "asc" } },
    },
  });
  if (!show) notFound();

  const pnl = calcShowProfitability(
    { id: show.id, feeCents: show.feeCents, status: show.status },
    show.transactions,
  );
  const profit = pnl.netCents >= 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-slate-500 hover:underline">
          ← Shows
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{show.title}</h1>
              <span className={`badge ${SHOW_STATUS_BADGE[show.status] ?? ""}`}>
                {SHOW_STATUS_LABELS[show.status] ?? show.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(show.date)}
              {show.venue ? ` · ${show.venue}` : ""}
              {show.city ? ` · ${show.city}` : ""}
            </p>
            {show.contact && (
              <p className="mt-1 text-sm text-slate-500">
                Contato: {show.contact.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/shows/${show.id}/edit`} className="btn-secondary">
              Editar
            </Link>
            <form action={deleteShow.bind(null, show.id)}>
              <button type="submit" className="btn-danger">Excluir</button>
            </form>
          </div>
        </div>
      </div>

      {/* Rentabilidade (P&L) */}
      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Rentabilidade</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cachê" value={formatCents(pnl.feeCents)} />
          <Stat label="+ Receitas vinc." value={formatCents(pnl.linkedIncomeCents)} />
          <Stat label="− Despesas vinc." value={formatCents(pnl.linkedExpenseCents)} />
          <Stat
            label="Resultado"
            value={formatCents(pnl.netCents)}
            className={profit ? "text-green-600" : "text-red-600"}
          />
        </dl>
        <p className="mt-3 text-xs text-slate-400">
          Resultado = (cachê + receitas vinculadas) − despesas vinculadas a este show.
        </p>
      </section>

      {/* Transações vinculadas */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transações vinculadas</h2>
          <Link
            href={`/finances/new?showId=${show.id}`}
            className="text-sm text-brand-600 hover:underline"
          >
            + Lançar
          </Link>
        </div>
        {show.transactions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma transação vinculada. Lance despesas (transporte, equipamento) e
            receitas extras (merch) para ver a rentabilidade real.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {show.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="text-slate-700">{t.category}</span>
                  {t.description ? (
                    <span className="text-slate-400"> · {t.description}</span>
                  ) : null}
                </span>
                <span
                  className={t.type === "income" ? "text-green-600" : "text-red-600"}
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatCents(t.amountCents)}{" "}
                  <span className="text-xs text-slate-400">
                    ({TRANSACTION_TYPE_LABELS[t.type]})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {show.notes && (
        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{show.notes}</p>
        </section>
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
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${className}`}>{value}</dd>
    </div>
  );
}
