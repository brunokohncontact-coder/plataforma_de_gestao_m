import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { monthGridRange, parseMonthKey, monthKey } from "@/lib/calendar";
import { monthCalendarToCsv, type CsvCalendarShow } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os shows do mês exibido no calendário (`/shows/calendario?mes=YYYY-MM`)
// em CSV, espelhando a faixa de resumo do mês (ver `summarizeMonthShows`/D216).
// A camada pura está em `@/lib/csv` (`monthCalendarToCsv`, testada); aqui só
// carregamos os mesmos shows que a grade usa (inclui as bordas das semanas
// vizinhas) e embrulhamos no HTTP. O recorte LOCAL ao mês é feito no serializer.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { year, month } = parseMonthKey(req.nextUrl.searchParams.get("mes") ?? undefined);

  // Mesma janela da página: só os shows que aparecem na grade exibida.
  const { start, endExclusive } = monthGridRange(year, month);
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

  const csv = monthCalendarToCsv(shows, year, month);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename = `calendario-${monthKey(year, month)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
