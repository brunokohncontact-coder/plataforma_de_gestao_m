import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { SHOW_STATUS_BADGE, SHOW_STATUS_LABEL } from "@/lib/labels";

export default async function ShowsPage() {
  const userId = await requireUserId();
  const shows = await prisma.show.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { contact: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shows</h1>
        <Link href="/app/shows/new" className="btn-primary">
          Novo show
        </Link>
      </div>

      {shows.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          Nenhum show ainda.{" "}
          <Link href="/app/shows/new" className="text-brand-600 hover:underline">
            Adicionar o primeiro
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Cachê</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/shows/${s.id}`} className="font-medium text-slate-900 hover:underline">
                      {s.title}
                    </Link>
                    {s.contact && <p className="text-xs text-slate-400">{s.contact.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(s.date)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[s.venue, s.city].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${SHOW_STATUS_BADGE[s.status]}`}>{SHOW_STATUS_LABEL[s.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatMoney(s.feeCents)}
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
