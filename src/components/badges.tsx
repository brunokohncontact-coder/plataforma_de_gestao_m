import {
  SHOW_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  type ShowStatus,
  type ContactRole,
} from "@/lib/enums";

const statusStyles: Record<ShowStatus, string> = {
  PROPOSED: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PERFORMED: "bg-green-50 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500 line-through",
};

export function ShowStatusBadge({ status }: { status: string }) {
  const s = status as ShowStatus;
  return (
    <span className={`badge ${statusStyles[s] ?? "bg-slate-100 text-slate-600"}`}>
      {SHOW_STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function ContactRoleBadge({ role }: { role: string }) {
  const r = role as ContactRole;
  return (
    <span className="badge bg-brand-50 text-brand-700">
      {CONTACT_ROLE_LABELS[r] ?? role}
    </span>
  );
}
