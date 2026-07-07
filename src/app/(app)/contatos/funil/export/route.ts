import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pipelineByContact, type ContactRankLike } from "@/lib/contacts";
import {
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
} from "@/lib/finance";
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
// agregados da carteira, herdando o recorte por período (`?ano=`) do seletor.
export async function GET(request: NextRequest) {
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

  // Recorte por período espelhando a página (D108): filtra cada carteira ANTES
  // de agregar, então `pipelineByContact` segue agnóstico ao recorte.
  const allShows = contacts.flatMap((c) => c.shows.map((cs) => cs.show));
  const availableYears = showProfitYears(allShows.map((s) => s.date));
  const yearFilter = parseProfitYear(
    request.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as PipelineContact,
    shows: filterShowsByYear(
      c.shows.map((cs) => cs.show),
      yearFilter,
    ),
  }));

  const report = pipelineByContact(items);

  // Comparativo por-linha "vs. {ano-1}" espelhando a tela (D238): só com um ano
  // específico e ambos os períodos com pipeline aberto. O ano anterior sai do
  // mesmo acervo já carregado (recorte por `date`, D108) — zero I/O extra.
  let previousReport: typeof report | null = null;
  let previousYear: number | null = null;
  if (yearFilter !== "all" && report.contactCount > 0) {
    previousYear = yearFilter - 1;
    const prev = pipelineByContact(
      contacts.map((c) => ({
        contact: { id: c.id, name: c.name, role: c.role } as PipelineContact,
        shows: filterShowsByYear(
          c.shows.map((cs) => cs.show),
          previousYear!,
        ),
      })),
    );
    if (prev.contactCount > 0) previousReport = prev;
    else previousYear = null;
  }

  const csv = pipelineByContactToCsv(
    report,
    undefined,
    previousReport,
    previousYear,
  );

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename =
    yearFilter === "all"
      ? "funil-por-contratante.csv"
      : `funil-por-contratante-${yearFilter}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
