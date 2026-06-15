import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { computeShowPnL, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import {
  SHOW_STATUS_BADGE,
  SHOW_STATUS_LABEL,
  SHOW_STATUSES,
  CONTACT_ROLE_LABEL,
  TX_TYPE_LABEL,
} from "@/lib/labels";
import { deleteShow, updateShowStatus } from "../actions";

export default async function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const show = await prisma.show.findFirst({
    where: { id, userId },
    include: {
      contact: true,
      transactions: { orderBy: { date: "asc" } },
    },
  });
  if (!show) notFound();

  const txLike: TxLike[] = show.transactions.map((t) => ({
    type: t.type,
    amountCents: t.amountCents,
    category: t.category,
    date: t.date,
    paid: t.paid,
    showId: t.showId,
  }));

  const pnl = computeShowPnL({ id: show.id, feeCents: show.feeCents, status: show.status }, txLike);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/shows" className="text-sm text-brand-600 hover:underline">
          ← Shows
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{show.title}</h1>
            <p className="text-sm text-slate-500">
              {formatDate(show.date)}
              {show.venue ? ` · ${show.venue}` : ""}
              {show.city ? ` · ${show.city}` : ""}
            </p>
          </div>
          <span className={`badge ${SHOW_STATUS_BADGE[show.status]}`}>{SHOW_STATUS_LABEL[show.status]}</span>
        </div>
      </div>

      {/* P&L — o diferencial (F4) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PnlCard label="Cachê acordado" value={formatMoney(pnl.feeCents)} />
        <PnlCard label="Despesas vinculadas" value={formatMoney(pnl.expensesCents)} tone="neg" />
        <PnlCard
          label="Lucro projetado"
          value={formatMoney(pnl.projectedProfitCents)}
          tone={pnl.projectedProfitCents >= 0 ? "pos" : "neg"}
          hint="Cachê − despesas"
          highlight
        />
        <PnlCard
          label="Lucro realizado"
          value={formatMoney(pnl.realizedProfitCents)}
          tone={pnl.realizedProfitCents >= 0 ? "pos" : "neg"}
          hint="Recebido − pago"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Transações vinculadas</h2>
            <Link
              href={`/app/finances/new?showId=${show.id}`}
              className="text-sm text-brand-600 hover:underline"
            >
              + Vincular transação
            </Link>
          </div>
          {show.transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma transação vinculada. Vincule despesas e receitas para ver a rentabilidade real.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {show.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{t.category}</p>
                    <p className="text-xs text-slate-500">
                      {TX_TYPE_LABEL[t.type]} · {formatDate(t.date)} · {t.paid ? "pago" : "pendente"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          {show.contact && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Contato</h3>
              <p className="font-medium">{show.contact.name}</p>
              <p className="text-xs text-slate-500">{CONTACT_ROLE_LABEL[show.contact.role]}</p>
              {show.contact.email && <p className="mt-1 text-xs text-slate-500">{show.contact.email}</p>}
              {show.contact.phone && <p className="text-xs text-slate-500">{show.contact.phone}</p>}
            </div>
          )}

          {show.notes && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Notas</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{show.notes}</p>
            </div>
          )}

          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Status</h3>
            <form action={updateShowStatus} className="flex gap-2">
              <input type="hidden" name="id" value={show.id} />
              <select name="status" defaultValue={show.status} className="input">
                {SHOW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SHOW_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-ghost">
                Atualizar
              </button>
            </form>
            <form action={deleteShow}>
              <input type="hidden" name="id" value={show.id} />
              <button type="submit" className="btn-danger w-full text-xs">
                Excluir show
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PnlCard({
  label,
  value,
  hint,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg";
  highlight?: boolean;
}) {
  return (
    <div className={`card ${highlight ? "ring-2 ring-brand-500" : ""}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
