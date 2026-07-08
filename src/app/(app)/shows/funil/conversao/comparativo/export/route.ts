import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  compareProposalOutcomes,
  proposalOutcomes,
  proposalOutcomeYears,
} from "@/lib/shows";
import { parseProfitYear } from "@/lib/finance";
import { proposalConversionComparisonToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Exporta o comparativo ano a ano da conversão real de propostas (Conversão real
// {ano} vs. {ano-1}) em CSV — espelha o card `ConversionComparisonCard` de
// `/shows/funil/conversao`. Só faz sentido com um ano específico (`?ano=YYYY`) e
// ambas as coortes (deste ano e do anterior) com propostas decididas — o mesmo
// gate que decide exibir o card na página; fora disso, 404 (não há comparativo
// para exportar). A camada pura está em `@/lib/shows` (`compareProposalOutcomes`)
// e `@/lib/csv` (`proposalConversionComparisonToCsv`), ambas testadas; aqui só
// consultamos, recortamos a coorte de cada ano do mesmo acervo e embrulhamos no
// HTTP.
export async function GET(request: Request) {
  const user = await requireUser();

  // Só os eventos de status de cada show — a coorte é montada pela data da
  // primeira entrada em PROPOSED (a agregação é pura sobre os eventos).
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    select: {
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Os anos válidos vêm só dos shows que entraram em PROPOSED. `parseProfitYear`
  // devolve "all" quando o parâmetro não bate num ano do acervo — e o comparativo
  // exige um ano concreto, então "all" cai no 404 abaixo.
  const availableYears = proposalOutcomeYears(shows);
  const rawYear = new URL(request.url).searchParams.get("ano") ?? undefined;
  const yearFilter = parseProfitYear(rawYear, availableYears);

  if (yearFilter === "all") {
    return new NextResponse("Selecione um ano para exportar o comparativo.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Recorta a coorte deste ano e a do anterior do mesmo acervo já carregado
  // (zero I/O extra; o eixo é a data da proposta), espelhando a página.
  const current = proposalOutcomes(shows, { year: yearFilter });
  const previous = proposalOutcomes(shows, { year: yearFilter - 1 });

  // Mesmo gate do card na página: só há comparativo com propostas decididas nos
  // dois períodos (sem decididas a taxa é indefinida e não há o que comparar).
  if (current.decidedCount === 0 || previous.decidedCount === 0) {
    return new NextResponse("Sem propostas decididas nos dois anos para comparar.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const comparison = compareProposalOutcomes(current, previous);
  const csv = proposalConversionComparisonToCsv(comparison);

  // BOM UTF-8 para preservar acentuação ao abrir no Excel.
  const body = "﻿" + csv;
  const filename = `conversao-comparativo-${yearFilter}-vs-${yearFilter - 1}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
