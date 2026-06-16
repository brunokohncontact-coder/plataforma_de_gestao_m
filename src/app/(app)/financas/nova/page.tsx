import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../TransactionForm";
import { createTransactionAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: { showId?: string };
}) {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  const defaultShowId = searchParams.showId;
  const cancelHref = defaultShowId ? `/shows/${defaultShowId}` : "/financas";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={cancelHref} className="text-sm text-gray-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nova transação</h1>
      </div>
      <div className="card">
        <TransactionForm
          action={createTransactionAction}
          shows={shows}
          defaultShowId={defaultShowId}
          cancelHref={cancelHref}
        />
      </div>
    </div>
  );
}
