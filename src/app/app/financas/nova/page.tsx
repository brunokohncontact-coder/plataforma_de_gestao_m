import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { TransactionForm } from "@/components/TransactionForm";
import { createTransactionAction } from "@/app/actions/transactions";
import { toDateInputValue } from "@/lib/labels";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ showId?: string }>;
}) {
  const user = await requireUser();
  const { showId } = await searchParams;
  const shows = await db.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <Link href="/app/financas" className="text-sm text-brand-600 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-gray-900">Nova transação</h1>
      <div className="card">
        <TransactionForm
          action={createTransactionAction}
          shows={shows}
          submitLabel="Salvar transação"
          initial={{
            date: toDateInputValue(new Date()),
            showId: showId ?? "",
            type: "EXPENSE",
          }}
        />
      </div>
    </div>
  );
}
