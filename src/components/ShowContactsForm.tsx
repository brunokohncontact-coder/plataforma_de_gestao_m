"use client";

import { useFormStatus } from "react-dom";
import { CONTACT_ROLE_LABELS, type ContactRole } from "@/lib/enums";
import { setShowContactsAction } from "@/app/actions/shows";

interface ContactItem {
  id: string;
  name: string;
  role: string;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary py-1.5 text-xs" disabled={pending}>
      {pending ? "Salvando…" : "Salvar vínculos"}
    </button>
  );
}

export function ShowContactsForm({
  showId,
  contacts,
  linkedIds,
}: {
  showId: string;
  contacts: ContactItem[];
  linkedIds: string[];
}) {
  if (contacts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Cadastre contatos para vinculá-los a este show.
      </p>
    );
  }

  return (
    <form action={setShowContactsAction} className="space-y-3">
      <input type="hidden" name="showId" value={showId} />
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`c-${c.id}`}
              name="contactIds"
              value={c.id}
              defaultChecked={linkedIds.includes(c.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor={`c-${c.id}`} className="text-sm text-slate-700">
              {c.name}{" "}
              <span className="text-xs text-slate-400">
                · {CONTACT_ROLE_LABELS[c.role as ContactRole] ?? c.role}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <SaveButton />
    </form>
  );
}
