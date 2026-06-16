import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeShowPnL, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatDate } from "@/lib/format";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  CONTACT_ROLE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type ShowStatus,
  type ContactRole,
  type TransactionType,
} from "@/lib/domain";
import { deleteShowAction } from "../actions";

export const dynamic = "force-dynamic";

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

  const txs: TxLike[] = show.transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const pnl = computeShowPnL({ id: show.id, fee: show.fee }, txs);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/shows" className="text-sm text-gray-500 hover:underline">
            ← Shows
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{show.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateTime(show.date)}
            {show.venue ? ` · ${show.venue}` : ""}
            {show.city ? ` · ${show.city}` : ""}
          </p>
        </div>
        <span className={"badge " + SHOW_STATUS_COLORS[show.status as ShowStatus]}>
          {SHOW_STATUS_LABELS[show.status as ShowStatus]}
        </span>
      </div>

      {/* P&L — diferencial do produto */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Rentabilidade</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PnlItem label="Cachê" value={formatMoney(pnl.fee)} />
          <PnlItem label="Receitas extras" value={formatMoney(pnl.extraIncome)} />
          <PnlItem label="Despesas" value={"−" + formatMoney(pnl.expenses)} tone="red" />
          <PnlItem
            label="Resultado"
            value={formatMoney(pnl.net)}
            tone={pnl.net >= 0 ? "emerald" : "red"}
            strong
          />
        </dl>
        {pnl.fee + pnl.extraIncome > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            Margem: {(pnl.margin * 100).toFixed(0)}% sobre a receita bruta.
          </p>
        )}
      </section>

      {show.notes && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{show.notes}</p>
        </section>
      )}

      {/* Transações vinculadas */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Transações vinculadas</h2>
          <Link href={`/financas/nova?showId=${show.id}`} className="text-sm text-brand-700 hover:underline">
            + Vincular transação
          </Link>
        </div>
        {show.transactions.length === 0 ? (
          <p className="py-3 text-center text-sm text-gray-400">
            Nenhuma transação vinculada. Adicione despesas (transporte, equipamento) para ver o
            resultado real do show.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {show.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{t.description}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {t.category} · {formatDate(t.date)}
                  </span>
                </div>
                <span
                  className={
                    (t.type as TransactionType) === "INCOME"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  {(t.type as TransactionType) === "INCOME" ? "+" : "−"}
                  {formatMoney(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contatos vinculados */}
      {show.contacts.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Contatos</h2>
          <ul className="flex flex-wrap gap-2">
            {show.contacts.map(({ contact }) => (
              <li key={contact.id} className="badge bg-gray-100 text-gray-700">
                {contact.name} · {CONTACT_ROLE_LABELS[contact.role as ContactRole]}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-3">
        <Link href={`/shows/${show.id}/editar`} className="btn-secondary">
          Editar
        </Link>
        <form action={deleteShowAction}>
          <input type="hidden" name="id" value={show.id} />
          <button type="submit" className="btn-danger">
            Excluir
          </button>
        </form>
      </div>
    </div>
  );
}

function PnlItem({
  label,
  value,
  tone = "gray",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "gray" | "red" | "emerald";
  strong?: boolean;
}) {
  const tones: Record<string, string> = {
    gray: "text-gray-900",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className={`mt-0.5 ${strong ? "text-lg font-bold" : "font-medium"} ${tones[tone]}`}>
        {value}
      </dd>
    </div>
  );
}
