"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "@/app/actions/contacts";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/domain/enums";

export interface ContactFormData {
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

export function ContactForm({
  action,
  initial,
  submitLabel = "Salvar",
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<ContactFormData>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useFormState(action, {} as FormState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nome *
          </label>
          <input id="name" name="name" required defaultValue={initial?.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Papel
          </label>
          <select id="role" name="role" defaultValue={initial?.role ?? "OTHER"} className="input">
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telefone
          </label>
          <input id="phone" name="phone" defaultValue={initial?.phone ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="input" />
      </div>
      <div className="flex gap-3">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
        {cancelHref && (
          <Link href={cancelHref} className="btn-secondary">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
