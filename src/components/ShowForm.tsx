"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import { SHOW_STATUS_LABELS, CONTACT_ROLE_LABELS } from "@/lib/labels";
import type { ShowActionState } from "@/app/actions/shows";

export interface ShowFormData {
  title: string;
  date: string;
  venue: string;
  city: string;
  status: string;
  fee: string;
  notes: string;
  contactIds: string[];
}

export interface ContactOption {
  id: string;
  name: string;
  role: string;
}

type Action = (
  state: ShowActionState,
  formData: FormData
) => Promise<ShowActionState>;

export function ShowForm({
  action,
  initial,
  contacts,
  submitLabel,
}: {
  action: Action;
  initial?: Partial<ShowFormData>;
  contacts: ContactOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ShowActionState, FormData>(action, {});
  const selected = new Set(initial?.contactIds ?? []);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">Título *</label>
        <input id="title" name="title" className="input" required defaultValue={initial?.title} placeholder="Ex.: Festival de Inverno" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Data *</label>
          <input id="date" name="date" type="date" className="input" required defaultValue={initial?.date} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={initial?.status ?? "PROPOSED"}>
            {Object.entries(SHOW_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="venue">Local</label>
          <input id="venue" name="venue" className="input" defaultValue={initial?.venue} placeholder="Nome da casa/venue" />
        </div>
        <div>
          <label className="label" htmlFor="city">Cidade</label>
          <input id="city" name="city" className="input" defaultValue={initial?.city} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fee">Cachê (R$)</label>
        <input id="fee" name="fee" className="input" inputMode="decimal" defaultValue={initial?.fee} placeholder="0,00" />
      </div>

      <div>
        <label className="label" htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" className="input min-h-20" defaultValue={initial?.notes} />
      </div>

      {contacts.length > 0 && (
        <fieldset>
          <legend className="label">Contatos vinculados</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <input type="checkbox" name="contactIds" value={c.id} defaultChecked={selected.has(c.id)} />
                <span className="truncate">
                  {c.name}{" "}
                  <span className="text-xs text-gray-400">
                    ({CONTACT_ROLE_LABELS[c.role]})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
