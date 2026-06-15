import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWorkspaceShows } from "@/lib/queries";
import { Card } from "@/components/ui";
import { TransactionForm } from "../TransactionForm";
import { createTransaction } from "../actions";

export default async function NewTransactionPage() {
  const user = await requireUser();
  const shows = await getWorkspaceShows(user.workspaceId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/financas" className="text-sm text-slate-500 hover:underline">
          ← Voltar para finanças
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nova transação</h1>
      </div>
      <Card>
        <TransactionForm
          action={createTransaction}
          shows={shows.map((s) => ({ id: s.id, title: s.title }))}
          submitLabel="Adicionar"
        />
      </Card>
    </div>
  );
}
