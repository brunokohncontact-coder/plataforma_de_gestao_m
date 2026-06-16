"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createShow, updateShow, type FormState } from "@/app/(app)/shows/actions";
import { SHOW_STATUSES, SHOW_STATUS_LABELS } from "@/lib/domain/constants";
import { useCloseDialog } from "@/components/Dialog";

export interface ShowFormValues {
  id?: string;
  title?: string;
  venue?: string | null;
  city?: string | null;
  date?: string; // yyyy-mm-dd
  status?: string;
  feeAgreed?: number;
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

export function ShowForm({ initial }: { initial?: ShowFormValues }) {
  const router = useRouter();
  const close = useCloseDialog();
  const action = initial?.id
    ? updateShow.bind(null, initial.id)
    : createShow;
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
      <div>
        <label className="label">Título *</label>
        <input
          name="title"
          className="input"
          defaultValue={initial?.title}
          placeholder="Ex.: Show no Bar do Zé"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Local</label>
          <input name="venue" className="input" defaultValue={initial?.venue ?? ""} />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input name="city" className="input" defaultValue={initial?.city ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data *</label>
          <input
            name="date"
            type="date"
            className="input"
            defaultValue={initial?.date}
            required
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={initial?.status ?? "proposto"}>
            {SHOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SHOW_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Cachê acordado (R$)</label>
        <input
          name="feeAgreed"
          type="number"
          step="0.01"
          min="0"
          className="input"
          defaultValue={initial?.feeAgreed ?? 0}
        />
      </div>
      <div>
        <label className="label">Notas</label>
        <textarea
          name="notes"
          className="input"
          rows={2}
          defaultValue={initial?.notes ?? ""}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Submit label={initial?.id ? "Salvar" : "Criar show"} />
      </div>
    </form>
  );
}
