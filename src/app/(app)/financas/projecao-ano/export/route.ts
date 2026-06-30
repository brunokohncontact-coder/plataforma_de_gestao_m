import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  projectYearEnd,
  recurringExpenses,
  yearEndScenarioView,
  type TxLike,
  type YearEndScenarioChoice,
  type YearEndShowLike,
} from "@/lib/finance";
import { yearEndProjectionToCsv } from "@/lib/csv";

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

/** Slug pt-BR do cenário no nome do arquivo (otimista é o default da query). */
const CENARIO_SLUG: Record<YearEndScenarioChoice, string> = {
  optimistic: "otimista",
  conservative: "conservador",
  pessimistic: "pior-caso",
};

// Exporta a projeção de fechamento do ano (composição receita/despesa + resultado
// projetado) em CSV — espelha os cards de `/financas/projecao-ano`, herdando o ano
// (?ano=YYYY) e o cenário (?cenario=conservador|pessimista, otimista por default)
// da página. A camada pura está em `@/lib/finance` (`yearEndScenarioView`) e
// `@/lib/csv` (`yearEndProjectionToCsv`), ambas testadas; aqui só consultamos e
// embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const year = parseYear(req.nextUrl.searchParams.get("ano"));
  const rawCenario = req.nextUrl.searchParams.get("cenario");
  const mode: YearEndScenarioChoice =
    rawCenario === "conservador"
      ? "conservative"
      : rawCenario === "pessimista"
        ? "pessimistic"
        : "optimistic";

  // Mesma consulta da página: todas as transações alimentam os totais e abatem os
  // cachês agendados (sem dupla contagem); os shows do ano fornecem a receita
  // futura ainda não lançada.
  const [transactions, shows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { type: true, amount: true, date: true, received: true, showId: true },
    }),
    prisma.show.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { id: true, fee: true, status: true, date: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const forecast = projectYearEnd(txs, shows as YearEndShowLike[], year);
  const fixedCost = recurringExpenses(txs).estimatedMonthlyFixedCost;
  const view = yearEndScenarioView(forecast, txs, fixedCost, mode);
  const csv = yearEndProjectionToCsv(view);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `projecao-ano-${year}-${CENARIO_SLUG[mode]}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
