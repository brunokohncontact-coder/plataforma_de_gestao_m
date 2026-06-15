import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";
import { ShowStatusBadge } from "@/components/badges";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { _count: { select: { transactions: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shows</h1>
          <p className="mt-1 text-sm text-slate-600">Sua agenda de apresentações.</p>
        </div>
        <Link href="/app/shows/new" className="btn-primary">
          + Novo show
        </Link>
      </div>

      {shows.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-slate-500">Você ainda não cadastrou shows.</p>
          <Link href="/app/shows/new" className="btn-primary mt-4">
            Agendar primeiro show
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Show / Local</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Cachê</th>
              </tr>
            </thead>
            <tbody>
              {shows.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatDate(s.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/shows/${s.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {s.title || s.venue}
                    </Link>
                    {s.title && <p className="text-xs text-slate-500">{s.venue}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.city}</td>
                  <td className="px-4 py-3">
                    <ShowStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatBRL(s.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
