import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { proposalOutcomes, proposalOutcomeYears } from "@/lib/shows";
import { parseProfitYear } from "@/lib/finance";
import { proposalConversionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a conversão real das propostas (`proposalOutcomes`: coorte pela data de
// entrada no funil, com o desfecho de cada uma) em CSV — espelha a decomposição de
// `/shows/funil/conversao`. Mesma consulta (só os eventos de status de cada show),
// mesmo recorte por ano da proposta (`?ano=`, eixo distinto do funil) e mesma
// agregação pura; a serialização fica em `@/lib/csv` (`proposalConversionToCsv`),
// testada.
export async function GET(request: Request) {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const availableYears = proposalOutcomeYears(shows);
  const rawYear = new URL(request.url).searchParams.get("ano") ?? undefined;
  const yearFilter = parseProfitYear(rawYear, availableYears);
  const conv = proposalOutcomes(shows, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const csv = proposalConversionToCsv(conv);

  const suffix = yearFilter === "all" ? "todas" : String(yearFilter);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversao-propostas-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
