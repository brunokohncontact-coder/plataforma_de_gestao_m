import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { showGaps, type ShowGapShowLike } from "@/lib/shows";
import { showGapsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os hiatos entre shows (intervalos entre gigs firmes consecutivos) em
// CSV — espelha a tabela "Maiores secas" da página `/shows/hiatos`. A camada
// pura está em `@/lib/shows` (`showGaps`) e `@/lib/csv` (`showGapsToCsv`), ambas
// testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
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

  const report = showGaps(shows);
  const csv = showGapsToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hiatos-entre-shows.csv"',
      "Cache-Control": "no-store",
    },
  });
}
