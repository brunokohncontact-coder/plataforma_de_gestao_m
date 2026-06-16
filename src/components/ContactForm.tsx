"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "./SubmitButton";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/enums";
import type { ContactFormState } from "@/app/(app)/contacts/actions";

type Action = (
  prev: ContactFormState,
  fd: FormData
) => Promise<ContactFormState>;

export function ContactForm({ action }: { action: Action }) {
  const [state, formAction] = useFormState(action, {} as ContactFormState);
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input id="name" name="name" className="input" required />
          {e.name && <p className="field-error">{e.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="role">
            Papel
          </label>
          <select id="role" name="role" className="input" defaultValue="OTHER">
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
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" />
          {e.email && <p className="field-error">{e.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telefone
          </label>
          <input id="phone" name="phone" className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="company">
          Empresa / casa
        </label>
        <input id="company" name="company" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea id="notes" name="notes" className="input" rows={2} />
      </div>

      <div className="flex justify-end">
        <SubmitButton>Adicionar contato</SubmitButton>
      </div>
    </form>
  );
}
