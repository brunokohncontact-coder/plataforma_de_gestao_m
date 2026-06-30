import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { yearToDatePace, type TxLike } from "@/lib/finance";
import { yearPaceToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o ritmo do ano (acumulado YTD vs. mesmo período do ano anterior) em CSV —
// espelha a tabela "{ano} × {ano-1} (mesmo período)" de `/financas/ritmo-do-ano`.
// É uma fotografia do estado atual (sem `?ano=`): o corte é sempre "hoje". A camada
// pura está em `@/lib/finance` (`yearToDatePace`) e `@/lib/csv` (`yearPaceToCsv`),
// ambas testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
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

  const pace = yearToDatePace(txs);
  const csv = yearPaceToCsv(pace);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `ritmo-do-ano-${pace.year}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
