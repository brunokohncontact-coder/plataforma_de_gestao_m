"use client";

import { CONTACT_ROLES } from "@/lib/validation";
import { CONTACT_ROLE_LABELS } from "@/lib/labels";

export interface ContactFormValues {
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

interface Props {
  action: (formData: FormData) => void;
  initial?: Partial<ContactFormValues>;
  submitLabel: string;
}

export default function ContactForm({ action, initial, submitLabel }: Props) {
  return (
    <form action={action} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nome *</label>
          <input id="name" name="name" className="input" required defaultValue={initial?.name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="role">Papel</label>
          <select id="role" name="role" className="input" defaultValue={initial?.role ?? "other"}>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>{CONTACT_ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" defaultValue={initial?.email ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefone</label>
          <input id="phone" name="phone" className="input" defaultValue={initial?.phone ?? ""} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" className="input" rows={3} defaultValue={initial?.notes ?? ""} />
      </div>

      <button type="submit" className="btn-primary">{submitLabel}</button>
    </form>
  );
}
