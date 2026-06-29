import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clientRetention, type ContactRankLike } from "@/lib/contacts";
import { clientRetentionToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface RetentionContact extends ContactRankLike {
  role: string;
}

// Exporta a fidelização da carteira (`/contatos/retencao`) em CSV — espelha a
// mesma query/`clientRetention` da página. A camada pura está em `@/lib/csv`
// (`clientRetentionToCsv`) e `@/lib/contacts` (`clientRetention`). O CSV traz
// todos os contratantes (rows), com a coluna "Recorrente" Sim/Não — mais amplo
// que a tabela da tela (que lista só os recorrentes).
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

  const csv = clientRetentionToCsv(retention);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fidelizacao-contratantes.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
