"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "@/app/actions/shows";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/domain/enums";

export interface ShowFormData {
  title: string;
  venue: string;
  city: string;
  date: string; // YYYY-MM-DD
  status: string;
  fee: number;
  feePaid: boolean;
  notes: string;
  contactId: string;
}

export function ShowForm({
  action,
  initial,
  contacts,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<ShowFormData>;
  contacts: { id: string; name: string }[];
  cancelHref: string;
}) {
  const [state, formAction] = useFormState(action, {} as FormState);

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
            Data *
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initial?.date ?? ""}
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
            Local
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
            defaultValue={initial?.fee ?? 0}
            className="input"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="feePaid"
              defaultChecked={initial?.feePaid ?? false}
              className="h-4 w-4 rounded border-slate-300"
            />
            Cachê já recebido
          </label>
        </div>
      </div>

      {contacts.length > 0 && (
        <div>
          <label className="label" htmlFor="contactId">
            Contato vinculado
          </label>
          <select
            id="contactId"
            name="contactId"
            defaultValue={initial?.contactId ?? ""}
            className="input"
          >
            <option value="">— Nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
        <SubmitButton className="btn-primary">Salvar</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
