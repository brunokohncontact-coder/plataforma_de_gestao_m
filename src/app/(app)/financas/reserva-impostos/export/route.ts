import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { taxReserve, DEFAULT_TAX_RATE, type TxLike } from "@/lib/finance";
import { taxReserveToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// "YYYY" -> ano válido (1970–2999); fallback ao ano atual. Espelha o parser da
// página `/financas/reserva-impostos`.
function parseYear(raw: string | undefined, reference: Date = new Date()): number {
  if (raw) {
    const m = /^\d{4}$/.exec(raw.trim());
    if (m) {
      const y = Number(m[0]);
      if (y >= 1970 && y <= 2999) return y;
    }
  }
  return reference.getFullYear();
}

// Alíquota em porcentagem (0–100) vinda da query; fallback ao padrão. Espelha o
// parser da página.
function parseRate(raw: string | undefined): number {
  if (raw != null && raw.trim() !== "") {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n / 100;
  }
  return DEFAULT_TAX_RATE;
}

// Exporta a reserva para impostos (recebido + reserva sugerida por mês + total)
// em CSV — espelha a página `/financas/reserva-impostos`, incluindo o recorte por
// ano (`?ano=`) e a alíquota (`?aliquota=`). A camada pura está em `@/lib/finance`
// (`taxReserve`) e `@/lib/csv` (`taxReserveToCsv`), ambas testadas; aqui só
// fazemos a consulta, aplicamos os mesmos parâmetros da página e embrulhamos no
// HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const year = parseYear(req.nextUrl.searchParams.get("ano") ?? undefined);
  const rate = parseRate(req.nextUrl.searchParams.get("aliquota") ?? undefined);

  // Mesma consulta da página: só receitas (a reserva incide sobre o que entrou).
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: "INCOME" },
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

  const report = taxReserve(allTxs, { year, rate });
  const csv = taxReserveToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const ratePct = String(Math.round(report.rate * 1000) / 10).replace(".", "-");
  const filename = `reserva-impostos-${year}-${ratePct}pct.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
