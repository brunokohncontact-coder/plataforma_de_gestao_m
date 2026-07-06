import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { weekRange, parseDayParam, startOfWeek, toDayParam } from "@/lib/calendar";
import { weekShowsToCsv, type CsvCalendarShow } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os shows da semana exibida em `/shows/semana?semana=YYYY-MM-DD` em CSV,
// espelhando a agenda semanal (irmã do export do mês, ver `weekShowsToCsv`). A
// camada pura está em `@/lib/csv` (`weekShowsToCsv`) e `@/lib/shows`
// (`summarizeWeekShows`), ambas testadas; aqui só carregamos os mesmos shows da
// janela da semana (`weekRange`) e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const reference = parseDayParam(req.nextUrl.searchParams.get("semana") ?? undefined);

  // Mesma janela da página: só os shows da semana exibida.
  const { start, endExclusive } = weekRange(reference);
  const rows = await prisma.show.findMany({
    where: { userId: user.id, date: { gte: start, lt: endExclusive } },
    orderBy: { date: "asc" },
    select: { id: true, title: true, date: true, venue: true, status: true, fee: true },
  });

  const shows: CsvCalendarShow[] = rows.map((s) => ({
    date: s.date,
    title: s.title,
    venue: s.venue,
    status: s.status,
    fee: s.fee,
  }));

  const csv = weekShowsToCsv(shows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  // Nome ancorado no início da semana (segunda), estável para qualquer dia de
  // referência dentro dela.
  const filename = `semana-${toDayParam(startOfWeek(reference))}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
