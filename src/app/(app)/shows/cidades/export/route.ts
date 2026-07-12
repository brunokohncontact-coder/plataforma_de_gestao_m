import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankCitiesByProfit,
  compareCitiesByProfit,
  indexCityProfitChanges,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type VenueShowLike,
  type CityProfitChange,
} from "@/lib/finance";
import { venueProfitToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta a atuação por cidade (P&L agregado por cidade) em CSV, respeitando o
// recorte por período (?ano=YYYY) — espelha a página `/shows/cidades`.
// A camada pura está em `@/lib/csv`/`@/lib/finance` (testadas).
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

  const cityShows: (VenueShowLike & { date: Date })[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    venue: s.venue,
    city: s.city,
    date: s.date,
  }));

  // Mesmo recorte por ano da página (D108/D115): filtra antes de agregar,
  // oferecendo só os anos dos shows não cancelados.
  const availableYears = showProfitYears(
    cityShows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodShows = filterShowsByYear(cityShows, yearFilter);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  const report = rankCitiesByProfit(periodShows, txs);

  // Comparativo ano a ano por cidade (mesma coluna "vs. {ano-1}" da página):
  // só com um ano específico e o ano anterior tendo shows, recomputando o
  // ranking do ano anterior sobre os MESMOS registros já carregados (recorte
  // UTC da D108). Sem isso, a planilha sai idêntica à anterior.
  let changeByKey: Map<string, CityProfitChange> | null = null;
  let previousYear: number | null = null;
  if (yearFilter !== "all") {
    const previousReport = rankCitiesByProfit(
      filterShowsByYear(cityShows, yearFilter - 1),
      txs,
    );
    if (previousReport.count > 0) {
      previousYear = yearFilter - 1;
      changeByKey = indexCityProfitChanges(
        compareCitiesByProfit(report, previousReport),
      );
    }
  }

  const csv = venueProfitToCsv(report.rows, "Cidade", undefined, changeByKey, previousYear);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `rentabilidade-cidades-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
