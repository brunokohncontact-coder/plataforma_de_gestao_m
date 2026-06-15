"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/enums";
import type { FormState } from "@/app/actions/shows";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface ShowDefaults {
  title?: string | null;
  date?: string; // YYYY-MM-DD
  venue?: string;
  city?: string;
  status?: string;
  fee?: number;
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

export function ShowForm({
  action,
  defaults = {},
  submitLabel = "Salvar show",
}: {
  action: Action;
  defaults?: ShowDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="card space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Título (opcional)
        </label>
        <input
          id="title"
          name="title"
          className="input"
          defaultValue={defaults.title ?? ""}
          placeholder="Ex.: Show de lançamento"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Data
          </label>
          <input
            id="date"
            name="date"
            type="date"
            className="input"
            required
            defaultValue={defaults.date ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="input"
            defaultValue={defaults.status ?? "proposto"}
          >
            {SHOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHOW_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="venue">
            Local (venue)
          </label>
          <input
            id="venue"
            name="venue"
            className="input"
            required
            defaultValue={defaults.venue ?? ""}
            placeholder="Nome da casa de shows"
          />
        </div>
        <div>
          <label className="label" htmlFor="city">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            className="input"
            required
            defaultValue={defaults.city ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fee">
          Cachê acordado (R$)
        </label>
        <input
          id="fee"
          name="fee"
          type="number"
          min="0"
          step="0.01"
          className="input"
          defaultValue={defaults.fee ?? 0}
        />
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
        <Link href="/app/shows" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
