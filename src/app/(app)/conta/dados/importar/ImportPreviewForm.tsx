"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import {
  previewAccountImportAction,
  type ImportPreviewState,
} from "./actions";

const initial: ImportPreviewState = {};

const COUNT_LABELS: Array<{
  key: "shows" | "transactions" | "contacts" | "revenueGoals";
  label: string;
}> = [
  { key: "shows", label: "Shows" },
  { key: "transactions", label: "Transações" },
  { key: "contacts", label: "Contatos" },
  { key: "revenueGoals", label: "Metas de faturamento" },
];

function formatExportedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

export function ImportPreviewForm() {
  const [state, formAction] = useFormState(previewAccountImportAction, initial);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="arquivo">
            Arquivo de backup (<code>.json</code>)
          </label>
          <input
            className="input"
            id="arquivo"
            name="arquivo"
            type="file"
            accept="application/json,.json"
            required
          />
        </div>
        <SubmitButton className="btn-primary" pendingLabel="Conferindo...">
          Conferir arquivo
        </SubmitButton>
      </form>

      {state.errors && state.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">
            Este arquivo não é um backup restaurável:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {state.summary && (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            <p className="font-medium">
              ✓ Backup válido do {state.summary.app} (formato v
              {state.summary.schemaVersion}).
            </p>
            <p className="mt-0.5 text-green-700">
              Gerado em {formatExportedAt(state.summary.exportedAt)}.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COUNT_LABELS.map(({ key, label }) => (
              <div key={key} className="rounded-lg border border-gray-200 px-3 py-2">
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {state.summary!.counts[key]}
                </dd>
              </div>
            ))}
          </dl>

          {state.warnings && state.warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-medium">Avisos (o arquivo é válido mesmo assim):</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {state.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Esta é apenas uma conferência — nada foi gravado na sua conta. A
            restauração dos dados a partir do backup será um passo à parte.
          </p>
        </div>
      )}
    </div>
  );
}
