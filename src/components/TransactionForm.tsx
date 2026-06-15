"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createTransactionAction,
  updateTransactionAction,
  type ActionState,
} from "@/app/actions/transactions";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  SUGGESTED_INCOME_CATEGORIES,
  SUGGESTED_EXPENSE_CATEGORIES,
} from "@/lib/enums";
import { centsToReais } from "@/lib/money";
import { toDateInputValue } from "@/lib/format";

export interface TransactionFormValues {
  id?: string;
  type?: string;
  amountCents?: number;
  category?: string;
  description?: string | null;
  date?: string | Date;
  settled?: boolean;
  showId?: string | null;
}

export interface ShowOption {
  id: string;
  title: string;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function TransactionForm({
  initial,
  shows,
  lockedShowId,
  returnTo,
}: {
  initial?: TransactionFormValues;
  shows: ShowOption[];
  lockedShowId?: string;
  returnTo?: string;
}) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit
    ? updateTransactionAction.bind(null, initial!.id!)
    : createTransactionAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, {});
  const [type, setType] = useState(initial?.type ?? "EXPENSE");

  const categories =
    type === "INCOME"
      ? SUGGESTED_INCOME_CATEGORIES
      : SUGGESTED_EXPENSE_CATEGORIES;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <div>
        <label className="label">Tipo</label>
        <div className="flex gap-2">
          {TRANSACTION_TYPES.map((t) => (
            <label
              key={t}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                type === t
                  ? t === "INCOME"
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-red-400 bg-red-50 text-red-700"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {TRANSACTION_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Valor (R$) *
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={
              initial?.amountCents != null
                ? centsToReais(initial.amountCents)
                : ""
            }
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="date">
            Data *
          </label>
          <input
            id="date"
            name="date"
            type="datetime-local"
            required
            defaultValue={
              initial?.date
                ? toDateInputValue(initial.date)
                : toDateInputValue(new Date())
            }
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="category">
          Categoria *
        </label>
        <input
          id="category"
          name="category"
          required
          list="cat-suggestions"
          defaultValue={initial?.category ?? ""}
          className="input"
        />
        <datalist id="cat-suggestions">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descrição
        </label>
        <input
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="showId">
          Vincular a um show <span className="text-slate-400">(opcional)</span>
        </label>
        {lockedShowId ? (
          <input type="hidden" name="showId" value={lockedShowId} />
        ) : (
          <select
            id="showId"
            name="showId"
            defaultValue={initial?.showId ?? ""}
            className="input"
          >
            <option value="">— Nenhum —</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="settled"
          defaultChecked={initial?.settled ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        Já {type === "INCOME" ? "recebido" : "pago"} (desmarque se pendente)
      </label>

      <div className="flex gap-3">
        <Submit label={isEdit ? "Salvar" : "Adicionar"} />
        <Link href={returnTo || "/financas"} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
