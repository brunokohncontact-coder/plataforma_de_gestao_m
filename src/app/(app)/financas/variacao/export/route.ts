import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  compareCategoryReports,
  filterTransactions,
  type TxLike,
} from "@/lib/finance";
import { categoryVariationToCsv } from "@/lib/csv";
import { parseMonthKey, shiftMonth, monthKey as monthKeyOf } from "@/lib/calendar";

export const dynamic = "force-dynamic";

// Exporta a variação por categoria (mês de referência vs. mês anterior) em CSV —
// espelha a página `/financas/variacao`. Mesma leitura de mês (?mes=YYYY-MM),
// mesma consulta e mesmo `compareCategoryReports`; a camada pura está em
// `@/lib/finance` e `@/lib/csv` (`categoryVariationToCsv`), ambas testadas.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  // Mês de referência (fallback: mês atual) — mesmos helpers da página.
  const { year, month } = parseMonthKey(req.nextUrl.searchParams.get("mes"));
  const key = monthKeyOf(year, month);
  const prev = shiftMonth(year, month, -1);
  const prevKey = monthKeyOf(prev.year, prev.month);

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

  const current = filterTransactions(allTxs, { month: key });
  const previous = filterTransactions(allTxs, { month: prevKey });
  const csv = categoryVariationToCsv(compareCategoryReports(current, previous));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `variacao-por-categoria-${key}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
