import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { showProfitAndLoss } from "@/lib/finance";
import { formatBRL, formatDateTime, formatDate } from "@/lib/money";
import { Badge, Button, Card } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import {
  SHOW_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type ShowStatus,
  type ContactRole,
  type TransactionType,
  type TransactionStatus,
} from "@/lib/domain";
import { deleteShow } from "../actions";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const show = await prisma.show.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { contact: true, transactions: { orderBy: { date: "asc" } } },
  });
  if (!show) notFound();

  const pnl = showProfitAndLoss(
    { id: show.id, feeAgreed: show.feeAgreed },
    show.transactions.map((t) => ({
      type: t.type as TransactionType,
      amount: t.amount,
      date: t.date,
      category: t.category,
      status: t.status as TransactionStatus,
      showId: t.showId,
    })),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/shows" className="text-sm text-slate-500 hover:underline">
            ← Voltar para shows
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold">{show.title}</h1>
            <Badge value={show.status} label={SHOW_STATUS_LABELS[show.status as ShowStatus]} />
          </div>
          <p className="mt-1 text-slate-500">
            {formatDateTime(show.date)}
            {show.venue ? ` · ${show.venue}` : ""}
            {show.city ? ` · ${show.city}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/shows/${show.id}/editar`}>
            <Button variant="secondary">Editar</Button>
          </Link>
          <form action={deleteShow.bind(null, show.id)}>
            <DeleteButton confirmText="Excluir este show? As transações ficam, mas perdem o vínculo." />
          </form>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Cachê</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(pnl.fee)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Receitas extras</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatBRL(pnl.linkedIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Despesas</p>
          <p className="mt-1 text-xl font-bold text-red-600">{formatBRL(pnl.expenses)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Resultado</p>
          <p
            className={
              "mt-1 text-xl font-bold " + (pnl.net >= 0 ? "text-emerald-600" : "text-red-600")
            }
          >
            {formatBRL(pnl.net)}
          </p>
        </Card>
      </section>

      {show.contact && (
        <Card>
          <p className="text-sm text-slate-500">Contato</p>
          <p className="mt-1 font-medium">{show.contact.name}</p>
          <p className="text-sm text-slate-500">
            {CONTACT_ROLE_LABELS[show.contact.role as ContactRole]}
            {show.contact.email ? ` · ${show.contact.email}` : ""}
            {show.contact.phone ? ` · ${show.contact.phone}` : ""}
          </p>
        </Card>
      )}

      {show.notes && (
        <Card>
          <p className="text-sm text-slate-500">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{show.notes}</p>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Transações vinculadas</h2>
        <Card>
          {show.transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma transação vinculada. Vincule despesas/receitas a este show na aba{" "}
              <Link href="/dashboard/financas" className="text-brand-600 hover:underline">
                Finanças
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {show.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {t.description || t.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {TRANSACTION_TYPE_LABELS[t.type as TransactionType]} · {t.category} ·{" "}
                      {formatDate(t.date)}
                    </p>
                  </div>
                  <span
                    className={
                      "font-medium " + (t.type === "income" ? "text-emerald-600" : "text-red-600")
                    }
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatBRL(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
