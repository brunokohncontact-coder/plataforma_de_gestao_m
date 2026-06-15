"use client";

import { useActionState, useEffect, useRef } from "react";
import { createContact, type FormState } from "@/app/app/contacts/actions";
import { CONTACT_ROLES, CONTACT_ROLE_LABEL } from "@/lib/labels";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createContact, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="name">
          Nome *
        </label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="role">
          Papel
        </label>
        <select id="role" name="role" className="input" defaultValue="VENUE">
          {CONTACT_ROLES.map((r) => (
            <option key={r} value={r}>
              {CONTACT_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Telefone
        </label>
        <input id="phone" name="phone" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea id="notes" name="notes" className="input" rows={2} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Adicionar contato"}
      </button>
    </form>
  );
}
