import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWorkspaceShows } from "@/lib/queries";
import { showProfitAndLoss } from "@/lib/finance";
import { formatBRL, formatDate } from "@/lib/money";
import { Badge, Button, Card } from "@/components/ui";
import { SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain";
import type { TransactionType, TransactionStatus } from "@/lib/domain";

export default async function ShowsPage() {
  const user = await requireUser();
  const shows = await getWorkspaceShows(user.workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shows</h1>
        <Link href="/dashboard/shows/novo">
          <Button>+ Novo show</Button>
        </Link>
      </div>

      {shows.length === 0 ? (
        <Card>
          <p className="text-slate-600">
            Nenhum show ainda. Comece adicionando seu primeiro show.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shows.map((s) => {
            const pnl = showProfitAndLoss(
              { id: s.id, feeAgreed: s.feeAgreed },
              s.transactions.map((t) => ({
                type: t.type as TransactionType,
                amount: t.amount,
                date: t.date,
                category: t.category,
                status: t.status as TransactionStatus,
                showId: t.showId,
              })),
            );
            return (
              <Link key={s.id} href={`/dashboard/shows/${s.id}`}>
                <Card className="transition hover:border-brand-300">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{s.title}</h2>
                        <Badge value={s.status} label={SHOW_STATUS_LABELS[s.status as ShowStatus]} />
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatDate(s.date)}
                        {s.venue ? ` · ${s.venue}` : ""}
                        {s.city ? ` · ${s.city}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Resultado</p>
                      <p
                        className={
                          "font-semibold " + (pnl.net >= 0 ? "text-emerald-600" : "text-red-600")
                        }
                      >
                        {formatBRL(pnl.net)}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
