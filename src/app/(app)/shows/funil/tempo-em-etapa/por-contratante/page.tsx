import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  proposalDeliberationByContact,
  MIN_DELIBERATION_SAMPLE,
  type ProposalDeliberationShowLike,
  type ContactProposalDeliberationRow,
} from "@/lib/shows";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

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

export default async function ProposalDeliberationByContactPage() {
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

  const report = proposalDeliberationByContact(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tempo de decisão por contratante</h1>
          <p className="text-sm text-gray-500">
            Quanto tempo, tipicamente, cada contratante deixa uma proposta na mesa antes de decidir —
            avançar para confirmado ou cancelar. O tempo em cada etapa, quebrado por quem fecha:
            para saber com quem vale cobrar antes e de quem a resposta demora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.contactCount > 0 && (
            <a
              href="/shows/funil/tempo-em-etapa/por-contratante/export"
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil/tempo-em-etapa" className="btn-secondary">
            ← Tempo em cada etapa
          </Link>
        </div>
      </div>

      {report.contactCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Ainda não há propostas decididas por contratante para medir.</p>
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

          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Mediana</th>
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
