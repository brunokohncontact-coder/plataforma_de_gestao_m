import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateLong } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import { showProfitability } from "@/lib/finance";
import { TRANSACTION_TYPE_LABELS } from "@/lib/enums";
import { PageHeader, ShowStatusBadge, StatCard } from "@/components/ui";
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
      contact: true,
      transactions: { orderBy: { date: "asc" } },
    },
  });

  if (!show) notFound();

  const pnl = showProfitability({ fee: show.fee }, show.transactions);

  return (
    <div>
      <PageHeader
        title={show.title}
        subtitle={formatDateLong(show.date)}
        action={
          <div className="flex gap-2">
            <Link href={`/shows/${show.id}/edit`} className="btn-secondary">
              Editar
            </Link>
            <form action={deleteShow}>
              <input type="hidden" name="id" value={show.id} />
              <button type="submit" className="btn-danger">
                Excluir
              </button>
            </form>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <ShowStatusBadge status={show.status} />
        {(show.venue || show.city) && (
          <span>{[show.venue, show.city].filter(Boolean).join(" · ")}</span>
        )}
        {show.contact && (
          <span>
            Contato:{" "}
            <Link
              href={`/contacts`}
              className="font-medium text-brand-700 hover:underline"
            >
              {show.contact.name}
            </Link>
          </span>
        )}
      </div>

      {/* F4 — Rentabilidade do show */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Receita" value={formatBRL(pnl.revenue)} hint="Cachê + extras" />
        <StatCard
          label="Despesas"
          value={formatBRL(pnl.expenses)}
          tone={pnl.expenses > 0 ? "negative" : "neutral"}
          hint={`${pnl.expenseCount} lançamento(s)`}
        />
        <StatCard
          label="Resultado"
          value={formatBRL(pnl.result)}
          tone={pnl.result >= 0 ? "positive" : "negative"}
          hint={pnl.revenue > 0 ? `Margem ${(pnl.margin * 100).toFixed(0)}%` : undefined}
        />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Lançamentos vinculados</h2>
          <Link
            href={`/transactions/new?showId=${show.id}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            + Vincular lançamento
          </Link>
        </div>

        {show.transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma receita ou despesa vinculada a este show ainda.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {show.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{t.category}</div>
                  {t.description && (
                    <div className="text-xs text-slate-400">{t.description}</div>
                  )}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "−"}
                  {formatBRL(t.amount)}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {TRANSACTION_TYPE_LABELS[t.type as "INCOME" | "EXPENSE"]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {show.notes && (
        <div className="card mt-6">
          <h2 className="mb-2 font-semibold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {show.notes}
          </p>
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link href="/shows" className="text-slate-500 hover:underline">
          ← Voltar para a agenda
        </Link>
      </p>
    </div>
  );
}
