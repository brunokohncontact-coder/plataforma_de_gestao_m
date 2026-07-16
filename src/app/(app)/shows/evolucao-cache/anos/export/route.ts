import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { feeTrendByYear, type ReceivableShowLike } from "@/lib/finance";
import { feeTrendByYearToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o recorte ANUAL da evolução do cachê (cachê médio por ano civil) em
// CSV — espelha a tabela "Cachê médio ano a ano" da página
// `/shows/evolucao-cache`. A camada pura está em `@/lib/finance`
// (`feeTrendByYear`) e `@/lib/csv` (`feeTrendByYearToCsv`), ambas testadas; aqui
// só fazemos a consulta e embrulhamos no HTTP. Irmã de
// `/shows/evolucao-cache/export` (mesma query, eixo por ano em vez de por mês).
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

  const byYear = feeTrendByYear(shows);
  const csv = feeTrendByYearToCsv(byYear);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="evolucao-cache-anual.csv"',
      "Cache-Control": "no-store",
    },
  });
}
