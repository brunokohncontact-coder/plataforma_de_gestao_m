import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { monthlySeasonality, type TxLike } from "@/lib/finance";
import { monthlySeasonalityToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a sazonalidade financeira por mês do ano (jan→dez, média por ano-ativo)
// em CSV — espelha a página `/financas/sazonalidade`. A camada pura está em
// `@/lib/finance` (`monthlySeasonality`) e `@/lib/csv` (`monthlySeasonalityToCsv`),
// ambas testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
export async function GET() {
  const user = await requireUser();

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

  const seasonality = monthlySeasonality(allTxs);
  const csv = monthlySeasonalityToCsv(seasonality);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sazonalidade-financeira.csv"',
      "Cache-Control": "no-store",
    },
  });
}
