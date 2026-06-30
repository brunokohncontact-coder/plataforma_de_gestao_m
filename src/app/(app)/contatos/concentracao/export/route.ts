import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clientConcentration, type ContactRankLike } from "@/lib/contacts";
import { clientConcentrationToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface ConcentrationContact extends ContactRankLike {
  role: string;
}

// Exporta a concentração da carteira (`/contatos/concentracao`) em CSV — espelha
// a mesma query/`clientConcentration` da página. A camada pura está em `@/lib/csv`
// (`clientConcentrationToCsv`) e `@/lib/contacts` (`clientConcentration`). Uma
// linha por contratante com faturamento (cachê, nº de shows, participação),
// encerrada num "Total".
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
    contact: { id: c.id, name: c.name, role: c.role } as ConcentrationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const concentration = clientConcentration(items);

  const csv = clientConcentrationToCsv(concentration);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="concentracao-contratantes.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
