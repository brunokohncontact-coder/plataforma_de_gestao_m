import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  funnelActivitySeasonality,
  compareFunnelActivitySeasonality,
  parseFeedYear,
  feedYearRangeUtc,
} from "@/lib/shows";
import { funnelActivitySeasonalityComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano da SAZONALIDADE da atividade do funil
// ("Temporada {ano} vs. {ano-1}") em CSV — espelha a tabela do card de
// `/shows/funil/atividade/sazonalidade`. Só faz sentido com um ano específico
// (`?ano=YYYY`) e ambos os períodos com transições — o MESMO gate que decide
// exibir o card na página; fora disso, 404 (não há comparativo para exportar). A
// camada pura está em `@/lib/shows` (`compareFunnelActivitySeasonality`) e
// `@/lib/csv` (`funnelActivitySeasonalityComparisonToCsv`), ambas testadas; aqui
// só consultamos os eventos de status dos dois anos, colapsamos cada um no
// calendário de 12 meses e embrulhamos no HTTP.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await requireUser();

  // O comparativo exige um ano concreto (o card só aparece com `?ano=`); sem ele,
  // não há dois períodos para comparar.
  const activeYear = parseFeedYear(url.searchParams.get("ano"));
  if (activeYear === null) {
    return new NextResponse("Selecione um ano para exportar o comparativo.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const range = feedYearRangeUtc(activeYear);
  const prevRange = feedYearRangeUtc(activeYear - 1);

  // Eventos de status dos dois anos (índice `[userId]`, recorte por `createdAt` em
  // UTC), a mesma consulta da página. Só o essencial de cada evento — sem o show —
  // porque a sazonalidade é uma contagem por mês do calendário.
  const [events, prevEvents] = await Promise.all([
    prisma.showStatusEvent.findMany({
      where: { userId: user.id, createdAt: { gte: range.gte, lt: range.lt } },
      orderBy: { createdAt: "desc" },
      select: { showId: true, fromStatus: true, toStatus: true, createdAt: true },
    }),
    prisma.showStatusEvent.findMany({
      where: { userId: user.id, createdAt: { gte: prevRange.gte, lt: prevRange.lt } },
      orderBy: { createdAt: "desc" },
      select: { showId: true, fromStatus: true, toStatus: true, createdAt: true },
    }),
  ]);

  const toFeed = (
    rows: { showId: string; fromStatus: string | null; toStatus: string; createdAt: Date }[],
  ) =>
    buildFunnelActivityFeed(
      rows.map((e) => ({
        showId: e.showId,
        showTitle: "",
        showDate: null,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        at: e.createdAt,
      })),
    );

  const season = funnelActivitySeasonality(toFeed(events));
  const prevSeason = funnelActivitySeasonality(toFeed(prevEvents));

  // Mesmo gate do card na página: só há comparativo com transições nos dois anos.
  if (season.totalTransitions === 0 || prevSeason.totalTransitions === 0) {
    return new NextResponse("Sem atividade nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareFunnelActivitySeasonality(season, prevSeason);
  const csv = funnelActivitySeasonalityComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `sazonalidade-atividade-funil-comparativo-${activeYear}-vs-${activeYear - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
