import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { formatBRL } from "@/lib/domain/money";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { contact: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shows</h1>
        <Link href="/shows/new" className="btn-primary">
          + Novo show
        </Link>
      </div>

      {shows.length === 0 ? (
        <div className="card text-center text-slate-500">
          <p className="mb-3">Nenhum show ainda.</p>
          <Link href="/shows/new" className="btn-primary">
            Cadastrar o primeiro show
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {shows.map((show) => (
            <Link
              key={show.id}
              href={`/shows/${show.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 hover:border-brand/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{show.title}</span>
                  <StatusBadge status={show.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(show.date)}
                  {show.venue ? ` · ${show.venue}` : ""}
                  {show.city ? ` · ${show.city}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatBRL(show.fee)}</p>
                <p className="text-xs text-slate-400">
                  {show.feePaid ? "Cachê recebido" : "Cachê pendente"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
