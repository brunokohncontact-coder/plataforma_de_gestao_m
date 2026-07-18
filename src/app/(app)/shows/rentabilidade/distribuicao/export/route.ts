import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankShowsByProfit,
  showResultDistribution,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  parseShowNature,
  filterShowsByNature,
  type TxLike,
} from "@/lib/finance";
import { showResultDistributionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta a distribuição de resultado por show (faixas Prejuízo → Margem alta)
// em CSV, respeitando o recorte por período (?ano=YYYY) — espelha a página
// `/shows/rentabilidade/distribuicao`. A camada pura está em
// `@/lib/finance`/`@/lib/csv` (testadas).
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { id: true, title: true, date: true, status: true, fee: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  // Mesmo recorte por ano da página (D108/D118): filtra antes de agregar,
  // oferecendo só os anos dos shows não cancelados.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  // Mesmo recorte por natureza da página (D369): todos × só firmes.
  const nature = parseShowNature(req.nextUrl.searchParams.get("natureza") ?? undefined);
  const periodShows = filterShowsByNature(filterShowsByYear(shows, yearFilter), nature);

  const report = rankShowsByProfit(periodShows, txs);
  const csv = showResultDistributionToCsv(showResultDistribution(report));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const yearSuffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const natureSuffix = nature === "firm" ? "-firmes" : "";
  const filename = `distribuicao-resultado-shows-${yearSuffix}${natureSuffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
