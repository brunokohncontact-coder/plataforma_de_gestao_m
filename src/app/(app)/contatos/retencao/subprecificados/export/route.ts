import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  clientRetention,
  underpricedLoyalClients,
  type ContactRankLike,
} from "@/lib/contacts";
import { underpricedLoyalClientsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface RetentionContact extends ContactRankLike {
  role: string;
}

// Exporta os "fiéis cobrando abaixo do balcão" (`/contatos/retencao`, seção
// 🟠) em CSV — os alvos concretos de renegociação (D346). Espelha a mesma
// query/`clientRetention` da página e deriva a lista com
// `underpricedLoyalClients`. A camada pura está em `@/lib/csv`
// (`underpricedLoyalClientsToCsv`). Quando não há balcão mensurável (nenhum
// contratante de um show só com cachê) a lista é nula → CSV só com o cabeçalho.
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
    contact: { id: c.id, name: c.name, role: c.role } as RetentionContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const retention = clientRetention(items);
  const underpriced = underpricedLoyalClients(retention);

  const csv = underpricedLoyalClientsToCsv(
    underpriced ?? { benchmark: 0, clients: [] },
  );

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fieis-abaixo-do-balcao.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
