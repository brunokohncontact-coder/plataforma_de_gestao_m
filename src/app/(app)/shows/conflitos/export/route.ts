import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findScheduleConflicts, type ConflictShowLike } from "@/lib/shows";
import { scheduleConflictsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os conflitos de agenda (dias com 2+ shows não cancelados) em CSV —
// espelha a página `/shows/conflitos`. Mesma consulta (todos os shows do usuário)
// usada pela página; a regra de conflito fica na lógica pura
// `findScheduleConflicts`, e a serialização em `scheduleConflictsToCsv` — ambas
// testadas. Sem parâmetros de janela: a tela é um retrato de toda a agenda.
export async function GET(request: Request) {
  const user = await requireUser();
  void request;

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      status: true,
      fee: true,
    },
    orderBy: { date: "asc" },
  });

  const report = findScheduleConflicts(shows as ConflictShowLike[]);
  const csv = scheduleConflictsToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "conflitos-de-agenda.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
