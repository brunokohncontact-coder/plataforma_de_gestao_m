"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createTransaction,
  updateTransaction,
  type FormState,
} from "@/app/(app)/financas/actions";
import {
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
} from "@/lib/domain/constants";
import { useCloseDialog } from "@/components/Dialog";

export interface TransactionFormValues {
  id?: string;
  type?: string;
  amount?: number;
  category?: string;
  description?: string | null;
  date?: string;
  received?: boolean;
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
}: {
  initial?: TransactionFormValues;
  shows: ShowOption[];
}) {
  const router = useRouter();
  const close = useCloseDialog();
  const action = initial?.id
    ? updateTransaction.bind(null, initial.id)
    : createTransaction;
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  const [type, setType] = useState(initial?.type ?? "receita");

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      close();
    }
  }, [state.ok, router, close]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo *</label>
          <select
            name="type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "receita" ? "Receita" : "Despesa"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Valor (R$) *</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            className="input"
            defaultValue={initial?.amount}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Categoria</label>
          <select
            name="category"
            className="input"
            defaultValue={initial?.category ?? "outro"}
          >
            {TRANSACTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TRANSACTION_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data *</label>
          <input
            name="date"
            type="date"
            className="input"
            defaultValue={initial?.date ?? today}
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Descrição</label>
        <input
          name="description"
          className="input"
          defaultValue={initial?.description ?? ""}
          placeholder="Ex.: Combustível, cachê da casa…"
        />
      </div>
      <div>
        <label className="label">Vincular a um show (opcional)</label>
        <select
          name="showId"
          className="input"
          defaultValue={initial?.showId ?? ""}
        >
          <option value="">— Nenhum —</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="received"
          defaultChecked={initial?.received ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        {type === "despesa" ? "Já paga" : "Já recebida"}
      </label>
      <div className="flex justify-end pt-1">
        <Submit label={initial?.id ? "Salvar" : "Adicionar"} />
      </div>
    </form>
  );
}
