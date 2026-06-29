import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cashFlowByMonth, parseBurnWindow, type TxLike } from "@/lib/finance";
import { cashFlowToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o fluxo de caixa realizado mês a mês (a textura por trás do burn rate)
// em CSV — espelha a tira "Cenário alternativo" de `/financas/folego-de-caixa`,
// incluindo a janela parametrizável (`?meses=`, saneada por `parseBurnWindow`).
// A camada pura está em `@/lib/finance` (`cashFlowByMonth`) e `@/lib/csv`
// (`cashFlowToCsv`), ambas testadas; aqui só fazemos a consulta, aplicamos a
// mesma janela da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const burnWindow = parseBurnWindow(req.nextUrl.searchParams.get("meses") ?? undefined);

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

  const months = cashFlowByMonth(txs, { months: burnWindow });
  const csv = cashFlowToCsv(months);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `fluxo-de-caixa-mensal-${burnWindow}m.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
