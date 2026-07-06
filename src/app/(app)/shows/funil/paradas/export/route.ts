import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findStaleProposals } from "@/lib/shows";
import { staleProposalsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta as propostas paradas (`findStaleProposals`: shows ainda em PROPOSED sem
// movimento há tempo demais ou com a data já vencida) em CSV — espelha a fila de
// `/shows/funil/paradas`. Mesma consulta (só os PROPOSED + eventos de status) e
// mesma detecção pura; a serialização fica em `@/lib/csv` (`staleProposalsToCsv`),
// testada. Sem `?ano=` (a leitura é sobre o estado atual das propostas em aberto).
export async function GET() {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id, status: "PROPOSED" },
    select: {
      id: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      fee: true,
      status: true,
      createdAt: true,
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const report = findStaleProposals(shows);
  const csv = staleProposalsToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="propostas-paradas.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
