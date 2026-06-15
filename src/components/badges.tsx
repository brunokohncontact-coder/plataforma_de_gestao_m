import {
  SHOW_STATUS_LABELS,
  TRANSACTION_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  type ShowStatus,
  type TransactionStatus,
  type ContactRole,
} from "@/lib/enums";

const SHOW_STATUS_STYLES: Record<ShowStatus, string> = {
  proposto: "bg-amber-100 text-amber-800",
  confirmado: "bg-blue-100 text-blue-800",
  realizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-slate-200 text-slate-600",
};

export function ShowStatusBadge({ status }: { status: string }) {
  const s = (status as ShowStatus) in SHOW_STATUS_STYLES ? (status as ShowStatus) : "proposto";
  return <span className={`badge ${SHOW_STATUS_STYLES[s]}`}>{SHOW_STATUS_LABELS[s]}</span>;
}

export function TxStatusBadge({ status }: { status: string }) {
  const s = status as TransactionStatus;
  const style =
    s === "received" || s === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";
  const label = TRANSACTION_STATUS_LABELS[s] ?? "Pendente";
  return <span className={`badge ${style}`}>{label}</span>;
}

export function ContactRoleBadge({ role }: { role: string }) {
  const label = CONTACT_ROLE_LABELS[role as ContactRole] ?? role;
  return <span className="badge bg-brand-50 text-brand-700">{label}</span>;
}
