import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findCitiesToReengage,
  parseReengageWindow,
  type CityReengageShowLike,
} from "@/lib/finance";
import { citiesToReengageToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta as praças para revisitar (cidades dormentes com histórico e nada
// agendado) em CSV — espelha a página `/shows/cidades/revisitar`. Mesma consulta
// (todos os shows do usuário); a regra de dormência fica na lógica pura
// `findCitiesToReengage` e a serialização em `citiesToReengageToCsv` — ambas
// testadas.
export async function GET(request: NextRequest) {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { status: true, city: true, date: true, fee: true },
  });

  // Herda a janela `?dias=` da página (espelha o export de fins-de-semana livres).
  const staleDays = parseReengageWindow(request.nextUrl.searchParams.get("dias") ?? undefined);
  const list = findCitiesToReengage(shows as CityReengageShowLike[], { staleDays });
  const csv = citiesToReengageToCsv(list);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `pracas-para-revisitar-${staleDays}dias.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
