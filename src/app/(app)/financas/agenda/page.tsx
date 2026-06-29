import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  buildDueAgenda,
  DUE_BUCKET_LABELS,
  type DueAgendaItem,
  type DueBucketKey,
  type TxLike,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { toggleReceivedAction } from "../actions";

export const dynamic = "force-dynamic";

type Tx = TxLike & {
  id: string;
  description: string;
  show: { id: string; title: string } | null;
};

const BUCKET_META: Record<
  DueBucketKey,
  { label: string; hint: string; tone: string; accent: string }
> = {
  overdue: {
    label: DUE_BUCKET_LABELS.overdue,
    hint: "Já passaram do vencimento",
    tone: "text-red-700",
    accent: "border-red-200 bg-red-50",
  },
  today: {
    label: DUE_BUCKET_LABELS.today,
    hint: "Vencem hoje",
    tone: "text-amber-700",
    accent: "border-amber-200 bg-amber-50",
  },
  week: {
    label: DUE_BUCKET_LABELS.week,
    hint: "Vencem na próxima semana",
    tone: "text-brand-700",
    accent: "border-brand-200 bg-brand-50",
  },
  later: {
    label: DUE_BUCKET_LABELS.later,
    hint: "Vencem depois de 7 dias",
    tone: "text-gray-700",
    accent: "border-gray-200 bg-gray-50",
  },
};

/** Texto curto de vencimento relativo ("hoje", "em 3 dias", "há 2 dias"). */
function dueLabel(daysUntil: number): string {
  if (daysUntil === 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  if (daysUntil === -1) return "venceu ontem";
  if (daysUntil > 1) return `vence em ${daysUntil} dias`;
  return `venceu há ${Math.abs(daysUntil)} dias`;
}

export default async function FinancasAgendaPage() {
  const user = await requireUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, received: false },
    orderBy: { date: "asc" },
    include: { show: { select: { id: true, title: true } } },
  });

  const pending: Tx[] = transactions.map((t) => ({
    id: t.id,
    description: t.description,
    type: t.type as TxLike["type"],
    amount: t.amount,
    category: t.category,
    date: t.date,
    received: t.received,
    showId: t.showId,
    show: t.show,
  }));

  const agenda = buildDueAgenda(pending);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">A pagar e receber</h1>
          <p className="text-sm text-gray-500">
            Contas pendentes organizadas pelo vencimento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {agenda.count > 0 && (
            <a
              href="/financas/agenda/export"
              className="btn-secondary text-sm"
              download
            >
              ⬇ CSV
            </a>
          )}
          <Link href="/financas" className="btn-secondary">
            ← Finanças
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="A receber" value={agenda.totalIncome} tone="emerald" />
        <Stat label="A pagar" value={agenda.totalExpense} tone="red" />
        <Stat
          label="Saldo pendente"
          value={agenda.totalIncome - agenda.totalExpense}
          tone="brand"
        />
      </div>

      {agenda.count === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma conta pendente. Tudo em dia! 🎉</p>
          <Link
            href="/financas"
            className="mt-3 inline-block text-brand-700 hover:underline"
          >
            Ver Finanças
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {agenda.buckets
            .filter((bucket) => bucket.count > 0)
            .map((bucket) => {
              const meta = BUCKET_META[bucket.key];
              return (
                <section key={bucket.key} className="space-y-3">
                  <div
                    className={
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2 " +
                      meta.accent
                    }
                  >
                    <div>
                      <h2 className={"font-semibold " + meta.tone}>
                        {meta.label}{" "}
                        <span className="text-sm font-normal opacity-70">
                          ({bucket.count})
                        </span>
                      </h2>
                      <p className="text-xs text-gray-500">{meta.hint}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {bucket.income > 0 && (
                        <span className="text-emerald-700">
                          A receber <strong>{formatMoney(bucket.income)}</strong>
                        </span>
                      )}
                      {bucket.expense > 0 && (
                        <span className="text-red-700">
                          A pagar <strong>{formatMoney(bucket.expense)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card overflow-hidden p-0">
                    <ul className="divide-y divide-gray-100">
                      {bucket.items.map((item) => (
                        <AgendaRow key={item.tx.id} item={item} />
                      ))}
                    </ul>
                  </div>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}

function AgendaRow({ item }: { item: DueAgendaItem<Tx> }) {
  const t = item.tx;
  const isIncome = t.type === "INCOME";
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{t.description}</p>
        <p className="text-xs text-gray-500">
          {t.category} · {formatDate(t.date)}
          {t.show ? (
            <>
              {" · "}
              <Link
                href={`/shows/${t.show.id}`}
                className="text-brand-700 hover:underline"
              >
                {t.show.title}
              </Link>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span
          className={
            "hidden text-xs sm:inline " +
            (item.daysUntil < 0 ? "text-red-600" : "text-gray-400")
          }
        >
          {dueLabel(item.daysUntil)}
        </span>
        <span className="badge bg-amber-100 text-amber-800">
          {isIncome ? "A receber" : "A pagar"}
        </span>
        <span
          className={
            isIncome
              ? "font-medium text-emerald-600"
              : "font-medium text-red-600"
          }
        >
          {isIncome ? "+" : "−"}
          {formatMoney(t.amount)}
        </span>
        <Link
          href={`/financas/${t.id}/editar`}
          title="Editar"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ✎
        </Link>
        <form action={toggleReceivedAction}>
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            title={isIncome ? "Marcar como recebido" : "Marcar como pago"}
            className="rounded p-1 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
          >
            ✓
          </button>
        </form>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "brand";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
