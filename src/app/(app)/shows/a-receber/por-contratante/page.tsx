import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  reconcileShowFees,
  outstandingByContact,
  RECEIVABLE_AGE_BUCKET_LABELS,
  type ReceivableAgeBucketKey,
  type ReceivableShowLike,
  type TxLike,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Contato resolvido como pagador de um show (campos usados na página). */
interface PayerContact {
  id: string;
  name: string;
  role: string;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Texto pt-BR para um atraso em dias (sempre >= 0). */
function daysLabel(days: number): string {
  if (days === 0) return "no dia";
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

function roleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? CONTACT_ROLE_LABELS.OTHER;
}

// Quanto mais velho o atraso, mais quente a cor — sinal de urgência de cobrança.
const BUCKET_DOT: Record<ReceivableAgeBucketKey, string> = {
  d30: "bg-emerald-400",
  d60: "bg-amber-400",
  d90: "bg-orange-400",
  older: "bg-red-500",
};

const BUCKET_TEXT: Record<ReceivableAgeBucketKey, string> = {
  d30: "text-emerald-600",
  d60: "text-amber-600",
  d90: "text-orange-600",
  older: "text-red-600",
};

export default async function ReceivablesByContactPage() {
  const user = await requireUser();

  // Shows que já podem ter gerado cachê (PLAYED ou CONFIRMED) com os contatos
  // vinculados, e as receitas vinculadas. A regra de "já aconteceu" e o abatimento
  // ficam na lógica pura (reconcileShowFees); quem paga vem por papel
  // (pickPayerContact) e a agregação por devedor é pura (outstandingByContact).
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { in: ["PLAYED", "CONFIRMED"] } },
      orderBy: { date: "asc" },
      include: { contacts: { include: { contact: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", showId: { not: null } },
      select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  type ShowRow = (typeof shows)[number];
  const receivables = reconcileShowFees(shows as (ReceivableShowLike & ShowRow)[], txs);

  const getPayer = (show: ShowRow): PayerContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };

  const byContact = outstandingByContact(
    receivables,
    getPayer as (s: ReceivableShowLike & ShowRow) => PayerContact | null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cachês a receber por contratante</h1>
          <p className="text-sm text-gray-500">
            Quem está te devendo — e há quanto tempo. Quebra os{" "}
            <Link href="/shows/a-receber" className="text-brand-700 hover:underline">
              cachês a receber
            </Link>{" "}
            por quem responde pelo pagamento, para priorizar a cobrança pelo maior devedor.
          </p>
        </div>
        <Link href="/shows/a-receber" className="btn-secondary">
          ← Cachês a receber
        </Link>
      </div>

      {byContact.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Tudo certo — nenhum cachê em aberto de shows realizados. 🎉</p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total a receber
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatMoney(byContact.totalOutstanding)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {byContact.count} {byContact.count === 1 ? "show" : "shows"} ·{" "}
                {byContact.contactCount}{" "}
                {byContact.contactCount === 1 ? "contratante" : "contratantes"}
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Maior devedor
              </p>
              {byContact.topDebtor?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {byContact.topDebtor.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {formatMoney(byContact.topDebtor.outstanding)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">—</p>
              )}
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Espera mais tempo
              </p>
              {byContact.oldestDebtor?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {byContact.oldestDebtor.contact.name}
                  </p>
                  <p
                    className={
                      "mt-1 text-lg font-bold " +
                      BUCKET_TEXT[byContact.oldestDebtor.oldestBucket]
                    }
                  >
                    {daysLabel(byContact.oldestDebtor.maxDaysOutstanding)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {/* Por contratante, do maior saldo devedor ao menor */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">A receber</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Pior atraso</th>
                  <th className="px-4 py-3 text-right font-medium">Atraso médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byContact.rows.map((r) => (
                  <tr key={r.contact?.id ?? "__none__"} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {r.contact ? (
                        <Link
                          href={`/contatos/${r.contact.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {r.contact.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-500">Sem contratante</span>
                      )}
                      <p className="text-xs text-gray-400">
                        {r.contact ? roleLabel(r.contact.role) : "shows sem contato vinculado"}
                        {" · "}
                        {pct(r.share)} do total
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatMoney(r.outstanding)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.showCount}</td>
                    <td
                      className={
                        "px-4 py-3 text-right font-medium " + BUCKET_TEXT[r.oldestBucket]
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={"h-2 w-2 rounded-full " + BUCKET_DOT[r.oldestBucket]}
                        />
                        {daysLabel(r.maxDaysOutstanding)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {daysLabel(r.weightedAvgDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Detalhe: shows em aberto de cada contratante (mais atrasado → mais recente) */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Shows em aberto por contratante</h2>
            {byContact.rows.map((r) => (
              <div key={r.contact?.id ?? "__none__"} className="card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">
                    {r.contact ? r.contact.name : "Sem contratante"}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatMoney(r.outstanding)}
                  </p>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {r.rows.map((a) => {
                    const info = a.row.show as ReceivableShowLike & {
                      title: string;
                      venue: string | null;
                      city: string | null;
                    };
                    return (
                      <li
                        key={info.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/shows/${info.id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {info.title}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {formatDate(info.date)}
                            {info.venue
                              ? ` · ${info.venue}`
                              : info.city
                                ? ` · ${info.city}`
                                : ""}
                            {" · "}
                            <span className={BUCKET_TEXT[a.bucket]}>
                              {daysLabel(a.daysOutstanding)}
                            </span>
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-gray-900">
                          {formatMoney(a.row.outstanding)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <p className="text-xs text-gray-400">
            Cada show com saldo em aberto é atribuído ao contato responsável pelo pagamento
            (contratante/promoter antes da casa). O atraso conta os dias desde a data do show;
            o atraso médio pondera os shows pelo valor em aberto. Shows sem contato vinculado
            caem em &quot;Sem contratante&quot;. Para cobrar (e-mail/WhatsApp) ou quitar, use{" "}
            <Link href="/shows/a-receber" className="text-brand-700 hover:underline">
              Cachês a receber
            </Link>
            . Baldes de atraso: {Object.values(RECEIVABLE_AGE_BUCKET_LABELS).join(" · ")}.
          </p>
        </>
      )}
    </div>
  );
}
