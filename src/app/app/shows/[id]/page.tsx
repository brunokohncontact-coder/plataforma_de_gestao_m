import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { computeShowPnL } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { deleteShowAction } from "@/app/actions/shows";
import { DeleteButton } from "@/components/DeleteButton";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  TRANSACTION_TYPE_LABELS,
  CONTACT_ROLE_LABELS,
  formatDate,
} from "@/lib/labels";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const show = await db.show.findFirst({
    where: { id, userId: user.id },
    include: {
      transactions: { orderBy: { date: "asc" } },
      contacts: { include: { contact: true } },
    },
  });
  if (!show) notFound();

  const pnl = computeShowPnL(
    { id: show.id, feeCents: show.feeCents, status: show.status },
    show.transactions.map((t) => ({
      type: t.type,
      amountCents: t.amountCents,
      category: t.category,
      date: t.date,
      status: t.status,
      showId: t.showId,
    }))
  );

  const deleteThis = deleteShowAction.bind(null, show.id);

  return (
    <div>
      <Link href="/app/shows" className="text-sm text-brand-600 hover:underline">
        ← Shows
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{show.title}</h1>
            <span className={`badge ${SHOW_STATUS_COLORS[show.status]}`}>
              {SHOW_STATUS_LABELS[show.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(show.date)}
            {show.venue ? ` · ${show.venue}` : ""}
            {show.city ? ` · ${show.city}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/shows/${show.id}/editar`} className="btn-secondary">
            Editar
          </Link>
          <DeleteButton action={deleteThis} label="Excluir show" />
        </div>
      </div>

      {/* P&L — diferencial do produto */}
      <div className="card mb-6">
        <h2 className="mb-4 font-semibold text-gray-900">Rentabilidade</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">
              Cachê {show.status === "CANCELED" && "(cancelado, não contabilizado)"}
            </dt>
            <dd className="font-medium">{formatBRL(pnl.feeCents)}</dd>
          </div>
          {pnl.linkedIncomeCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-600">+ Outras receitas vinculadas</dt>
              <dd className="font-medium text-green-600">{formatBRL(pnl.linkedIncomeCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600">− Despesas vinculadas</dt>
            <dd className="font-medium text-red-600">{formatBRL(pnl.linkedExpenseCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
            <dt className="font-semibold text-gray-900">Resultado</dt>
            <dd
              className={`font-bold ${pnl.profitCents >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatBRL(pnl.profitCents)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Transações vinculadas</h2>
            <Link
              href={`/app/financas/nova?showId=${show.id}`}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              + Adicionar
            </Link>
          </div>
          {show.transactions.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma transação vinculada.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {show.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{t.category}</p>
                    <p className="text-xs text-gray-500">
                      {TRANSACTION_TYPE_LABELS[t.type]} · {formatDate(t.date)}
                    </p>
                  </div>
                  <span className={t.type === "INCOME" ? "text-green-600" : "text-red-600"}>
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatBRL(t.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold text-gray-900">Contatos</h2>
          {show.contacts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum contato vinculado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {show.contacts.map(({ contact }) => (
                <li key={contact.id} className="py-2 text-sm">
                  <p className="font-medium text-gray-800">{contact.name}</p>
                  <p className="text-xs text-gray-500">
                    {CONTACT_ROLE_LABELS[contact.role]}
                    {contact.email ? ` · ${contact.email}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {show.notes && (
        <div className="card mt-6">
          <h2 className="mb-2 font-semibold text-gray-900">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{show.notes}</p>
        </div>
      )}
    </div>
  );
}
