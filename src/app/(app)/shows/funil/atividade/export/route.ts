import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildFunnelActivityFeed } from "@/lib/shows";
import { funnelActivityFeedToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Mesmo limite da página `/shows/funil/atividade`. */
const ACTIVITY_LIMIT = 100;

// Exporta o feed de atividade do funil (`buildFunnelActivityFeed`: as últimas
// transições de status da carteira, mais recentes primeiro) em CSV — espelha a
// página `/shows/funil/atividade`. Mesma consulta (eventos de status pelo índice
// `[userId]`, ordenados/limitados no banco), mesmo limite e a mesma agregação
// pura; a serialização fica em `@/lib/csv` (`funnelActivityFeedToCsv`), testada.
export async function GET() {
  const user = await requireUser();

  const events = await prisma.showStatusEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      showId: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
      show: { select: { title: true, date: true } },
    },
  });

  const feed = buildFunnelActivityFeed(
    events.map((e) => ({
      showId: e.showId,
      showTitle: e.show?.title ?? "Show removido",
      showDate: e.show?.date ?? null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: e.createdAt,
    })),
    { limit: ACTIVITY_LIMIT },
  );

  const csv = funnelActivityFeedToCsv(feed);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atividade-funil.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
