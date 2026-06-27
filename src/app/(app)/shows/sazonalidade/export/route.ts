import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { gigSeasonality, type ReceivableShowLike } from "@/lib/finance";
import { gigSeasonalityToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a sazonalidade de shows por mês do ano (jan→dez, somando todos os anos)
// em CSV — espelha a página `/shows/sazonalidade`. A camada pura está em
// `@/lib/finance` (`gigSeasonality`) e `@/lib/csv` (`gigSeasonalityToCsv`), ambas
// testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
export async function GET() {
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

  const season = gigSeasonality(shows);
  const csv = gigSeasonalityToCsv(season);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sazonalidade-shows.csv"',
      "Cache-Control": "no-store",
    },
  });
}
