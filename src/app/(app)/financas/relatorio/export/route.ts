import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  summarizeFinances,
  filterTransactions,
  compareSummaries,
  averageSummaries,
  type TxLike,
  type FinanceSummary,
} from "@/lib/finance";
import { parseMonthKey, shiftMonth, monthKey as monthKeyOf } from "@/lib/calendar";
import { monthlyReportToCsv, type MonthlyReportCsvView } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Janela (em meses) da média móvel — idêntica à página `/financas/relatorio`. */
const AVERAGE_WINDOW = 3;

// Exporta o relatório mensal (resumo do mês vs. mês anterior e vs. média móvel
// recente) em CSV — espelha os quatro indicadores do topo de `/financas/relatorio`.
// O mês de referência vem de `?mes=` (saneado por `parseMonthKey`, como na página).
// A lógica pura está em `@/lib/finance` (resumo + comparativos) e `@/lib/csv`
// (`monthlyReportToCsv`), ambas testadas; aqui só fazemos a consulta, repetimos a
// mesma composição da página e embrulhamos no HTTP.
export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);

  const { year, month } = parseMonthKey(searchParams.get("mes") ?? undefined);
  const key = monthKeyOf(year, month);
  const prev = shiftMonth(year, month, -1);

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const allTxs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const visible = filterTransactions(allTxs, { month: key });
  const summary = summarizeFinances(visible);

  // Comparativo com o mês anterior.
  const prevVisible = filterTransactions(allTxs, { month: monthKeyOf(prev.year, prev.month) });
  const vsPreviousMonth = compareSummaries(summary, summarizeFinances(prevVisible));
  const hasPreviousMonth = prevVisible.length > 0;

  // Comparativo com a média dos meses recentes COM movimento (mesma regra da página).
  const trailingSummaries: FinanceSummary[] = [];
  for (let i = 1; i <= AVERAGE_WINDOW; i++) {
    const s = shiftMonth(year, month, -i);
    const monthTxs = filterTransactions(allTxs, { month: monthKeyOf(s.year, s.month) });
    if (monthTxs.length > 0) trailingSummaries.push(summarizeFinances(monthTxs));
  }
  const vsAverage = compareSummaries(summary, averageSummaries(trailingSummaries));
  const hasAverage = trailingSummaries.length >= 2;

  const view: MonthlyReportCsvView = {
    summary,
    vsPreviousMonth,
    vsAverage,
    hasPreviousMonth,
    hasAverage,
    averageMonths: trailingSummaries.length,
  };

  const csv = monthlyReportToCsv(view);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `relatorio-${key}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
