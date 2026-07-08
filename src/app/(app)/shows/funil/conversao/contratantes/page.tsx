import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  proposalOutcomesByContact,
  proposalOutcomeYears,
  compareContactProposalOutcomes,
  indexContactProposalConversionChanges,
  type ProposalOutcomeShowLike,
  type ContactProposalConversionComparison,
  type ContactProposalConversionChange,
  type ContactProposalConversionRowStatus,
} from "@/lib/shows";
import { parseProfitYear, type ProfitYearFilter } from "@/lib/finance";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

interface ConversionContact {
  id: string;
  name: string;
  role: string;
}

/** Taxa (0..1) como percentual inteiro, ou "—" quando indefinida. */
function rateLabel(rate: number | null): string {
  return rate == null ? "—" : `${(rate * 100).toFixed(0)}%`;
}

/** Variação da taxa de conversão em pontos percentuais, com sinal. */
function pctDelta(delta: number): string {
  const points = Math.round(delta * 100);
  const sign = points > 0 ? "+" : "";
  return `${sign}${points} pts`;
}

export default async function ProposalConversionByContactPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Cada contato + os eventos de status dos shows a que está vinculado — a coorte
  // de cada contratante se monta pela data da PRIMEIRA entrada em PROPOSED (a
  // agregação é pura sobre os eventos, como em `/shows/funil/conversao`).
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      shows: {
        select: {
          show: {
            select: {
              statusEvents: {
                select: { fromStatus: true, toStatus: true, createdAt: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as ConversionContact,
    shows: c.shows.map((cs) => cs.show) as ProposalOutcomeShowLike[],
  }));

  // Anos do seletor: só os que têm coorte (entrada em PROPOSED), reaproveitando o
  // mesmo eixo (data da proposta) da conversão geral. Achatar com repetição não
  // afeta o conjunto de anos.
  const allShows = items.flatMap((i) => i.shows);
  const availableYears = proposalOutcomeYears(allShows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);

  const report = proposalOutcomesByContact(items, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const periodLabel =
    yearFilter === "all" ? "todas as propostas" : `propostas de ${yearFilter}`;

  // Comparativo por contratante {ano} × {ano-1}: para quem minhas propostas
  // passaram a fechar mais / menos (o card de movers do funil por contratante /
  // D236, aqui no eixo da conversão real / D247). Só com um ano específico e ambas
  // as coortes não-vazias — senão "convertendo mais/menos" enganaria. Reusa os
  // mesmos `items` já carregados, recortando pela data da proposta (opts.year),
  // sem nova consulta; o veredito ancora na taxa de conversão, direção "subir é
  // melhora" como o funil geral.
  let comparison: ContactProposalConversionComparison<ConversionContact> | null = null;
  let previousYear = 0;
  if (yearFilter !== "all" && report.contactCount > 0) {
    previousYear = yearFilter - 1;
    const previousReport = proposalOutcomesByContact(items, { year: previousYear });
    if (previousReport.contactCount > 0) {
      const cmp = compareContactProposalOutcomes(report, previousReport);
      // Só vale exibir se há de fato algum contratante nas duas coortes.
      if (cmp.changes.length > 0) comparison = cmp;
    }
  }

  // Lookup por `contact.id` para a coluna "vs. {ano-1}" da tabela: casa cada linha
  // com sua variação da taxa de conversão real no comparativo (D248), em O(1) — o
  // detalhe por-linha que o card de movers abre (espelho de D238 no funil por
  // contratante). Só existe quando há comparativo exibível.
  const rowStatus = comparison ? indexContactProposalConversionChanges(comparison) : null;

  const exportHref =
    yearFilter === "all"
      ? "/shows/funil/conversao/contratantes/export"
      : `/shows/funil/conversao/contratantes/export?ano=${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conversão por contratante</h1>
          <p className="text-sm text-gray-500">
            De quem minhas propostas de fato viram show ({periodLabel}). A mesma coorte da
            conversão geral (pela data em que a <em>proposta</em> nasceu), quebrada por
            contratante — para saber com quem vale insistir e de quem a proposta esfria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.contactCount > 0 && (
            <a href={exportHref} className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/conversao" className="btn-secondary">
            ← Conversão
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter as ProfitYearFilter}
          basePath="/shows/funil/conversao/contratantes"
        />
      )}

      {report.contactCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Ainda não há propostas registradas para medir a conversão por contratante.</p>
          <p className="mt-2 text-sm">
            A conversão é calculada a partir do histórico de status registrado a partir de agora
            (proposta → confirmado → realizado), vinculado a cada contratante. Conforme você
            cadastra e movimenta shows com contatos, esta leitura vai se formando — os shows
            antigos, sem histórico, ficam de fora.
          </p>
          <Link
            href="/shows/funil/conversao"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver a conversão geral das propostas
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Contratantes na coorte"
              value={String(report.contactCount)}
              hint="com ao menos uma proposta no período"
              tone="gray"
            />
            <Stat
              label="Conversão da carteira"
              value={rateLabel(report.overall.conversionRate)}
              hint={
                report.overall.conversionRate == null
                  ? "nenhuma proposta decidida ainda"
                  : `${report.overall.wonCount} de ${report.overall.decidedCount} decididas viraram show`
              }
              tone="brand"
            />
            <Stat
              label="Propostas na coorte"
              value={String(report.overall.total)}
              hint={`${report.overall.decidedCount} decidida${report.overall.decidedCount === 1 ? "" : "s"} · ${report.overall.openCount} em aberto`}
              tone="emerald"
            />
          </div>

          {comparison && (
            <ConversionMoversCard
              comparison={comparison}
              currentYear={yearFilter as number}
              previousYear={previousYear}
            />
          )}

          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Conversão</th>
                  <th className="px-4 py-3 text-right font-medium">Realizadas</th>
                  <th className="px-4 py-3 text-right font-medium">Perdidas</th>
                  <th className="px-4 py-3 text-right font-medium">Em aberto</th>
                  <th className="px-4 py-3 text-right font-medium">Coorte</th>
                  {rowStatus && (
                    <th className="px-4 py-3 text-right font-medium">
                      vs. {previousYear}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map(({ contact, conversion }) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/contatos/${contact.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {contact.name}
                      </Link>
                      <div className="mt-0.5">
                        <span className="badge bg-brand-50 text-brand-700">
                          {CONTACT_ROLE_LABELS[contact.role as ContactRole] ?? contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {conversion.conversionRate == null ? (
                        <span
                          className="text-gray-400"
                          title="Nenhuma proposta decidida ainda (sem realizada nem perdida)."
                        >
                          —
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold text-brand-700">
                            {rateLabel(conversion.conversionRate)}
                          </span>
                          <div className="text-xs text-gray-400">
                            {conversion.wonCount}/{conversion.decidedCount} decididas
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {conversion.wonCount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {conversion.lostCount}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {conversion.openCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">
                      {conversion.total}
                    </td>
                    {rowStatus && (
                      <td className="px-4 py-3 text-right">
                        <ConversionRowDelta
                          status={rowStatus(contact.id)}
                          year={previousYear}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            A <strong>conversão</strong> olha só as propostas com desfecho (realizadas ÷
            decididas), resistente a propostas ainda em andamento. As em aberto entram na coorte
            do contratante, mas ficam fora do denominador da taxa. Um show com mais de um contato
            conta para cada um. A ordem prioriza a maior taxa; onde a taxa empata, quem decidiu
            mais propostas aparece antes — leia a coluna “decididas” para pesar amostras finas.
            {rowStatus && (
              <>
                {" "}
                A coluna <strong>vs. {previousYear}</strong> mostra a variação da taxa de conversão
                real deste contratante frente ao ano anterior:{" "}
                <span className="text-emerald-600">verde</span> fechou uma fração maior,{" "}
                <span className="text-red-600">vermelho</span> fechou menos, “novo” só teve proposta
                na coorte deste ano.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "gray",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "brand" | "amber" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    brand: "text-brand-700",
    amber: "text-amber-600",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

/**
 * Célula da coluna "vs. {ano-1}" na tabela de conversão por contratante: a variação
 * da taxa de conversão real deste contratante frente ao ano anterior
 * (`indexContactProposalConversionChanges`). Subir a taxa é melhora (verde, fecha
 * uma fração maior das que propõe); descer é piora (vermelho); dentro do limiar é
 * estável (cinza). Quem só teve proposta neste ano vira "novo"; quem não é comparável
 * (ou sem base — taxa indefinida em algum período) fica em "—". Espelho de
 * `PipelineRowDelta` (D238) no eixo da coorte.
 */
function ConversionRowDelta({
  status,
  year,
}: {
  status: ContactProposalConversionRowStatus<ConversionContact>;
  year: number;
}) {
  if (status.kind === "new") {
    return (
      <span
        className="text-xs text-gray-400"
        title={`Só teve proposta na coorte depois de ${year}`}
      >
        novo
      </span>
    );
  }
  if (status.kind === "none") {
    return <span className="text-gray-300">—</span>;
  }
  const { conversionRateDelta, trend } = status.change;
  if (conversionRateDelta == null) {
    return (
      <span
        className="text-gray-300"
        title="Sem proposta decidida em algum dos anos — sem base para comparar."
      >
        —
      </span>
    );
  }
  const tone =
    trend === "improved"
      ? "text-emerald-600"
      : trend === "worsened"
        ? "text-red-600"
        : "text-gray-500";
  return <span className={"font-medium " + tone}>{pctDelta(conversionRateDelta)}</span>;
}

/**
 * Card "Para quem passei a fechar mais/menos · {ano} vs. {ano-1}": destaca o
 * contratante cuja conversão real mais melhorou e o cuja mais piorou frente ao ano
 * anterior (`compareContactProposalOutcomes`). Espelho por contratante do
 * comparativo geral da conversão (D244) no eixo da coorte: **subir** a taxa é a
 * melhora (fecha uma fração maior das propostas que faz). Fecha o rodapé com quem
 * entrou / saiu da mesa de propostas neste ano.
 */
function ConversionMoversCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ContactProposalConversionComparison<ConversionContact>;
  currentYear: number;
  previousYear: number;
}) {
  const { biggestImprovement, biggestWorsening, changes, newContacts, droppedContacts } =
    comparison;
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Para quem passei a fechar mais/menos · {currentYear} vs. {previousYear}
        </p>
        <span className="text-xs text-gray-400">
          {changes.length}{" "}
          {changes.length === 1 ? "contratante comparável" : "contratantes comparáveis"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoverBlock title="Convertendo mais" change={biggestImprovement} tone="improved" />
        <MoverBlock title="Convertendo menos" change={biggestWorsening} tone="worsened" />
      </div>
      {(newContacts.length > 0 || droppedContacts.length > 0) && (
        <p className="text-xs text-gray-400">
          {newContacts.length > 0 && (
            <>
              {newContacts.length}{" "}
              {newContacts.length === 1
                ? "contratante com proposta nova na mesa"
                : "contratantes com proposta nova na mesa"}{" "}
              em {currentYear}
            </>
          )}
          {newContacts.length > 0 && droppedContacts.length > 0 && " · "}
          {droppedContacts.length > 0 && (
            <>
              {droppedContacts.length}{" "}
              {droppedContacts.length === 1
                ? "tinha proposta"
                : "tinham proposta"}{" "}
              em {previousYear} mas não em {currentYear}
            </>
          )}
          .
        </p>
      )}
    </section>
  );
}

/** Um lado do card de "movers": para quem passei a fechar mais ou menos. */
function MoverBlock({
  title,
  change,
  tone,
}: {
  title: string;
  change: ContactProposalConversionChange<ConversionContact> | null;
  tone: "improved" | "worsened";
}) {
  const valueClass = tone === "improved" ? "text-emerald-600" : "text-red-600";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      {change && change.conversionRateDelta != null ? (
        <>
          <p className="mt-1 truncate font-medium text-gray-900">{change.contact.name}</p>
          <p className={"mt-1 text-lg font-bold " + valueClass}>
            {pctDelta(change.conversionRateDelta)}
          </p>
          <p className="text-xs text-gray-400">
            {rateLabel(change.previous.conversion.conversionRate)} →{" "}
            {rateLabel(change.current.conversion.conversionRate)}
          </p>
          {change.winRateDelta != null && (
            <p className="mt-1 text-xs text-gray-400">
              Vazão da coorte: {pctDelta(change.winRateDelta)} —{" "}
              {rateLabel(change.previous.conversion.winRate)} →{" "}
              {rateLabel(change.current.conversion.winRate)} das propostas viraram palco
              (inclui as em aberto).
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-400">
          Nenhum contratante passou a converter{" "}
          {tone === "improved" ? "mais" : "menos"} de forma relevante
        </p>
      )}
    </div>
  );
}
