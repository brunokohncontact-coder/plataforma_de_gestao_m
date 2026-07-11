import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  reconcileShowFees,
  bucketReceivablesByAge,
  summarizePaymentPromises,
  receivablesAwaitingPromise,
  paymentPromiseStatus,
  dayKey,
  type PromisableShowLike,
  type PaymentPromiseStatus,
  type TxLike,
} from "@/lib/finance";
import { buildShowBillings, preferredBillingIndex, type ShowBilling } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { BillingActions } from "@/components/BillingActions";
import { SettleFeeButton } from "@/components/SettleFeeButton";
import { PromiseButton } from "@/components/PromiseButton";
import {
  settleShowFeeAction,
  setPaymentPromiseAction,
  setBillingContactAction,
} from "../actions";

/** Estado da promessa de um recebível, pronto para a UI (selo + input). */
function promiseInfo(promisedAt: Date | string | null | undefined): {
  status: PaymentPromiseStatus;
  value: string;
  label: string;
} {
  const status = paymentPromiseStatus(promisedAt ?? null);
  if (status === "none") return { status, value: "", label: "" };
  const value = dayKey(promisedAt as Date | string); // "YYYY-MM-DD"
  const [y, m, d] = value.split("-");
  return { status, value, label: `${d}/${m}/${y.slice(2)}` };
}

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

  const result = reconcileShowFees(shows as PromisableShowLike[], txs);
  const aging = bucketReceivablesByAge(result);
  const promises = summarizePaymentPromises(result.rows);
  const awaitingPromise = receivablesAwaitingPromise(result.rows);
  const daysByShow = new Map(
    aging.buckets.flatMap((b) => b.rows.map((a) => [a.row.show.id, a.daysOutstanding])),
  );
  const showById = new Map(shows.map((s) => [s.id, s]));
  const today = dayKey(new Date());

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
        <div className="flex flex-wrap gap-2">
          {result.count > 0 && (
            <a href="/shows/a-receber/export" className="btn-secondary text-sm" download>
              ⬇ CSV
            </a>
          )}
          <Link href="/shows/a-receber/por-contratante" className="btn-secondary">
            Por contratante →
          </Link>
          <Link href="/shows" className="btn-secondary">
            ← Shows
          </Link>
        </div>
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

          <div className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700">
                Aging — há quanto tempo o dinheiro está parado
              </h2>
              <p className="text-xs text-gray-400">
                Atraso médio (ponderado): <strong>{aging.weightedAvgDays} dias</strong> · pior
                caso: <strong>{aging.maxDaysOutstanding} dias</strong>
              </p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {aging.buckets.map((bucket) => {
                const stale = bucket.key === "d90" || bucket.key === "older";
                return (
                  <div
                    key={bucket.key}
                    className={
                      "rounded-lg border p-3 " +
                      (bucket.count === 0
                        ? "border-gray-100 bg-gray-50"
                        : stale
                          ? "border-red-200 bg-red-50"
                          : "border-amber-200 bg-amber-50")
                    }
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {bucket.label}
                    </p>
                    <p
                      className={
                        "mt-1 text-lg font-bold " +
                        (bucket.count === 0
                          ? "text-gray-400"
                          : stale
                            ? "text-red-700"
                            : "text-amber-700")
                      }
                    >
                      {formatMoney(bucket.totalOutstanding)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {bucket.count === 0
                        ? "nada parado"
                        : `${bucket.count} ${bucket.count === 1 ? "show" : "shows"} · ${Math.round(
                            bucket.share * 100,
                          )}% do total`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {(promises.brokenCount > 0 || promises.pendingCount > 0) && (
            <div
              className={
                "rounded-lg border px-4 py-3 text-sm " +
                (promises.brokenCount > 0
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800")
              }
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold">🤝 Promessas de pagamento</span>
                {promises.brokenCount > 0 && (
                  <span className="font-semibold text-red-700">
                    ⚠ {formatMoney(promises.brokenOutstanding)} em{" "}
                    {promises.brokenCount}{" "}
                    {promises.brokenCount === 1 ? "promessa vencida" : "promessas vencidas"}
                  </span>
                )}
                {promises.pendingCount > 0 && (
                  <span className={promises.brokenCount > 0 ? "text-red-600" : "text-amber-700"}>
                    {formatMoney(promises.pendingOutstanding)} em{" "}
                    {promises.pendingCount}{" "}
                    {promises.pendingCount === 1 ? "promessa no prazo" : "promessas no prazo"}
                  </span>
                )}
              </div>
              {promises.brokenCount > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Quem prometeu e não pagou: volte a cobrar. As linhas com{" "}
                  <span className="font-medium">⚠</span> abaixo já passaram da data prometida.
                </p>
              )}
            </div>
          )}

          {awaitingPromise.count > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold">🔔 Cobrança que ainda nem começou</span>
                <span className="font-semibold text-amber-700">
                  {formatMoney(awaitingPromise.totalOutstanding)} em{" "}
                  {awaitingPromise.count}{" "}
                  {awaitingPromise.count === 1 ? "cachê parado" : "cachês parados"} há 30+ dias
                </span>
                <span className="text-amber-600">
                  mais antigo: <strong>{awaitingPromise.maxDaysOutstanding} dias</strong>
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-600">
                Shows vencidos sem nenhuma promessa de pagamento registrada — o dinheiro
                mais fácil de esquecer. Cobre e registre uma data prometida (
                <span className="font-medium">+ promessa</span>) para acompanhar.
              </p>
            </div>
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Show</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 text-right font-medium">Cachê</th>
                  <th className="px-4 py-3 text-right font-medium">Recebido</th>
                  <th className="px-4 py-3 text-right font-medium">A receber</th>
                  <th className="px-4 py-3 font-medium">Promessa</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((row) => {
                  const show = showById.get(row.show.id);
                  const billings: ShowBilling[] = show
                    ? buildShowBillings(
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
                    : [];
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
                        {(() => {
                          const days = daysByShow.get(row.show.id) ?? 0;
                          return (
                            <span
                              className={
                                "mt-0.5 block text-xs " +
                                (days > 90
                                  ? "text-red-600"
                                  : days > 60
                                    ? "text-amber-600"
                                    : "text-gray-400")
                              }
                            >
                              {days === 0 ? "hoje" : `há ${days} ${days === 1 ? "dia" : "dias"}`}
                            </span>
                          );
                        })()}
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
                        {(() => {
                          const info = promiseInfo(row.show.paymentPromisedAt);
                          return (
                            <PromiseButton
                              action={setPaymentPromiseAction}
                              id={row.show.id}
                              promisedAt={info.value}
                              status={info.status}
                              label={info.label}
                              today={today}
                            />
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <BillingActions
                            billings={billings}
                            showId={row.show.id}
                            initialIndex={preferredBillingIndex(
                              billings,
                              show?.billingContactId,
                            )}
                            action={setBillingContactAction}
                          />
                          <SettleFeeButton
                            action={settleShowFeeAction}
                            id={row.show.id}
                            outstanding={row.outstanding}
                            today={today}
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
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            &quot;A receber&quot; = cachê acordado menos a receita já recebida vinculada ao
            show. <strong>Quitar</strong> lança uma receita já recebida vinculada ao show —
            sem precisar ir às Finanças — no valor em aberto ou num valor menor (parcial),
            deixando o restante na lista. Você pode informar a <strong>data real</strong> do
            recebimento (o caixa entra no mês dessa data). Receitas pendentes (ainda não
            recebidas) não abatem o saldo. <strong>✉ E-mail</strong> / <strong>WhatsApp</strong>
            abrem uma mensagem de cobrança pronta para o contato do show (aparecem quando há
            um contato vinculado com e-mail/telefone). Quando o show tem mais de um contato
            alcançável, escolha no seletor <strong>quem cobrar</strong> antes de abrir a
            mensagem. O <strong>aging</strong> agrupa o que falta receber pela idade do atraso
            (dias desde o show), para você priorizar o dinheiro parado há mais tempo.
            Em <strong>Promessa</strong> você registra a data em que o contratante prometeu
            pagar: promessas vencidas (data já passou e o cachê continua em aberto) sobem
            como <span className="text-red-600">⚠</span> para você voltar a cobrar.
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
