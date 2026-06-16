import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { TransactionForm } from "@/components/TransactionForm";
import { createTransaction } from "../actions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: { showId?: string };
}) {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <PageHeader title="Novo lançamento" subtitle="Registre uma receita ou despesa." />
      <TransactionForm
        action={createTransaction}
        shows={shows}
        defaultShowId={searchParams.showId}
        defaultDate={toDateInputValue(new Date())}
      />
      <p className="mt-4 text-sm">
        <Link href="/transactions" className="text-slate-500 hover:underline">
          ← Voltar para finanças
        </Link>
      </p>
    </div>
  );
}
