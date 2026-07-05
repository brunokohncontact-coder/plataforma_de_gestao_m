import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  expenseMix,
  expenseMixYears,
  compareExpenseMix,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
} from "@/lib/finance";
import { expenseMixComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano da composição de despesas ({ano} vs. {ano-1})
// em CSV — a forma completa (rubrica a rubrica) do card "Onde o gasto mudou" de
// `/financas/composicao-despesas`, que na tela só mostra os movers. Só faz
// sentido com um ano específico (`?ano=YYYY`) e ambos os anos com despesa, o
// mesmo gate que decide exibir o card na página; fora disso, 404. A camada pura
// está em `@/lib/finance` (`compareExpenseMix`) e `@/lib/csv`
// (`expenseMixComparisonToCsv`), ambas testadas; aqui só consultamos, recortamos
// por ano e embrulhamos no HTTP. Espelho do export do comparativo de sazonalidade
// de shows (D223).
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  // Os anos válidos vêm só das despesas (`expenseMixYears`); `parseProfitYear`
  // devolve "all" quando o parâmetro não bate num ano do acervo — e o comparativo
  // exige um ano concreto, então "all" cai no 404 abaixo.
  const availableYears = expenseMixYears(
    transactions.map((t) => ({
      type: t.type as TxLike["type"],
      amount: t.amount,
      category: t.category,
      date: t.date,
      received: t.received,
      showId: t.showId,
    })),
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
  // extra), espelhando a página. `filterShowsByYear` opera sobre as transações
  // cruas (têm `date: Date`) — genérico da D108.
  const toTx = (t: (typeof transactions)[number]): TxLike => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  });
  const mix = expenseMix(filterShowsByYear(transactions, yearFilter).map(toTx));
  const prevMix = expenseMix(
    filterShowsByYear(transactions, yearFilter - 1).map(toTx),
  );

  // Mesmo gate do card na página: só há comparativo com despesa nos dois anos.
  if (mix.categoryCount === 0 || prevMix.categoryCount === 0) {
    return new NextResponse("Sem despesas nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareExpenseMix(mix, prevMix);
  const csv = expenseMixComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `composicao-despesas-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
