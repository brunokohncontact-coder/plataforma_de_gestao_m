import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  filterFunnelActivityByKind,
  parseFunnelActivityKind,
} from "@/lib/shows";
import { funnelActivityFeedToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Mesmo limite da página `/shows/funil/atividade`. */
const ACTIVITY_LIMIT = 100;

// Exporta o feed de atividade do funil (`buildFunnelActivityFeed`: as últimas
// transições de status da carteira, mais recentes primeiro) em CSV — espelha a
// página `/shows/funil/atividade`. Mesma consulta (eventos de status pelo índice
// `[userId]`, ordenados/limitados no banco), mesmo limite e a mesma agregação
// pura; a serialização fica em `@/lib/csv` (`funnelActivityFeedToCsv`), testada.
// Respeita o filtro `?natureza=` da página (recorte por natureza da transição),
// aplicado sobre a MESMA janela de eventos — o download espelha o que a tela mostra.
export async function GET(request: Request) {
  const user = await requireUser();

  const activeKind = parseFunnelActivityKind(
    new URL(request.url).searchParams.get("natureza"),
  );

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

  const visible = filterFunnelActivityByKind(feed, activeKind);
  const csv = funnelActivityFeedToCsv(visible);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  // Nome do arquivo carrega a natureza filtrada, quando houver.
  const filename =
    activeKind === null
      ? "atividade-funil.csv"
      : `atividade-funil-${activeKind}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
