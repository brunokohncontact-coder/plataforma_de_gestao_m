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
  type FeeDistributionComparison,
} from "@/lib/finance";
import { feeDistributionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a distribuição por faixa de cachê (Até R$ 500 → Acima de R$ 5.000) em
// CSV — espelha a página `/shows/faixas-de-cache`, incluindo o recorte por ano
// (`?ano=`). A camada pura está em `@/lib/finance` (`feeDistribution`) e
// `@/lib/csv` (`feeDistributionToCsv`), ambas testadas; aqui só fazemos a
// consulta, aplicamos o mesmo recorte da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, date: true, status: true, fee: true },
  });

  // Mesmo recorte por ano da página (helpers da D108).
  const availableYears = feeDistributionYears(rows);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodRows = filterShowsByYear(rows, yearFilter);

  const shows: ReceivableShowLike[] = periodRows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const dist = feeDistribution(shows);

  // Coluna "vs. {ano-1} (p.p.)" no CSV — paridade com o card comparativo da
  // página: só com um ano específico e ambos os períodos tendo shows realizados
  // com cachê (senão a comparação seria enganosa). Reaproveita o MESMO recorte
  // por ano UTC (D108) sobre os registros já carregados, sem nova consulta.
  let comparison: FeeDistributionComparison | null = null;
  let previousYear: number | null = null;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousDist = feeDistribution(
      filterShowsByYear(rows, previousYear).map((s) => ({
        id: s.id,
        fee: s.fee,
        status: s.status,
        date: s.date,
      })),
    );
    if (dist.totalShows > 0 && previousDist.totalShows > 0) {
      comparison = compareFeeDistribution(dist, previousDist);
    } else {
      previousYear = null;
    }
  }

  const csv = feeDistributionToCsv(dist, undefined, comparison, previousYear);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `faixas-de-cache-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
