import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  bookingLeadTime,
  bookingLeadTimeYears,
  parseLeadTimeScope,
  type LeadTimeShowLike,
} from "@/lib/shows";
import { parseProfitYear, filterShowsByYear } from "@/lib/finance";
import { bookingLeadTimeToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a antecedência de agendamento (booking lead time) em CSV — espelha a
// página `/shows/antecedencia`, incluindo o recorte por ano (`?ano=`) e o
// escopo da amostra (`?escopo=`, D190). A camada pura está em `@/lib/shows`
// (`bookingLeadTime`) e `@/lib/csv` (`bookingLeadTimeToCsv`), ambas testadas;
// aqui só fazemos a consulta, aplicamos o mesmo recorte da página e embrulhamos
// no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { status: true, date: true, createdAt: true, fee: true },
  });

  // Mesmo escopo + recorte por ano da página (D190 / helpers da D108).
  const scope = parseLeadTimeScope(req.nextUrl.searchParams.get("escopo") ?? undefined);
  const availableYears = bookingLeadTimeYears(rows, scope);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodRows = filterShowsByYear(rows, yearFilter);

  const shows: LeadTimeShowLike[] = periodRows.map((s) => ({
    status: s.status,
    date: s.date,
    createdAt: s.createdAt,
    fee: s.fee,
  }));

  const lead = bookingLeadTime(shows, scope);
  const csv = bookingLeadTimeToCsv(lead);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const scopeSuffix = scope === "firm" ? "-firmes" : "";
  const filename = `antecedencia-de-agendamento-${suffix}${scopeSuffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
