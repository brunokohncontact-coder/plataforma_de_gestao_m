"use client";

import { useState } from "react";

export interface TxFormValues {
  type: string;
  amount: string;
  category: string;
  date: string; // yyyy-MM-dd
  description: string;
  received: boolean;
  showId: string;
}

interface Props {
  action: (formData: FormData) => void;
  initial?: Partial<TxFormValues>;
  shows: { id: string; title: string }[];
  submitLabel: string;
}

export default function TransactionForm({ action, initial, shows, submitLabel }: Props) {
  const [type, setType] = useState(initial?.type ?? "expense");

  return (
    <form action={action} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">Tipo *</label>
          <select
            id="type"
            name="type"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">Valor (R$) *</label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            className="input"
            required
            defaultValue={initial?.amount ?? ""}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">Categoria *</label>
          <input
            id="category"
            name="category"
            className="input"
            required
            defaultValue={initial?.category ?? ""}
            placeholder={type === "income" ? "cachê, merch, royalties…" : "transporte, equipamento…"}
            list="cat-suggestions"
          />
          <datalist id="cat-suggestions">
            {(type === "income"
              ? ["Cachê", "Merch", "Royalties", "Streaming", "Aula", "Outro"]
              : ["Transporte", "Equipamento", "Hospedagem", "Alimentação", "Marketing", "Estúdio", "Outro"]
            ).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="date">Data *</label>
          <input
            id="date"
            name="date"
            type="date"
            className="input"
            required
            defaultValue={initial?.date ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="showId">Vincular a um show</label>
        <select id="showId" name="showId" className="input" defaultValue={initial?.showId ?? ""}>
          <option value="">— nenhum —</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Vincular despesas/receitas a um show alimenta o cálculo de rentabilidade.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <input id="description" name="description" className="input" defaultValue={initial?.description ?? ""} />
      </div>

      {type === "income" && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="received"
            defaultChecked={initial?.received ?? true}
            className="h-4 w-4 rounded border-slate-300"
          />
          Já recebido (desmarque para &ldquo;a receber&rdquo;)
        </label>
      )}

      <button type="submit" className="btn-primary">{submitLabel}</button>
    </form>
  );
}
