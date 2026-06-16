import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import {
  PageHeader,
  LinkButton,
  ShowStatusBadge,
  EmptyState,
} from "@/components/ui";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { contact: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Shows"
        subtitle="Sua agenda de apresentações."
        action={<LinkButton href="/shows/new">+ Novo show</LinkButton>}
      />

      {shows.length === 0 ? (
        <EmptyState
          title="Nenhum show ainda"
          description="Cadastre seu primeiro show para acompanhar agenda, cachê e rentabilidade."
          action={<LinkButton href="/shows/new">+ Novo show</LinkButton>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Show</th>
                <th className="hidden px-4 py-3 sm:table-cell">Local</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Cachê</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shows.map((show) => (
                <tr key={show.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(show.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/shows/${show.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {show.title}
                    </Link>
                    {show.contact && (
                      <div className="text-xs text-slate-400">
                        {show.contact.name}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {[show.venue, show.city].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ShowStatusBadge status={show.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {formatBRL(show.fee)}
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
