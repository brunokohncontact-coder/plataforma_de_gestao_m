"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { importAccountAction, type ImportState } from "./actions";
import {
  RESET_CONFIRMATION_PHRASE,
  matchesResetConfirmation,
} from "@/lib/accountReset";

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
 * Os botões do formulário. Vivem dentro do `<form>` para ler o `pending`
 * compartilhado via `useFormStatus`; o `intent` clicado é lembrado no clique
 * para rotular só o botão ativo enquanto envia. Numa conta vazia oferecemos
 * "Restaurar na conta"; numa conta com dados, "Substituir tudo pelo backup".
 */
function ImportButtons({
  canRestore,
  confirmed,
  replaceConfirmed,
}: {
  canRestore: boolean;
  confirmed: boolean;
  replaceConfirmed: boolean;
}) {
  const { pending } = useFormStatus();
  const [intent, setIntent] = useState<
    "conferir" | "restaurar" | "substituir" | null
  >(null);

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
      {canRestore ? (
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
      ) : (
        <button
          type="submit"
          name="intent"
          value="substituir"
          onClick={() => setIntent("substituir")}
          disabled={pending || !replaceConfirmed}
          className="btn-danger"
          title={
            replaceConfirmed
              ? undefined
              : `Digite “${RESET_CONFIRMATION_PHRASE}” para habilitar a substituição.`
          }
        >
          {pending && intent === "substituir"
            ? "Substituindo..."
            : "Substituir tudo pelo backup"}
        </button>
      )}
    </div>
  );
}

export function ImportForm({
  canRestore,
  existingCounts,
}: {
  /** A conta está vazia? (só então a restauração simples é oferecida). */
  canRestore: boolean;
  /** Quantidades já existentes na conta — para explicar a substituição. */
  existingCounts: {
    shows: number;
    transactions: number;
    contacts: number;
    revenueGoals: number;
  };
}) {
  const [state, formAction] = useFormState(importAccountAction, initial);
  const [confirmed, setConfirmed] = useState(false);
  const [replacePhrase, setReplacePhrase] = useState("");
  const replaceConfirmed = matchesResetConfirmation(replacePhrase);

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
          <div className="space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-medium">
              Sua conta já tem dados — restaurar exige substituir a carteira atual.
            </p>
            <p className="text-amber-700">
              Você tem {existingCounts.shows} show(s),{" "}
              {existingCounts.transactions} transação(ões), {existingCounts.contacts}{" "}
              contato(s) e {existingCounts.revenueGoals} meta(s). “Substituir tudo
              pelo backup” <strong>apaga</strong> esses dados e grava o backup no
              lugar, tudo de uma vez — é <strong>irreversível</strong> e não faz
              merge com o que já existe. O perfil (nome artístico, alíquota) e o
              login são preservados.
            </p>
            <div>
              <label className="label" htmlFor="confirmacao">
                Para confirmar, digite{" "}
                <code className="font-semibold">{RESET_CONFIRMATION_PHRASE}</code>
              </label>
              <input
                className="input"
                id="confirmacao"
                name="confirmacao"
                type="text"
                autoComplete="off"
                placeholder={RESET_CONFIRMATION_PHRASE}
                value={replacePhrase}
                onChange={(e) => setReplacePhrase(e.target.value)}
              />
            </div>
            <p className="text-xs text-amber-700">
              Prefere só esvaziar a conta?{" "}
              <a
                href="/conta/dados/apagar"
                className="font-medium underline hover:no-underline"
              >
                Apague seus dados
              </a>{" "}
              sem restaurar nada. A conferência abaixo continua disponível.
            </p>
          </div>
        )}

        <ImportButtons
          canRestore={canRestore}
          confirmed={confirmed}
          replaceConfirmed={replaceConfirmed}
        />
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

      {/* Restauração/substituição concluída */}
      {state.restored && (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            <p className="font-medium">
              {state.deletedBeforeRestore
                ? "✓ Carteira substituída pelo backup."
                : "✓ Backup restaurado na sua conta."}
            </p>
            {state.deletedBeforeRestore && (
              <p className="mt-0.5 text-green-700">
                Antes da restauração foram apagados{" "}
                {state.deletedBeforeRestore.shows} show(s),{" "}
                {state.deletedBeforeRestore.transactions} transação(ões),{" "}
                {state.deletedBeforeRestore.contacts} contato(s) e{" "}
                {state.deletedBeforeRestore.revenueGoals} meta(s).
              </p>
            )}
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
              : " Para gravar, digite a frase de confirmação e use “Substituir tudo pelo backup”."}
          </p>
        </div>
      )}
    </div>
  );
}
