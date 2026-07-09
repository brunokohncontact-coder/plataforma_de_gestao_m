import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { showGaps, gapDistribution, type ShowGapShowLike } from "@/lib/shows";
import { gapDistributionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a distribuição das secas por faixa de duração (Até 1 semana → Mais de
// 2 meses) em CSV — espelha a seção "Distribuição das secas" de `/shows/hiatos`.
// A camada pura está em `@/lib/shows` (`showGaps`/`gapDistribution`) e `@/lib/csv`
// (`gapDistributionToCsv`), todas testadas; aqui só fazemos a consulta e
// embrulhamos no HTTP.
export async function GET() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { date: true, status: true },
  });

  const shows: ShowGapShowLike[] = rows.map((s) => ({
    date: s.date,
    status: s.status,
  }));

  const distribution = gapDistribution(showGaps(shows));
  const csv = gapDistributionToCsv(distribution);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="hiatos-distribuicao.csv"',
      "Cache-Control": "no-store",
    },
  });
}
