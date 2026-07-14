import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildFunnelActivityFeed,
  filterFunnelActivityByKind,
  parseFunnelActivityKind,
  parseFeedPage,
  sliceFeedPage,
} from "@/lib/shows";
import { funnelActivityFeedToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Mesmo tamanho de página da tela `/shows/funil/atividade`. */
const PAGE_SIZE = 100;

// Exporta o feed de atividade do funil (`buildFunnelActivityFeed`: as transições
// de status da carteira, mais recentes primeiro) em CSV — espelha a página
// `/shows/funil/atividade`. Mesma consulta (eventos de status pelo índice
// `[userId]`, ordenados no banco), mesma paginação (`skip`/`take`) e a mesma
// agregação pura; a serialização fica em `@/lib/csv` (`funnelActivityFeedToCsv`),
// testada. Respeita o filtro `?natureza=` E a página `?pagina=` da tela —
// aplicados sobre a MESMA janela de eventos — para o download espelhar exatamente
// o que a tela mostra.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await requireUser();

  const activeKind = parseFunnelActivityKind(url.searchParams.get("natureza"));
  const page = parseFeedPage(url.searchParams.get("pagina"));

  const fetched = await prisma.showStatusEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      showId: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
      show: { select: { title: true, date: true } },
    },
  });

  // Descarta o item-sentinela extra (usado só para detectar próxima página).
  const { items: pageEvents } = sliceFeedPage(fetched, PAGE_SIZE);

  const feed = buildFunnelActivityFeed(
    pageEvents.map((e) => ({
      showId: e.showId,
      showTitle: e.show?.title ?? "Show removido",
      showDate: e.show?.date ?? null,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      at: e.createdAt,
    })),
  );

  const visible = filterFunnelActivityByKind(feed, activeKind);
  const csv = funnelActivityFeedToCsv(visible);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  // Nome do arquivo carrega a natureza filtrada e a página, quando houver.
  const parts = ["atividade-funil"];
  if (activeKind !== null) parts.push(activeKind);
  if (page > 1) parts.push(`p${page}`);
  const filename = `${parts.join("-")}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
