import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  paymentLagByContact,
  paymentLagYears,
  parseProfitYear,
  filterShowsByYear,
  type ReceivableShowLike,
  type TxLike,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { paymentLagByContactToCsv, type PaymentLagByContactCsvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Contato resolvido como pagador de um show (campos usados aqui). */
interface PayerContact {
  id: string;
  name: string;
  role: string;
}

// Exporta o prazo de recebimento AGRUPADO por contratante (quem paga rápido ×
// devagar) em CSV, espelhando a página `/shows/prazo-recebimento/por-contratante`:
// mesma consulta (shows não cancelados + contatos + receitas recebidas vinculadas),
// a mesma atribuição de pagador por papel (`pickPayerContact`) e a mesma agregação
// ponderada (`paymentLagByContact`), toda na camada pura testada. A serialização
// fica em `@/lib/csv` (`paymentLagByContactToCsv`, testada). Uma linha por
// contratante, do prazo mais lento ao mais rápido (grupo "Sem contratante" por
// último), com o prazo mediano só a partir de `MIN_MEDIAN_LAG_SAMPLE` shows pagos.
// Recorte por período opcional via `?ano=` (mesmo eixo/`date` da página, D192).
export async function GET(request: NextRequest) {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      orderBy: { date: "asc" },
      include: { contacts: { include: { contact: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", received: true, showId: { not: null } },
      select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  type ShowRow = (typeof shows)[number];
  const getPayer = (show: ShowRow): PayerContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };

  // Recorte por ano espelhando a página: só anos com prazo mensurável, filtra
  // os shows pela `date` (D108) antes de agregar por contratante.
  const availableYears = paymentLagYears(shows, txs);
  const yearFilter = parseProfitYear(
    request.nextUrl.searchParams.get("ano") ?? undefined,
    availableYears,
  );

  const lag = paymentLagByContact(
    filterShowsByYear(shows, yearFilter) as (ReceivableShowLike & ShowRow)[],
    txs,
    getPayer as (s: ReceivableShowLike & ShowRow) => PayerContact | null,
  );

  const csvRows: PaymentLagByContactCsvRow[] = lag.rows.map((r) => ({
    contact: r.contact ? { name: r.contact.name, role: r.contact.role } : null,
    received: r.received,
    showCount: r.showCount,
    avgDays: r.avgDays,
    medianDays: r.medianDays,
    lastDays: r.lastDays,
    share: r.share,
    bucket: r.bucket,
  }));

  const csv = paymentLagByContactToCsv(csvRows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  // Nome ASCII (sem acento) para evitar caracteres não-ASCII no header HTTP;
  // herda o ano do recorte (`-todos` quando sem filtro), como a tela-mãe (D192).
  const filename = `prazo-recebimento-por-contratante-${yearFilter === "all" ? "todos" : yearFilter}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
