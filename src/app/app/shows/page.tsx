import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/ui";
import {
  SHOW_STATUS_LABELS,
  SHOW_STATUS_COLORS,
  formatDate,
} from "@/lib/labels";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await db.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Shows"
        subtitle="Sua agenda: propostas, confirmados e realizados."
        action={{ href: "/app/shows/novo", label: "+ Novo show" }}
      />

      {shows.length === 0 ? (
        <EmptyState
          title="Nenhum show ainda"
          description="Cadastre seu primeiro show para começar a acompanhar agenda e rentabilidade."
          action={{ href: "/app/shows/novo", label: "+ Novo show" }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Data</th>
                <th className="hidden px-4 py-3 sm:table-cell">Local</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Cachê</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shows.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/shows/${s.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {s.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(s.date)}</td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {[s.venue, s.city].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${SHOW_STATUS_COLORS[s.status]}`}>
                      {SHOW_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatBRL(s.feeCents)}
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
