import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  feeDistribution,
  feeDistributionYears,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
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
  const csv = feeDistributionToCsv(dist);

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
