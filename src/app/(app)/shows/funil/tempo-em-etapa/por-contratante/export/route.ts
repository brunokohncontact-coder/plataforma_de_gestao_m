import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  proposalDeliberationByContact,
  proposalOutcomeYears,
  type ProposalDeliberationShowLike,
} from "@/lib/shows";
import { parseProfitYear } from "@/lib/finance";
import { proposalDeliberationByContactToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o tempo de decisão da proposta por contratante
// (`proposalDeliberationByContact`: mediana/média/mín/máx de dias que cada
// contratante deixa uma proposta na mesa antes de decidir) em CSV — espelha a
// tabela de `/shows/funil/tempo-em-etapa/por-contratante`. Mesma consulta (cada
// contato + os eventos de status dos seus shows) e mesma agregação pura; a
// serialização fica em `@/lib/csv` (`proposalDeliberationByContactToCsv`), testada.
// Aplica o mesmo recorte por ano da proposta (`?ano=`, eixo da coorte) da tela.
export async function GET(request: Request) {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      shows: {
        select: {
          show: {
            select: {
              statusEvents: {
                select: { fromStatus: true, toStatus: true, createdAt: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name },
    shows: c.shows.map((cs) => cs.show) as ProposalDeliberationShowLike[],
  }));

  const availableYears = proposalOutcomeYears(items.flatMap((i) => i.shows));
  const rawYear = new URL(request.url).searchParams.get("ano") ?? undefined;
  const yearFilter = parseProfitYear(rawYear, availableYears);

  const report = proposalDeliberationByContact(items, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const csv = proposalDeliberationByContactToCsv(report.rows, report.totalSamples);

  const suffix = yearFilter === "all" ? "todas" : String(yearFilter);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tempo-decisao-por-contratante-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
