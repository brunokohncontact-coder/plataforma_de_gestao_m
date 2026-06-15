"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/domain";
import { toDateTimeLocal } from "@/lib/money";
import type { FormResult } from "./actions";

interface ShowDefaults {
  title?: string;
  date?: Date;
  venue?: string | null;
  city?: string | null;
  status?: string;
  feeAgreed?: number;
  contactId?: string | null;
  notes?: string | null;
}

export function ShowForm({
  action,
  defaults,
  contacts,
  submitLabel,
}: {
  action: (prev: FormResult, fd: FormData) => Promise<FormResult>;
  defaults?: ShowDefaults;
  contacts: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="title">Título do show</Label>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Data e hora</Label>
          <Input
            id="date"
            name="date"
            type="datetime-local"
            defaultValue={defaults?.date ? toDateTimeLocal(defaults.date) : ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaults?.status ?? "proposed"}>
            {SHOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHOW_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="venue">Local (venue)</Label>
          <Input id="venue" name="venue" defaultValue={defaults?.venue ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" defaultValue={defaults?.city ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="feeAgreed">Cachê acordado (R$)</Label>
          <Input
            id="feeAgreed"
            name="feeAgreed"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.feeAgreed ?? 0}
          />
        </div>
        <div>
          <Label htmlFor="contactId">Contato vinculado</Label>
          <Select id="contactId" name="contactId" defaultValue={defaults?.contactId ?? ""}>
            <option value="">— Nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : submitLabel}
      </Button>
    </form>
  );
}
