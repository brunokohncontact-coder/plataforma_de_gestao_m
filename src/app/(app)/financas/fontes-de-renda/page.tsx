import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  incomeMix,
  type TxLike,
  type DiversificationLevel,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const LEVEL_LABELS: Record<DiversificationLevel, string> = {
  concentrated: "Renda concentrada",
  moderate: "Diversificação moderada",
  diversified: "Renda diversificada",
};

const LEVEL_TONES: Record<DiversificationLevel, string> = {
  concentrated: "bg-red-50 text-red-800",
  moderate: "bg-amber-50 text-amber-800",
  diversified: "bg-emerald-50 text-emerald-800",
};

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export default async function FinanceIncomeSourcesPage() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  const allTxs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const mix = incomeMix(allTxs);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fontes de renda</h1>
          <p className="text-sm text-gray-500">
            De onde vem o seu dinheiro e o quanto você depende de uma única fonte.
          </p>
        </div>
        <Link href="/financas" className="text-sm text-gray-500 hover:underline">
          ← Finanças
        </Link>
      </div>

      {mix.sourceCount === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Ainda não há receitas para mostrar as suas fontes de renda.</p>
          <Link
            href="/financas/nova"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Registrar a primeira receita
          </Link>
        </div>
      ) : (
        <>
          {/* Veredito de diversificação */}
          <div className={"rounded-lg px-4 py-3 text-sm " + LEVEL_TONES[mix.level]}>
            <p className="font-semibold">{LEVEL_LABELS[mix.level]}</p>
            <p className="mt-0.5">
              {mix.level === "concentrated" && mix.top && (
                <>
                  {pct(mix.topShare)} da sua renda vem de{" "}
                  <strong>{mix.top.category}</strong>. Depender tanto de uma fonte é um
                  risco — vale buscar outras frentes de receita.
                </>
              )}
              {mix.level === "moderate" && (
                <>
                  Sua renda vem de algumas fontes, mas ainda é puxada por poucas. Equivale
                  a {mix.effectiveSources.toFixed(1)} fontes de mesmo tamanho.
                </>
              )}
              {mix.level === "diversified" && (
                <>
                  Sua renda está bem distribuída entre {mix.sourceCount} fontes — equivale a{" "}
                  {mix.effectiveSources.toFixed(1)} fontes de mesmo tamanho. Boa proteção
                  contra a perda de um cliente ou de uma frente.
                </>
              )}
            </p>
          </div>

          {/* Destaques */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Receita total" value={formatMoney(mix.total)} />
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Maior fonte
              </p>
              {mix.top && (
                <>
                  <p className="mt-1 truncate font-medium text-gray-900">
                    {mix.top.category}
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    {pct(mix.topShare)}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {formatMoney(mix.top.amount)}
                    </span>
                  </p>
                </>
              )}
            </div>
            <Stat
              label="Fontes de renda"
              value={String(mix.sourceCount)}
              hint={`top 3 = ${pct(mix.top3Share)} da renda`}
            />
          </div>

          {/* Composição por fonte */}
          <section className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Fonte</th>
                  <th className="px-4 py-3 text-right font-medium">Lançamentos</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mix.sources.map((s) => (
                  <tr key={s.category} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.category}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{s.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatMoney(s.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-gray-500">
                          {pct(s.share)}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-full rounded bg-emerald-400"
                            style={{ width: `${Math.max(2, Math.round(s.share * 100))}%` }}
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
            Considera todas as receitas lançadas (recebidas e a receber), agrupadas pela
            categoria. O número efetivo de fontes resume a concentração: quanto maior,
            mais distribuída é a renda.
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
