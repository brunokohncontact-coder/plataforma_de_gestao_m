import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  rankRolesByProfit,
  compareRoleMargins,
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
import { roleMarginComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const CANCELLED = "CANCELLED";

// Exporta o comparativo ano a ano da MARGEM por PAPEL do contratante ("que tipo
// de canal apertou a margem") em CSV — espelha o card "Margem por papel {ano} vs.
// {ano-1}" de `/contatos/rentabilidade/por-papel` (D375). Rollup por papel do
// irmão por contratante (`comparativo-margem/export`/D373). A camada pura está em
// `@/lib/finance` (`compareRoleMargins`) e `@/lib/csv`.
//
// Gate (espelha o card): exige um ano CONCRETO (`?ano=YYYY`) — o comparativo é
// contra o ano anterior — E ao menos um papel presente nos DOIS anos; senão a
// leitura é vazia/enganosa e a rota devolve 404 (mesma convenção do export do
// comparativo de margem por contratante/D373).
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
  // Mesmo recorte por natureza da página/card (D384): "todos" × só firmes,
  // aplicado aos DOIS anos para o comparativo casar com o que a tela mostra.
  const nature = parseShowNature(
    req.nextUrl.searchParams.get("natureza") ?? undefined,
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

  const currentReport = rankRolesByProfit(
    filterShowsByNature(
      filterShowsByYear(shows, yearFilter),
      nature,
    ) as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );
  const previousReport = rankRolesByProfit(
    filterShowsByNature(
      filterShowsByYear(shows, previousYear),
      nature,
    ) as (ShowLike & ShowRow)[],
    txs,
    getPayer as (s: ShowLike & ShowRow) => ContactProfitContact | null,
  );

  const comparison = compareRoleMargins(currentReport, previousReport);
  // Sem papel em comum nos dois anos, não há nada a comparar → 404.
  if (comparison.comparedCount === 0) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const csv = roleMarginComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const natureSuffix = nature === "firm" ? "-firmes" : "";
  const filename = `margem-papeis-comparativo-${yearFilter}-vs-${previousYear}${natureSuffix}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
