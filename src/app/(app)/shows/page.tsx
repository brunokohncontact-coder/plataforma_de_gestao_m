import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { computeShowPnL } from "@/lib/domain/finance";
import { StatusBadge, Money, EmptyState, formatDate } from "@/components/ui";
import { Dialog } from "@/components/Dialog";
import { ShowForm } from "@/components/ShowForm";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { transactions: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shows</h1>
          <p className="text-sm text-slate-500">
            Sua agenda e a rentabilidade de cada show.
          </p>
        </div>
        <Dialog title="Novo show" triggerLabel="+ Novo show">
          <ShowForm />
        </Dialog>
      </div>

      {shows.length === 0 ? (
        <EmptyState
          title="Nenhum show ainda"
          hint="Crie seu primeiro show para começar a acompanhar a agenda e os resultados."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Data</th>
                <th className="hidden px-4 py-3 sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Cachê</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shows.map((s) => {
                const pnl = computeShowPnL(s, s.transactions);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/shows/${s.id}`} className="font-medium text-brand-700">
                        {s.title}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {[s.venue, s.city].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(s.date)}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money value={s.feeAgreed} />
                    </td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
                      <Money value={pnl.plannedResult} signed />
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
