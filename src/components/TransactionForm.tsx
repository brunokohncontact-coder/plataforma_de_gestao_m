"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "./SubmitButton";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/enums";
import type { TransactionFormState } from "@/app/(app)/transactions/actions";

type Action = (
  prev: TransactionFormState,
  fd: FormData
) => Promise<TransactionFormState>;

export function TransactionForm({
  action,
  shows,
  defaultShowId,
  defaultDate,
}: {
  action: Action;
  shows: { id: string; title: string }[];
  defaultShowId?: string;
  defaultDate: string;
}) {
  const [state, formAction] = useFormState(action, {} as TransactionFormState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">
            Tipo
          </label>
          <select id="type" name="type" className="input" defaultValue="EXPENSE">
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
            step="0.01"
            min="0.01"
            className="input"
            required
          />
          {e.amount && <p className="field-error">{e.amount}</p>}
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
            placeholder="Ex.: Cachê, Transporte, Equipamento"
            required
          />
          {e.category && <p className="field-error">{e.category}</p>}
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
            defaultValue={defaultDate}
            required
          />
          {e.date && <p className="field-error">{e.date}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descrição <span className="text-slate-400">(opcional)</span>
        </label>
        <input id="description" name="description" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="showId">
          Vincular a um show <span className="text-slate-400">(opcional)</span>
        </label>
        <select
          id="showId"
          name="showId"
          className="input"
          defaultValue={defaultShowId ?? ""}
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
          name="settled"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300"
        />
        Já liquidado (recebido / pago)
      </label>

      <div className="flex justify-end">
        <SubmitButton>Adicionar lançamento</SubmitButton>
      </div>
    </form>
  );
}
