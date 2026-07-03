import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  computeBreakEven,
  type TxLike,
  type BreakEvenShowLike,
} from "@/lib/finance";
import { breakEvenToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o ponto de equilíbrio (shows/mês para cobrir o custo fixo) em CSV —
// espelha os números de `/financas/ponto-de-equilibrio`. É uma fotografia do
// estado atual (o corte é sempre "hoje"). A camada pura está em `@/lib/finance`
// (`computeBreakEven`) e `@/lib/csv` (`breakEvenToCsv`), ambas testadas; aqui só
// consultamos e embrulhamos no HTTP. Quando não há custo fixo detectado
// (`monthlyFixedCost <= 0`), não há o que exportar — a página nem mostra o botão;
// caso a rota seja acessada direto, respondemos 404.
export async function GET() {
  const user = await requireUser();

  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    }),
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, fee: true, status: true, date: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const showLikes: BreakEvenShowLike[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const analysis = computeBreakEven(showLikes, txs);

  if (analysis.monthlyFixedCost <= 0) {
    return new NextResponse("Sem custos fixos detectados para exportar.", {
      status: 404,
    });
  }

  const csv = breakEvenToCsv(analysis);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "ponto-de-equilibrio.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
