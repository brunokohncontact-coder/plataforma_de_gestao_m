import {
  SHOW_STATUS_LABELS,
  type ShowStatus,
} from "@/lib/domain/constants";
import { formatBRL } from "@/lib/domain/finance";

const STATUS_STYLES: Record<ShowStatus, string> = {
  proposto: "bg-amber-50 text-amber-700",
  confirmado: "bg-blue-50 text-blue-700",
  realizado: "bg-emerald-50 text-emerald-700",
  cancelado: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status as ShowStatus) in STATUS_STYLES ? (status as ShowStatus) : "proposto";
  return (
    <span className={`badge ${STATUS_STYLES[s]}`}>{SHOW_STATUS_LABELS[s]}</span>
  );
}

export function Money({
  value,
  className = "",
  signed = false,
}: {
  value: number;
  className?: string;
  signed?: boolean;
}) {
  const color = signed
    ? value > 0
      ? "text-emerald-600"
      : value < 0
        ? "text-red-600"
        : ""
    : "";
  return (
    <span className={`tabular-nums ${color} ${className}`}>
      {formatBRL(value)}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
