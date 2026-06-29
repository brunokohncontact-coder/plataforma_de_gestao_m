import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { yearlyHistory, type TxLike } from "@/lib/finance";
import { yearlyHistoryToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o crescimento ano a ano (receitas/despesas/resultado por ano + variação)
// em CSV — espelha a página `/financas/crescimento`. Mesma consulta e mesmo
// `yearlyHistory`; é a série inteira por design (sem `?ano=`). A camada pura está
// em `@/lib/finance` e `@/lib/csv` (`yearlyHistoryToCsv`), ambas testadas.
export async function GET() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const csv = yearlyHistoryToCsv(yearlyHistory(txs));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "crescimento-ano-a-ano.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
