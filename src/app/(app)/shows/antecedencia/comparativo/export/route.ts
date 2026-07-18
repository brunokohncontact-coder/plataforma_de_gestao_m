import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  bookingLeadTime,
  bookingLeadTimeYears,
  compareBookingLeadTime,
  parseLeadTimeScope,
  type LeadTimeShowLike,
} from "@/lib/shows";
import { parseProfitYear, filterShowsByYear } from "@/lib/finance";
import { bookingLeadTimeComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o COMPARATIVO ano a ano da antecedência de agendamento em CSV — espelha
// o card "Antecedência {ano} vs. {ano-1}" da página `/shows/antecedencia`, que já
// aparece na tela mas o export do ranking (`/shows/antecedencia/export`,
// `bookingLeadTimeToCsv`) não carregava. Rota IRMÃ, sem tocar no export simples.
// A camada pura vive em `@/lib/shows` (`compareBookingLeadTime`) e `@/lib/csv`
// (`bookingLeadTimeComparisonToCsv`), ambas testadas; aqui só consultamos,
// aplicamos o MESMO gate da página e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { status: true, date: true, createdAt: true, fee: true },
  });

  const toShows = (subset: typeof rows): LeadTimeShowLike[] =>
    subset.map((s) => ({
      status: s.status,
      date: s.date,
      createdAt: s.createdAt,
      fee: s.fee,
    }));

  // Mesmo escopo + recorte por ano da página (D190 / helpers da D108).
  const scope = parseLeadTimeScope(req.nextUrl.searchParams.get("escopo") ?? undefined);
  const availableYears = bookingLeadTimeYears(rows, scope);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  // Gate idêntico ao card da página (page.tsx): o comparativo só faz sentido com
  // um ano específico E ambos os períodos tendo amostra mensurável — caso
  // contrário a comparação de medianas seria enganosa (mediana de amostra vazia
  // é 0). Sem isso, 404 (o export simples cobre um período só).
  if (yearFilter === "all") {
    return new NextResponse("Comparativo indisponível: escolha um ano específico.", {
      status: 404,
    });
  }
  const previousYear = yearFilter - 1;
  const current = bookingLeadTime(toShows(filterShowsByYear(rows, yearFilter)), scope);
  const previous = bookingLeadTime(toShows(filterShowsByYear(rows, previousYear)), scope);
  if (current.sample === 0 || previous.sample === 0) {
    return new NextResponse(
      "Comparativo indisponível: os dois anos precisam ter shows com antecedência mensurável.",
      { status: 404 },
    );
  }

  const csv = bookingLeadTimeComparisonToCsv(compareBookingLeadTime(current, previous));

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const scopeSuffix = scope === "firm" ? "-firmes" : "";
  const filename = `antecedencia-comparativo-${yearFilter}-vs-${previousYear}${scopeSuffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
