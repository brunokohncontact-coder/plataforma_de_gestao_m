import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calcShowPnL } from "@/lib/finance";
import type { TransactionType } from "@/lib/enums";
import { formatBRL, formatDate } from "@/lib/format";
import { ShowStatusBadge, TxStatusBadge, ContactRoleBadge } from "@/components/badges";
import { DeleteButton } from "@/components/DeleteButton";
import { ShowContactsForm } from "@/components/ShowContactsForm";
import { deleteShowAction } from "@/app/actions/shows";

export default async function ShowDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const show = await prisma.show.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      contacts: { include: { contact: true } },
    },
  });
  if (!show) notFound();

  const allContacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const txLike = show.transactions.map((t) => ({
    type: t.type as TransactionType,
    amount: t.amount,
    date: t.date,
    showId: t.showId,
  }));
  const pnl = calcShowPnL({ id: show.id, fee: show.fee }, txLike);
  const linkedIds = show.contacts.map((sc) => sc.contactId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/shows" className="text-sm text-brand-700 hover:underline">
            ← Shows
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {show.title || show.venue}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(show.date)} · {show.venue} · {show.city}
          </p>
          <div className="mt-2">
            <ShowStatusBadge status={show.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/shows/${show.id}/edit`} className="btn-secondary py-1.5 text-xs">
            Editar
          </Link>
          <DeleteButton action={deleteShowAction} id={show.id} confirmText="Excluir este show?" />
        </div>
      </div>

      {/* P&L — diferencial do produto */}
      <section className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Cachê acordado</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatBRL(pnl.agreedFee)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Despesas vinculadas</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatBRL(pnl.expenses)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Resultado</p>
          <p
            className={`mt-1 text-xl font-bold ${
              pnl.result >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {formatBRL(pnl.result)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Margem</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {Math.round(pnl.margin * 100)}%
          </p>
        </div>
      </section>

      {pnl.realizedIncome > 0 && (
        <p className="text-sm text-slate-500">
          Receitas lançadas e vinculadas: {formatBRL(pnl.realizedIncome)} · Resultado de caixa:{" "}
          <span className={pnl.netRealized >= 0 ? "text-emerald-700" : "text-red-600"}>
            {formatBRL(pnl.netRealized)}
          </span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Transações vinculadas</h2>
            <Link
              href={`/app/financas/new?showId=${show.id}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              + Lançar
            </Link>
          </div>
          {show.transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhuma transação vinculada. Vincule despesas e receitas para ver a rentabilidade real.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {show.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/app/financas/${t.id}/edit`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {t.category}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formatDate(t.date)}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <TxStatusBadge status={t.status} />
                    <span
                      className={`font-medium ${
                        t.type === "income" ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatBRL(t.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold text-slate-900">Contatos do show</h2>
          {show.contacts.length > 0 && (
            <ul className="mb-4 space-y-2">
              {show.contacts.map((sc) => (
                <li key={sc.contactId} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{sc.contact.name}</span>
                  <ContactRoleBadge role={sc.contact.role} />
                </li>
              ))}
            </ul>
          )}
          <ShowContactsForm showId={show.id} contacts={allContacts} linkedIds={linkedIds} />
        </section>
      </div>

      {show.notes && (
        <section className="card">
          <h2 className="mb-2 font-semibold text-slate-900">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{show.notes}</p>
        </section>
      )}
    </div>
  );
}
