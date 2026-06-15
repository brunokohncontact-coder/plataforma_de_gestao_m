"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  SUGGESTED_INCOME_CATEGORIES,
  SUGGESTED_EXPENSE_CATEGORIES,
} from "@/lib/enums";
import type { FormState } from "@/app/actions/transactions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface TxDefaults {
  type?: string;
  category?: string;
  description?: string | null;
  amount?: number;
  date?: string; // YYYY-MM-DD
  status?: string;
  showId?: string | null;
}

export interface ShowOption {
  id: string;
  label: string;
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
  action,
  defaults = {},
  shows,
  submitLabel = "Salvar transação",
}: {
  action: Action;
  defaults?: TxDefaults;
  shows: ShowOption[];
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const allCategories = Array.from(
    new Set([...SUGGESTED_INCOME_CATEGORIES, ...SUGGESTED_EXPENSE_CATEGORIES]),
  );

  return (
    <form action={formAction} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            className="input"
            defaultValue={defaults.type ?? "income"}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">
            Valor (R$)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            className="input"
            required
            defaultValue={defaults.amount ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Categoria
          </label>
          <input
            id="category"
            name="category"
            className="input"
            required
            list="category-suggestions"
            defaultValue={defaults.category ?? ""}
            placeholder="Ex.: Cachê, Transporte…"
          />
          <datalist id="category-suggestions">
            {allCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="date">
            Data
          </label>
          <input
            id="date"
            name="date"
            type="date"
            className="input"
            required
            defaultValue={defaults.date ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="input"
            defaultValue={defaults.status ?? "pending"}
          >
            <option value="pending">Pendente</option>
            <option value="received">Recebida (receita)</option>
            <option value="paid">Paga (despesa)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="showId">
            Vincular a um show (opcional)
          </label>
          <select
            id="showId"
            name="showId"
            className="input"
            defaultValue={defaults.showId ?? ""}
          >
            <option value="">— Nenhum —</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descrição (opcional)
        </label>
        <input
          id="description"
          name="description"
          className="input"
          defaultValue={defaults.description ?? ""}
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Submit label={submitLabel} />
        <Link href="/app/financas" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
