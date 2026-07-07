import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findVenuesToReengage,
  parseReengageWindow,
  type VenueReengageShowLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { ReengageWindowPicker } from "@/components/ReengageWindowPicker";

export const dynamic = "force-dynamic";

/** "há 2 meses", "há 136 dias", etc. — leitura rápida do tempo sem tocar. */
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

export default async function LocaisRevisitarPage({
  searchParams,
}: {
  searchParams?: { dias?: string };
}) {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { status: true, venue: true, date: true, fee: true },
  });

  // Janela de dormência configurável via `?dias=` (a hipótese do 90 fixo, ver
  // D231/bloqueios). A regra continua pura em `findVenuesToReengage`.
  const staleDays = parseReengageWindow(searchParams?.dias);
  const list = findVenuesToReengage(shows as VenueReengageShowLike[], { staleDays });
  const exportHref = `/shows/locais/revisitar/export?dias=${staleDays}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Casas para revisitar</h1>
          <p className="text-sm text-gray-500">
            Locais/palcos onde você já tocou, está sem nada agendado e há mais de{" "}
            {list.staleDays} dias sem show. Planeje um retorno antes que a casa esfrie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {list.count > 0 && (
            <a href={exportHref} className="btn-secondary" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/locais" className="btn-secondary">
            ← Rentabilidade por local
          </Link>
        </div>
      </div>

      <ReengageWindowPicker active={staleDays} basePath="/shows/locais/revisitar" />

      {list.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma casa esfriando no momento. 🎶</p>
          <p className="mt-1 text-sm">
            Aparecem aqui os locais com shows passados, sem nada marcado e há mais de{" "}
            {list.staleDays} dias sem tocar.
          </p>
          <Link
            href="/shows/locais"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver rentabilidade por local
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Casas para revisitar" value={String(list.count)} />
            <div className="card sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Prioridade
              </p>
              <p className="mt-1 block truncate font-medium text-brand-700">
                {list.rows[0].name}
              </p>
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
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 text-right font-medium">Último show</th>
                  <th className="px-4 py-3 text-right font-medium">Sem tocar</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê histórico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.rows.map(
                  ({ key, name, lastShowDate, daysSinceLastShow, pastShows, totalFee }) => (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
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
                  ),
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Ordenado pelas mais esquecidas primeiro (mais tempo sem show), desempatando
            pelo cachê histórico da casa. Shows cancelados e sem local não contam. Uma
            casa some daqui assim que você agenda um novo show nela.
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
