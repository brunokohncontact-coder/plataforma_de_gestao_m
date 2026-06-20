import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clientRetention, type ContactRankLike } from "@/lib/contacts";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface RetentionContact extends ContactRankLike {
  role: string;
}

function pct(value: number | null): string {
  return value == null ? "—" : `${(value * 100).toFixed(0)}%`;
}

export default async function ContatosRetencaoPage() {
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
    contact: { id: c.id, name: c.name, role: c.role } as RetentionContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const retention = clientRetention(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fidelização de contratantes</h1>
          <p className="text-sm text-gray-500">
            Quanto da sua agenda vem de quem volta a te contratar. Um contratante é
            recorrente quando tem 2 ou mais shows não cancelados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contatos/ranking" className="btn-secondary">
            Ranking
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {retention.totalClients === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum contato vinculado a shows ainda.</p>
          <p className="mt-1 text-sm">
            Vincule contatos aos seus shows na tela de detalhe do show para medir a
            fidelização.
          </p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Taxa de recompra"
              value={pct(retention.repeatRate)}
              hint={`${retention.recurringClients} de ${retention.totalClients} ${
                retention.totalClients === 1 ? "contratante" : "contratantes"
              } voltaram`}
              tone="brand"
            />
            <Stat
              label="Receita de recorrentes"
              value={pct(retention.recurringFeeShare)}
              hint={`${formatMoney(retention.recurringFee)} de ${formatMoney(
                retention.totalFee,
              )}`}
              tone="emerald"
            />
            <Stat
              label="Contratantes únicos"
              value={String(retention.oneTimeClients)}
              hint="apenas 1 show — candidatos a follow-up"
              tone="amber"
            />
            <Stat
              label="Shows por contratante"
              value={retention.avgShowsPerClient.toFixed(1)}
              hint={`${retention.totalShows} shows · ${retention.totalClients} ${
                retention.totalClients === 1 ? "contratante" : "contratantes"
              }`}
              tone="gray"
            />
          </div>

          {retention.mostLoyal && retention.mostLoyal.recurring && (
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Mais fiel
              </p>
              <Link
                href={`/contatos/${retention.mostLoyal.contact.id}`}
                className="mt-1 block truncate font-medium text-brand-700 hover:underline"
              >
                {retention.mostLoyal.contact.name}
              </Link>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {retention.mostLoyal.activeShows} shows
                {retention.mostLoyal.totalFee > 0 && (
                  <span className="ml-2 text-sm font-normal text-emerald-600">
                    {formatMoney(retention.mostLoyal.totalFee)}
                  </span>
                )}
              </p>
            </div>
          )}

          <section className="card p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-semibold">
                Contratantes recorrentes
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {retention.recurringClients}
                </span>
              </h2>
            </div>
            {retention.recurring.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-gray-500">
                Nenhum contratante voltou ainda — todos os {retention.totalClients}{" "}
                tiveram apenas um show. Cada show realizado é uma chance de fidelizar:
                veja quem chamar de volta em{" "}
                <Link href="/contatos/reativar" className="text-brand-700 hover:underline">
                  Reativar
                </Link>
                .
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 font-medium">Contratante</th>
                      <th className="px-4 py-3 text-right font-medium">Shows</th>
                      <th className="px-4 py-3 text-right font-medium">Cachê total</th>
                      <th className="px-4 py-3 text-right font-medium">Último show</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {retention.recurring.map(
                      ({ contact, activeShows, totalFee, lastShowDate }) => (
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
                                {CONTACT_ROLE_LABELS[contact.role as ContactRole] ??
                                  contact.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700">
                            {activeShows}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                            {totalFee > 0 ? formatMoney(totalFee) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            {lastShowDate ? formatDate(lastShowDate) : "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-gray-400">
            O cachê é por contato: um show com vários contatos conta para cada um. Shows
            cancelados não entram. Inclui shows futuros já confirmados (uma re-contratação
            agendada também é fidelização).
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "brand" | "emerald" | "amber" | "gray";
}) {
  const tones: Record<string, string> = {
    brand: "text-brand-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-2xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
