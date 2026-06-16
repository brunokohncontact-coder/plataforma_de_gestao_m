import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  summarizeFinances,
  filterTransactions,
  availableMonths,
  availableCategories,
  hasActiveFilter,
  isValidMonthKey,
  type TxLike,
  type TransactionFilter,
} from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonthKey } from "@/lib/format";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/domain";
import { toggleReceivedAction, deleteTransactionAction } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function readParam(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const user = await requireUser();
  const params = searchParams ?? {};

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { show: { select: { id: true, title: true } } },
  });

  // Filtros vindos da query string (validados).
  const monthParam = readParam(params, "mes");
  const typeParam = readParam(params, "tipo");
  const showParam = readParam(params, "show");
  const statusParam = readParam(params, "status");
  const categoryParam = readParam(params, "categoria");

  const filter: TransactionFilter = {
    month: isValidMonthKey(monthParam) ? monthParam : null,
    type:
      typeParam === "INCOME" || typeParam === "EXPENSE"
        ? (typeParam as TransactionType)
        : null,
    showId: showParam || null,
    received:
      statusParam === "received" ? true : statusParam === "pending" ? false : null,
    category: categoryParam || null,
  };
  const active = hasActiveFilter(filter);

  const allTxs: (TxLike & { id: string; description: string; show: { id: string; title: string } | null })[] =
    transactions.map((t) => ({
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

  const visible = filterTransactions(allTxs, filter);
  const summary = summarizeFinances(visible);

  // Opções dos seletores (derivadas de todas as transações do usuário).
  const months = availableMonths(allTxs);
  const categories = availableCategories(allTxs);
  const shows = await prisma.show.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finanças</h1>
        <Link href="/financas/nova" className="btn-primary">
          + Nova transação
        </Link>
      </div>

      {transactions.length > 0 && (
        <form
          method="get"
          className="card flex flex-wrap items-end gap-3"
          aria-label="Filtros de finanças"
        >
          <Field label="Mês" htmlFor="f-mes">
            <select id="f-mes" name="mes" defaultValue={filter.month ?? ""} className="input">
              <option value="">Todos os meses</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthKey(m)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo" htmlFor="f-tipo">
            <select id="f-tipo" name="tipo" defaultValue={filter.type ?? ""} className="input">
              <option value="">Todos</option>
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TRANSACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>

          {categories.length > 0 && (
            <Field label="Categoria" htmlFor="f-categoria">
              <select
                id="f-categoria"
                name="categoria"
                defaultValue={filter.category ?? ""}
                className="input"
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Show" htmlFor="f-show">
            <select id="f-show" name="show" defaultValue={filter.showId ?? ""} className="input">
              <option value="">Todos</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Situação" htmlFor="f-status">
            <select
              id="f-status"
              name="status"
              defaultValue={
                filter.received === true ? "received" : filter.received === false ? "pending" : ""
              }
              className="input"
            >
              <option value="">Todas</option>
              <option value="received">Concluídas</option>
              <option value="pending">Pendentes</option>
            </select>
          </Field>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary">
              Filtrar
            </button>
            {active && (
              <Link href="/financas" className="text-sm text-gray-500 hover:underline">
                Limpar
              </Link>
            )}
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receitas" value={summary.totalIncome} tone="emerald" />
        <Stat label="Despesas" value={summary.totalExpense} tone="red" />
        <Stat label="Saldo" value={summary.balance} tone="brand" />
        <Stat label="Caixa realizado" value={summary.cashBalance} tone="gray" />
      </div>

      {(summary.pendingIncome > 0 || summary.pendingExpense > 0) && (
        <div className="flex flex-wrap gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {summary.pendingIncome > 0 && (
            <span>A receber: <strong>{formatMoney(summary.pendingIncome)}</strong></span>
          )}
          {summary.pendingExpense > 0 && (
            <span>A pagar: <strong>{formatMoney(summary.pendingExpense)}</strong></span>
          )}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma transação registrada.</p>
          <Link href="/financas/nova" className="mt-3 inline-block text-brand-700 hover:underline">
            Registrar a primeira
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>Nenhuma transação para os filtros selecionados.</p>
          <Link href="/financas" className="mt-3 inline-block text-brand-700 hover:underline">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <>
          {active && (
            <p className="text-sm text-gray-500">
              {visible.length} de {transactions.length} transações
            </p>
          )}
          <div className="card overflow-hidden p-0">
            <ul className="divide-y divide-gray-100">
              {visible.map((t) => {
                const isIncome = (t.type as TransactionType) === "INCOME";
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.description}</p>
                      <p className="text-xs text-gray-500">
                        {t.category} · {formatDate(t.date)}
                        {t.show ? (
                          <>
                            {" · "}
                            <Link href={`/shows/${t.show.id}`} className="text-brand-700 hover:underline">
                              {t.show.title}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {!t.received && (
                        <span className="badge bg-amber-100 text-amber-800">
                          {isIncome ? "A receber" : "A pagar"}
                        </span>
                      )}
                      <span className={isIncome ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
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
                          title={t.received ? "Marcar como pendente" : "Marcar como concluído"}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          {t.received ? "↺" : "✓"}
                        </button>
                      </form>
                      <DeleteButton
                        action={deleteTransactionAction}
                        id={t.id}
                        trigger="✕"
                        triggerTitle="Excluir transação"
                        triggerClassName="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        confirmMessage="Excluir?"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "brand" | "gray";
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    brand: "text-brand-700",
    gray: "text-gray-900",
  };
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={"mt-1 text-xl font-bold " + tones[tone]}>{formatMoney(value)}</p>
    </div>
  );
}
