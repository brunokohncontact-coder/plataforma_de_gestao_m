import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  gigSeasonality,
  gigSeasonalityYears,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
} from "@/lib/finance";
import { gigSeasonalityToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a sazonalidade de shows por mês do ano (jan→dez) em CSV — espelha a
// página `/shows/sazonalidade`, herdando o recorte por período (`?ano=`) do
// seletor. A camada pura está em `@/lib/finance` (`gigSeasonality`) e `@/lib/csv`
// (`gigSeasonalityToCsv`), ambas testadas; aqui só consultamos, recortamos por
// ano e embrulhamos no HTTP.
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

  // Recorte por período espelhando a página: filtra ANTES de agregar. Os anos
  // válidos vêm dos shows que a sazonalidade conta (`gigSeasonalityYears`).
  const availableYears = gigSeasonalityYears(shows);
  const yearFilter = parseProfitYear(
    request.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  // Filtra as `rows` (com `date: Date`) antes de mapear — `ReceivableShowLike`
  // tem `date: string | Date`, incompatível com o `{ date: Date }` do helper.
  const periodShows: ReceivableShowLike[] = filterShowsByYear(rows, yearFilter).map(
    (s) => ({ id: s.id, fee: s.fee, status: s.status, date: s.date }),
  );

  const season = gigSeasonality(periodShows);
  const csv = gigSeasonalityToCsv(season);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename =
    yearFilter === "all"
      ? "sazonalidade-shows.csv"
      : `sazonalidade-shows-${yearFilter}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
