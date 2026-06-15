"use client";

import { useActionState, useState } from "react";
import { createTransaction, type FormState } from "@/app/app/finances/actions";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/labels";

type ShowOption = { id: string; title: string };

export function TransactionForm({
  shows,
  defaultShowId,
  defaultType = "EXPENSE",
}: {
  shows: ShowOption[];
  defaultShowId?: string;
  defaultType?: "INCOME" | "EXPENSE";
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTransaction, {});
  const [type, setType] = useState<"INCOME" | "EXPENSE">(defaultType);
  const today = new Date().toISOString().slice(0, 10);
  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form action={action} className="space-y-4">
      <div>
        <span className="label">Tipo</span>
        <div className="grid grid-cols-2 gap-2">
          {(["INCOME", "EXPENSE"] as const).map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium ${
                type === t
                  ? t === "INCOME"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
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
              {t === "INCOME" ? "Receita" : "Despesa"}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            Valor (R$) *
          </label>
          <input id="amount" name="amount" className="input" inputMode="decimal" required placeholder="0,00" />
        </div>
        <div>
          <label className="label" htmlFor="date">
            Data *
          </label>
          <input id="date" name="date" type="date" className="input" required defaultValue={today} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="category">
          Categoria *
        </label>
        <input
          id="category"
          name="category"
          className="input"
          required
          list="cat-options"
          placeholder="Selecione ou digite"
        />
        <datalist id="cat-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label" htmlFor="showId">
          Vincular a show
        </label>
        <select id="showId" name="showId" className="input" defaultValue={defaultShowId ?? ""}>
          <option value="">— nenhum —</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descrição
        </label>
        <input id="description" name="description" className="input" />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="paid" className="h-4 w-4 rounded border-slate-300" />
        {type === "INCOME" ? "Já recebido" : "Já pago"}
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Salvando…" : "Salvar transação"}
      </button>
    </form>
  );
}
