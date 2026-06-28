import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { expenseMix, type TxLike } from "@/lib/finance";
import { expenseMixToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a composição das despesas (mix de gastos por categoria) em CSV —
// espelha a página `/financas/composicao-despesas`. A camada pura está em
// `@/lib/finance` (`expenseMix`) e `@/lib/csv` (`expenseMixToCsv`), ambas
// testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
export async function GET() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const allTxs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const mix = expenseMix(allTxs);
  const csv = expenseMixToCsv(mix);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="composicao-despesas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
