import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { gigCadence, type ReceivableShowLike } from "@/lib/finance";
import { gigCadenceToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a cadência de shows (volume realizado mês a mês ao longo do tempo) em
// CSV — espelha a tabela "Shows mês a mês" da página `/shows/cadencia`. A camada
// pura está em `@/lib/finance` (`gigCadence`) e `@/lib/csv` (`gigCadenceToCsv`),
// ambas testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
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

  const cadence = gigCadence(shows);
  const csv = gigCadenceToCsv(cadence);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cadencia-shows.csv"',
      "Cache-Control": "no-store",
    },
  });
}
