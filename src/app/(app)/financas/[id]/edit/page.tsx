import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TransactionForm } from "@/components/TransactionForm";

export default async function EditTransactionPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const [tx, shows] = await Promise.all([
    prisma.transaction.findFirst({ where: { id: params.id, userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!tx) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/financas" className="text-sm text-slate-500">
          ← Finanças
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Editar transação</h1>
      </div>
      <div className="card">
        <TransactionForm
          shows={shows}
          initial={{
            id: tx.id,
            type: tx.type,
            amountCents: tx.amountCents,
            category: tx.category,
            description: tx.description,
            date: tx.date,
            settled: tx.settled,
            showId: tx.showId,
          }}
        />
      </div>
    </div>
  );
}
