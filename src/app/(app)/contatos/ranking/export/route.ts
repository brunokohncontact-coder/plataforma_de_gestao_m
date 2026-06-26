import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rankContactsByActivity, type ContactRankLike } from "@/lib/contacts";
import { contactActivityToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface RankContact extends ContactRankLike {
  role: string;
}

// Exporta o ranking de contatos por atividade (CRM) em CSV — espelha a query e a
// ordenação da página `/contatos/ranking`. A camada pura está em `@/lib/csv`
// (`contactActivityToCsv`) e `@/lib/contacts` (`rankContactsByActivity`).
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
    contact: { id: c.id, name: c.name, role: c.role } as RankContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const ranking = rankContactsByActivity(items);

  const csv = contactActivityToCsv(ranking.rows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ranking-contatos.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
