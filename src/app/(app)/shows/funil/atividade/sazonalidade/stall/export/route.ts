import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  funnelActivitySeasonality,
  funnelActivitySeasonalityStall,
  countCurrentMonthFunnelActivity,
} from "@/lib/shows";
import { funnelActivitySeasonalityStallToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o "funil parado numa temporada forte" (o `StallDetail` de
// `/shows/funil/atividade/sazonalidade`) em CSV — o único recorte ACIONÁVEL e do
// PRESENTE da página, cruzando o pico histórico de agendamento do mês corrente com
// o ritmo real do funil neste mês. Ao contrário da tabela mensal e do comparativo
// (ambos retrospectivos e recortáveis por `?ano=`), o stall só faz sentido somando
// TODAS as temporadas (mede o mês corrente contra o padrão de fundo), então esta
// rota ignora o seletor de período e sempre usa o acervo inteiro — espelhando a
// condição `activeYear === null` da página. A camada pura está em `@/lib/shows`
// (`funnelActivitySeasonalityStall`) e `@/lib/csv`
// (`funnelActivitySeasonalityStallToCsv`), ambas testadas; aqui só consultamos e
// embrulhamos.
export async function GET() {
  const user = await requireUser();

  const events = await prisma.showStatusEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { showId: true, fromStatus: true, toStatus: true, createdAt: true },
  });

  const feed = buildFunnelActivityFeed(
    events.map((e) => ({
      showId: e.showId,
      showTitle: "",
      showDate: null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: e.createdAt,
    })),
  );

  const season = funnelActivitySeasonality(feed);
  const stall = funnelActivitySeasonalityStall(
    season,
    countCurrentMonthFunnelActivity(feed),
  );
  const csv = funnelActivitySeasonalityStallToCsv(stall);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="funil-mes-forte.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
