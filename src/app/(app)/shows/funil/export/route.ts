import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  showPipeline,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type ShowLike,
} from "@/lib/finance";
import { pipelineToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o funil de propostas (shows por etapa: proposto → confirmado →
// realizado → cancelado, com contagem e cachê) em CSV — espelha a página
// `/shows/funil`, herdando o recorte por período (`?ano=`) do seletor. Mesma
// consulta e mesmo `showPipeline`; a regra de agregação por etapa fica na
// lógica pura. A camada pura está em `@/lib/finance` e `@/lib/csv`
// (`pipelineToCsv`), ambas testadas.
export async function GET(request: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, status: true, fee: true, date: true },
  });

  // Recorte por período espelhando a página (D108): filtra ANTES de agregar.
  const availableYears = showProfitYears(rows.map((s) => s.date));
  const yearFilter = parseProfitYear(
    request.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodShows = filterShowsByYear(rows, yearFilter);

  const pipeline = showPipeline(periodShows as ShowLike[]);
  const csv = pipelineToCsv(pipeline);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename =
    yearFilter === "all"
      ? "funil-de-propostas.csv"
      : `funil-de-propostas-${yearFilter}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
