"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/domain";
import type { FormState } from "./actions";

const initial: FormState = {};

export interface ContactFormValues {
  name?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export function ContactForm({
  action,
  values = {},
  cancelHref,
  submitLabel = "Salvar",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values?: ContactFormValues;
  cancelHref: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input className="input" id="name" name="name" type="text" required defaultValue={values.name} />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Papel
          </label>
          <select className="input" id="role" name="role" defaultValue={values.role ?? "OTHER"}>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            E-mail <span className="text-gray-400">(opcional)</span>
          </label>
          <input className="input" id="email" name="email" type="email" defaultValue={values.email ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telefone <span className="text-gray-400">(opcional)</span>
          </label>
          <input className="input" id="phone" name="phone" type="text" defaultValue={values.phone ?? ""} />
        </div>
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
