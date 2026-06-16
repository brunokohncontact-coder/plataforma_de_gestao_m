"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createContact,
  updateContact,
  type FormState,
} from "@/app/(app)/contatos/actions";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/domain/constants";
import { useCloseDialog } from "@/components/Dialog";

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
  const router = useRouter();
  const close = useCloseDialog();
  const action = initial?.id
    ? updateContact.bind(null, initial.id)
    : createContact;
  const [state, formAction] = useFormState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      close();
    }
  }, [state.ok, router, close]);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nome *</label>
          <input name="name" className="input" defaultValue={initial?.name} required />
        </div>
        <div>
          <label className="label">Papel</label>
          <select name="role" className="input" defaultValue={initial?.role ?? "outro"}>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">E-mail</label>
          <input
            name="email"
            type="email"
            className="input"
            defaultValue={initial?.email ?? ""}
          />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input name="phone" className="input" defaultValue={initial?.phone ?? ""} />
        </div>
      </div>
      <div>
        <label className="label">Notas</label>
        <textarea
          name="notes"
          rows={2}
          className="input"
          defaultValue={initial?.notes ?? ""}
        />
      </div>
      <div className="flex justify-end pt-1">
        <Submit label={initial?.id ? "Salvar" : "Adicionar"} />
      </div>
    </form>
  );
}
