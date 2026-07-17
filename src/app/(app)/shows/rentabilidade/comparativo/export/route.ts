import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankShowsByProfit,
  compareShowsProfitability,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
} from "@/lib/finance";
import { showsProfitabilityComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta o comparativo ano a ano da rentabilidade por show ({ano} vs. {ano-1})
// em CSV — espelha o card "Resultado por show {ano} vs. {ano-1}" de
// `/shows/rentabilidade`, que hoje só vive na tela. Só faz sentido com um ano
// específico (?ano=YYYY) e ambos os períodos tendo shows, o MESMO gate que decide
// exibir o card na página; fora disso, 404 (não há comparativo para exportar). A
// camada pura está em `@/lib/finance` (`compareShowsProfitability`) e `@/lib/csv`
// (`showsProfitabilityComparisonToCsv`), ambas testadas; aqui só consultamos,
// recortamos por ano e embrulhamos no HTTP.
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

  // Os anos válidos vêm só dos shows que a agregação conta (não cancelados). O
  // comparativo exige um ano concreto — `parseProfitYear` devolve "all" quando o
  // parâmetro não bate num ano do acervo, e "all" cai no 404 abaixo.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
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

  // Recorta o ano atual e o anterior do mesmo acervo já carregado (zero I/O
  // extra), espelhando a página.
  const report = rankShowsByProfit(filterShowsByYear(shows, yearFilter), txs);
  const previousReport = rankShowsByProfit(filterShowsByYear(shows, yearFilter - 1), txs);

  // Mesmo gate do card na página: só há comparativo com shows nos dois anos
  // (senão o resultado médio por show do ano vazio seria 0 e a comparação
  // enganosa).
  if (report.count === 0 || previousReport.count === 0) {
    return new NextResponse("Sem shows nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareShowsProfitability(report, previousReport);
  const csv = showsProfitabilityComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `rentabilidade-shows-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
