import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { SHOW_STATUS_LABELS, SHOW_STATUS_BADGE } from "@/lib/labels";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Shows</h1>
        <Link
          href="/shows/new"
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
        >
          + Novo show
        </Link>
      </div>

      {shows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Nenhum show cadastrado. Comece adicionando o primeiro.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Show</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right font-medium">Cachê</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/shows/${s.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {s.title}
                    </Link>
                    {s.city && (
                      <span className="block text-slate-500">{s.city}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(s.date)}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        SHOW_STATUS_BADGE[s.status] ?? ""
                      }`}
                    >
                      {SHOW_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatMoney(s.fee)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
