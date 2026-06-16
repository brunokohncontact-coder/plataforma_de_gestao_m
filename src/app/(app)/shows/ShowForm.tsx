"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/domain";
import type { FormState } from "./actions";

const initial: FormState = {};

export interface ShowFormValues {
  title?: string;
  date?: string; // datetime-local value
  venue?: string | null;
  city?: string | null;
  status?: string;
  fee?: string; // valor editável
  notes?: string | null;
}

export function ShowForm({
  action,
  values = {},
  cancelHref,
  submitLabel = "Salvar",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values?: ShowFormValues;
  cancelHref: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="label" htmlFor="title">
          Título do show
        </label>
        <input
          className="input"
          id="title"
          name="title"
          type="text"
          required
          defaultValue={values.title}
          placeholder="Ex.: Show no Bar do Zé"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Data e hora
          </label>
          <input
            className="input"
            id="date"
            name="date"
            type="datetime-local"
            required
            defaultValue={values.date}
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select className="input" id="status" name="status" defaultValue={values.status ?? "PROPOSED"}>
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
            Local <span className="text-gray-400">(opcional)</span>
          </label>
          <input className="input" id="venue" name="venue" type="text" defaultValue={values.venue ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade <span className="text-gray-400">(opcional)</span>
          </label>
          <input className="input" id="city" name="city" type="text" defaultValue={values.city ?? ""} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fee">
          Cachê acordado (R$) <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          className="input"
          id="fee"
          name="fee"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={values.fee}
        />
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notas <span className="text-gray-400">(opcional)</span>
        </label>
        <textarea className="input" id="notes" name="notes" rows={3} defaultValue={values.notes ?? ""} />
      </div>

      <div className="flex gap-3 pt-2">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
