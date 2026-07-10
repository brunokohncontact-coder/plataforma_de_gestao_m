import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  proposalDeliberationByContact,
  proposalOutcomeYears,
  compareProposalDeliberationByContact,
  indexContactProposalDeliberationChanges,
  MIN_DELIBERATION_SAMPLE,
  DELIBERATION_TREND_EPSILON,
  type ProposalDeliberationShowLike,
  type ContactProposalDeliberationRow,
  type ProposalDeliberationByContactComparison,
  type ContactProposalDeliberationChange,
  type ContactProposalDeliberationRowStatus,
} from "@/lib/shows";
import { parseProfitYear, type ProfitYearFilter } from "@/lib/finance";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

interface DeliberationContact {
  id: string;
  name: string;
  role: string;
}

/** Dias inteiros como texto pt-BR ("1 dia" / "N dias"). */
function daysLabel(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/** Participação 0..1 como percentual inteiro (ex.: 0,25 → "25%"). */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function ProposalDeliberationByContactPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();

  // Cada contato + os eventos de status dos shows a que está vinculado — a
  // deliberação de cada contratante se destila da etapa PROPOSED (a agregação é
  // pura sobre os eventos, como em `/shows/funil/tempo-em-etapa`).
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
    contact: { id: c.id, name: c.name, role: c.role } as DeliberationContact,
    shows: c.shows.map((cs) => cs.show) as ProposalDeliberationShowLike[],
  }));

  // Anos do seletor: só os que têm coorte (entrada em PROPOSED), pelo mesmo eixo
  // (data da proposta) da conversão por contratante — reusa `proposalOutcomeYears`,
  // já que a deliberação recorta pela ENTRADA da proposta no funil, não pela data
  // do show. Achatar com repetição não afeta o conjunto de anos.
  const allShows = items.flatMap((i) => i.shows);
  const availableYears = proposalOutcomeYears(allShows);
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);

  const report = proposalDeliberationByContact(items, {
    year: yearFilter === "all" ? "all" : yearFilter,
  });
  const periodLabel =
    yearFilter === "all" ? "todas as propostas" : `propostas de ${yearFilter}`;

  // Comparativo por contratante {ano} × {ano-1}: quem passou a decidir mais rápido /
  // mais devagar uma proposta (D278 — fecha o "passo maior" adiado na D276, espelhando
  // compareBookingLeadTimeByContact/D196). Só com um ano específico e ambos os períodos
  // com decisão cronometrada — senão "acelerou/desacelerou" enganaria. Reusa os MESMOS
  // itens já carregados, recortando o ano anterior pelo eixo da entrada da proposta
  // (`opts.year`), sem nova consulta. O veredito por contratante ancora na mediana, o
  // eixo por que a página ordena e destaca.
  let comparison: ProposalDeliberationByContactComparison<DeliberationContact> | null = null;
  let previousYear = 0;
  if (yearFilter !== "all") {
    previousYear = yearFilter - 1;
    const previousReport = proposalDeliberationByContact(items, { year: previousYear });
    if (report.totalSamples > 0 && previousReport.totalSamples > 0) {
      const c = compareProposalDeliberationByContact(report, previousReport);
      // Só vale exibir se há de fato algum contratante nos dois períodos.
      if (c.changes.length > 0) comparison = c;
    }
  }

  // Lookup por `contact.id` para a coluna "vs. {ano-1}" da tabela: casa cada linha
  // (período atual) com sua variação, ou marca "novo"/"—" (D278). Reusa o mesmo
  // comparativo já computado — zero lógica pura nova na página.
  const rowStatus = comparison ? indexContactProposalDeliberationChanges(comparison) : null;

  const exportHref =
    yearFilter === "all"
      ? "/shows/funil/tempo-em-etapa/por-contratante/export"
      : `/shows/funil/tempo-em-etapa/por-contratante/export?ano=${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tempo de decisão por contratante</h1>
          <p className="text-sm text-gray-500">
            Quanto tempo, tipicamente, cada contratante deixa uma proposta na mesa antes de decidir —
            avançar para confirmado ou cancelar ({periodLabel}). O tempo em cada etapa, quebrado por
            quem fecha: para saber com quem vale cobrar antes e de quem a resposta demora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.contactCount > 0 && (
            <a href={exportHref} className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/tempo-em-etapa" className="btn-secondary">
            ← Tempo em cada etapa
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter as ProfitYearFilter}
          basePath="/shows/funil/tempo-em-etapa/por-contratante"
        />
      )}

      {report.contactCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p>
            {yearFilter === "all"
              ? "Ainda não há propostas decididas por contratante para medir."
              : `Nenhuma proposta de ${yearFilter} foi decidida por contratante para medir.`}
          </p>
          <p className="mt-2 text-sm">
            A deliberação é calculada a partir do histórico de status registrado a partir de agora
            (proposta → confirmado / cancelado), vinculado a cada contratante. Conforme você
            movimenta shows pelo funil, esta leitura vai se formando — propostas ainda na mesa
            (sem desfecho) não entram, e os shows antigos, sem histórico, ficam de fora.
          </p>
          <Link
            href="/shows/funil/tempo-em-etapa"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver o tempo em cada etapa
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Contratantes medidos"
              value={String(report.contactCount)}
              hint="com ao menos uma proposta decidida"
              tone="gray"
            />
            <Stat
              label="Deliberação da carteira"
              value={report.overall ? daysLabel(report.overall.medianDays) : "—"}
              hint={
                report.overall
                  ? `mediana de ${report.overall.count} ${report.overall.count === 1 ? "decisão" : "decisões"}`
                  : "nenhuma proposta decidida ainda"
              }
              tone="brand"
            />
            <Stat
              label="Decisões cronometradas"
              value={String(report.totalSamples)}
              hint="propostas que já saíram da mesa"
              tone="emerald"
            />
          </div>

          {report.slowest && (
            <SlowestCard row={report.slowest} />
          )}

          {comparison && (
            <DeliberationMoversCard
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
                  <th className="px-4 py-3 text-right font-medium">Mediana</th>
                  {rowStatus && (
                    <th className="px-4 py-3 text-right font-medium">vs. {previousYear}</th>
                  )}
                  <th className="px-4 py-3 text-right font-medium">Média</th>
                  <th className="px-4 py-3 text-right font-medium">Decisões</th>
                  <th className="px-4 py-3 text-right font-medium">Mín</th>
                  <th className="px-4 py-3 text-right font-medium">Máx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map(({ contact, stat, reliable }) => (
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
                      {reliable ? (
                        <span className="font-semibold tabular-nums text-gray-900">
                          {daysLabel(stat.medianDays)}
                        </span>
                      ) : (
                        <span
                          className="text-gray-400"
                          title={`Precisa de ao menos ${MIN_DELIBERATION_SAMPLE} decisões para a mediana ser confiável`}
                        >
                          —
                        </span>
                      )}
                    </td>
                    {rowStatus && (
                      <td className="px-4 py-3 text-right">
                        <DeliberationRowDelta
                          status={rowStatus(contact.id)}
                          year={previousYear}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {daysLabel(stat.averageDays)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-700">
                      {stat.count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {daysLabel(stat.shortestDays)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {daysLabel(stat.longestDays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            A <strong>deliberação</strong> conta os dias que uma proposta ficou na etapa Proposto
            antes de sair — avançando ou sendo cancelada. Propostas ainda na mesa (sem desfecho) não
            entram na conta. A ordem é da <strong>menor mediana à maior</strong> (quem decide rápido
            primeiro). A <strong>mediana</strong> é a leitura principal (resistente a um caso fora da
            curva) e só aparece com {MIN_DELIBERATION_SAMPLE} decisões ou mais; a média fica como
            referência. Um show com mais de um contato conta para cada um.
            {rowStatus && (
              <>
                {" "}
                A coluna <strong>vs. {previousYear}</strong> mostra a variação da mediana de
                deliberação de cada contratante frente ao ano anterior —{" "}
                <span className="text-emerald-600">verde</span> passou a decidir mais rápido,{" "}
                <span className="text-red-600">vermelho</span> passou a demorar mais,
                &quot;novo&quot; começou a decidir só neste ano.
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
 * Card "Quem mais te deixa esperando": destaca o contratante com a maior mediana
 * de deliberação entre os de amostra confiável — quem mais senta em cima da
 * proposta antes de decidir. Só aparece quando há mais de um contratante
 * confiável (senão o destaque seria trivial).
 */
function SlowestCard({
  row,
}: {
  row: ContactProposalDeliberationRow<DeliberationContact>;
}) {
  return (
    <section className="card border border-amber-200 bg-amber-50 text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Quem mais te deixa esperando
        </p>
        <span className="badge bg-white/70 font-semibold">🕰️ Proposta parada</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="truncate text-lg font-bold">{row.contact.name}</p>
          <p className="text-xs opacity-80">
            {CONTACT_ROLE_LABELS[row.contact.role as ContactRole] ?? row.contact.role} ·{" "}
            {row.stat.count} {row.stat.count === 1 ? "decisão" : "decisões"} ({pct(row.share)} das
            suas)
          </p>
        </div>
        <p className="text-2xl font-bold">{daysLabel(row.stat.medianDays)}</p>
      </div>
      <p className="mt-3 text-xs opacity-90">
        Mediana de {daysLabel(row.stat.medianDays)} para decidir uma proposta (até{" "}
        {daysLabel(row.stat.longestDays)} no caso mais lento). Vale combinar um prazo de resposta ou
        cobrar antes com quem costuma demorar.
      </p>
    </section>
  );
}

/** Variação da deliberação em dias com sinal (ex.: -12 → "−12 dias", 3 → "+3 dias"). */
function signedDaysLabel(delta: number): string {
  if (delta === 0) return "0 dias";
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${abs} ${abs === 1 ? "dia" : "dias"}`;
}

/**
 * Célula da coluna "vs. {ano-1}" na tabela por contratante: a variação da mediana
 * de deliberação deste contratante frente ao ano anterior
 * (`indexContactProposalDeliberationChanges`, D278). Descer a mediana é melhora
 * (verde, decide mais rápido); subir é piora (vermelho, demora mais); dentro do
 * limiar é estável (cinza). Quem só apareceu neste ano vira "novo"; quem não é
 * comparável fica em "—".
 */
function DeliberationRowDelta({
  status,
  year,
}: {
  status: ContactProposalDeliberationRowStatus<DeliberationContact>;
  year: number;
}) {
  if (status.kind === "new") {
    return (
      <span className="text-xs text-gray-400" title={`Começou a decidir depois de ${year}`}>
        novo
      </span>
    );
  }
  if (status.kind === "none") {
    return <span className="text-gray-300">—</span>;
  }
  const { medianDaysDelta, trend } = status.change;
  const tone =
    trend === "improved"
      ? "text-emerald-600"
      : trend === "worsened"
        ? "text-red-600"
        : "text-gray-500";
  return <span className={"font-medium tabular-nums " + tone}>{signedDaysLabel(medianDaysDelta)}</span>;
}

/** Um lado do card de "movers": quem acelerou ou quem desacelerou a decisão. */
function MoverBlock({
  title,
  change,
  tone,
}: {
  title: string;
  change: ContactProposalDeliberationChange<DeliberationContact> | null;
  tone: "improved" | "worsened";
}) {
  const valueClass = tone === "improved" ? "text-emerald-600" : "text-red-600";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      {change ? (
        <>
          <p className="mt-1 truncate font-medium text-gray-900">{change.contact.name}</p>
          <p className={"mt-1 text-lg font-bold " + valueClass}>
            {signedDaysLabel(change.medianDaysDelta)}
          </p>
          <p className="text-xs text-gray-400">
            {daysLabel(change.previous.stat.medianDays)} → {daysLabel(change.current.stat.medianDays)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-400">
          Nenhum contratante {tone === "improved" ? "acelerou" : "desacelerou"} mais de{" "}
          {DELIBERATION_TREND_EPSILON} dias
        </p>
      )}
    </div>
  );
}

/**
 * Card "Quem mudou o ritmo de decisão {ano} vs. {ano-1}": destaca o contratante que
 * mais acelerou (passou a decidir uma proposta mais rápido) e o que mais desacelerou
 * (passou a demorar mais) frente ao ano anterior
 * (`compareProposalDeliberationByContact`, D278). Como no prazo de recebimento,
 * **descer** a mediana é a melhora — a proposta fica menos tempo parada na mesa.
 * Fecha o rodapé com os contratantes que entraram e sumiram da carteira neste ano.
 * Espelho de `LeadTimeMoversCard` no eixo da deliberação.
 */
function DeliberationMoversCard({
  comparison,
  currentYear,
  previousYear,
}: {
  comparison: ProposalDeliberationByContactComparison<DeliberationContact>;
  currentYear: number;
  previousYear: number;
}) {
  const { biggestImprovement, biggestWorsening, changes, newContacts, droppedContacts } =
    comparison;
  const smallSample = [biggestImprovement, biggestWorsening].some(
    (c) =>
      c &&
      (c.current.stat.count < MIN_DELIBERATION_SAMPLE ||
        c.previous.stat.count < MIN_DELIBERATION_SAMPLE),
  );
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Quem mudou o ritmo de decisão · {currentYear} vs. {previousYear}
        </p>
        <span className="text-xs text-gray-400">
          {changes.length}{" "}
          {changes.length === 1 ? "contratante comparável" : "contratantes comparáveis"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoverBlock title="Passou a decidir mais rápido" change={biggestImprovement} tone="improved" />
        <MoverBlock title="Passou a demorar mais" change={biggestWorsening} tone="worsened" />
      </div>
      {(newContacts.length > 0 || droppedContacts.length > 0) && (
        <p className="text-xs text-gray-400">
          {newContacts.length > 0 && (
            <>
              {newContacts.length}{" "}
              {newContacts.length === 1
                ? "contratante começou a decidir"
                : "contratantes começaram a decidir"}{" "}
              em {currentYear}
            </>
          )}
          {newContacts.length > 0 && droppedContacts.length > 0 && " · "}
          {droppedContacts.length > 0 && (
            <>
              {droppedContacts.length}{" "}
              {droppedContacts.length === 1 ? "decidiu" : "decidiram"} em {previousYear} mas não em{" "}
              {currentYear}
            </>
          )}
          .
        </p>
      )}
      {smallSample && (
        <p className="text-xs text-gray-400">
          Amostra pequena em ao menos um dos destaques — poucas decisões tornam a comparação da
          mediana sensível a casos isolados.
        </p>
      )}
    </section>
  );
}
