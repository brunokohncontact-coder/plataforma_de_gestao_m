import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  clientConcentration,
  type ClientConcentrationLevel,
  type ContactRankLike,
} from "@/lib/contacts";
import { formatMoney } from "@/lib/money";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface ConcentrationContact extends ContactRankLike {
  role: string;
}

const LEVEL_LABELS: Record<ClientConcentrationLevel, string> = {
  concentrated: "Carteira concentrada",
  moderate: "Concentração moderada",
  diversified: "Carteira diversificada",
};

const LEVEL_TONES: Record<ClientConcentrationLevel, string> = {
  concentrated: "bg-red-50 text-red-800",
  moderate: "bg-amber-50 text-amber-800",
  diversified: "bg-emerald-50 text-emerald-800",
};

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function ContatosConcentracaoPage() {
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
    contact: { id: c.id, name: c.name, role: c.role } as ConcentrationContact,
    shows: c.shows.map((cs) => cs.show),
  }));

  const conc = clientConcentration(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Concentração de contratantes</h1>
          <p className="text-sm text-gray-500">
            Quanto da sua receita depende de poucos contratantes — o risco de
            perder um cliente que responde por boa parte do seu faturamento.
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

      {conc.clientCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Ainda não há cachê de contratantes para medir a concentração.</p>
          <p className="mt-1 text-sm">
            Vincule contatos aos seus shows (com cachê) na tela de detalhe do show.
          </p>
          <Link href="/shows" className="mt-3 inline-block text-brand-700 hover:underline">
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          {/* Veredito de concentração */}
          <div className={"rounded-lg px-4 py-3 text-sm " + LEVEL_TONES[conc.level]}>
            <p className="font-semibold">{LEVEL_LABELS[conc.level]}</p>
            <p className="mt-0.5">
              {conc.level === "concentrated" && conc.top && (
                <>
                  {pct(conc.topShare)} do seu cachê vem de{" "}
                  <strong>{conc.top.contact.name}</strong>. Depender tanto de um único
                  contratante é um risco — perdê-lo abriria um buraco grande na agenda.
                  Vale cultivar novas frentes de booking.
                </>
              )}
              {conc.level === "moderate" && (
                <>
                  Sua receita vem de alguns contratantes, mas ainda é puxada por poucos.
                  Equivale a {conc.effectiveClients.toFixed(1)} contratantes de mesmo
                  tamanho.
                </>
              )}
              {conc.level === "diversified" && (
                <>
                  Seu cachê está bem distribuído entre {conc.clientCount} contratantes —
                  equivale a {conc.effectiveClients.toFixed(1)} de mesmo tamanho. Boa
                  proteção contra a perda de um único cliente.
                </>
              )}
            </p>
          </div>

          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Cachê total da carteira" value={formatMoney(conc.totalFee)} />
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Maior contratante
              </p>
              {conc.top && (
                <>
                  <Link
                    href={`/contatos/${conc.top.contact.id}`}
                    className="mt-1 block truncate font-medium text-brand-700 hover:underline"
                  >
                    {conc.top.contact.name}
                  </Link>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {pct(conc.topShare)}
                    <span className="ml-2 text-sm font-normal text-emerald-600">
                      {formatMoney(conc.top.totalFee)}
                    </span>
                  </p>
                </>
              )}
            </div>
            <Stat
              label="Contratantes"
              value={String(conc.clientCount)}
              hint={`top 3 = ${pct(conc.top3Share)} do cachê`}
            />
          </div>

          {/* Composição por contratante */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Contratante</th>
                  <th className="px-4 py-3 text-right font-medium">Shows</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 font-medium">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conc.rows.map((r) => (
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
                    <td className="px-4 py-3 text-right text-gray-500">{r.activeShows}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatMoney(r.totalFee)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-gray-500">
                          {pct(r.share)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-brand-400"
                            style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-gray-400">
            O cachê é por contato: um show com vários contatos conta para cada um. Shows
            cancelados e contatos sem cachê não entram. O número efetivo de contratantes
            resume a concentração: quanto maior, menos dependente você é de um só cliente.
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
