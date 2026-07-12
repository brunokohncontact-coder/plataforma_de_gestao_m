import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankVenuesByProfit,
  compareVenuesByProfit,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type VenueShowLike,
} from "@/lib/finance";
import { cityProfitComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta o comparativo ano a ano da rentabilidade por local (para quais casas a
// agenda migrou — {ano} vs. {ano-1}) em CSV: a lista COMPLETA de mudanças por casa
// que o card "Quais casas cresceram e caíram" de `/shows/locais` só destila em dois
// movers e a coluna "vs. {ano-1}" da tabela só resume num Δ de shows. Espelho fiel
// do export por cidade (D300) — o motor de comparação é genérico sobre qualquer
// ranking de rentabilidade agregado, então reusa os aliases de eixo-casa da D299
// (`compareVenuesByProfit`) e `cityProfitComparisonToCsv` com o rótulo "Local".
// Só faz sentido com um ano específico (`?ano=YYYY`) e o ano anterior tendo shows —
// o mesmo gate que decide exibir o card/coluna na página; fora disso, 404.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      select: { id: true, fee: true, status: true, venue: true, city: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  const venueShows: (VenueShowLike & { date: Date })[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    venue: s.venue,
    city: s.city,
    date: s.date,
  }));

  // Mesmo recorte por ano da página (D108/D111): só os anos dos shows não
  // cancelados alimentam o seletor. O comparativo exige um ano concreto, então
  // "all" cai no 404 abaixo.
  const availableYears = showProfitYears(
    venueShows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  if (yearFilter === "all") {
    return new NextResponse("Selecione um ano para exportar o comparativo.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  // Recorta o ano atual e o anterior do mesmo acervo já carregado (zero I/O
  // extra), espelhando a página.
  const current = rankVenuesByProfit(filterShowsByYear(venueShows, yearFilter), txs);
  const previous = rankVenuesByProfit(filterShowsByYear(venueShows, yearFilter - 1), txs);

  // Mesmo gate do card na página: só há comparativo com o ano anterior tendo shows.
  if (previous.count === 0) {
    return new NextResponse("Sem shows no ano anterior para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const changes = compareVenuesByProfit(current, previous);
  const csv = cityProfitComparisonToCsv(changes, undefined, "Local");

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `locais-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
