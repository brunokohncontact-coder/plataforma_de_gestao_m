import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { recurringExpenses, type TxLike } from "@/lib/finance";
import { recurringExpensesToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os custos fixos recorrentes em CSV — espelha a tabela "Despesas
// recorrentes" da página `/financas/custos-fixos`. A camada pura está em
// `@/lib/finance` (`recurringExpenses`) e `@/lib/csv` (`recurringExpensesToCsv`),
// ambas testadas; aqui só consultamos as despesas e embrulhamos no HTTP. Sem
// `?ano=`: a detecção de recorrência é um retrato de todo o histórico de despesas
// (igual à página).
export async function GET() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: "EXPENSE" },
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

  const report = recurringExpenses(allTxs);
  const csv = recurringExpensesToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="custos-fixos.csv"',
      "Cache-Control": "no-store",
    },
  });
}
