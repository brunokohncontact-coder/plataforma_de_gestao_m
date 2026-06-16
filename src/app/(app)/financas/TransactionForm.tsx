"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { MoneyInput } from "@/components/MoneyInput";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  SUGGESTED_INCOME_CATEGORIES,
  SUGGESTED_EXPENSE_CATEGORIES,
  type TransactionType,
} from "@/lib/domain";
import type { FormState } from "./actions";

const initial: FormState = {};

export interface ShowOption {
  id: string;
  title: string;
}

export interface TransactionFormValues {
  type?: TransactionType;
  description?: string;
  amount?: string;
  date?: string; // yyyy-mm-dd
  category?: string;
  received?: boolean;
  showId?: string | null;
}

export function TransactionForm({
  action,
  shows,
  defaultShowId,
  cancelHref,
  values,
  submitLabel = "Adicionar",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  shows: ShowOption[];
  defaultShowId?: string;
  cancelHref: string;
  values?: TransactionFormValues;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, initial);
  const [type, setType] = useState<TransactionType>(values?.type ?? "EXPENSE");

  const categories =
    type === "INCOME" ? SUGGESTED_INCOME_CATEGORIES : SUGGESTED_EXPENSE_CATEGORIES;
  const selectedShowId = values?.showId ?? defaultShowId ?? "";

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <span className="label">Tipo</span>
        <div className="grid grid-cols-2 gap-2">
          {TRANSACTION_TYPES.map((t) => (
            <label
              key={t}
              className={
                "cursor-pointer rounded-lg border px-4 py-2 text-center text-sm font-medium " +
                (type === t
                  ? t === "INCOME"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-300 text-gray-600")
              }
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

      <div>
        <label className="label" htmlFor="description">
          Descrição
        </label>
        <input
          className="input"
          id="description"
          name="description"
          type="text"
          required
          defaultValue={values?.description}
          placeholder={type === "INCOME" ? "Ex.: Cachê show no Bar X" : "Ex.: Gasolina ida e volta"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Valor (R$)
          </label>
          <MoneyInput id="amount" name="amount" required defaultValue={values?.amount} />
        </div>
        <div>
          <label className="label" htmlFor="date">
            Data
          </label>
          <input className="input" id="date" name="date" type="date" required defaultValue={values?.date} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Categoria
          </label>
          <input
            className="input"
            id="category"
            name="category"
            type="text"
            required
            defaultValue={values?.category}
            list="category-options"
            placeholder="Escolha ou digite"
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="showId">
            Vincular a um show <span className="text-gray-400">(opcional)</span>
          </label>
          <select className="input" id="showId" name="showId" defaultValue={selectedShowId}>
            <option value="">— Nenhum —</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="received"
          defaultChecked={values?.received ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        {type === "INCOME" ? "Já recebido" : "Já pago"} (desmarque para “pendente”)
      </label>

      <div className="flex gap-3 pt-2">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
