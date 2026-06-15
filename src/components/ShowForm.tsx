"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createShowAction,
  updateShowAction,
  type ActionState,
} from "@/app/actions/shows";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/enums";
import { centsToReais } from "@/lib/money";
import { toDateInputValue } from "@/lib/format";

export interface ShowFormValues {
  id?: string;
  title?: string;
  date?: string | Date;
  venue?: string | null;
  city?: string | null;
  status?: string;
  feeCents?: number;
  notes?: string | null;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function ShowForm({ initial }: { initial?: ShowFormValues }) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit
    ? updateShowAction.bind(null, initial!.id!)
    : createShowAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="title">
          Título *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="Ex.: Show no Bar do Zé"
          className="input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Data e hora *
          </label>
          <input
            id="date"
            name="date"
            type="datetime-local"
            required
            defaultValue={initial?.date ? toDateInputValue(initial.date) : ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "PROPOSED"}
            className="input"
          >
            {SHOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHOW_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="venue">
            Local / Casa
          </label>
          <input
            id="venue"
            name="venue"
            defaultValue={initial?.venue ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            defaultValue={initial?.city ?? ""}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="fee">
          Cachê (R$)
        </label>
        <input
          id="fee"
          name="fee"
          type="number"
          step="0.01"
          min="0"
          defaultValue={
            initial?.feeCents != null ? centsToReais(initial.feeCents) : ""
          }
          placeholder="0,00"
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className="input"
        />
      </div>
      <div className="flex gap-3">
        <Submit label={isEdit ? "Salvar alterações" : "Criar show"} />
        <Link href="/shows" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
