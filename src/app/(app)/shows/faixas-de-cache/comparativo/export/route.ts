import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  feeDistribution,
  feeDistributionYears,
  compareFeeDistribution,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
} from "@/lib/finance";
import { feeDistributionComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano da distribuição de cachês ({ano} vs. {ano-1})
// em CSV: os números do card "Cachê {ano} vs. {ano-1}" de `/shows/faixas-de-cache`
// (cachê mediano/médio, migração de participação faixa a faixa e o veredito de
// tendência) que só viviam na tela — o export do ano (`/export`, D292) traz só a
// faixa do ano corrente + o Δ em p.p., sem os valores do ano anterior nem o
// resumo mediano/médio. Só faz sentido com um ano específico (`?ano=YYYY`) e ambos
// os períodos tendo shows realizados com cachê — o MESMO gate que decide exibir o
// card na página; fora disso, 404. A camada pura está em `@/lib/finance`
// (`compareFeeDistribution`) e `@/lib/csv` (`feeDistributionComparisonToCsv`),
// ambas testadas; aqui só consultamos, recortamos por ano e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, date: true, status: true, fee: true },
  });

  // Mesmo recorte por ano da página (helpers da D108). O comparativo exige um ano
  // concreto, então "all" cai no 404 abaixo.
  const availableYears = feeDistributionYears(rows);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  if (yearFilter === "all") {
    return new NextResponse("Selecione um ano para exportar o comparativo.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const toShows = (year: number): ReceivableShowLike[] =>
    filterShowsByYear(rows, year).map((s) => ({
      id: s.id,
      fee: s.fee,
      status: s.status,
      date: s.date,
    }));

  const dist = feeDistribution(toShows(yearFilter));
  const previousDist = feeDistribution(toShows(yearFilter - 1));

  // Mesmo gate do card na página: comparativo só com AMBOS os anos tendo shows
  // realizados com cachê (senão a comparação de medianas seria enganosa —
  // mediana de amostra vazia é 0).
  if (dist.totalShows === 0 || previousDist.totalShows === 0) {
    return new NextResponse("Sem shows nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareFeeDistribution(dist, previousDist);
  const csv = feeDistributionComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `faixas-de-cache-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
