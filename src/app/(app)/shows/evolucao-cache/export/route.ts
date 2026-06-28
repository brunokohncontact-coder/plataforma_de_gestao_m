import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { feeTrend, type ReceivableShowLike } from "@/lib/finance";
import { feeTrendToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a evolução do cachê (cachê médio realizado mês a mês ao longo do tempo)
// em CSV — espelha a tabela "Cachê médio mês a mês" da página
// `/shows/evolucao-cache`. A camada pura está em `@/lib/finance` (`feeTrend`) e
// `@/lib/csv` (`feeTrendToCsv`), ambas testadas; aqui só fazemos a consulta e
// embrulhamos no HTTP.
export async function GET() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { id: true, date: true, status: true, fee: true },
  });

  const shows: ReceivableShowLike[] = rows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const trend = feeTrend(shows);
  const csv = feeTrendToCsv(trend);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="evolucao-cache.csv"',
      "Cache-Control": "no-store",
    },
  });
}
