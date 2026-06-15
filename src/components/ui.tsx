// Componentes de UI reutilizáveis (inputs, botões, badges) com estilo Tailwind.
"use client";

import { useFormStatus } from "react-dom";

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export const labelClass = "block text-sm font-medium text-slate-700";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function SubmitButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 ${className}`}
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}
