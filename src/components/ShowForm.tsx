"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "./SubmitButton";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/enums";
import type { ShowFormState } from "@/app/(app)/shows/actions";

type Action = (prev: ShowFormState, fd: FormData) => Promise<ShowFormState>;

export type ShowFormValues = {
  title?: string;
  venue?: string | null;
  city?: string | null;
  date?: string; // YYYY-MM-DD
  status?: string;
  fee?: number;
  notes?: string | null;
  contactId?: string | null;
};

export function ShowForm({
  action,
  initial = {},
  contacts,
  submitLabel,
}: {
  action: Action;
  initial?: ShowFormValues;
  contacts: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {} as ShowFormState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Título do show
        </label>
        <input
          id="title"
          name="title"
          className="input"
          defaultValue={initial.title}
          required
        />
        {e.title && <p className="field-error">{e.title}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Data
          </label>
          <input
            id="date"
            name="date"
            type="date"
            className="input"
            defaultValue={initial.date}
            required
          />
          {e.date && <p className="field-error">{e.date}</p>}
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="input"
            defaultValue={initial.status ?? "PROPOSED"}
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
            Local / venue
          </label>
          <input
            id="venue"
            name="venue"
            className="input"
            defaultValue={initial.venue ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            className="input"
            defaultValue={initial.city ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            className="input"
            defaultValue={initial.fee ?? 0}
          />
          {e.fee && <p className="field-error">{e.fee}</p>}
        </div>
        <div>
          <label className="label" htmlFor="contactId">
            Contato vinculado
          </label>
          <select
            id="contactId"
            name="contactId"
            className="input"
            defaultValue={initial.contactId ?? ""}
          >
            <option value="">— Nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          className="input"
          rows={3}
          defaultValue={initial.notes ?? ""}
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
