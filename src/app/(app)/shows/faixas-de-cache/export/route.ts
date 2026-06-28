import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { feeDistribution, type ReceivableShowLike } from "@/lib/finance";
import { feeDistributionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a distribuição por faixa de cachê (Até R$ 500 → Acima de R$ 5.000) em
// CSV — espelha a página `/shows/faixas-de-cache`. A camada pura está em
// `@/lib/finance` (`feeDistribution`) e `@/lib/csv` (`feeDistributionToCsv`),
// ambas testadas; aqui só fazemos a consulta e embrulhamos no HTTP.
export async function GET() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, date: true, status: true, fee: true },
  });

  const shows: ReceivableShowLike[] = rows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    date: s.date,
  }));

  const dist = feeDistribution(shows);
  const csv = feeDistributionToCsv(dist);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="faixas-de-cache.csv"',
      "Cache-Control": "no-store",
    },
  });
}
