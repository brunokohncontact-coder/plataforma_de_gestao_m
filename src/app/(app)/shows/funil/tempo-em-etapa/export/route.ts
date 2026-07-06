import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { funnelStageDurations } from "@/lib/shows";
import { stageDurationsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o tempo de permanência por etapa do funil (`funnelStageDurations`:
// mediana/média/mín/máx de dias que um show fica em cada etapa antes de sair) em
// CSV — espelha a tabela "Detalhe" de `/shows/funil/tempo-em-etapa`. Mesma
// consulta (só os eventos de status de cada show) e mesma agregação pura; a
// serialização fica em `@/lib/csv` (`stageDurationsToCsv`), testada. Sem `?ano=`
// (a leitura ainda é sobre todo o histórico de transições, como a página).
export async function GET() {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const durations = funnelStageDurations(shows);
  const csv = stageDurationsToCsv(durations);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tempo-em-etapa.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
