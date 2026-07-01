import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  cancellationByContact,
  cancelledShowYears,
  type ContactRankLike,
} from "@/lib/contacts";
import { parseProfitYear, filterShowsByYear } from "@/lib/finance";
import { cancellationByContactToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface CancellationContact extends ContactRankLike {
  role: string;
}

// Exporta a taxa de cancelamento por contratante (`/contatos/cancelamentos`) em
// CSV, respeitando o recorte por período (?ano=YYYY) — espelha a mesma
// query/`cancellationByContact` da página. A camada pura está em `@/lib/csv`
// (`cancellationByContactToCsv`) e `@/lib/contacts` (`cancellationByContact`).
// Uma linha por contratante com ≥1 cancelamento (cancelados, shows, taxa, cachê
// perdido, confiabilidade da amostra), encerrada num "Total" com os agregados
// da carteira.
export async function GET(req: NextRequest) {
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
    contact: { id: c.id, name: c.name, role: c.role } as CancellationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  // Mesmo recorte por ano da página: oferece só os anos com cancelamento e
  // filtra os shows de cada contato antes de agregar.
  const availableYears = cancelledShowYears(items);
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  const periodItems = items.map((it) => ({
    contact: it.contact,
    shows: filterShowsByYear(it.shows, yearFilter),
  }));

  const report = cancellationByContact(periodItems);

  const csv = cancellationByContactToCsv(report);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const filename = `cancelamentos-por-contratante-${suffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
