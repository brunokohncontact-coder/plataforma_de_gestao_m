import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { showPipeline, type ShowLike } from "@/lib/finance";
import { pipelineToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o funil de propostas (shows por etapa: proposto → confirmado →
// realizado → cancelado, com contagem e cachê) em CSV — espelha a página
// `/shows/funil`. Mesma consulta (todos os shows do usuário) e mesmo
// `showPipeline`; a regra de agregação por etapa fica na lógica pura. A camada
// pura está em `@/lib/finance` e `@/lib/csv` (`pipelineToCsv`), ambas testadas.
export async function GET() {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { id: true, status: true, fee: true },
  });

  const pipeline = showPipeline(shows as ShowLike[]);
  const csv = pipelineToCsv(pipeline);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "funil-de-propostas.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
