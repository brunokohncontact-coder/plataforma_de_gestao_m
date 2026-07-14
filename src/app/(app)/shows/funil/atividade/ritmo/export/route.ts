import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  groupFunnelActivityByMonth,
  parseFeedYear,
  feedYearRangeUtc,
} from "@/lib/shows";
import { funnelActivityMonthlyToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o ritmo mensal da atividade do funil (`groupFunnelActivityByMonth`: as
// transições de status da carteira contadas por mês) em CSV — espelha a página
// `/shows/funil/atividade/ritmo`. Mesma consulta (eventos de status pelo índice
// `[userId]`, ordenados no banco) e a mesma agregação pura; a serialização fica em
// `@/lib/csv` (`funnelActivityMonthlyToCsv`), testada. Respeita o recorte `?ano=`
// da tela — aplicado sobre a MESMA janela de eventos — para o download espelhar
// exatamente o ritmo exibido.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await requireUser();

  const activeYear = parseFeedYear(url.searchParams.get("ano"));
  const yearRange = activeYear !== null ? feedYearRangeUtc(activeYear) : null;

  const events = await prisma.showStatusEvent.findMany({
    where: {
      userId: user.id,
      ...(yearRange ? { createdAt: { gte: yearRange.gte, lt: yearRange.lt } } : {}),
    },
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

  const months = groupFunnelActivityByMonth(feed);
  const csv = funnelActivityMonthlyToCsv(months);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  // Nome do arquivo carrega o ano recortado, quando houver.
  const filename =
    activeYear !== null
      ? `ritmo-atividade-funil-${activeYear}.csv`
      : "ritmo-atividade-funil.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
