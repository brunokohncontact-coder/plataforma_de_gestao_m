import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TransactionForm } from "../../TransactionForm";
import { updateTransactionAction } from "../../actions";
import { centsToInputValue } from "@/lib/format";
import type { TransactionType } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({ params }: { params: { id: string } }) {
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

  const action = updateTransactionAction.bind(null, tx.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Editar transação</h1>
      </div>
      <div className="card">
        <TransactionForm
          action={action}
          shows={shows}
          cancelHref="/financas"
          submitLabel="Salvar alterações"
          values={{
            type: tx.type as TransactionType,
            description: tx.description,
            amount: centsToInputValue(tx.amount),
            date: tx.date.toISOString().slice(0, 10),
            category: tx.category,
            received: tx.received,
            showId: tx.showId,
          }}
        />
      </div>
    </div>
  );
}
