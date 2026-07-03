import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  clientConcentration,
  clientConcentrationYears,
  type ClientConcentration,
  type ContactRankLike,
} from "@/lib/contacts";
import { parseProfitYear, filterShowsByYear } from "@/lib/finance";
import { clientConcentrationToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface ConcentrationContact extends ContactRankLike {
  role: string;
}

// Exporta a concentração da carteira (`/contatos/concentracao`) em CSV — espelha
// a mesma query/`clientConcentration` da página, incluindo o recorte por período
// (`?ano=`, D108). A camada pura está em `@/lib/csv` (`clientConcentrationToCsv`)
// e `@/lib/contacts` (`clientConcentration`). Uma linha por contratante com
// faturamento (cachê, nº de shows, participação), encerrada num "Total".
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
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as ConcentrationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  // Recorte por ano herdado da página (mesmos helpers/`filterShowsByYear`).
  const availableYears = clientConcentrationYears(items);
  const rawYear = new URL(request.url).searchParams.get("ano") ?? undefined;
  const yearFilter = parseProfitYear(rawYear, availableYears);
  const periodItems = items.map((it) => ({
    contact: it.contact,
    shows: filterShowsByYear(it.shows, yearFilter),
  }));

  const concentration = clientConcentration(periodItems);
  const yearSuffix = yearFilter === "all" ? "todos" : `${yearFilter}`;

  // Comparativo por contratante "vs. {ano-1}": mesmo gate da página (ano
  // específico + contratante com cachê nos dois anos). Reaproveita o recorte por
  // ano UTC (D108) sobre os `items` já carregados — só uma agregação extra em
  // memória, zero I/O adicional. A coluna só entra quando o comparativo é válido.
  let previousConcentration: ClientConcentration<ConcentrationContact> | null = null;
  let previousYear: number | null = null;
  if (yearFilter !== "all" && concentration.clientCount > 0) {
    const py = yearFilter - 1;
    const previousItems = items.map((it) => ({
      contact: it.contact,
      shows: filterShowsByYear(it.shows, py),
    }));
    const prevConc = clientConcentration(previousItems);
    if (prevConc.clientCount > 0) {
      previousConcentration = prevConc;
      previousYear = py;
    }
  }

  const csv = clientConcentrationToCsv(
    concentration,
    undefined,
    previousConcentration,
    previousYear,
  );

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="concentracao-contratantes-${yearSuffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
