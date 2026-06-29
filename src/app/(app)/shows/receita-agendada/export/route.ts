import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { forecastBookedRevenue, type BookedRevenueShowLike } from "@/lib/finance";
import { bookedRevenueToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a receita agendada (cachês de shows futuros agregados por mês, com
// confirmado/a confirmar) em CSV — espelha a página `/shows/receita-agendada`.
// Mesma consulta (só shows a partir de hoje) e mesmo `forecastBookedRevenue`; a
// regra fina de "futuro" e a exclusão de cancelados ficam na lógica pura. A
// camada pura está em `@/lib/finance` e `@/lib/csv` (`bookedRevenueToCsv`),
// ambas testadas.
export async function GET() {
  const user = await requireUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const shows = await prisma.show.findMany({
    where: { userId: user.id, date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    select: { fee: true, status: true, date: true },
  });

  const forecast = forecastBookedRevenue(shows as BookedRevenueShowLike[]);
  const csv = bookedRevenueToCsv(forecast);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "receita-agendada.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
