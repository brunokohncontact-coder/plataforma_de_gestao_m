import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { profitByShow } from "@/lib/finance";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { ShowStatusBadge } from "@/components/badges";

export default async function ShowsPage() {
  const user = await requireUser();
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
    }),
  ]);

  const profits = new Map(profitByShow(shows, transactions).map((p) => [p.showId, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shows</h1>
        <Link href="/shows/new" className="btn-primary">
          + Novo show
        </Link>
      </div>

      {shows.length === 0 ? (
        <div className="card text-center text-slate-500">
          Nenhum show ainda.{" "}
          <Link href="/shows/new" className="font-medium text-brand-600">
            Crie o primeiro
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Data</th>
                <th className="hidden px-4 py-3 sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Cachê</th>
                <th className="px-4 py-3 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shows.map((s) => {
                const p = profits.get(s.id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/shows/${s.id}`} className="font-medium text-brand-700">
                        {s.title}
                      </Link>
                      {s.city && (
                        <p className="text-xs text-slate-400">{s.city}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(s.date)}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <ShowStatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCents(s.feeCents)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        p && p.netCents < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {p ? formatCents(p.netCents) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
