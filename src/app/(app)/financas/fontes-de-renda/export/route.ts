import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  incomeMix,
  incomeMixYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
} from "@/lib/finance";
import { incomeMixToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta as fontes de renda (mix de receitas por categoria) em CSV — espelha a
// página `/financas/fontes-de-renda`, incluindo o recorte por ano (`?ano=`). A
// camada pura está em `@/lib/finance` (`incomeMix`) e `@/lib/csv`
// (`incomeMixToCsv`), ambas testadas; aqui só fazemos a consulta, aplicamos o
// mesmo recorte da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  // Mesmo recorte por ano da página: anos só das receitas (`incomeMixYears`),
  // filtro genérico da D108 sobre as transações cruas (têm `date: Date`).
  const availableYears = incomeMixYears(
    transactions.map((t) => ({
      type: t.type as TxLike["type"],
      amount: t.amount,
      category: t.category,
      date: t.date,
      received: t.received,
      showId: t.showId,
    })),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodTxs = filterShowsByYear(transactions, yearFilter);

  const allTxs: TxLike[] = periodTxs.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const mix = incomeMix(allTxs);
  const csv = incomeMixToCsv(mix);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `fontes-de-renda-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
