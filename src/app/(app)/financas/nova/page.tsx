import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/domain";
import { TransactionForm, type TransactionFormValues } from "../TransactionForm";
import { createTransactionAction } from "../actions";

export const dynamic = "force-dynamic";

/** "150.00" / "150,00" / "15000" → string aceita pelo MoneyInput; vazio se inválido. */
function sanitizeAmount(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.,]/g, "");
  return cleaned || undefined;
}

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: {
    showId?: string;
    tipo?: string;
    categoria?: string;
    valor?: string;
    descricao?: string;
    data?: string;
  };
}) {
  const user = await requireUser();
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  const defaultShowId = searchParams.showId;
  const cancelHref = defaultShowId ? `/shows/${defaultShowId}` : "/financas";

  // Pré-preenchimento por query string (ex.: "Lançar" um custo fixo a partir de
  // /financas/custos-fixos). Cada parâmetro é validado/saneado; o que não casar
  // é simplesmente ignorado, mantendo o formulário utilizável.
  const type = TRANSACTION_TYPES.includes(searchParams.tipo as TransactionType)
    ? (searchParams.tipo as TransactionType)
    : undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data ?? "")
    ? searchParams.data
    : undefined;
  const prefill: TransactionFormValues = {
    type,
    category: searchParams.categoria?.trim() || undefined,
    description: searchParams.descricao?.trim() || undefined,
    amount: sanitizeAmount(searchParams.valor),
    date,
    showId: defaultShowId,
  };
  const hasPrefill = Object.values(prefill).some((v) => v !== undefined);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={cancelHref} className="text-sm text-gray-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nova transação</h1>
      </div>
      <div className="card">
        <TransactionForm
          action={createTransactionAction}
          shows={shows}
          defaultShowId={defaultShowId}
          cancelHref={cancelHref}
          values={hasPrefill ? prefill : undefined}
        />
      </div>
    </div>
  );
}
