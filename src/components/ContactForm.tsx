"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createContactAction,
  updateContactAction,
  type ActionState,
} from "@/app/actions/contacts";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/enums";

export interface ContactFormValues {
  id?: string;
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

export function ContactForm({ initial }: { initial?: ContactFormValues }) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit
    ? updateContactAction.bind(null, initial!.id!)
    : createContactAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Nome *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="role">
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue={initial?.role ?? "OTHER"}
            className="input"
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
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            className="input"
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
          rows={3}
          defaultValue={initial?.notes ?? ""}
          className="input"
        />
      </div>
      <div className="flex gap-3">
        <Submit label={isEdit ? "Salvar alterações" : "Criar contato"} />
        <Link href="/contatos" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
