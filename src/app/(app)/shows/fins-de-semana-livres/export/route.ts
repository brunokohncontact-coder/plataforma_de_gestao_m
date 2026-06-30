import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findOpenWeekends,
  parseWeekendWindow,
  type ConflictShowLike,
} from "@/lib/shows";
import { openWeekendsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o mapa de fins de semana livres (sexta→domingo, livre/ocupado, cachê
// marcado) em CSV — espelha a página `/shows/fins-de-semana-livres`. Mesma
// consulta (todos os shows do usuário) e mesma janela `?semanas=` (saneada por
// `parseWeekendWindow`); a regra de ocupação fica na lógica pura
// `findOpenWeekends`, e a serialização em `openWeekendsToCsv` — ambas testadas.
export async function GET(request: Request) {
  const user = await requireUser();

  const { searchParams } = new URL(request.url);
  const weeks = parseWeekendWindow(searchParams.get("semanas") ?? undefined);

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

  const report = findOpenWeekends(shows as ConflictShowLike[], { weeks });
  const csv = openWeekendsToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `fins-de-semana-livres-${weeks}sem.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
