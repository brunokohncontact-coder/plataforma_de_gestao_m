import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findVenuesToReengage,
  parseReengageWindow,
  type VenueReengageShowLike,
} from "@/lib/finance";
import { venuesToReengageToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta as casas para revisitar (locais dormentes com histórico e nada
// agendado) em CSV — espelha a página `/shows/locais/revisitar`. Mesma consulta
// (todos os shows do usuário); a regra de dormência fica na lógica pura
// `findVenuesToReengage` e a serialização em `venuesToReengageToCsv` — ambas
// testadas.
export async function GET(request: NextRequest) {
  const user = await requireUser();

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: { status: true, venue: true, date: true, fee: true },
  });

  // Herda a janela `?dias=` da página (espelha o export de fins-de-semana livres).
  const staleDays = parseReengageWindow(request.nextUrl.searchParams.get("dias") ?? undefined);
  const list = findVenuesToReengage(shows as VenueReengageShowLike[], { staleDays });
  const csv = venuesToReengageToCsv(list);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `casas-para-revisitar-${staleDays}dias.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
