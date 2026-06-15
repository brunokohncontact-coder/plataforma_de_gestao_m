import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toDateInputValue } from "@/lib/dates";
import TransactionForm from "../TransactionForm";
import { createTransaction } from "../actions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ showId?: string }>;
}) {
  const user = await requireUser();
  const { showId } = await searchParams;
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <Link href="/finances" className="text-sm text-slate-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">Nova transação</h1>
      <TransactionForm
        action={createTransaction}
        shows={shows}
        submitLabel="Lançar"
        initial={{
          date: toDateInputValue(new Date()),
          showId: showId ?? "",
        }}
      />
    </div>
  );
}
