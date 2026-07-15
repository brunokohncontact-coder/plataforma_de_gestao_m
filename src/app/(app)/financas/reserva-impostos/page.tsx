import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { taxReserve, DEFAULT_TAX_RATE, parseTaxRatePercent, type TxLike } from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const MONTH_ABBR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

/** "YYYY" -> ano válido (1970–2999); fallback ao ano atual. */
function parseYear(raw: string | undefined, reference: Date = new Date()): number {
  if (raw) {
    const m = /^\d{4}$/.exec(raw.trim());
    if (m) {
      const y = Number(m[0]);
      if (y >= 1970 && y <= 2999) return y;
    }
  }
  return reference.getFullYear();
}

export default async function TaxReservePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};
  const year = parseYear(readParam(params, "ano"));
  // Alíquota efetiva, em porcentagem: `?aliquota=` (what-if pontual) tem
  // precedência sobre a alíquota salva na Conta (regime real do músico), que por
  // sua vez cai no padrão genérico do Simples (`DEFAULT_TAX_RATE`) quando ausente.
  const queryPct = parseTaxRatePercent(readParam(params, "aliquota"));
  const savedPct = user.taxRatePercent ?? null;
  const effectivePct = queryPct ?? savedPct ?? DEFAULT_TAX_RATE * 100;
  const rate = effectivePct / 100;
  const rateSource: "query" | "saved" | "default" =
    queryPct != null ? "query" : savedPct != null ? "saved" : "default";

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: "INCOME" },
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

  const report = taxReserve(allTxs, { year, rate });
  const ratePct = Math.round(report.rate * 1000) / 10; // 1 casa decimal
  const hasActivity = report.totalReceivedIncome > 0;

  // Escala das barras: maior reserva mensal do ano.
  const peak = Math.max(1, ...report.months.map((m) => m.reserve));

  // Atalhos de alíquota comuns (mantém ano e troca só a alíquota).
  const ratePresets = [6, 11, 15, 27.5];
  const hrefFor = (pct: number) => `/financas/reserva-impostos?ano=${year}&aliquota=${pct}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reserva para impostos</h1>
          <p className="text-sm text-gray-500">
            Quanto guardar do que entra para não ser pego de surpresa no imposto · {year}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {hasActivity && (
            <a
              href={`/financas/reserva-impostos/export?ano=${year}&aliquota=${ratePct}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="text-sm text-gray-500 hover:underline">
            ← Finanças
          </Link>
        </div>
      </div>

      {/* Navegação por ano */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/financas/reserva-impostos?ano=${year - 1}&aliquota=${ratePct}`}
          className="btn-secondary"
          aria-label="Ano anterior"
        >
          ←
        </Link>
        <Link
          href={`/financas/reserva-impostos?aliquota=${ratePct}`}
          className="text-sm text-brand-700 hover:underline"
        >
          Ano atual
        </Link>
        <Link
          href={`/financas/reserva-impostos?ano=${year + 1}&aliquota=${ratePct}`}
          className="btn-secondary"
          aria-label="Próximo ano"
        >
          →
        </Link>
      </div>

      {/* Seletor de alíquota */}
      <section className="card">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Alíquota aplicada
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {ratePct.toLocaleString("pt-BR")}%
        </p>
        <p className="mt-1 text-sm text-gray-500">
          A reserva é calculada sobre as receitas <strong>já recebidas</strong> (o que entrou no
          caixa), não sobre o que ainda está a receber.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ratePresets.map((pct) => {
            const active = Math.abs(report.rate - pct / 100) < 1e-9;
            return (
              <Link
                key={pct}
                href={hrefFor(pct)}
                className={
                  "rounded-full border px-3 py-1 text-sm " +
                  (active
                    ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-brand-300")
                }
              >
                {pct.toLocaleString("pt-BR")}%
              </Link>
            );
          })}
        </div>
      </section>

      {rateSource === "default" && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A alíquota de {DEFAULT_TAX_RATE * 100}% é uma <strong>estimativa</strong> (faixa inicial
          do Simples Nacional). Seu regime real — MEI, Simples ou carnê-leão — pode ser bem
          diferente.{" "}
          <Link href="/conta" className="font-medium underline">
            Salve a sua alíquota na Conta
          </Link>{" "}
          e confirme com um contador.
        </p>
      )}

      {rateSource === "saved" && (
        <p className="text-sm text-gray-500">
          Usando a alíquota salva no seu perfil.{" "}
          <Link href="/conta" className="text-brand-700 hover:underline">
            Alterar na Conta
          </Link>
        </p>
      )}

      {!hasActivity ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma receita recebida em {year}.</p>
          <Link
            href="/financas/nova"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Registrar uma receita
          </Link>
        </div>
      ) : (
        <>
          {/* Reserva sugerida do ano */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Receita recebida no ano
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {formatMoney(report.totalReceivedIncome)}
              </p>
            </div>
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Reserva sugerida no ano
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-700">
                {formatMoney(report.totalReserve)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {ratePct.toLocaleString("pt-BR")}% do que entrou
              </p>
            </div>
          </div>

          {/* Mês a mês */}
          <section className="card overflow-x-auto">
            <h2 className="mb-4 font-semibold">Mês a mês</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 px-3 text-right font-medium">Recebido</th>
                  <th className="pb-2 pl-3 text-right font-medium">Guardar</th>
                </tr>
              </thead>
              <tbody>
                {report.months.map((m) => {
                  const empty = m.receivedIncome === 0;
                  return (
                    <tr
                      key={m.month}
                      className={"border-b last:border-0 " + (empty ? "text-gray-400" : "")}
                    >
                      <td className="py-2 pr-3">
                        <Link
                          href={`/financas/relatorio?mes=${m.month}`}
                          className="hover:underline"
                        >
                          {MONTH_ABBR[m.monthIndex - 1]}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600">
                        {m.receivedIncome > 0 ? formatMoney(m.receivedIncome) : "—"}
                      </td>
                      <td className="py-2 pl-3 text-right font-medium text-brand-700">
                        {empty ? "—" : formatMoney(m.reserve)}
                        <Bar value={m.reserve} peak={peak} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="pt-2 pr-3">Total</td>
                  <td className="pt-2 px-3 text-right text-emerald-600">
                    {formatMoney(report.totalReceivedIncome)}
                  </td>
                  <td className="pt-2 pl-3 text-right text-brand-700">
                    {formatMoney(report.totalReserve)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Bar({ value, peak }: { value: number; peak: number }) {
  if (value <= 0) return null;
  const width = Math.max(2, Math.round((value / peak) * 100));
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
      <div className="ml-auto h-full rounded bg-brand-400" style={{ width: `${width}%` }} />
    </div>
  );
}
