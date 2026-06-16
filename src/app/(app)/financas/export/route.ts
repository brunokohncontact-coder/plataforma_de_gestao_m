import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  filterTransactions,
  isValidMonthKey,
  isValidDateKey,
  dayKey,
  type TransactionFilter,
} from "@/lib/finance";
import { transactionsToCsv, type CsvTransaction } from "@/lib/csv";
import type { TransactionType } from "@/lib/domain";

export const dynamic = "force-dynamic";

// Exporta as transações do usuário em CSV, aplicando os MESMOS filtros da página
// de finanças (mês, tipo, categoria, show, situação, intervalo de datas) que
// chegam pela query string. A camada pura está em `@/lib/csv` (testada).
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;

  const monthParam = sp.get("mes") ?? undefined;
  const typeParam = sp.get("tipo");
  const showParam = sp.get("show");
  const statusParam = sp.get("status");
  const categoryParam = sp.get("categoria");
  const fromParam = sp.get("de") ?? undefined;
  const toParam = sp.get("ate") ?? undefined;

  const filter: TransactionFilter = {
    month: isValidMonthKey(monthParam) ? monthParam : null,
    type:
      typeParam === "INCOME" || typeParam === "EXPENSE"
        ? (typeParam as TransactionType)
        : null,
    showId: showParam || null,
    received: statusParam === "received" ? true : statusParam === "pending" ? false : null,
    category: categoryParam || null,
    from: isValidDateKey(fromParam) ? fromParam : null,
    to: isValidDateKey(toParam) ? toParam : null,
  };

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { title: true } } },
  });

  const rows: (CsvTransaction & { showId: string | null })[] = transactions.map((t) => ({
    date: t.date,
    type: t.type as TransactionType,
    description: t.description,
    category: t.category,
    amount: t.amount,
    received: t.received,
    showId: t.showId,
    show: t.show ? { title: t.show.title } : null,
  }));

  const visible = filterTransactions(rows, filter);
  const csv = transactionsToCsv(visible);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "\uFEFF" + csv;
  const filename = `financas-${dayKey(new Date())}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
