import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/finance";
import {
  filterContacts,
  isValidContactRole,
  type ContactFilter,
} from "@/lib/contacts";
import { contactsToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o diretório de contatos do usuário em CSV, aplicando os MESMOS filtros
// da página `/contatos` (busca livre + tipo/papel) que chegam pela query string.
// A camada pura de serialização está em `@/lib/csv` (`contactsToCsv`) e a de
// filtragem em `@/lib/contacts` (`filterContacts`), ambas testadas.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;

  const qParam = sp.get("q");
  const roleParam = sp.get("papel");

  const filter: ContactFilter = {
    q: qParam || null,
    role: isValidContactRole(roleParam) ? roleParam : null,
  };

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      name: true,
      role: true,
      email: true,
      phone: true,
      notes: true,
    },
  });

  const visible = filterContacts(contacts, filter);
  const csv = contactsToCsv(visible);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename = `contatos-${dayKey(new Date())}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
