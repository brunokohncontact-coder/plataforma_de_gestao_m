import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { taxReserve, DEFAULT_TAX_RATE, type TxLike } from "@/lib/finance";
import { taxReserveToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** "YYYY" -> ano válido (1970–2999); fallback ao ano atual. Igual à página. */
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

/** Alíquota em porcentagem (0–100) vinda da query; fallback ao padrão. Igual à página. */
function parseRate(raw: string | null): number {
  if (raw != null && raw.trim() !== "") {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n / 100;
  }
  return DEFAULT_TAX_RATE;
}

// Exporta a reserva para impostos mês a mês em CSV — espelha a tabela
// "Mês a mês" de `/financas/reserva-impostos`. Ano e alíquota vêm de `?ano=` e
// `?aliquota=` (saneados como na página). A lógica pura está em `@/lib/finance`
// (`taxReserve`) e `@/lib/csv` (`taxReserveToCsv`), ambas testadas; aqui só
// fazemos a consulta, repetimos o parsing da página e embrulhamos no HTTP.
export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);

  const year = parseYear(searchParams.get("ano"));
  const rate = parseRate(searchParams.get("aliquota"));

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
  // Alíquota efetiva (saneada) no nome, 1 casa decimal sem ponto ("6" / "27-5").
  const ratePct = Math.round(report.rate * 1000) / 10;
  const rateLabel = String(ratePct).replace(".", "-");
  const filename = `reserva-impostos-${year}-${rateLabel}pct.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
