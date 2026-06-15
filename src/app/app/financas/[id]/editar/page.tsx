import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { TransactionForm } from "@/components/TransactionForm";
import { updateTransactionAction } from "@/app/actions/transactions";
import { centsToReais } from "@/lib/money";
import { toDateInputValue } from "@/lib/labels";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [tx, shows] = await Promise.all([
    db.transaction.findFirst({ where: { id, userId: user.id } }),
    db.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!tx) notFound();

  const action = updateTransactionAction.bind(null, tx.id);

  return (
    <div>
      <Link href="/app/financas" className="text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900">Editar transação</h1>
      <div className="card">
        <TransactionForm
          action={action}
          shows={shows}
          submitLabel="Salvar alterações"
          initial={{
            type: tx.type,
            amount: String(centsToReais(tx.amountCents)),
            category: tx.category,
            description: tx.description ?? "",
            date: toDateInputValue(tx.date),
            status: tx.status,
            showId: tx.showId ?? "",
          }}
        />
      </div>
    </div>
  );
}
