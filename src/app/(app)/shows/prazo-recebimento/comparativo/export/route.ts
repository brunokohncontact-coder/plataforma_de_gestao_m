import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  paymentLag,
  paymentLagYears,
  comparePaymentLag,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
  type TxLike,
} from "@/lib/finance";
import { paymentLagComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o COMPARATIVO ano a ano do prazo de recebimento (DSO) em CSV — espelha
// o card "Prazo de recebimento {ano} vs. {ano-1}" da página
// `/shows/prazo-recebimento`, que já aparece na tela mas o export do ranking
// (`/shows/prazo-recebimento/export`, `paymentLagToCsv`) não carregava. Rota IRMÃ,
// sem tocar no export simples. A camada pura vive em `@/lib/finance`
// (`comparePaymentLag`) e `@/lib/csv` (`paymentLagComparisonToCsv`), ambas
// testadas; aqui só consultamos, aplicamos o MESMO gate da página e embrulhamos
// no HTTP. Mesma consulta da página/export simples (shows não cancelados +
// receitas recebidas vinculadas).
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

  // Mesmo recorte por ano da página: oferece só os anos com prazo mensurável.
  const availableYears = paymentLagYears(shows, txs);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  // Gate idêntico ao card da página (page.tsx): o comparativo só faz sentido com
  // um ano específico E ambos os períodos tendo recebimento — caso contrário a
  // comparação de medianas seria enganosa (mediana de amostra vazia é 0). Sem
  // isso, 404 (o export simples cobre um período só).
  if (yearFilter === "all") {
    return new NextResponse("Comparativo indisponível: escolha um ano específico.", {
      status: 404,
    });
  }
  const previousYear = yearFilter - 1;
  const current = paymentLag(filterShowsByYear(shows, yearFilter) as Gig[], txs);
  const previous = paymentLag(filterShowsByYear(shows, previousYear) as Gig[], txs);
  if (current.showCount === 0 || previous.showCount === 0) {
    return new NextResponse(
      "Comparativo indisponível: os dois anos precisam ter cachês recebidos de shows.",
      { status: 404 },
    );
  }

  const csv = paymentLagComparisonToCsv(comparePaymentLag(current, previous));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `prazo-recebimento-comparativo-${yearFilter}-vs-${previousYear}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
