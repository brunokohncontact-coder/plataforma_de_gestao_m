import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildDueAgenda } from "@/lib/finance";
import { dueAgendaToCsv, type DueAgendaCsvTx } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta a agenda de contas a pagar e a receber (pendências por janela de
// vencimento) em CSV — espelha a página `/financas/agenda`. Mesma consulta (só
// pendências, `received: false`) e mesmo `buildDueAgenda`; a distribuição nas
// janelas e a ordenação por vencimento ficam na lógica pura. A camada pura está
// em `@/lib/finance` (`buildDueAgenda`) e `@/lib/csv` (`dueAgendaToCsv`), ambas
// testadas.
export async function GET() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, received: false },
    orderBy: { date: "asc" },
    include: { show: { select: { title: true } } },
  });

  const pending: DueAgendaCsvTx[] = transactions.map((t) => ({
    type: t.type as DueAgendaCsvTx["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    description: t.description,
    show: t.show,
  }));

  const agenda = buildDueAgenda(pending);
  const csv = dueAgendaToCsv(agenda);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = "agenda-pagar-receber.csv";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
