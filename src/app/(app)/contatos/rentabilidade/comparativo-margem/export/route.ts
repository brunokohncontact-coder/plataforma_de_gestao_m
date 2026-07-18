import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankContactsByProfit,
  compareContactMargins,
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
  type TxLike,
  type ShowLike,
  type ContactProfitContact,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { contactMarginComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta o comparativo ano a ano da MARGEM por contratante ("quais casas
// apertaram a margem") em CSV — espelha o card "Margem por contratante {ano} vs.
// {ano-1}" de `/contatos/rentabilidade` (D372). A camada pura está em
// `@/lib/finance` (`compareContactMargins`) e `@/lib/csv`.
//
// Gate (espelha o card): exige um ano CONCRETO (`?ano=YYYY`) — o comparativo é
// contra o ano anterior — E ao menos um contratante presente nos DOIS anos;
// senão a leitura é vazia/enganosa e a rota devolve 404 (mesma convenção do
// export do comparativo de distribuição/D366).
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

  // Mesmo recorte por ano da página (D108): oferece só os anos dos shows não
  // cancelados. Sem um ano concreto não há comparativo → 404.
  const availableYears = showProfitYears(
    shows.filter((s) => s.status !== CANCELLED).map((s) => s.date),
  );
  const yearFilter = parseProfitYear(
    req.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );
  if (yearFilter === "all") {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const previousYear = yearFilter - 1;

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

  const currentReport = rankContactsByProfit(
    filterShowsByYear(shows, yearFilter) as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );
  const previousReport = rankContactsByProfit(
    filterShowsByYear(shows, previousYear) as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );

  const comparison = compareContactMargins(currentReport, previousReport);
  // Sem contratante em comum nos dois anos, não há nada a comparar → 404.
  if (comparison.comparedCount === 0) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const csv = contactMarginComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename = `margem-contratantes-comparativo-${yearFilter}-vs-${previousYear}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
