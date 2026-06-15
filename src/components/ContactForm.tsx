"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/enums";
import type { FormState } from "@/app/actions/contacts";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface ContactDefaults {
  name?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function ContactForm({
  action,
  defaults = {},
  submitLabel = "Salvar contato",
}: {
  action: Action;
  defaults?: ContactDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            name="name"
            className="input"
            required
            defaultValue={defaults.name ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Papel
          </label>
          <select
            id="role"
            name="role"
            className="input"
            defaultValue={defaults.role ?? "venue"}
          >
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
            E-mail (opcional)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            defaultValue={defaults.email ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telefone (opcional)
          </label>
          <input
            id="phone"
            name="phone"
            className="input"
            defaultValue={defaults.phone ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          className="input min-h-[80px]"
          defaultValue={defaults.notes ?? ""}
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Submit label={submitLabel} />
        <Link href="/app/contatos" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
