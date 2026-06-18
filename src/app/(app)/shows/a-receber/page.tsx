import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { reconcileShowFees, type ReceivableShowLike, type TxLike } from "@/lib/finance";
import { buildShowBilling, type ShowBilling } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";
import { settleShowFeeAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ShowReceivablesPage() {
  const user = await requireUser();

  // Só interessam os shows que já podem ter gerado cachê (PLAYED ou CONFIRMED) e as
  // receitas vinculadas a shows; a regra fina de "já aconteceu" e o abatimento ficam
  // na lógica pura (reconcileShowFees). Trazemos os contatos vinculados ao show para
  // montar o atalho de cobrança (e-mail/WhatsApp).
  const [shows, transactions] = await Promise.all([
    prisma.show.findMany({
      where: { userId: user.id, status: { in: ["PLAYED", "CONFIRMED"] } },
      orderBy: { date: "asc" },
      include: { contacts: { include: { contact: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", showId: { not: null } },
      select: { type: true, amount: true, category: true, date: true, received: true, showId: true },
    }),
  ]);

  const fromName = user.artistName?.trim() || user.name;

  const txs: TxLike[] = transactions.map((t) => ({
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
  }));

  const result = reconcileShowFees(shows as ReceivableShowLike[], txs);
  const showById = new Map(shows.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cachês a receber</h1>
          <p className="text-sm text-gray-500">
            Shows que você já realizou (ou confirmados que já passaram) cujo cachê ainda
            não entrou no caixa. Cobre o dinheiro que ficou na mesa.
          </p>
        </div>
        <Link href="/shows" className="btn-secondary">
          ← Shows
        </Link>
      </div>

      {result.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Tudo certo — nenhum cachê em aberto de shows realizados. 🎉</p>
          <Link
            href="/shows"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver shows
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total a receber" value={formatMoney(result.totalOutstanding)} tone="amber" />
            <Stat
              label="Shows pendentes"
              value={String(result.count)}
              hint={`${formatMoney(result.totalFee)} em cachês`}
            />
            <Stat label="Já recebido" value={formatMoney(result.totalCollected)} tone="emerald" />
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Show</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Recebido</th>
                  <th className="px-4 py-3 text-right font-medium">A receber</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((row) => {
                  const show = showById.get(row.show.id);
                  const billing: ShowBilling | null = show
                    ? buildShowBilling(
                        {
                          title: show.title,
                          date: row.show.date,
                          venue: show.venue,
                          city: show.city,
                          outstanding: row.outstanding,
                        },
                        show.contacts.map((cs) => cs.contact),
                        { fromName },
                      )
                    : null;
                  return (
                    <tr key={row.show.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/shows/${row.show.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {show?.title ?? "Show"}
                        </Link>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {show?.venue || show?.city || "—"}
                          {row.unregistered ? (
                            <span className="ml-2 text-amber-600">
                              · receita não lançada
                            </span>
                          ) : row.registeredPending > 0 ? (
                            <span className="ml-2 text-gray-400">
                              · {formatMoney(row.registeredPending)} pendente
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {formatDate(row.show.date)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatMoney(row.fee)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {row.collected > 0 ? formatMoney(row.collected) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">
                        {formatMoney(row.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {billing?.mailtoUrl && (
                            <a
                              href={billing.mailtoUrl}
                              className="btn border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 py-1.5 text-xs"
                              title={`Cobrar ${billing.contact.name} por e-mail`}
                              aria-label={`Cobrar ${billing.contact.name} por e-mail`}
                            >
                              ✉ E-mail
                            </a>
                          )}
                          {billing?.whatsappUrl && (
                            <a
                              href={billing.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 py-1.5 text-xs"
                              title={`Cobrar ${billing.contact.name} pelo WhatsApp`}
                              aria-label={`Cobrar ${billing.contact.name} pelo WhatsApp`}
                            >
                              WhatsApp
                            </a>
                          )}
                          <DeleteButton
                            action={settleShowFeeAction}
                            id={row.show.id}
                            trigger="Quitar"
                            triggerClassName="btn border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 py-1.5 text-xs"
                            triggerTitle={`Lançar ${formatMoney(row.outstanding)} como recebido`}
                            confirmMessage={`Lançar ${formatMoney(row.outstanding)} como recebido?`}
                            confirmLabel="Confirmar"
                            pendingLabel="Lançando..."
                            confirmClassName="btn bg-emerald-600 text-white hover:bg-emerald-500 py-1.5 text-xs"
                            groupLabel="Confirmar lançamento do cachê"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-sm font-semibold">
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(result.totalFee)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatMoney(result.totalCollected)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700">
                    {formatMoney(result.totalOutstanding)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            &quot;A receber&quot; = cachê acordado menos a receita já recebida vinculada ao
            show. <strong>Quitar</strong> lança uma receita já recebida no valor em aberto e
            vinculada ao show — sem precisar ir às Finanças. Receitas pendentes (ainda não
            recebidas) não abatem o saldo. <strong>✉ E-mail</strong> / <strong>WhatsApp</strong>
            abrem uma mensagem de cobrança pronta para o contato do show (aparecem quando há
            um contato vinculado com e-mail/telefone).
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
  hint,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "brand" | "gray";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
