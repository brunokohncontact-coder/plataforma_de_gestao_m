import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  reconcileShowFees,
  outstandingByContact,
  summarizePaymentPromises,
  awaitingPromiseByContact,
  type ReceivableShowLike,
  type PromisableShowLike,
  type TxLike,
} from "@/lib/finance";
import { pickPayerContact } from "@/lib/billing";
import { receivablesByContactToCsv, type ReceivableByContactCsvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Contato resolvido como pagador de um show (campos usados aqui). */
interface PayerContact {
  id: string;
  name: string;
  role: string;
}

// Exporta os cachês a receber AGRUPADOS por contratante (de quem cobrar primeiro)
// em CSV, espelhando a página `/shows/a-receber/por-contratante`: mesma consulta
// (shows PLAYED/CONFIRMED + contatos + receitas vinculadas), a mesma reconciliação
// (`reconcileShowFees`), a mesma atribuição de pagador por papel (`pickPayerContact`)
// e a mesma agregação por devedor (`outstandingByContact`), toda na camada pura
// testada. As promessas vencidas por grupo vêm de `summarizePaymentPromises`. A
// serialização fica em `@/lib/csv` (`receivablesByContactToCsv`, testada). Uma
// linha por devedor, do maior saldo ao menor (grupo "Sem contratante" por último).
export async function GET() {
  const user = await requireUser();

  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { in: ["PLAYED", "CONFIRMED"] } },
      orderBy: { date: "asc" },
      include: { contacts: { include: { contact: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", showId: { not: null } },
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
  const receivables = reconcileShowFees(shows as (ReceivableShowLike & ShowRow)[], txs);

  const getPayer = (show: ShowRow): PayerContact | null => {
    const picked = pickPayerContact(show.contacts.map((cs) => cs.contact));
    return picked ? { id: picked.id, name: picked.name, role: picked.role } : null;
  };

  const byContact = outstandingByContact(
    receivables,
    getPayer as (s: ReceivableShowLike & ShowRow) => PayerContact | null,
  );

  // Cobrança que ainda nem começou por devedor (D289): recebíveis vencidos há
  // ≥30 dias SEM nenhuma promessa registrada. Espelha a página; o lookup por id
  // do contratante casa a chave de `byContact` (grupo sem contratante = "").
  const NO_CONTACT_KEY = "";
  const awaiting = awaitingPromiseByContact(
    receivables.rows,
    getPayer as (s: PromisableShowLike & ShowRow) => PayerContact | null,
  );
  const awaitingByKey = new Map(
    awaiting.rows.map((r) => [r.contact?.id ?? NO_CONTACT_KEY, r]),
  );

  // Promessas vencidas por devedor (mesma chave da página): contagem + valor.
  const csvRows: ReceivableByContactCsvRow[] = byContact.rows.map((r) => {
    const promises = summarizePaymentPromises(r.rows.map((a) => a.row));
    const await_ = awaitingByKey.get(r.contact?.id ?? NO_CONTACT_KEY);
    return {
      contact: r.contact ? { name: r.contact.name, role: r.contact.role } : null,
      outstanding: r.outstanding,
      showCount: r.showCount,
      maxDaysOutstanding: r.maxDaysOutstanding,
      weightedAvgDays: r.weightedAvgDays,
      share: r.share,
      brokenCount: promises.brokenCount,
      brokenOutstanding: promises.brokenOutstanding,
      awaitingCount: await_?.count ?? 0,
      awaitingOutstanding: await_?.totalOutstanding ?? 0,
    };
  });

  const csv = receivablesByContactToCsv(csvRows);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  // Nome ASCII (sem acento) para evitar caracteres não-ASCII no header HTTP.
  const filename = "caches-a-receber-por-contratante.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
