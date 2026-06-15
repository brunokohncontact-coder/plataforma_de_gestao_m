import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TransactionForm } from "@/components/TransactionForm";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: { showId?: string; returnTo?: string };
}) {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  const lockedShowId = searchParams.showId;
  const lockedShow = lockedShowId
    ? shows.find((s) => s.id === lockedShowId)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={searchParams.returnTo || "/financas"} className="text-sm text-slate-500">
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nova transação</h1>
        {lockedShow && (
          <p className="text-sm text-slate-500">
            Vinculada ao show: <strong>{lockedShow.title}</strong>
          </p>
        )}
      </div>
      <div className="card">
        <TransactionForm
          shows={shows}
          lockedShowId={lockedShow ? lockedShowId : undefined}
          returnTo={searchParams.returnTo}
        />
      </div>
    </div>
  );
}
