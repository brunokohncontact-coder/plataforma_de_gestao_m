import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { SHOW_STATUS_LABELS, SHOW_STATUS_COLORS, type ShowStatus } from "@/lib/domain";
import { ShowsViewToggle } from "@/components/ShowsViewToggle";

export const dynamic = "force-dynamic";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shows</h1>
        <div className="flex items-center gap-3">
          <ShowsViewToggle active="lista" />
          <Link href="/shows/novo" className="btn-primary">
            + Novo show
          </Link>
        </div>
      </div>

      {shows.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Você ainda não cadastrou shows.</p>
          <Link href="/shows/novo" className="mt-3 inline-block text-brand-700 hover:underline">
            Cadastrar o primeiro
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <ul className="divide-y divide-gray-100">
            {shows.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/shows/${s.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(s.date)}
                      {s.venue ? ` · ${s.venue}` : ""}
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3 whitespace-nowrap">
                    {s.fee > 0 && (
                      <span className="hidden text-sm text-gray-600 sm:inline">
                        {formatMoney(s.fee)}
                      </span>
                    )}
                    <span className={"badge " + SHOW_STATUS_COLORS[s.status as ShowStatus]}>
                      {SHOW_STATUS_LABELS[s.status as ShowStatus]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
