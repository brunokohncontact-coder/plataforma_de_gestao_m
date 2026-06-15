"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import {
  TRANSACTION_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/labels";
import type { TransactionActionState } from "@/app/actions/transactions";

export interface TransactionFormData {
  type: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  status: string;
  showId: string;
}

export interface ShowOption {
  id: string;
  title: string;
}

type Action = (
  state: TransactionActionState,
  formData: FormData
) => Promise<TransactionActionState>;

// Sugestões de categoria comuns para músicos (datalist, não obrigatórias).
const INCOME_CATEGORIES = ["Cachê", "Venda de merch", "Streaming", "Aula", "Patrocínio"];
const EXPENSE_CATEGORIES = ["Transporte", "Hospedagem", "Alimentação", "Equipamento", "Produção", "Marketing", "Taxas"];

export function TransactionForm({
  action,
  initial,
  shows,
  submitLabel,
}: {
  action: Action;
  initial?: Partial<TransactionFormData>;
  shows: ShowOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<TransactionActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">Tipo</label>
          <select id="type" name="type" className="input" defaultValue={initial?.type ?? "INCOME"}>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">Valor (R$) *</label>
          <input id="amount" name="amount" className="input" inputMode="decimal" required defaultValue={initial?.amount} placeholder="0,00" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">Categoria *</label>
          <input id="category" name="category" className="input" required list="categories" defaultValue={initial?.category} placeholder="Ex.: Cachê, Transporte" />
          <datalist id="categories">
            {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="date">Data *</label>
          <input id="date" name="date" type="date" className="input" required defaultValue={initial?.date} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">Situação</label>
          <select id="status" name="status" className="input" defaultValue={initial?.status ?? "SETTLED"}>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="showId">Vincular a um show</label>
          <select id="showId" name="showId" className="input" defaultValue={initial?.showId ?? ""}>
            <option value="">— Nenhum —</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <input id="description" name="description" className="input" defaultValue={initial?.description} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
