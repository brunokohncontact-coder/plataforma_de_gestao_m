import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  funnelActivitySeasonality,
  parseFeedYear,
  feedYearRangeUtc,
} from "@/lib/shows";
import { funnelActivitySeasonalityToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a sazonalidade da atividade do funil por mês do ano (jan→dez) em CSV —
// espelha a página `/shows/funil/atividade/sazonalidade`. Mesma consulta (eventos
// de status pelo índice `[userId]`) e a mesma agregação pura; a serialização fica
// em `@/lib/csv` (`funnelActivitySeasonalityToCsv`), testada. Espelha o recorte
// por ano da tela (`?ano=`, pelo `createdAt` do evento em UTC): sem recorte, o
// download traz o histórico inteiro somado; com `?ano=`, só a temporada escolhida.
export async function GET(request: Request) {
  const user = await requireUser();

  const { searchParams } = new URL(request.url);
  const activeYear = parseFeedYear(searchParams.get("ano"));
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

  const season = funnelActivitySeasonality(feed);
  const csv = funnelActivitySeasonalityToCsv(season);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename =
    activeYear !== null
      ? `sazonalidade-atividade-funil-${activeYear}.csv`
      : "sazonalidade-atividade-funil.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
