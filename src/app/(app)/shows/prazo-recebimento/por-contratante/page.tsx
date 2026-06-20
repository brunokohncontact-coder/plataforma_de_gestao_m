import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  paymentLagByContact,
  type PaymentSpeedBucketKey,
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

/** Texto pt-BR para um prazo em dias (negativo = adiantado). */
function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} d adiantado`;
  if (days === 0) return "no dia";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

function roleLabel(role: string): string {
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? CONTACT_ROLE_LABELS.OTHER;
}

const BUCKET_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "bg-emerald-400",
  d7: "bg-emerald-400",
  d30: "bg-amber-400",
  d60: "bg-orange-400",
  slow: "bg-red-400",
};

const BUCKET_TEXT_TONES: Record<PaymentSpeedBucketKey, string> = {
  onTime: "text-emerald-600",
  d7: "text-emerald-600",
  d30: "text-amber-600",
  d60: "text-orange-600",
  slow: "text-red-600",
};

export default async function PaymentLagByContactPage() {
  const user = await requireUser();

  // Shows não cancelados (a data deles é a âncora do prazo) com os contatos
  // vinculados, e as receitas já recebidas. Quem paga é escolhido por papel
  // (pickPayerContact); a agregação e o prazo ponderado ficam na lógica pura.
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      include: { contacts: { include: { contact: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", received: true, showId: { not: null } },
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
  const getPayer = (show: ShowRow): PayerContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked
      ? { id: picked.id, name: picked.name, role: picked.role }
      : null;
  };

  const lag = paymentLagByContact(
    shows as (ReceivableShowLike & ShowRow)[],
    txs,
    getPayer as (s: ReceivableShowLike & ShowRow) => PayerContact | null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prazo de recebimento por contratante</h1>
          <p className="text-sm text-gray-500">
            Quem te paga rápido e quem te deixa esperando. Quebra o{" "}
            <Link href="/shows/prazo-recebimento" className="text-brand-700 hover:underline">
              prazo de recebimento
            </Link>{" "}
            por quem responde pelo pagamento de cada show.
          </p>
        </div>
        <Link href="/shows/prazo-recebimento" className="btn-secondary">
          ← Prazo de recebimento
        </Link>
      </div>

      {lag.contactCount === 0 && lag.rows.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            Ainda não há cachês recebidos e vinculados a shows para medir o prazo por
            contratante.
          </p>
          <Link
            href="/shows/a-receber"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver cachês a receber
          </Link>
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prazo médio (ponderado)
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900">{daysLabel(lag.avgDays)}</p>
              <p className="mt-1 text-xs text-gray-400">
                {lag.contactCount}{" "}
                {lag.contactCount === 1 ? "contratante" : "contratantes"} ·{" "}
                {formatMoney(lag.totalReceived)} recebidos
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Paga mais rápido
              </p>
              {lag.fastest?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {lag.fastest.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    {daysLabel(lag.fastest.avgDays)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">—</p>
              )}
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Paga mais devagar
              </p>
              {lag.slowest?.contact ? (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {lag.slowest.contact.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-red-600">
                    {daysLabel(lag.slowest.avgDays)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">—</p>
              )}
            </div>
          </div>

          {/* Por contratante, do mais lento ao mais rápido */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Recebido</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Prazo médio</th>
                  <th className="px-4 py-3 text-right font-medium">Pior prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lag.rows.map((r) => (
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
                        {pct(r.share)} do recebido
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatMoney(r.received)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.showCount}</td>
                    <td
                      className={
                        "px-4 py-3 text-right font-medium " + BUCKET_TEXT_TONES[r.bucket]
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className={"h-2 w-2 rounded-full " + BUCKET_TONES[r.bucket]} />
                        {daysLabel(r.avgDays)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {daysLabel(r.lastDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Detalhe: shows de cada contratante (lento → rápido) */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Shows por contratante</h2>
            {lag.rows.map((r) => (
              <div key={r.contact?.id ?? "__none__"} className="card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">
                    {r.contact ? r.contact.name : "Sem contratante"}
                  </p>
                  <p className={"text-sm font-semibold " + BUCKET_TEXT_TONES[r.bucket]}>
                    {daysLabel(r.avgDays)} em média
                  </p>
                </div>
                <ul className="divide-y divide-gray-100 text-sm">
                  {r.shows.map((s) => {
                    const info = s.show as ReceivableShowLike & {
                      title: string;
                      venue: string | null;
                      city: string | null;
                    };
                    return (
                      <li key={info.id} className="flex items-center justify-between gap-3 py-2">
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
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-emerald-600">
                            {formatMoney(s.received)}
                          </p>
                          <p className="text-xs text-gray-400">{daysLabel(s.avgDays)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <p className="text-xs text-gray-400">
            Cada show é atribuído ao contato responsável pelo pagamento (contratante/promoter
            antes da casa). O prazo de cada contratante pondera os shows pelo valor recebido.
            Shows sem contato vinculado caem em &quot;Sem contratante&quot;. Considera só
            receitas já recebidas e vinculadas a um show.
          </p>
        </>
      )}
    </div>
  );
}
