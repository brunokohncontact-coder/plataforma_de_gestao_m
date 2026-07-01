import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  cancellationByContact,
  type ContactRankLike,
} from "@/lib/contacts";
import { formatMoney } from "@/lib/money";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface CancellationContact extends ContactRankLike {
  role: string;
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default async function ContatosCancelamentosPage() {
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
    contact: { id: c.id, name: c.name, role: c.role } as CancellationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const report = cancellationByContact(items);
  const hasData = report.contactCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cancelamentos por contratante</h1>
          <p className="text-sm text-gray-500">
            Quem mais fura o combinado — a fração dos shows marcados que acabou
            cancelada e o cachê que caiu junto. Um sinal de confiabilidade de
            quem te contrata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contatos/retencao" className="btn-secondary">
            Fidelização
          </Link>
          <Link href="/contatos" className="btn-secondary">
            ← Contatos
          </Link>
        </div>
      </div>

      {!hasData ? (
        <div className="card text-center text-gray-500">
          <p>Nenhum show cancelado vinculado a um contratante até agora.</p>
          <p className="mt-1 text-sm">
            Sinal bom: os combinados que você marcou vêm se mantendo. Os
            cancelamentos aparecem aqui conforme surgirem.
          </p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Taxa de cancelamento"
              value={pct(report.overallRate)}
              hint={`${report.totalCancelled} de ${report.totalShows} shows vinculados`}
            />
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cachê perdido
              </p>
              <p className="mt-1 text-xl font-bold text-red-600">
                {formatMoney(report.totalLostFee)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                combinado que caiu com os cancelamentos
              </p>
            </div>
            <Stat
              label="Contratantes que cancelaram"
              value={String(report.contactCount)}
              hint="com ao menos um show cancelado"
            />
          </div>

          {/* Lista por contratante */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Cancelados</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 font-medium">Taxa</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê perdido</th>
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
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {r.cancelledShows}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.totalShows}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-gray-500">
                          {pct(r.cancellationRate)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-red-400"
                            style={{
                              width: `${Math.max(2, Math.round(r.cancellationRate * 100))}%`,
                            }}
                          />
                        </div>
                        {!r.reliable && (
                          <span
                            className="shrink-0 text-xs text-gray-400"
                            title={`Amostra pequena (menos de ${report.minSample} shows) — taxa pouco confiável.`}
                          >
                            amostra pequena
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {r.lostFee > 0 ? formatMoney(r.lostFee) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            A contagem é por contato: um show com vários contatos conta para cada
            um. A taxa é os cancelados sobre o total de shows vinculados (todos os
            status). Contratantes com poucos shows aparecem marcados como
            &quot;amostra pequena&quot; — uma taxa alta ali pode ser só azar
            pontual, não um padrão.
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
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
