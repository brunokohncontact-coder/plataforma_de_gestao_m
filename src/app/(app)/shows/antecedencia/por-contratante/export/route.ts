import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  bookingLeadTimeByContact,
  parseLeadTimeScope,
  type LeadTimeShowLike,
} from "@/lib/shows";
import { pickPayerContact } from "@/lib/billing";
import { bookingLeadTimeByContactToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a antecedência de agendamento POR contratante em CSV — espelha a
// página `/shows/antecedencia/por-contratante`, incluindo o escopo da amostra
// (`?escopo=`, D190). A camada pura está em `@/lib/shows`
// (`bookingLeadTimeByContact`) e `@/lib/csv` (`bookingLeadTimeByContactToCsv`),
// ambas testadas; aqui só fazemos a consulta, atribuímos cada show ao seu
// contratante (`pickPayerContact`) e embrulhamos no HTTP.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const rows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    include: { contacts: { include: { contact: true } } },
  });

  const scope = parseLeadTimeScope(req.nextUrl.searchParams.get("escopo") ?? undefined);

  type ShowRow = (typeof rows)[number];
  const getBooker = (show: ShowRow) => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name } : null;
  };

  const report = bookingLeadTimeByContact(
    rows as (LeadTimeShowLike & ShowRow)[],
    getBooker as (s: LeadTimeShowLike & ShowRow) => { id: string; name: string } | null,
    scope,
  );

  const csv = bookingLeadTimeByContactToCsv(
    report.rows.map((r) => ({
      contact: r.contact ? { name: r.contact.name } : null,
      sample: r.leadTime.sample,
      medianDays: r.leadTime.medianDays,
      avgDays: r.leadTime.avgDays,
      shortestDays: r.leadTime.shortestDays,
      longestDays: r.leadTime.longestDays,
      reliable: r.leadTime.reliable,
      share: r.share,
      totalFee: r.totalFee,
    })),
  );

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const scopeSuffix = scope === "firm" ? "-firmes" : "";
  const filename = `antecedencia-por-contratante${scopeSuffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
