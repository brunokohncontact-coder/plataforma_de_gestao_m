"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { CONTACT_ROLES, CONTACT_ROLE_LABELS } from "@/lib/domain";
import type { FormResult } from "./actions";

interface ContactDefaults {
  name?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export function ContactForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormResult, fd: FormData) => Promise<FormResult>;
  defaults?: ContactDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
        <div>
          <Label htmlFor="role">Papel</Label>
          <Select id="role" name="role" defaultValue={defaults?.role ?? "other"}>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {CONTACT_ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} />
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
