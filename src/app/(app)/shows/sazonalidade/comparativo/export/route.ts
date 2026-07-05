import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  gigSeasonality,
  gigSeasonalityYears,
  compareGigSeasonality,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
} from "@/lib/finance";
import { gigSeasonalityComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano da sazonalidade de shows (temporada {ano} vs.
// {ano-1}) em CSV — espelha a tabela "Ver os 12 meses" do card de
// `/shows/sazonalidade`. Só faz sentido com um ano específico (`?ano=YYYY`) e
// ambos os períodos com shows realizados, o mesmo gate que decide exibir o card
// na página; fora disso, 404 (não há comparativo para exportar). A camada pura
// está em `@/lib/finance` (`compareGigSeasonality`) e `@/lib/csv`
// (`gigSeasonalityComparisonToCsv`), ambas testadas; aqui só consultamos,
// recortamos por ano e embrulhamos no HTTP.
export async function GET(request: NextRequest) {
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

  // Os anos válidos vêm só dos shows que a sazonalidade conta. `parseProfitYear`
  // devolve "all" quando o parâmetro não bate num ano do acervo — e o comparativo
  // exige um ano concreto, então "all" cai no 404 abaixo.
  const availableYears = gigSeasonalityYears(shows);
  const yearFilter = parseProfitYear(
    request.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  if (yearFilter === "all") {
    return new NextResponse("Selecione um ano para exportar o comparativo.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Recorta o ano atual e o anterior do mesmo acervo já carregado (zero I/O
  // extra), espelhando a página. `ReceivableShowLike` aceita `date: Date`.
  const periodShows: ReceivableShowLike[] = filterShowsByYear(rows, yearFilter).map(
    (s) => ({ id: s.id, fee: s.fee, status: s.status, date: s.date }),
  );
  const prevShows: ReceivableShowLike[] = filterShowsByYear(rows, yearFilter - 1).map(
    (s) => ({ id: s.id, fee: s.fee, status: s.status, date: s.date }),
  );

  const season = gigSeasonality(periodShows);
  const prevSeason = gigSeasonality(prevShows);

  // Mesmo gate do card na página: só há comparativo com shows nos dois períodos.
  if (season.totalShows === 0 || prevSeason.totalShows === 0) {
    return new NextResponse("Sem shows nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareGigSeasonality(season, prevSeason);
  const csv = gigSeasonalityComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `sazonalidade-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
