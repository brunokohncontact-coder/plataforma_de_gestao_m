import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findContactsToReengage, type ContactRankLike } from "@/lib/contacts";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface ReengageContact extends ContactRankLike {
  role: string;
  email: string | null;
  phone: string | null;
}

/** "há 2 meses", "há 68 dias", etc. — leitura rápida do tempo sem contato. */
function describeStaleness(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `há ${years} ${years === 1 ? "ano" : "anos"}`;
  }
  if (days >= 60) {
    const months = Math.floor(days / 30);
    return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  }
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export default async function ContatosReativarPage() {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      phone: true,
      shows: {
        select: {
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: {
      id: c.id,
      name: c.name,
      role: c.role,
      email: c.email,
      phone: c.phone,
    } as ReengageContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const list = findContactsToReengage(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contatos para reativar</h1>
          <p className="text-sm text-gray-500">
            Quem já tocou com você, está sem nada agendado e há mais de{" "}
            {list.staleDays} dias sem show. Um alô pode render o próximo gig.
          </p>
        </div>
        <Link href="/contatos" className="btn-secondary">
          ← Contatos
        </Link>
      </div>

      {list.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum contato dormente no momento. 🎶</p>
          <p className="mt-1 text-sm">
            Aparecem aqui os contatos com shows passados, sem nada marcado e há mais de{" "}
            {list.staleDays} dias sem tocar.
          </p>
          <Link
            href="/contatos/ranking"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver ranking de contatos
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Contatos para reativar" value={String(list.count)} />
            <div className="card sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prioridade
              </p>
              <Link
                href={`/contatos/${list.rows[0].contact.id}`}
                className="mt-1 block truncate font-medium text-brand-700 hover:underline"
              >
                {list.rows[0].contact.name}
              </Link>
              <p className="mt-1 text-sm text-gray-500">
                Último show {describeStaleness(list.rows[0].daysSinceLastShow)} ·{" "}
                {formatMoney(list.rows[0].totalFee)} em cachê histórico
              </p>
            </div>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 text-right font-medium">Último show</th>
                  <th className="px-4 py-3 text-right font-medium">Sem contato</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê histórico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.rows.map(
                  ({ contact, lastShowDate, daysSinceLastShow, pastShows, totalFee }) => {
                    const c = contact as ReengageContact;
                    const reach = c.email
                      ? `mailto:${c.email}`
                      : c.phone
                        ? `tel:${c.phone.replace(/[^+\d]/g, "")}`
                        : null;
                    return (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/contatos/${contact.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            {contact.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="badge bg-brand-50 text-brand-700">
                              {CONTACT_ROLE_LABELS[c.role as ContactRole] ?? c.role}
                            </span>
                            {reach && (
                              <a
                                href={reach}
                                className="text-xs text-gray-500 hover:text-brand-700 hover:underline"
                              >
                                {c.email ? "✉ E-mail" : "☎ Ligar"}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {formatDate(lastShowDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-amber-600">
                          {describeStaleness(daysSinceLastShow)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{pastShows}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {totalFee > 0 ? formatMoney(totalFee) : "—"}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Ordenado pelos mais esquecidos primeiro (mais tempo sem show), desempatando
            pelo cachê histórico. Shows cancelados não contam. O cachê é por contato:
            um show com vários contatos conta para cada um.
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
