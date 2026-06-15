"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, inputClass, SubmitButton } from "@/components/ui";
import { SHOW_STATUS_OPTIONS, SETTLEMENT_LABELS } from "@/lib/labels";
import type { FormState } from "@/app/(app)/shows/actions";

export interface ShowFormValues {
  title?: string;
  date?: string; // YYYY-MM-DD
  venue?: string | null;
  city?: string | null;
  status?: string;
  fee?: number;
  feeStatus?: string;
  notes?: string | null;
  contactId?: string | null;
}

export function ShowForm({
  action,
  defaultValues = {},
  contacts,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: ShowFormValues;
  contacts: { id: string; name: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const d = defaultValues;

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Título *">
        <input
          name="title"
          required
          defaultValue={d.title ?? ""}
          className={inputClass}
          placeholder="Ex.: Show no Bar do Rock"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data *">
          <input
            type="date"
            name="date"
            required
            defaultValue={d.date ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={d.status ?? "PROPOSED"} className={inputClass}>
            {SHOW_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Local (venue)">
          <input name="venue" defaultValue={d.venue ?? ""} className={inputClass} />
        </Field>
        <Field label="Cidade">
          <input name="city" defaultValue={d.city ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cachê (R$)">
          <input
            type="number"
            name="fee"
            min="0"
            step="0.01"
            defaultValue={d.fee ?? 0}
            className={inputClass}
          />
        </Field>
        <Field label="Status do cachê">
          <select
            name="feeStatus"
            defaultValue={d.feeStatus ?? "PENDING"}
            className={inputClass}
          >
            {Object.entries(SETTLEMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {contacts.length > 0 && (
        <Field label="Contato">
          <select name="contactId" defaultValue={d.contactId ?? ""} className={inputClass}>
            <option value="">— Nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Notas">
        <textarea
          name="notes"
          rows={3}
          defaultValue={d.notes ?? ""}
          className={inputClass}
        />
      </Field>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
