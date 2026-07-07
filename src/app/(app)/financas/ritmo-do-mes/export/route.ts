import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { currentMonthPace, parseBurnWindow, type TxLike } from "@/lib/finance";
import { monthPaceToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o "ritmo do mês corrente" (projeção pro-rata × mês típico) em CSV —
// espelha a tabela "Projeção do mês × mês típico" de `/financas/ritmo-do-mes`,
// incluindo a janela do mês típico parametrizável (`?meses=`, saneada por
// `parseBurnWindow`, a mesma da página). A camada pura está em `@/lib/finance`
// (`currentMonthPace`) e `@/lib/csv` (`monthPaceToCsv`), ambas testadas; aqui só
// fazemos a consulta, aplicamos a mesma janela da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const windowMonths = parseBurnWindow(req.nextUrl.searchParams.get("meses") ?? undefined);

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

  const pace = currentMonthPace(txs, { months: windowMonths });
  const csv = monthPaceToCsv(pace);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `ritmo-do-mes-${pace.month}-${windowMonths}m.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
