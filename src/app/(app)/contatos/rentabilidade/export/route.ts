import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankContactsByProfit,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  parseShowNature,
  filterShowsByNature,
  type TxLike,
  type ShowLike,
  type ContactProfitContact,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { contactProfitToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta a rentabilidade por contratante (P&L somado por quem paga) em CSV,
// respeitando o recorte por período (?ano=YYYY) — espelha a página
// `/contatos/rentabilidade`. A camada pura está em `@/lib/csv`/`@/lib/finance`.
export async function GET(req: NextRequest) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        fee: true,
        status: true,
        date: true,
        contacts: {
          select: { contact: { select: { id: true, name: true, role: true } } },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, showId: { not: null } },
      select: { type: true, amount: true, showId: true },
    }),
  ]);

  type ShowRow = (typeof shows)[number];

  // Mesmo recorte por ano da página (D108): filtra antes de agregar, oferecendo
  // só os anos dos shows não cancelados.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  // Mesmo recorte por natureza da página (D385): "todos" × só firmes.
  const nature = parseShowNature(
    req.nextUrl.searchParams.get("natureza") ?? undefined,
  );
  const periodShows = filterShowsByNature(
    filterShowsByYear(shows, yearFilter),
    nature,
  );

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: true,
    showId: t.showId,
  }));

  const getPayer = (show: ShowRow): ContactProfitContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };

  const report = rankContactsByProfit(
    periodShows as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );

  const csv = contactProfitToCsv(report.rows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const suffix = yearFilter === "all" ? "todos" : String(yearFilter);
  const natureSuffix = nature === "firm" ? "-firmes" : "";
  const filename = `rentabilidade-contratantes-${suffix}${natureSuffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
