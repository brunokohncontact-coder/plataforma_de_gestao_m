import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/finance";
import {
  buildAccountDataExport,
  accountDataExportToJson,
  accountDataExportFilename,
} from "@/lib/accountExport";

export const dynamic = "force-dynamic";

// Backup / portabilidade: baixa TODOS os dados da conta (shows, transações,
// contatos, metas e perfil) num único arquivo JSON versionado. A montagem e a
// serialização ficam na camada pura `@/lib/accountExport` (testada); aqui só
// carregamos os registros do usuário e carimbamos o momento do export.
export async function GET() {
  const user = await requireUser();

  const [shows, transactions, contacts, revenueGoals] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        date: true,
        venue: true,
        city: true,
        status: true,
        fee: true,
        notes: true,
        paymentPromisedAt: true,
        contacts: { select: { contactId: true } },
        statusEvents: {
          select: { fromStatus: true, toStatus: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        type: true,
        description: true,
        category: true,
        amount: true,
        date: true,
        received: true,
        showId: true,
      },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        phone: true,
        notes: true,
      },
    }),
    prisma.revenueGoal.findMany({
      where: { userId: user.id },
      orderBy: { year: "desc" },
      select: { year: true, amount: true },
    }),
  ]);

  const now = new Date();
  const data = buildAccountDataExport({
    exportedAt: now,
    profile: {
      name: user.name,
      email: user.email,
      artistName: user.artistName,
      taxRatePercent: user.taxRatePercent,
    },
    shows: shows.map((s) => ({
      ...s,
      contactIds: s.contacts.map((c) => c.contactId),
      statusEvents: s.statusEvents,
    })),
    transactions,
    contacts,
    revenueGoals,
  });

  const body = accountDataExportToJson(data);
  const filename = accountDataExportFilename(dayKey(now));

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
