import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  paymentLag,
  paymentLagYears,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
  type TxLike,
} from "@/lib/finance";
import { paymentLagToCsv, type PaymentLagCsvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o prazo de recebimento por show (tela-mãe `/shows/prazo-recebimento`)
// em CSV, respeitando o recorte por período (?ano=YYYY) — espelha a mesma
// consulta (shows não cancelados + receitas recebidas vinculadas) e a mesma
// agregação ponderada (`paymentLag`), toda na camada pura testada. A
// serialização fica em `@/lib/csv` (`paymentLagToCsv`, testada). Uma linha por
// show, do prazo médio mais lento ao mais rápido.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      select: { id: true, fee: true, status: true, date: true, title: true, venue: true, city: true },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", received: true, showId: { not: null } },
      select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  type Gig = ReceivableShowLike & {
    title: string;
    venue: string | null;
    city: string | null;
  };

  // Mesmo recorte por ano da página: oferece só os anos com prazo mensurável e
  // filtra os shows (prisma, `date: Date`) pela `date` antes de agregar.
  const availableYears = paymentLagYears(shows, txs);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const lag = paymentLag(filterShowsByYear(shows, yearFilter) as Gig[], txs);

  const csvRows: PaymentLagCsvRow[] = lag.rows.map((r) => {
    const show = r.show as ReceivableShowLike & {
      title: string;
      venue: string | null;
      city: string | null;
    };
    return {
      show: { title: show.title, date: show.date, venue: show.venue, city: show.city },
      received: r.received,
      paymentCount: r.paymentCount,
      avgDays: r.avgDays,
      lastDays: r.lastDays,
      bucket: r.bucket,
    };
  });

  const csv = paymentLagToCsv(csvRows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `prazo-recebimento-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
