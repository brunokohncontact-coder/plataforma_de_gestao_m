import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  groupFunnelActivityByMonth,
  compareFunnelActivityMonths,
  parseFeedYear,
  feedYearRangeUtc,
} from "@/lib/shows";
import { funnelActivityComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano do RITMO da atividade do funil ("Ritmo {ano}
// vs. {ano-1}") em CSV — espelha a tabela "Quebra por natureza" do card de
// `/shows/funil/atividade/ritmo`. Só faz sentido com um ano específico
// (`?ano=YYYY`) e ambos os períodos com atividade — o MESMO gate que decide
// exibir o card na página; fora disso, 404 (não há comparativo para exportar). A
// camada pura está em `@/lib/shows` (`compareFunnelActivityMonths`) e `@/lib/csv`
// (`funnelActivityComparisonToCsv`), ambas testadas; aqui só consultamos os
// eventos de status dos dois anos, agrupamos por mês e embrulhamos no HTTP.
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
  // porque o ritmo é uma contagem.
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

  // Mesmo gate do card na página: só há comparativo com atividade nos dois anos.
  if (events.length === 0 || prevEvents.length === 0) {
    return new NextResponse("Sem atividade nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

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

  const months = groupFunnelActivityByMonth(toFeed(events));
  const prevMonths = groupFunnelActivityByMonth(toFeed(prevEvents));
  const comparison = compareFunnelActivityMonths(months, prevMonths);
  const csv = funnelActivityComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `ritmo-atividade-funil-comparativo-${activeYear}-vs-${activeYear - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
