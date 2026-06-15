"use client";

import { useState } from "react";
import { SHOW_STATUSES } from "@/lib/validation";
import { SHOW_STATUS_LABELS } from "@/lib/labels";

export interface ShowFormValues {
  title: string;
  date: string; // yyyy-MM-ddThh:mm
  venue: string;
  city: string;
  status: string;
  fee: string; // reais como texto
  notes: string;
  contactId: string;
}

interface Props {
  action: (formData: FormData) => void;
  initial?: Partial<ShowFormValues>;
  contacts: { id: string; name: string }[];
  submitLabel: string;
}

export default function ShowForm({ action, initial, contacts, submitLabel }: Props) {
  const [v] = useState<ShowFormValues>({
    title: initial?.title ?? "",
    date: initial?.date ?? "",
    venue: initial?.venue ?? "",
    city: initial?.city ?? "",
    status: initial?.status ?? "proposed",
    fee: initial?.fee ?? "",
    notes: initial?.notes ?? "",
    contactId: initial?.contactId ?? "",
  });

  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="title">Título *</label>
        <input id="title" name="title" className="input" required defaultValue={v.title} placeholder="Show no Bar do Zé" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Data e hora *</label>
          <input id="date" name="date" type="datetime-local" className="input" required defaultValue={v.date} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={v.status}>
            {SHOW_STATUSES.map((s) => (
              <option key={s} value={s}>{SHOW_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="venue">Local (venue)</label>
          <input id="venue" name="venue" className="input" defaultValue={v.venue} />
        </div>
        <div>
          <label className="label" htmlFor="city">Cidade</label>
          <input id="city" name="city" className="input" defaultValue={v.city} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fee">Cachê (R$)</label>
          <input id="fee" name="fee" inputMode="decimal" className="input" defaultValue={v.fee} placeholder="0,00" />
        </div>
        <div>
          <label className="label" htmlFor="contactId">Contato</label>
          <select id="contactId" name="contactId" className="input" defaultValue={v.contactId}>
            <option value="">— nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" className="input" rows={3} defaultValue={v.notes} />
      </div>

      <button type="submit" className="btn-primary">{submitLabel}</button>
    </form>
  );
}
