import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { findContactsToReengage, type ContactRankLike } from "@/lib/contacts";
import { reengageToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface ReengageContact extends ContactRankLike {
  role: string;
}

// Exporta a lista de contatos para reativar (`/contatos/reativar`) em CSV —
// espelha a mesma query/`findContactsToReengage` da página. A camada pura está
// em `@/lib/csv` (`reengageToCsv`) e `@/lib/contacts` (`findContactsToReengage`).
// O CSV traz os contatos dormentes (já tocaram, nada agendado, há mais de
// `staleDays` dias sem show), na ordem da tela: a fila de follow-up.
export async function GET() {
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
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as ReengageContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const list = findContactsToReengage(items);

  const csv = reengageToCsv(list);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-para-reativar.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
