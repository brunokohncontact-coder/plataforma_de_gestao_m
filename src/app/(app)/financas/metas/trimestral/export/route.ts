import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { quarterlyGoalProgress, type TxLike } from "@/lib/finance";
import { quarterlyGoalProgressToCsv } from "@/lib/csv";

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

// Exporta a quebra trimestral da meta de faturamento (4 trimestres + total) em
// CSV, para o ano da query (?ano=YYYY). Espelho mais grosso do export mensal
// (/financas/metas/export). Sem meta definida no ano, a planilha sai com alvos
// zerados (meta 0), espelhando o estado "sem meta" da página. A camada pura está
// em `@/lib/csv` (testada).
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const year = parseYear(req.nextUrl.searchParams.get("ano"));

  const [goal, transactions] = await Promise.all([
    prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: user.id, year } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { type: true, amount: true, date: true, received: true, showId: true },
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

  const csv = quarterlyGoalProgressToCsv(quarterlyGoalProgress(txs, year, goal?.amount ?? 0));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `metas-trimestral-${year}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
