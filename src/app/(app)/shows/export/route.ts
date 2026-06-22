import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKey, isValidDateKey } from "@/lib/finance";
import { filterShows, isValidShowStatus, type ShowFilter } from "@/lib/shows";
import { showsToCsv, type CsvShow } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os shows do usuário em CSV, aplicando os MESMOS filtros da página de
// shows (busca, status, intervalo de datas) que chegam pela query string. A
// camada pura de serialização está em `@/lib/csv` (testada).
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;

  const qParam = sp.get("q");
  const statusParam = sp.get("status");
  const fromParam = sp.get("de") ?? undefined;
  const toParam = sp.get("ate") ?? undefined;

  const filter: ShowFilter = {
    q: qParam || null,
    status: isValidShowStatus(statusParam) ? statusParam : null,
    from: isValidDateKey(fromParam) ? fromParam : null,
    to: isValidDateKey(toParam) ? toParam : null,
  };

  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: {
      date: true,
      title: true,
      venue: true,
      city: true,
      status: true,
      fee: true,
      notes: true,
    },
  });

  const visible = filterShows(shows, filter);
  const csv = showsToCsv(visible as CsvShow[]);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename = `shows-${dayKey(new Date())}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
