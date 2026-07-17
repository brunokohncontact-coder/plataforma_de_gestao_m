"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  RESET_CONFIRMATION_PHRASE,
  matchesResetConfirmation,
} from "@/lib/accountReset";
import { resetAccountDataAction, type ResetState } from "./actions";

const initial: ResetState = {};

function ResetButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !enabled}
      className="btn-danger"
      title={
        enabled
          ? undefined
          : "Digite a frase de confirmação exatamente para habilitar."
      }
    >
      {pending ? "Apagando..." : "Apagar todos os meus dados"}
    </button>
  );
}

export function ResetForm({
  existingCounts,
}: {
  existingCounts: {
    shows: number;
    transactions: number;
    contacts: number;
    revenueGoals: number;
  };
}) {
  const [state, formAction] = useFormState(resetAccountDataAction, initial);
  const [confirmacao, setConfirmacao] = useState("");
  const matches = matchesResetConfirmation(confirmacao);

  const total =
    existingCounts.shows +
    existingCounts.transactions +
    existingCounts.contacts +
    existingCounts.revenueGoals;

  // Depois de apagar, a UI já reflete a conta vazia (o componente foi revalidado);
  // ainda assim mostramos a confirmação do que foi removido.
  if (state.deleted) {
    return (
      <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        <p className="font-medium">✓ Seus dados foram apagados.</p>
        <p className="mt-0.5 text-green-700">
          Foram removidos {state.deleted.shows} show(s),{" "}
          {state.deleted.transactions} transação(ões), {state.deleted.contacts}{" "}
          contato(s) e {state.deleted.revenueGoals} meta(s). Sua conta continua
          ativa e agora está vazia — você já pode restaurar um backup, se quiser.
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
        Sua conta já está vazia — não há dados para apagar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        <p className="font-medium">Esta ação é irreversível.</p>
        <p className="mt-0.5 text-red-700">
          Vamos apagar {existingCounts.shows} show(s),{" "}
          {existingCounts.transactions} transação(ões), {existingCounts.contacts}{" "}
          contato(s) e {existingCounts.revenueGoals} meta(s) de faturamento. Sua
          conta (nome, e-mail e senha) continua ativa. Se quiser guardar uma
          cópia antes, baixe o backup na página da Conta.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
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
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder={RESET_CONFIRMATION_PHRASE}
          />
        </div>

        <ResetButton enabled={matches} />
      </form>

      {state.errors && state.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <ul className="list-disc space-y-0.5 pl-5">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
