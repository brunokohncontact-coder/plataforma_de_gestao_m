import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computeShowProfitability } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { ShowStatusBadge, ContactRoleBadge } from "@/components/badges";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteShowAction, linkContactAction } from "@/app/actions/shows";
import { deleteTransactionAction } from "@/app/actions/transactions";

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

  const pl = computeShowProfitability(show, show.transactions);
  const linkedContactIds = new Set(show.contacts.map((c) => c.contactId));
  const allContacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const availableContacts = allContacts.filter((c) => !linkedContactIds.has(c.id));

  const returnTo = `/shows/${show.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/shows" className="text-sm text-slate-500">
          ← Shows
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{show.title}</h1>
            <ShowStatusBadge status={show.status} />
          </div>
          <div className="flex gap-2">
            <Link href={`/shows/${show.id}/edit`} className="btn-secondary">
              Editar
            </Link>
            <form action={deleteShowAction}>
              <input type="hidden" name="id" value={show.id} />
              <ConfirmButton confirmMessage="Excluir este show? As transações vinculadas serão desvinculadas.">
                Excluir
              </ConfirmButton>
            </form>
          </div>
        </div>
        <p className="mt-1 text-slate-500">
          {formatDateTime(show.date)}
          {show.venue ? ` · ${show.venue}` : ""}
          {show.city ? ` · ${show.city}` : ""}
        </p>
        {show.notes && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
            {show.notes}
          </p>
        )}
      </div>

      {/* P&L — diferencial do produto (F4) */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Rentabilidade</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <PlItem label="Cachê" value={formatCents(pl.feeCents)} />
          <PlItem
            label="Receitas extras"
            value={formatCents(pl.extraIncomeCents)}
          />
          <PlItem
            label="Despesas"
            value={`− ${formatCents(pl.expensesCents)}`}
            tone="red"
          />
          <PlItem
            label="Resultado"
            value={formatCents(pl.netCents)}
            tone={pl.netCents >= 0 ? "green" : "red"}
            strong
          />
        </div>
        {pl.margin !== null && (
          <p className="mt-3 text-sm text-slate-500">
            Margem: {(pl.margin * 100).toFixed(0)}%
          </p>
        )}
      </section>

      {/* Transações vinculadas */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Transações vinculadas</h2>
          <Link
            href={`/financas/new?showId=${show.id}&returnTo=${encodeURIComponent(returnTo)}`}
            className="btn-secondary"
          >
            + Lançar
          </Link>
        </div>
        {show.transactions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma transação vinculada. Lance as despesas (transporte,
            equipe…) e receitas extras deste show.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {show.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">
                    {t.category}
                    {t.description ? (
                      <span className="font-normal text-slate-400">
                        {" "}
                        · {t.description}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(t.date)}
                    {!t.settled && " · pendente"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      t.type === "INCOME" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "−"} {formatCents(t.amountCents)}
                  </span>
                  <form action={deleteTransactionAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <ConfirmButton
                      confirmMessage="Excluir esta transação?"
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      excluir
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contatos (F5) */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Contatos do show</h2>
        {show.contacts.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum contato vinculado.</p>
        ) : (
          <ul className="mb-4 divide-y divide-slate-100">
            {show.contacts.map(({ contact }) => (
              <li key={contact.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{contact.name}</span>
                  <ContactRoleBadge role={contact.role} />
                </div>
                <form action={linkContactAction}>
                  <input type="hidden" name="showId" value={show.id} />
                  <input type="hidden" name="contactId" value={contact.id} />
                  <input type="hidden" name="op" value="unlink" />
                  <button className="text-xs text-slate-400 hover:text-red-600">
                    remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {availableContacts.length > 0 && (
          <form action={linkContactAction} className="flex gap-2">
            <input type="hidden" name="showId" value={show.id} />
            <input type="hidden" name="op" value="link" />
            <select name="contactId" className="input" required>
              <option value="">Vincular contato…</option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary">Vincular</button>
          </form>
        )}
        {allContacts.length === 0 && (
          <p className="text-sm text-slate-500">
            Crie contatos em{" "}
            <Link href="/contatos" className="text-brand-600">
              Contatos
            </Link>{" "}
            para vinculá-los.
          </p>
        )}
      </section>
    </div>
  );
}

function PlItem({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
  strong?: boolean;
}) {
  const toneClass =
    tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-slate-800";
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg font-bold" : "font-medium"} ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
