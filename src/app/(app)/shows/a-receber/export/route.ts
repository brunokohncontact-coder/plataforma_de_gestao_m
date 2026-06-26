import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  reconcileShowFees,
  bucketReceivablesByAge,
  paymentPromiseStatus,
  type PromisableShowLike,
  type TxLike,
} from "@/lib/finance";
import { receivablesToCsv, type ReceivableCsvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta os cachês a receber (recebíveis em aberto) em CSV, espelhando a página
// `/shows/a-receber`: mesma consulta (shows PLAYED/CONFIRMED + receitas vinculadas)
// e a mesma reconciliação/aging/promessas da camada pura (`@/lib/finance`, testada).
// A serialização fica em `@/lib/csv` (`receivablesToCsv`, testada). As linhas saem
// do atraso mais longo ao mais curto (ordem do aging), para priorizar a cobrança.
export async function GET() {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { in: ["PLAYED", "CONFIRMED"] } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        date: true,
        status: true,
        fee: true,
        venue: true,
        city: true,
        paymentPromisedAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", showId: { not: null } },
      select: { type: true, amount: true, received: true, showId: true },
    }),
  ]);

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: "",
    date: new Date(),
    received: t.received,
    showId: t.showId,
  }));

  const result = reconcileShowFees(shows as PromisableShowLike[], txs);
  const aging = bucketReceivablesByAge(result);
  const daysByShow = new Map(
    aging.buckets.flatMap((b) => b.rows.map((a) => [a.row.show.id, a.daysOutstanding])),
  );
  const showById = new Map(shows.map((s) => [s.id, s]));

  // Ordena pelo atraso mais longo (como o aging prioriza a cobrança), id desempata.
  const ordered = [...result.rows].sort(
    (a, b) =>
      (daysByShow.get(b.show.id) ?? 0) - (daysByShow.get(a.show.id) ?? 0) ||
      a.show.id.localeCompare(b.show.id),
  );

  const csvRows: ReceivableCsvRow[] = ordered.map((row) => {
    const show = showById.get(row.show.id);
    return {
      show: {
        title: show?.title ?? "Show",
        date: row.show.date,
        venue: show?.venue ?? null,
        city: show?.city ?? null,
      },
      fee: row.fee,
      collected: row.collected,
      outstanding: row.outstanding,
      daysOutstanding: daysByShow.get(row.show.id) ?? 0,
      unregistered: row.unregistered,
      registeredPending: row.registeredPending,
      promiseStatus: paymentPromiseStatus(show?.paymentPromisedAt ?? null),
      promisedAt: show?.paymentPromisedAt ?? null,
    };
  });

  const csv = receivablesToCsv(csvRows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  // Nome ASCII (sem acento) para evitar caracteres não-ASCII no header HTTP.
  const filename = "caches-a-receber.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
