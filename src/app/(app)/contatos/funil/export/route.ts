import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pipelineByContact, type ContactRankLike } from "@/lib/contacts";
import { pipelineByContactToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface PipelineContact extends ContactRankLike {
  role: string;
}

// Exporta o funil por contratante (`/contatos/funil`) em CSV — espelha a mesma
// query/`pipelineByContact` da página. A camada pura está em `@/lib/csv`
// (`pipelineByContactToCsv`) e `@/lib/contacts` (`pipelineByContact`). Uma linha
// por contratante com pipeline aberto (cachê em aberto/em negociação/confirmado
// + contagens e a concretização histórica), encerrada num "Total" com os
// agregados da carteira. É um retrato do estado atual, sem recorte por período.
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
    contact: { id: c.id, name: c.name, role: c.role } as PipelineContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const report = pipelineByContact(items);

  const csv = pipelineByContactToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename = "funil-por-contratante.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
