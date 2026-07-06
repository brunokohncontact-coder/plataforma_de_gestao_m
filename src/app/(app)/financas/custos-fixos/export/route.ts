import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { recurringExpenses, type TxLike } from "@/lib/finance";
import { recurringExpensesToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os custos fixos (despesas recorrentes: conta típica/mês, meses, última,
// total e situação por categoria) em CSV — espelha a página
// `/financas/custos-fixos`. Mesma consulta (só EXPENSE) e mesmo `recurringExpenses`
// da página. A camada pura está em `@/lib/finance` e `@/lib/csv`
// (`recurringExpensesToCsv`), ambas testadas.
export async function GET() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: "EXPENSE" },
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

  const csv = recurringExpensesToCsv(recurringExpenses(txs));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "custos-fixos.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
