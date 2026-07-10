import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  funnelStageDurations,
  proposalOutcomeYears,
  type ProposalOutcomeShowLike,
} from "@/lib/shows";
import { parseProfitYear } from "@/lib/finance";
import { stageDurationsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o tempo de permanência por etapa do funil (`funnelStageDurations`:
// mediana/média/mín/máx de dias que um show fica em cada etapa antes de sair) em
// CSV — espelha a tabela "Detalhe" de `/shows/funil/tempo-em-etapa`. Mesma
// consulta (só os eventos de status de cada show) e mesma agregação pura; a
// serialização fica em `@/lib/csv` (`stageDurationsToCsv`), testada. Aplica o
// mesmo recorte por ano da proposta (`?ano=`, eixo da coorte) da tela (D281).
export async function GET(request: Request) {
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

  const availableYears = proposalOutcomeYears(shows as ProposalOutcomeShowLike[]);
  const rawYear = new URL(request.url).searchParams.get("ano") ?? undefined;
  const yearFilter = parseProfitYear(rawYear, availableYears);

  const durations = funnelStageDurations(shows, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const csv = stageDurationsToCsv(durations);

  const suffix = yearFilter === "all" ? "todas" : String(yearFilter);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tempo-em-etapa-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
