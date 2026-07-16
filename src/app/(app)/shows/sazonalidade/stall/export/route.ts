import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  gigSeasonality,
  gigSeasonalityStall,
  type ReceivableShowLike,
} from "@/lib/finance";
import { gigSeasonalityStallToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o "mês forte com agenda rala" (o `StallDetail` de `/shows/sazonalidade`)
// em CSV — o único recorte ACIONÁVEL e prospectivo da página, com o firme × tentativo
// da agenda do próximo mês forte à frente. Ao contrário da tabela mensal e do
// comparativo (ambos retrospectivos e recortáveis por `?ano=`), o stall só faz
// sentido somando TODAS as temporadas (projeta a próxima ocorrência do mês contra o
// padrão de fundo), então esta rota ignora o seletor de período e sempre usa o
// acervo inteiro — espelhando a condição `yearFilter === "all"` da página. A camada
// pura está em `@/lib/finance` (`gigSeasonalityStall`) e `@/lib/csv`
// (`gigSeasonalityStallToCsv`), ambas testadas; aqui só consultamos e embrulhamos.
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
  const stall = gigSeasonalityStall(season, shows);
  const csv = gigSeasonalityStallToCsv(stall);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda-mes-forte.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
