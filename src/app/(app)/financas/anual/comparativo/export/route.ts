import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  annualSummary,
  compareAnnualSummaries,
  type TxLike,
} from "@/lib/finance";
import { annualComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** "YYYY" -> ano válido (1970–2999); fallback ao ano atual. Espelha a página. */
function parseYear(raw: string | null, reference: Date = new Date()): number {
  if (raw) {
    const m = /^\d{4}$/.exec(raw.trim());
    if (m) {
      const y = Number(m[0]);
      if (y >= 1970 && y <= 2999) return y;
    }
  }
  return reference.getFullYear();
}

// Exporta o comparativo ano a ano do resumo anual ({ano} vs. {ano-1}) em CSV —
// os dois anos por inteiro (receita/despesa/resultado mês a mês) mais os deltas,
// espelhando o "vs {ano-1}" que `/financas/anual` já mostra na tela. Só faz
// sentido quando o ano anterior teve movimento — o MESMO gate (`prevHasActivity`)
// que decide exibir os deltas na página; sem isso, 404 (não há comparativo para
// exportar, o CSV simples `/financas/anual/export` cobre um ano isolado). A camada
// pura está em `@/lib/finance` (`compareAnnualSummaries`) e `@/lib/csv`
// (`annualComparisonToCsv`), ambas testadas; aqui só consultamos e embrulhamos.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const year = parseYear(req.nextUrl.searchParams.get("ano"));

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const summary = annualSummary(txs, year);
  const prevSummary = annualSummary(txs, year - 1);
  const prevHasActivity =
    prevSummary.totalIncome > 0 || prevSummary.totalExpense > 0;

  // Mesmo gate da página: sem movimento no ano anterior não há comparativo.
  if (!prevHasActivity) {
    return new NextResponse(
      `Sem movimento em ${year - 1} para comparar com ${year}.`,
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }

  const csv = annualComparisonToCsv(compareAnnualSummaries(summary, prevSummary));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `financas-anual-comparativo-${year}-vs-${year - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
