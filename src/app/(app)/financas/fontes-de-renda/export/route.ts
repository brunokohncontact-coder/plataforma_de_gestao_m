import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { incomeMix, type TxLike } from "@/lib/finance";
import { incomeMixToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta as fontes de renda (mix de receitas por categoria) em CSV — espelha a
// página `/financas/fontes-de-renda`. A camada pura está em `@/lib/finance`
// (`incomeMix`) e `@/lib/csv` (`incomeMixToCsv`), ambas testadas; aqui só fazemos
// a consulta e embrulhamos no HTTP.
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

  const mix = incomeMix(allTxs);
  const csv = incomeMixToCsv(mix);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fontes-de-renda.csv"',
      "Cache-Control": "no-store",
    },
  });
}
