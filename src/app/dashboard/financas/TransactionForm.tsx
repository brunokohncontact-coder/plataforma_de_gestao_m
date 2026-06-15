"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_LABELS,
} from "@/lib/domain";
import { toDateInput } from "@/lib/money";
import type { FormResult } from "./actions";

interface TxDefaults {
  type?: string;
  category?: string;
  description?: string | null;
  amount?: number;
  date?: Date;
  status?: string;
  showId?: string | null;
}

export function TransactionForm({
  action,
  defaults,
  shows,
  submitLabel,
}: {
  action: (prev: FormResult, fd: FormData) => Promise<FormResult>;
  defaults?: TxDefaults;
  shows: { id: string; title: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" name="type" defaultValue={defaults?.type ?? "expense"}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Situação</Label>
          <Select id="status" name="status" defaultValue={defaults?.status ?? "received"}>
            {TRANSACTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TRANSACTION_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaults?.amount ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={defaults?.date ? toDateInput(defaults.date) : toDateInput(new Date())}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Categoria</Label>
        <Input
          id="category"
          name="category"
          placeholder="cachê, transporte, hospedagem, merch…"
          defaultValue={defaults?.category}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input id="description" name="description" defaultValue={defaults?.description ?? ""} />
      </div>

      <div>
        <Label htmlFor="showId">Vincular a um show (opcional)</Label>
        <Select id="showId" name="showId" defaultValue={defaults?.showId ?? ""}>
          <option value="">— Nenhum —</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </Select>
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
