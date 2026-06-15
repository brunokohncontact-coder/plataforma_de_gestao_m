import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getShowOptions } from "@/lib/queries";
import { TransactionForm } from "@/components/TransactionForm";
import { updateTransactionAction } from "@/app/actions/transactions";
import { toDateInputValue } from "@/lib/format";

export default async function EditTransactionPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!tx) notFound();

  const shows = await getShowOptions(user.id);
  const action = updateTransactionAction.bind(null, tx.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Editar transação</h1>
      <TransactionForm
        action={action}
        shows={shows}
        submitLabel="Salvar alterações"
        defaults={{
          type: tx.type,
          category: tx.category,
          description: tx.description,
          amount: tx.amount,
          date: toDateInputValue(tx.date),
          status: tx.status,
          showId: tx.showId,
        }}
      />
    </div>
  );
}
