import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toDateInputValue } from "@/lib/dates";
import TransactionForm from "../../TransactionForm";
import { updateTransaction } from "../../actions";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [tx, shows] = await Promise.all([
    prisma.transaction.findFirst({ where: { id, userId: user.id } }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, title: true },
    }),
  ]);
  if (!tx) notFound();

  const update = updateTransaction.bind(null, tx.id);

  return (
    <div>
      <Link href="/finances" className="text-sm text-slate-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">Editar transação</h1>
      <TransactionForm
        action={update}
        shows={shows}
        submitLabel="Salvar alterações"
        initial={{
          type: tx.type,
          amount: (tx.amountCents / 100).toFixed(2),
          category: tx.category,
          date: toDateInputValue(tx.date),
          description: tx.description ?? "",
          received: tx.received,
          showId: tx.showId ?? "",
        }}
      />
    </div>
  );
}
