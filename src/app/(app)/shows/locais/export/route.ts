import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankVenuesByProfit,
  compareVenuesByProfit,
  indexVenueProfitChanges,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type VenueShowLike,
  type VenueProfitChange,
} from "@/lib/finance";
import { venueProfitToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta a rentabilidade por local (P&L agregado por casa) em CSV, respeitando
// o recorte por período (?ano=YYYY) — espelha a página `/shows/locais`.
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

  const venueShows: (VenueShowLike & { date: Date })[] = shows.map((s) => ({
    id: s.id,
    fee: s.fee,
    status: s.status,
    venue: s.venue,
    city: s.city,
    date: s.date,
  }));

  // Mesmo recorte por ano da página (D108/D111): filtra antes de agregar,
  // oferecendo só os anos dos shows não cancelados.
  const availableYears = showProfitYears(
    venueShows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodShows = filterShowsByYear(venueShows, yearFilter);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  const report = rankVenuesByProfit(periodShows, txs);

  // Comparativo ano a ano por local (mesma coluna "vs. {ano-1}" da página):
  // só com um ano específico e o ano anterior tendo shows, recomputando o
  // ranking do ano anterior sobre os MESMOS registros já carregados (recorte
  // UTC da D108). Sem isso, a planilha sai idêntica à anterior. Espelha o
  // export por cidade (D297).
  let changeByKey: Map<string, VenueProfitChange> | null = null;
  let previousYear: number | null = null;
  if (yearFilter !== "all") {
    const previousReport = rankVenuesByProfit(
      filterShowsByYear(venueShows, yearFilter - 1),
      txs,
    );
    if (previousReport.count > 0) {
      previousYear = yearFilter - 1;
      changeByKey = indexVenueProfitChanges(
        compareVenuesByProfit(report, previousReport),
      );
    }
  }

  const csv = venueProfitToCsv(report.rows, "Local", undefined, changeByKey, previousYear);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `rentabilidade-locais-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
