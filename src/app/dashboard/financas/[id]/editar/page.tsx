import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceShows } from "@/lib/queries";
import { Card } from "@/components/ui";
import { TransactionForm } from "../../TransactionForm";
import { updateTransaction } from "../../actions";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [tx, shows] = await Promise.all([
    prisma.transaction.findFirst({ where: { id, workspaceId: user.workspaceId } }),
    getWorkspaceShows(user.workspaceId),
  ]);
  if (!tx) notFound();

  const action = updateTransaction.bind(null, tx.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/financas" className="text-sm text-slate-500 hover:underline">
          ← Voltar para finanças
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Editar transação</h1>
      </div>
      <Card>
        <TransactionForm
          action={action}
          shows={shows.map((s) => ({ id: s.id, title: s.title }))}
          submitLabel="Salvar alterações"
          defaults={{
            type: tx.type,
            category: tx.category,
            description: tx.description,
            amount: tx.amount,
            date: tx.date,
            status: tx.status,
            showId: tx.showId,
          }}
        />
      </Card>
    </div>
  );
}
