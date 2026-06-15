"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import { CONTACT_ROLE_LABELS } from "@/lib/labels";
import type { ContactActionState } from "@/app/actions/contacts";

export interface ContactFormData {
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

type Action = (
  state: ContactActionState,
  formData: FormData
) => Promise<ContactActionState>;

export function ContactForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Partial<ContactFormData>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ContactActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nome *</label>
          <input id="name" name="name" className="input" required defaultValue={initial?.name} />
        </div>
        <div>
          <label className="label" htmlFor="role">Papel</label>
          <select id="role" name="role" className="input" defaultValue={initial?.role ?? "OTHER"}>
            {Object.entries(CONTACT_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" defaultValue={initial?.email} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefone</label>
          <input id="phone" name="phone" className="input" defaultValue={initial?.phone} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" className="input min-h-20" defaultValue={initial?.notes} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
