import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  proposalOutcomesByContact,
  proposalOutcomeYears,
  type ProposalOutcomeShowLike,
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
