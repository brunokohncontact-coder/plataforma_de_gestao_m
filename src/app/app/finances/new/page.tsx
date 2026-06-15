import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { TransactionForm } from "@/components/TransactionForm";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ showId?: string }>;
}) {
  const userId = await requireUserId();
  const { showId } = await searchParams;
  const shows = await prisma.show.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/finances" className="text-sm text-brand-600 hover:underline">
          ← Finanças
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nova transação</h1>
      </div>
      <div className="card">
        <TransactionForm shows={shows} defaultShowId={showId} />
      </div>
    </div>
  );
}
