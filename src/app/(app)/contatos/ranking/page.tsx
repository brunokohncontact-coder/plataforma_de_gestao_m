import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rankContactsByActivity, type ContactRankLike } from "@/lib/contacts";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface RankContact extends ContactRankLike {
  role: string;
}

export default async function ContactsRankingPage() {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      shows: {
        select: {
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as RankContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const ranking = rankContactsByActivity(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ranking de contatos</h1>
          <p className="text-sm text-gray-500">
            Quem mais movimenta sua agenda — shows vinculados e cachê acordado.
            Shows cancelados não somam cachê.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contatos/retencao" className="btn-secondary">
            Fidelização
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {ranking.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum contato vinculado a shows ainda.</p>
          <p className="mt-1 text-sm">
            Vincule contatos aos seus shows na tela de detalhe do show para ver o ranking.
          </p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          {ranking.top && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Contatos com shows" value={String(ranking.count)} />
              <div className="card sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Mais ativo
                </p>
                <Link
                  href={`/contatos/${ranking.top.contact.id}`}
                  className="mt-1 block truncate font-medium text-brand-700 hover:underline"
                >
                  {ranking.top.contact.name}
                </Link>
                <p className="mt-1 text-lg font-bold text-emerald-600">
                  {formatMoney(ranking.top.totalFee)}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    em {ranking.top.activeShows}{" "}
                    {ranking.top.activeShows === 1 ? "show" : "shows"}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Próximos</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê total</th>
                  <th className="px-4 py-3 text-right font-medium">Último show</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ranking.rows.map(({ contact, totalShows, activeShows, upcomingShows, totalFee, lastShowDate }) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/contatos/${contact.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {contact.name}
                      </Link>
                      <div className="mt-0.5">
                        <span className="badge bg-brand-50 text-brand-700">
                          {CONTACT_ROLE_LABELS[contact.role as ContactRole] ?? contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {activeShows}
                      {totalShows !== activeShows && (
                        <span className="text-gray-400"> / {totalShows}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {upcomingShows > 0 ? upcomingShows : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {totalFee > 0 ? formatMoney(totalFee) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {lastShowDate ? formatDate(lastShowDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            A coluna Shows mostra ativos / total (quando há cancelados). O cachê é
            por contato: um show com vários contatos conta para cada um.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
