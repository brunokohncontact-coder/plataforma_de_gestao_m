import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { bookingLeadTime, type LeadTimeShowLike } from "@/lib/shows";
import { bookingLeadTimeToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a antecedência de agendamento (booking lead time) em CSV — espelha a
// página `/shows/antecedencia`. A camada pura está em `@/lib/shows`
// (`bookingLeadTime`) e `@/lib/csv` (`bookingLeadTimeToCsv`), ambas testadas;
// aqui só fazemos a consulta e embrulhamos no HTTP. Sem `?ano=`: a tela é um
// retrato do acervo (mesma decisão do funil por contratante).
export async function GET() {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { status: true, date: true, createdAt: true, fee: true },
  });

  const shows: LeadTimeShowLike[] = rows.map((s) => ({
    status: s.status,
    date: s.date,
    createdAt: s.createdAt,
    fee: s.fee,
  }));

  const lead = bookingLeadTime(shows);
  const csv = bookingLeadTimeToCsv(lead);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="antecedencia-de-agendamento.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
