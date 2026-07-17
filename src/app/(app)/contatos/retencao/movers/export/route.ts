import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  compareRetentionPricingYoY,
  retentionPriceMovers,
  type ContactRankLike,
} from "@/lib/contacts";
import { retentionPriceMoversToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface RetentionContact extends ContactRankLike {
  role: string;
}

// Exporta os "movers de preço" ano a ano (`/contatos/retencao`, seção "Movers de
// preço") em CSV — a lista acionável de com quem você subiu/baixou o cachê de um
// ano para o outro (D352). Espelha a mesma query/derivação da página: deriva o
// par de anos com `compareRetentionPricingYoY` (o MESMO par do card agregado,
// para que planilha e tela contem a mesma história) e abre os movers individuais
// com `retentionPriceMovers`. A camada pura está em `@/lib/csv`
// (`retentionPriceMoversToCsv`). Quando não há par YoY comparável (carteira nova,
// ano isolado) os movers são nulos → CSV só com o cabeçalho.
export async function GET() {
  const user = await requireUser();

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      shows: {
        select: {
          show: { select: { status: true, date: true, fee: true } },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as RetentionContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const pricingYoY = compareRetentionPricingYoY(items);
  const movers = pricingYoY
    ? retentionPriceMovers(items, pricingYoY.year, pricingYoY.previousYear)
    : null;

  const csv = retentionPriceMoversToCsv(movers);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movers-de-preco.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
