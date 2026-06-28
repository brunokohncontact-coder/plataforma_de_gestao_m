import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  expenseMix,
  expenseMixYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
} from "@/lib/finance";
import { expenseMixToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a composição das despesas (mix de gastos por categoria) em CSV —
// espelha a página `/financas/composicao-despesas`, incluindo o recorte por ano
// (`?ano=`). A camada pura está em `@/lib/finance` (`expenseMix`) e `@/lib/csv`
// (`expenseMixToCsv`), ambas testadas; aqui só fazemos a consulta, aplicamos o
// mesmo recorte da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  // Mesmo recorte por ano da página: anos só das despesas (`expenseMixYears`),
  // filtro genérico da D108 sobre as transações cruas (têm `date: Date`).
  const availableYears = expenseMixYears(
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

  const mix = expenseMix(allTxs);
  const csv = expenseMixToCsv(mix);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `composicao-despesas-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
