"use client";

import { useActionState } from "react";
import { createShow, type FormState } from "@/app/app/shows/actions";
import { SHOW_STATUSES } from "@/lib/labels";
import { SHOW_STATUS_LABEL } from "@/lib/labels";

type ContactOption = { id: string; name: string };

export function ShowForm({ contacts }: { contacts: ContactOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createShow, {});
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Título *
        </label>
        <input id="title" name="title" className="input" required placeholder="Ex.: Show no Bar do Zé" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="venue">
            Local
          </label>
          <input id="venue" name="venue" className="input" placeholder="Casa / palco" />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade
          </label>
          <input id="city" name="city" className="input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Data *
          </label>
          <input id="date" name="date" type="date" className="input" required defaultValue={today} />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="input" defaultValue="PROPOSED">
            {SHOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHOW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fee">
            Cachê acordado (R$)
          </label>
          <input id="fee" name="fee" className="input" inputMode="decimal" placeholder="0,00" />
        </div>
        <div>
          <label className="label" htmlFor="contactId">
            Contato
          </label>
          <select id="contactId" name="contactId" className="input" defaultValue="">
            <option value="">— nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea id="notes" name="notes" className="input" rows={3} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar show"}
        </button>
      </div>
    </form>
  );
}
