import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeShowPnL } from "@/lib/domain/finance";
import { TRANSACTION_CATEGORY_LABELS } from "@/lib/domain/constants";
import { StatusBadge, Money, formatDate, toDateInputValue } from "@/components/ui";
import { Dialog } from "@/components/Dialog";
import { ShowForm } from "@/components/ShowForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteShow } from "../actions";

export default async function ShowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const show = await prisma.show.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      contacts: { include: { contact: true } },
    },
  });
  if (!show) notFound();

  const pnl = computeShowPnL(show, show.transactions);

  return (
    <div className="space-y-5">
      <Link href="/shows" className="text-sm text-brand-600">
        ← Voltar para shows
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{show.title}</h1>
            <StatusBadge status={show.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[show.venue, show.city].filter(Boolean).join(" · ") || "Local não informado"} ·{" "}
            {formatDate(show.date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            title="Editar show"
            triggerLabel="Editar"
            triggerClassName="btn-secondary"
          >
            <ShowForm
              initial={{
                id: show.id,
                title: show.title,
                venue: show.venue,
                city: show.city,
                date: toDateInputValue(show.date),
                status: show.status,
                feeAgreed: show.feeAgreed,
                notes: show.notes,
              }}
            />
          </Dialog>
          <DeleteButton
            action={deleteShow.bind(null, show.id)}
            redirectTo="/shows"
          />
        </div>
      </div>

      {/* P&L */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Cachê acordado</p>
          <p className="mt-1 text-xl font-semibold">
            <Money value={pnl.feeAgreed} />
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Despesas vinculadas</p>
          <p className="mt-1 text-xl font-semibold">
            <Money value={pnl.expensesTotal} />
          </p>
          {pnl.expensesPending > 0 && (
            <p className="text-xs text-amber-600">
              <Money value={pnl.expensesPending} /> a pagar
            </p>
          )}
        </div>
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Resultado planejado</p>
          <p className="mt-1 text-xl font-semibold">
            <Money value={pnl.plannedResult} signed />
          </p>
          <p className="text-xs text-slate-400">cachê − despesas</p>
        </div>
      </div>

      {show.notes && (
        <div className="card">
          <p className="text-xs uppercase text-slate-400">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {show.notes}
          </p>
        </div>
      )}

      {/* Transações vinculadas */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Transações vinculadas</h2>
          <Link href="/financas" className="text-sm text-brand-600">
            Gerenciar em Finanças →
          </Link>
        </div>
        {show.transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Nenhuma transação vinculada. Em Finanças, vincule receitas e despesas
            a este show para ver a rentabilidade real.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {show.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2">
                      <span className="font-medium">
                        {t.description ||
                          TRANSACTION_CATEGORY_LABELS[
                            t.category as keyof typeof TRANSACTION_CATEGORY_LABELS
                          ] ||
                          t.category}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {formatDate(t.date)}
                        {!t.received && " · pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Money
                        value={t.type === "despesa" ? -t.amount : t.amount}
                        signed
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contatos vinculados */}
      {show.contacts.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Contatos</h2>
          <div className="flex flex-wrap gap-2">
            {show.contacts.map((sc) => (
              <span key={sc.contactId} className="badge bg-slate-100 text-slate-700">
                {sc.contact.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
