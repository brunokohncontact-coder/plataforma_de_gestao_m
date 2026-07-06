import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  findStaleProposals,
  STALE_PROPOSAL_DAYS,
  type StaleProposal,
  type StaleProposalUrgency,
} from "@/lib/shows";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Dias inteiros como texto pt-BR ("1 dia" / "N dias"). */
function daysLabel(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/** Data do show em pt-BR, dia inteiro UTC (mesma convenção do detector). */
function showDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const URGENCY_META: Record<
  StaleProposalUrgency,
  { label: string; badge: string; dot: string }
> = {
  overdue: {
    label: "Vencida",
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
  imminent: {
    label: "Iminente",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  cold: {
    label: "Sem resposta",
    badge: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
};

/** "Data já passou" / "daqui a N dias" / "hoje" a partir de daysUntilShow. */
function whenLabel(p: StaleProposal): string {
  if (p.daysUntilShow < 0) return `venceu há ${daysLabel(-p.daysUntilShow)}`;
  if (p.daysUntilShow === 0) return "é hoje";
  return `daqui a ${daysLabel(p.daysUntilShow)}`;
}

export default async function StaleProposalsPage() {
  const user = await requireUser();

  // Só as propostas ainda abertas (PROPOSED) interessam; carregamos os eventos de
  // status para medir há quanto tempo cada uma está parada no status atual
  // (helper puro `findStaleProposals`).
  const shows = await prisma.show.findMany({
    where: { userId: user.id, status: "PROPOSED" },
    select: {
      id: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      fee: true,
      status: true,
      createdAt: true,
      statusEvents: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const report = findStaleProposals(shows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Propostas paradas</h1>
          <p className="text-sm text-gray-500">
            Propostas que pedem uma decisão agora — sem movimento há{" "}
            {daysLabel(STALE_PROPOSAL_DAYS)} ou mais, ou com a data do show já vencida.
            Cobre resposta, confirme ou descarte para manter o funil limpo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.count > 0 && (
            <a href="/shows/funil/paradas/export" className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/funil" className="btn-secondary">
            ← Funil
          </Link>
        </div>
      </div>

      {report.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma proposta parada. 🎉</p>
          <p className="mt-2 text-sm">
            Toda proposta em aberto teve movimento nos últimos{" "}
            {daysLabel(STALE_PROPOSAL_DAYS)} e nenhuma passou da data — nada a cobrar por
            enquanto.
          </p>
          <Link
            href="/shows/funil"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver o funil de propostas
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Paradas" value={String(report.count)} />
            <Stat label="Vencidas" value={String(report.overdueCount)} tone="overdue" />
            <Stat label="Iminentes" value={String(report.imminentCount)} tone="imminent" />
            <Stat label="Cachê em risco" value={formatMoney(report.totalFee)} />
          </div>

          <section className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Urgência</th>
                  <th className="py-2 px-3 font-medium">Show</th>
                  <th className="py-2 px-3 font-medium">Data</th>
                  <th className="py-2 px-3 text-right font-medium">Parado</th>
                  <th className="py-2 pl-3 text-right font-medium">Cachê</th>
                </tr>
              </thead>
              <tbody>
                {report.proposals.map((p) => {
                  const meta = URGENCY_META[p.urgency];
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span
                          className={
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium " +
                            meta.badge
                          }
                        >
                          <span
                            className={"inline-block h-1.5 w-1.5 rounded-full " + meta.dot}
                            aria-hidden
                          />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/shows/${p.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {p.title}
                        </Link>
                        {(p.venue || p.city) && (
                          <div className="text-xs text-gray-400">
                            {[p.venue, p.city].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {showDate(p.date)}
                        <div className="text-xs text-gray-400">{whenLabel(p)}</div>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-600">
                        {daysLabel(p.daysInStatus)}
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums font-semibold">
                        {p.fee > 0 ? formatMoney(p.fee) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">
              &ldquo;Parado&rdquo; conta os dias desde que a proposta entrou no status atual.
              Vencidas vêm primeiro, depois as iminentes (data mais próxima) e as demais sem
              resposta (mais tempo paradas primeiro).
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "overdue" | "imminent";
}) {
  const valueColor =
    tone === "overdue"
      ? "text-red-700"
      : tone === "imminent"
        ? "text-amber-700"
        : "text-gray-900";
  return (
    <div className="card">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={"mt-1 text-2xl font-bold tabular-nums " + valueColor}>{value}</div>
    </div>
  );
}
