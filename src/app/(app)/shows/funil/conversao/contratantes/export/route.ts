import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  proposalOutcomesByContact,
  proposalOutcomeYears,
  type ProposalOutcomeShowLike,
} from "@/lib/shows";
import { parseProfitYear } from "@/lib/finance";
import { proposalConversionByContactToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a conversão real das propostas por contratante
// (`proposalOutcomesByContact`) em CSV — espelha a tabela de
// `/shows/funil/conversao/contratantes`. Mesma consulta (cada contato + os eventos
// de status dos seus shows), mesmo recorte por ano da proposta (`?ano=`, eixo
// distinto do funil) e mesma agregação pura; a serialização fica em `@/lib/csv`
// (`proposalConversionByContactToCsv`), testada.
export async function GET(request: Request) {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
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
    contact: { id: c.id, name: c.name, role: c.role },
    shows: c.shows.map((cs) => cs.show) as ProposalOutcomeShowLike[],
  }));

  const availableYears = proposalOutcomeYears(items.flatMap((i) => i.shows));
  const rawYear = new URL(request.url).searchParams.get("ano") ?? undefined;
  const yearFilter = parseProfitYear(rawYear, availableYears);
  const report = proposalOutcomesByContact(items, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const csv = proposalConversionByContactToCsv(report);

  const suffix = yearFilter === "all" ? "todas" : String(yearFilter);
  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversao-por-contratante-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
