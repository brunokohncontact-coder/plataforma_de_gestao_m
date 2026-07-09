import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  weekdayPerformance,
  weekdayPerformanceYears,
  compareWeekdayPerformance,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
} from "@/lib/finance";
import { weekdayPerformanceComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano do desempenho por dia da semana (semana {ano}
// vs. {ano-1}) em CSV — espelha a tabela "Ver os 7 dias" do card de
// `/shows/dias-semana`. Só faz sentido com um ano específico (`?ano=YYYY`) e
// ambos os períodos com shows realizados, o mesmo gate que decide exibir o card
// na página; fora disso, 404 (não há comparativo para exportar). A camada pura
// está em `@/lib/finance` (`compareWeekdayPerformance`) e `@/lib/csv`
// (`weekdayPerformanceComparisonToCsv`), ambas testadas; aqui só consultamos,
// recortamos por ano e embrulhamos no HTTP.
export async function GET(request: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { id: true, date: true, status: true, fee: true },
  });

  // Os anos válidos vêm só dos shows que o desempenho por dia da semana conta.
  // `parseProfitYear` devolve "all" quando o parâmetro não bate num ano do
  // acervo — e o comparativo exige um ano concreto, então "all" cai no 404.
  const availableYears = weekdayPerformanceYears(rows);
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

  const wp = weekdayPerformance(periodShows);
  const prevWp = weekdayPerformance(prevShows);

  // Mesmo gate do card na página: só há comparativo com shows nos dois períodos.
  if (wp.totalShows === 0 || prevWp.totalShows === 0) {
    return new NextResponse("Sem shows nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareWeekdayPerformance(wp, prevWp);
  const csv = weekdayPerformanceComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `dias-semana-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
