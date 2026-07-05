import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findCitiesToReengage, type CityReengageShowLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

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

export default async function CidadesRevisitarPage() {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { status: true, city: true, date: true, fee: true },
  });

  const list = findCitiesToReengage(shows as CityReengageShowLike[]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Praças para revisitar</h1>
          <p className="text-sm text-gray-500">
            Cidades onde você já tocou, está sem nada agendado e há mais de{" "}
            {list.staleDays} dias sem show. Planeje um retorno antes que a praça esfrie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {list.count > 0 && (
            <a href="/shows/cidades/revisitar/export" className="btn-secondary">
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/cidades" className="btn-secondary">
            ← Atuação por cidade
          </Link>
        </div>
      </div>

      {list.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma praça esfriando no momento. 🎶</p>
          <p className="mt-1 text-sm">
            Aparecem aqui as cidades com shows passados, sem nada marcado e há mais de{" "}
            {list.staleDays} dias sem tocar.
          </p>
          <Link
            href="/shows/cidades"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver atuação por cidade
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Praças para revisitar" value={String(list.count)} />
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
                  <th className="px-4 py-3 font-medium">Cidade</th>
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
            pelo cachê histórico da praça. Shows cancelados e sem cidade não contam. Uma
            cidade some daqui assim que você agenda um novo show nela.
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
