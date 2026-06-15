import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { SHOW_STATUS_BADGE, SHOW_STATUS_LABELS } from "@/lib/labels";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { contact: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shows</h1>
        <Link href="/shows/new" className="btn-primary">+ Novo show</Link>
      </div>

      {shows.length === 0 ? (
        <div className="card text-center text-slate-500">
          <p>Nenhum show ainda.</p>
          <Link href="/shows/new" className="mt-3 inline-block text-brand-600 hover:underline">
            Cadastrar o primeiro show
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {shows.map((show) => (
            <li key={show.id}>
              <Link
                href={`/shows/${show.id}`}
                className="card flex items-center justify-between hover:border-brand-300"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{show.title}</span>
                    <span className={`badge ${SHOW_STATUS_BADGE[show.status] ?? ""}`}>
                      {SHOW_STATUS_LABELS[show.status] ?? show.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {formatDateTime(show.date)}
                    {show.venue ? ` · ${show.venue}` : ""}
                    {show.city ? ` · ${show.city}` : ""}
                  </p>
                </div>
                <div className="ml-4 shrink-0 text-right text-sm font-medium text-slate-700">
                  {formatCents(show.feeCents)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
