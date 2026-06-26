import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { summarizeContactShows, summarizeContactProfit } from "@/lib/contacts";
import {
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type ProfitYearFilter,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PeriodPicker } from "@/components/PeriodPicker";
import {
  CONTACT_ROLE_LABELS,
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  SHOW_STATUS_DOT,
  type ContactRole,
  type ShowStatus,
} from "@/lib/domain";
import { deleteContactAction } from "../actions";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireUser();

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      shows: {
        include: {
          show: {
            select: { id: true, title: true, date: true, status: true, fee: true },
          },
        },
      },
    },
  });

  if (!contact) notFound();

  const shows = contact.shows.map((cs) => cs.show);
  const summary = summarizeContactShows(shows);

  // Recorte por período (ano) — afeta SÓ a rentabilidade (D117), reusando os
  // três helpers da D108. O histórico e a lista de shows seguem mostrando tudo.
  // Anos vêm dos shows não cancelados (os que entram no P&L), para não oferecer
  // um ano que ficaria vazio na rentabilidade.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== "CANCELLED").map((s) => s.date),
  );
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);
  const periodShows = filterShowsByYear(shows, yearFilter);

  // Rentabilidade: P&L líquido dos shows deste contato (no período), depois dos
  // custos. Busca só as transações vinculadas aos shows do contato (receitas
  // extras e despesas) — `summarizeContactProfit` reaproveita `computeShowPnL`
  // (D106), filtrando por `showId` internamente, então passar todas é seguro.
  const showIds = shows.map((s) => s.id);
  const showTxs =
    showIds.length > 0
      ? await prisma.transaction.findMany({
          where: { userId: user.id, showId: { in: showIds } },
          select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
        })
      : [];
  const profit = summarizeContactProfit(
    periodShows,
    showTxs.map((t) => ({ ...t, type: t.type as "INCOME" | "EXPENSE" })),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/contatos" className="text-sm text-gray-500 hover:underline">
            ← Contatos
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold">{contact.name}</h1>
          <span className="badge mt-1 bg-brand-50 text-brand-700">
            {CONTACT_ROLE_LABELS[contact.role as ContactRole]}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/contatos/${contact.id}/editar`} className="btn-secondary py-1.5 text-xs">
            Editar
          </Link>
          <DeleteButton
            action={deleteContactAction}
            id={contact.id}
            triggerClassName="btn-danger py-1.5 text-xs"
            confirmMessage="Excluir contato?"
          />
        </div>
      </div>

      {(contact.email || contact.phone || contact.notes) && (
        <section className="card space-y-1 text-sm text-gray-700">
          {contact.email && (
            <p>
              ✉ <a href={`mailto:${contact.email}`} className="text-brand-700 hover:underline">{contact.email}</a>
            </p>
          )}
          {contact.phone && <p>☎ {contact.phone}</p>}
          {contact.notes && <p className="whitespace-pre-wrap text-gray-500">{contact.notes}</p>}
        </section>
      )}

      {/* Resumo do relacionamento — valor de CRM */}
      <section className="card">
        <h2 className="mb-3 font-semibold">Histórico de shows</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Shows" value={String(summary.total)} />
          <Stat label="Futuros" value={String(summary.upcoming.length)} />
          <Stat label="Cachê total" value={formatMoney(summary.totalFee)} />
          <Stat
            label="Próximo show"
            value={summary.nextShow ? formatDateTime(summary.nextShow.date) : "—"}
          />
        </dl>
      </section>

      {/* Rentabilidade — quanto este contato deixa depois dos custos.
          Só aparece com ≥1 show não cancelado (em qualquer ano); o seletor de
          período recorta o P&L sem mexer no histórico/lista acima. */}
      {availableYears.length > 0 && (
        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Rentabilidade</h2>
            <Link href="/contatos/rentabilidade" className="text-xs text-brand-700 hover:underline">
              Comparar contratantes →
            </Link>
          </div>

          <PeriodPicker
            years={availableYears}
            active={yearFilter}
            basePath={`/contatos/${contact.id}`}
            ariaLabel="Período da rentabilidade"
          />

          {profit.showCount > 0 ? (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Resultado líquido"
                  value={formatMoney(profit.totalNet)}
                  valueClassName={profit.totalNet >= 0 ? "text-emerald-600" : "text-red-600"}
                />
                <Stat label="Despesas" value={profit.totalExpenses > 0 ? "−" + formatMoney(profit.totalExpenses) : "—"} />
                <Stat label="Líquido médio/show" value={formatMoney(profit.avgNet)} />
                <Stat
                  label="Margem"
                  value={profit.totalFee + profit.totalExtra > 0 ? `${(profit.margin * 100).toFixed(0)}%` : "—"}
                />
              </dl>
              <p className="mt-3 text-xs text-gray-400">
                Líquido = cachê {profit.totalExtra > 0 ? "+ receitas extras " : ""}− despesas vinculadas aos{" "}
                {profit.showCount} show{profit.showCount > 1 ? "s" : ""} não cancelado
                {profit.showCount > 1 ? "s" : ""} deste contato
                {yearFilter === "all" ? "" : ` em ${yearFilter}`}.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-gray-400">
              Nenhum show não cancelado em {yearFilter}.{" "}
              <Link href={`/contatos/${contact.id}`} className="text-brand-700 hover:underline">
                Ver todos os anos
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {/* Lista de shows vinculados */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Shows vinculados</h2>
          <span className="text-xs text-gray-500">{summary.total} no total</span>
        </div>
        {summary.total === 0 ? (
          <p className="py-3 text-center text-sm text-gray-400">
            Este contato ainda não está vinculado a nenhum show. Vincule-o na tela de um show.
          </p>
        ) : (
          <div className="space-y-5">
            {summary.upcoming.length > 0 && (
              <ShowGroup title="Próximos" shows={summary.upcoming} />
            )}
            {summary.past.length > 0 && <ShowGroup title="Anteriores" shows={summary.past} />}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className={"mt-0.5 font-medium " + (valueClassName ?? "text-gray-900")}>{value}</dd>
    </div>
  );
}

function ShowGroup({
  title,
  shows,
}: {
  title: string;
  shows: { id: string; title: string; date: Date | string; status: string; fee: number }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      <ul className="divide-y divide-gray-100">
        {shows.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2">
            <Link href={`/shows/${s.id}`} className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${SHOW_STATUS_DOT[s.status as ShowStatus]}`}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate font-medium hover:underline">{s.title}</span>
                <span className="block text-xs text-gray-500">{formatDateTime(s.date)}</span>
              </span>
            </Link>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-sm text-gray-600">{formatMoney(s.fee)}</span>
              <span className={"badge " + SHOW_STATUS_COLORS[s.status as ShowStatus]}>
                {SHOW_STATUS_LABELS[s.status as ShowStatus]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
