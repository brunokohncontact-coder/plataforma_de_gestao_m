import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { weekdayPerformance, type ReceivableShowLike } from "@/lib/finance";
import { weekdayPerformanceToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o desempenho por dia da semana (domingo→sábado, somando todos os anos)
// em CSV — espelha a página `/shows/dias-semana`. A camada pura está em
// `@/lib/finance` (`weekdayPerformance`) e `@/lib/csv` (`weekdayPerformanceToCsv`),
// ambas testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
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

  const wp = weekdayPerformance(shows);
  const csv = weekdayPerformanceToCsv(wp);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shows-por-dia-da-semana.csv"',
      "Cache-Control": "no-store",
    },
  });
}
