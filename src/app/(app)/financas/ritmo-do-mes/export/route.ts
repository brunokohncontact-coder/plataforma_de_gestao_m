import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { currentMonthPace, monthYoYPace, parseBurnWindow, type TxLike } from "@/lib/finance";
import { monthPaceToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o ritmo do mês (projeção do mês corrente vs. mês típico e vs. o mesmo
// mês do ano anterior) em CSV — espelha as duas tabelas de `/financas/ritmo-do-mes`.
// A janela do "mês típico" vem de `?meses=` (saneada por `parseBurnWindow`, D102),
// como na página. A camada pura está em `@/lib/finance` (`currentMonthPace`/
// `monthYoYPace`) e `@/lib/csv` (`monthPaceToCsv`), ambas testadas; aqui só fazemos
// a consulta e embrulhamos no HTTP.
export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const windowMonths = parseBurnWindow(searchParams.get("meses") ?? undefined);

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
  const yoy = monthYoYPace(txs);
  const csv = monthPaceToCsv(pace, yoy);

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
