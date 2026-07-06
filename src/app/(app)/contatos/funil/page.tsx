import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pipelineByContact, type ContactRankLike } from "@/lib/contacts";
import {
  showProfitYears,
  parseProfitYear,
  filterShowsByYear,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";
import { PeriodPicker } from "@/components/PeriodPicker";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

interface PipelineContact extends ContactRankLike {
  role: string;
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default async function ContatosFunilPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
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

  // Recorte por período (ano da `date` do show), reaproveitando os helpers da
  // D108 como no funil geral (`/shows/funil`). Os anos do seletor vêm de TODOS os
  // shows vinculados; filtra-se cada carteira ANTES de agregar, então
  // `pipelineByContact` segue agnóstico ao recorte (não olha `date`).
  const allShows = contacts.flatMap((c) => c.shows.map((cs) => cs.show));
  const availableYears = showProfitYears(allShows.map((s) => s.date));
  const yearFilter = parseProfitYear(searchParams?.ano, availableYears);

  const items = contacts.map((c) => ({
    contact: { id: c.id, name: c.name, role: c.role } as PipelineContact,
    shows: filterShowsByYear(
      c.shows.map((cs) => cs.show),
      yearFilter,
    ),
  }));

  const report = pipelineByContact(items);
  const hasData = report.contactCount > 0;
  const periodLabel = yearFilter === "all" ? "todos os anos" : `${yearFilter}`;
  const exportHref =
    yearFilter === "all"
      ? "/contatos/funil/export"
      : `/contatos/funil/export?ano=${yearFilter}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Funil por contratante</h1>
          <p className="text-sm text-gray-500">
            Com quem você tem mais cachê em negociação ou confirmado — o pipeline
            aberto por quem paga, com a taxa de concretização histórica de cada um
            para você saber de quem cobrar o fechamento primeiro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <a href={exportHref} className="btn-secondary" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil" className="btn-secondary">
            Funil geral
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {availableYears.length > 0 && (
        <PeriodPicker
          years={availableYears}
          active={yearFilter}
          basePath="/contatos/funil"
        />
      )}

      {!hasData ? (
        <div className="card text-center text-gray-500">
          <p>
            Nenhum cachê em aberto vinculado a um contratante
            {yearFilter === "all" ? "" : ` em ${yearFilter}`}.
          </p>
          <p className="mt-1 text-sm">
            Assim que você marcar shows propostos ou confirmados com um contato,
            o pipeline aberto por contratante aparece aqui.
          </p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          {/* Destaques da carteira */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Cachê em aberto"
              value={formatMoney(report.totalOpenValue)}
              hint={`${report.totalOpenCount} ${report.totalOpenCount === 1 ? "show" : "shows"} (proposto + confirmado)`}
              tone="brand"
            />
            <Stat
              label="Em negociação"
              value={formatMoney(report.totalProposedValue)}
              hint="propostas ainda não fechadas"
              tone="amber"
            />
            <Stat
              label="Confirmado"
              value={formatMoney(report.totalConfirmedValue)}
              hint="fechado, ainda a tocar"
              tone="emerald"
            />
            <Stat
              label="Taxa de concretização"
              value={
                report.overallConversionRate == null
                  ? "—"
                  : pct(report.overallConversionRate)
              }
              hint={
                report.overallConversionRate == null
                  ? "sem shows decididos"
                  : "da carteira (realizados / decididos)"
              }
              tone="gray"
            />
          </div>

          {/* Lista por contratante */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Em aberto</th>
                  <th className="px-4 py-3 text-right font-medium">Em negociação</th>
                  <th className="px-4 py-3 text-right font-medium">Confirmado</th>
                  <th className="px-4 py-3 text-right font-medium">Concretização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.rows.map((r) => (
                  <tr key={r.contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/contatos/${r.contact.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {r.contact.name}
                      </Link>
                      <div className="mt-0.5">
                        <span className="badge bg-brand-50 text-brand-700">
                          {CONTACT_ROLE_LABELS[r.contact.role as ContactRole] ??
                            r.contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-brand-700">
                        {formatMoney(r.openValue)}
                      </span>
                      <div className="text-xs text-gray-400">
                        {r.openCount} {r.openCount === 1 ? "show" : "shows"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {r.proposedValue > 0 ? formatMoney(r.proposedValue) : "—"}
                      {r.proposedCount > 0 && (
                        <div className="text-xs text-gray-400">
                          {r.proposedCount} prop.
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {r.confirmedValue > 0 ? formatMoney(r.confirmedValue) : "—"}
                      {r.confirmedCount > 0 && (
                        <div className="text-xs text-gray-400">
                          {r.confirmedCount} conf.
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {r.conversionRate == null ? (
                        <span className="text-gray-400" title="Nenhum show decidido ainda (sem realizado nem cancelado).">
                          —
                        </span>
                      ) : (
                        <>
                          <span className="font-medium">{pct(r.conversionRate)}</span>
                          <div className="text-xs text-gray-400">
                            {r.playedCount}/{r.decidedCount} decididos
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            Recorte: {periodLabel}. A contagem é por contato: um show com vários
            contatos conta para cada um. &quot;Em aberto&quot; soma o cachê dos
            shows propostos e
            confirmados (dinheiro ainda não realizado). A concretização é
            histórica — realizados sobre os shows já decididos (realizados +
            cancelados) — e &quot;—&quot; quando o contratante ainda não teve
            nenhum show decidido. Como o funil geral, é um retrato do estado
            atual, não um histórico de transições.
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
  tone?: "emerald" | "red" | "brand" | "amber" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
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
