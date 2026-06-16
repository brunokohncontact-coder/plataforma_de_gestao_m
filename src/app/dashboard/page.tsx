import Link from "next/link";
import { calcShowProfitability, summarize } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { SHOW_STATUS_LABELS } from "@/lib/domain";
import type { TransactionLike } from "@/lib/domain";

// Dados de demonstração (estáticos). Na próxima fase isto vem do banco via Prisma.
const demoShows = [
  {
    id: "s1",
    title: "Festival de Inverno",
    venue: "Teatro Municipal",
    city: "Curitiba",
    date: new Date("2026-07-12T21:00:00Z"),
    status: "confirmed",
    feeCents: 4500_00,
  },
  {
    id: "s2",
    title: "Show no bar do Zé",
    venue: "Bar do Zé",
    city: "São Paulo",
    date: new Date("2026-06-28T22:00:00Z"),
    status: "done",
    feeCents: 1200_00,
  },
  {
    id: "s3",
    title: "Casamento (contratação privada)",
    venue: "Espaço Jardim",
    city: "Campinas",
    date: new Date("2026-08-03T19:00:00Z"),
    status: "proposed",
    feeCents: 8000_00,
  },
];

const demoTransactions: TransactionLike[] = [
  { id: "t1", type: "expense", category: "transporte", amountCents: 600_00, date: new Date("2026-07-12T00:00:00Z"), status: "received", showId: "s1" },
  { id: "t2", type: "expense", category: "produção", amountCents: 900_00, date: new Date("2026-07-10T00:00:00Z"), status: "received", showId: "s1" },
  { id: "t3", type: "income", category: "merch", amountCents: 350_00, date: new Date("2026-07-12T00:00:00Z"), status: "received", showId: "s1" },
  { id: "t4", type: "expense", category: "transporte", amountCents: 120_00, date: new Date("2026-06-28T00:00:00Z"), status: "received", showId: "s2" },
  { id: "t5", type: "income", category: "cachê", amountCents: 4500_00, date: new Date("2026-07-15T00:00:00Z"), status: "pending", showId: "s1" },
  { id: "t6", type: "income", category: "cachê", amountCents: 1200_00, date: new Date("2026-06-29T00:00:00Z"), status: "received", showId: "s2" },
];

export default function DashboardDemo() {
  const summary = summarize(demoTransactions);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demonstração</h1>
          <p className="text-sm text-zinc-400">
            Prévia da lógica de rentabilidade com dados fictícios.
          </p>
        </div>
        <Link href="/" className="text-sm text-indigo-400 hover:underline">
          ← Início
        </Link>
      </div>

      <section className="mb-10 grid gap-4 sm:grid-cols-4">
        <Card label="Receitas" value={formatBRL(summary.incomeCents)} />
        <Card label="Despesas" value={formatBRL(summary.expenseCents)} />
        <Card label="Resultado" value={formatBRL(summary.netCents)} highlight />
        <Card label="A receber" value={formatBRL(summary.pendingCents)} />
      </section>

      <h2 className="mb-3 text-lg font-semibold">Rentabilidade por show</h2>
      <div className="space-y-3">
        {demoShows.map((show) => {
          const linked = demoTransactions.filter((t) => t.showId === show.id);
          const pnl = calcShowProfitability(show, linked);
          const positive = pnl.netCents >= 0;
          return (
            <div
              key={show.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{show.title}</h3>
                  <p className="text-sm text-zinc-400">
                    {show.venue} · {show.city} ·{" "}
                    {SHOW_STATUS_LABELS[show.status] ?? show.status}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap text-lg font-bold ${
                    positive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {formatBRL(pnl.netCents)}
                </span>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
                <div>
                  <dt className="inline">Cachê: </dt>
                  <dd className="inline text-zinc-200">{formatBRL(pnl.feeCents)}</dd>
                </div>
                <div>
                  <dt className="inline">Receita extra: </dt>
                  <dd className="inline text-zinc-200">{formatBRL(pnl.extraIncomeCents)}</dd>
                </div>
                <div>
                  <dt className="inline">Despesas: </dt>
                  <dd className="inline text-zinc-200">{formatBRL(pnl.expensesCents)}</dd>
                </div>
                <div>
                  <dt className="inline">Margem: </dt>
                  <dd className="inline text-zinc-200">
                    {(pnl.margin * 100).toFixed(0)}%
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-indigo-500/40 bg-indigo-500/10"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
