import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  groupFunnelActivityByMonth,
} from "@/lib/shows";
import { funnelActivityMonthlyToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o ritmo mensal da atividade do funil (`groupFunnelActivityByMonth`: as
// transições de status da carteira contadas por mês) em CSV — espelha a página
// `/shows/funil/atividade/ritmo`. Mesma consulta (todos os eventos de status pelo
// índice `[userId]`, ordenados no banco) e a mesma agregação pura; a serialização
// fica em `@/lib/csv` (`funnelActivityMonthlyToCsv`), testada.
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

  const months = groupFunnelActivityByMonth(feed);
  const csv = funnelActivityMonthlyToCsv(months);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ritmo-atividade-funil.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
