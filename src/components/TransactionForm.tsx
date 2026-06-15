"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { SubmitButton } from "./SubmitButton";
import { createTransactionAction, type FormState } from "@/app/actions/transactions";
import {
  SUGGESTED_INCOME_CATEGORIES,
  SUGGESTED_EXPENSE_CATEGORIES,
} from "@/lib/domain/enums";
import { toDateInputValue } from "@/lib/format";

// Formulário de lançamento financeiro. Se `lockedShowId` vier, a transação já
// nasce vinculada ao show (usado na tela do show); senão mostra o seletor.
export function TransactionForm({
  shows,
  lockedShowId,
}: {
  shows: { id: string; title: string }[];
  lockedShowId?: string;
}) {
  const [state, formAction] = useFormState(createTransactionAction, {} as FormState);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const categories =
    type === "INCOME" ? SUGGESTED_INCOME_CATEGORIES : SUGGESTED_EXPENSE_CATEGORIES;

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
            className="input"
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </select>
        </div>
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
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">
            Categoria *
          </label>
          <input
            id="category"
            name="category"
            required
            list="tx-categories"
            placeholder="Ex.: Transporte"
            className="input"
          />
          <datalist id="tx-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="date">
            Data *
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue(new Date())}
            className="input"
          />
        </div>
      </div>

      {lockedShowId ? (
        <input type="hidden" name="showId" value={lockedShowId} />
      ) : (
        shows.length > 0 && (
          <div>
            <label className="label" htmlFor="showId">
              Vincular a um show
            </label>
            <select id="showId" name="showId" className="input" defaultValue="">
              <option value="">— Nenhum —</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )
      )}

      <div>
        <label className="label" htmlFor="note">
          Observação
        </label>
        <input id="note" name="note" className="input" />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="received"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300"
        />
        {type === "INCOME" ? "Já recebido" : "Já pago"}
      </label>

      <SubmitButton className="btn-primary w-full">Lançar</SubmitButton>
    </form>
  );
}
