import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { projectCashflow, parseCashflowHorizon, type TxLike } from "@/lib/finance";
import { cashflowProjectionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a projeção de caixa mês a mês (o que está a receber e a pagar, com o
// saldo acumulado) em CSV — espelha a tabela "Mês a mês" de
// `/financas/fluxo-de-caixa`, incluindo o horizonte parametrizável (`?meses=`,
// normalizado por `parseCashflowHorizon`, os mesmos 3/6/12/24 da página). A
// camada pura está em `@/lib/finance` (`projectCashflow`) e `@/lib/csv`
// (`cashflowProjectionToCsv`), ambas testadas; aqui só fazemos a consulta,
// aplicamos o mesmo horizonte da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const horizon = parseCashflowHorizon(req.nextUrl.searchParams.get("meses") ?? undefined);

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

  const projection = projectCashflow(txs, { months: horizon });
  const csv = cashflowProjectionToCsv(projection);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `fluxo-de-caixa-projetado-${horizon}m.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
