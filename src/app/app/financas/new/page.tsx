import { requireUser } from "@/lib/auth";
import { getShowOptions } from "@/lib/queries";
import { TransactionForm } from "@/components/TransactionForm";
import { createTransactionAction } from "@/app/actions/transactions";
import { toDateInputValue } from "@/lib/format";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: { showId?: string; type?: string };
}) {
  const user = await requireUser();
  const shows = await getShowOptions(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Nova transação</h1>
      <TransactionForm
        action={createTransactionAction}
        shows={shows}
        defaults={{
          date: toDateInputValue(new Date()),
          status: "pending",
          showId: searchParams.showId,
          type: searchParams.type === "expense" ? "expense" : "income",
        }}
      />
    </div>
  );
}
