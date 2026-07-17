"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { importAccountAction, type ImportState } from "./actions";

const initial: ImportState = {};

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

/**
 * Os dois botões do formulário (conferir × restaurar). Vivem dentro do `<form>`
 * para ler o `pending` compartilhado via `useFormStatus`; o `intent` clicado é
 * lembrado no clique para rotular só o botão ativo enquanto envia.
 */
function ImportButtons({
  canRestore,
  confirmed,
}: {
  canRestore: boolean;
  confirmed: boolean;
}) {
  const { pending } = useFormStatus();
  const [intent, setIntent] = useState<"conferir" | "restaurar" | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="submit"
        name="intent"
        value="conferir"
        onClick={() => setIntent("conferir")}
        disabled={pending}
        className="btn-secondary"
      >
        {pending && intent === "conferir" ? "Conferindo..." : "Conferir arquivo"}
      </button>
      {canRestore && (
        <button
          type="submit"
          name="intent"
          value="restaurar"
          onClick={() => setIntent("restaurar")}
          disabled={pending || !confirmed}
          className="btn-primary"
          title={
            confirmed
              ? undefined
              : "Marque a confirmação abaixo para habilitar a restauração."
          }
        >
          {pending && intent === "restaurar" ? "Restaurando..." : "Restaurar na conta"}
        </button>
      )}
    </div>
  );
}

export function ImportForm({
  canRestore,
  existingCounts,
}: {
  /** A conta está vazia? (só então a restauração é oferecida). */
  canRestore: boolean;
  /** Quantidades já existentes na conta — para explicar por que não pode restaurar. */
  existingCounts: {
    shows: number;
    transactions: number;
    contacts: number;
    revenueGoals: number;
  };
}) {
  const [state, formAction] = useFormState(importAccountAction, initial);
  const [confirmed, setConfirmed] = useState(false);

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

        {canRestore ? (
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              Entendo que restaurar vai gravar todos os dados do backup na minha
              conta (que está vazia).
            </span>
          </label>
        ) : (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">
              Sua conta já tem dados — a restauração está desabilitada.
            </p>
            <p className="mt-0.5 text-amber-700">
              Para não sobrescrever nem duplicar sua carteira, a restauração só é
              permitida numa conta vazia (você tem {existingCounts.shows} show(s),{" "}
              {existingCounts.transactions} transação(ões), {existingCounts.contacts}{" "}
              contato(s) e {existingCounts.revenueGoals} meta(s)). A conferência
              abaixo continua disponível.
            </p>
            <p className="mt-1 text-amber-700">
              Quer restaurar mesmo assim?{" "}
              <a
                href="/conta/dados/apagar"
                className="font-medium underline hover:no-underline"
              >
                Apague seus dados
              </a>{" "}
              para esvaziar a conta primeiro (a conta continua ativa).
            </p>
          </div>
        )}

        <ImportButtons canRestore={canRestore} confirmed={confirmed} />
      </form>

      {state.errors && state.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">Não foi possível concluir:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Restauração concluída */}
      {state.restored && (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            <p className="font-medium">✓ Backup restaurado na sua conta.</p>
            <p className="mt-0.5 text-green-700">
              Foram gravados {state.restored.shows} show(s),{" "}
              {state.restored.transactions} transação(ões), {state.restored.contacts}{" "}
              contato(s) e {state.restored.revenueGoals} meta(s) de faturamento.
            </p>
          </div>
          {state.restoreNotes && state.restoreNotes.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-medium">Ajustes aplicados na restauração:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {state.restoreNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Conferência (dry-run) */}
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
            Esta é apenas uma conferência — nada foi gravado na sua conta.
            {canRestore
              ? " Para gravar, marque a confirmação e use “Restaurar na conta”."
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}
