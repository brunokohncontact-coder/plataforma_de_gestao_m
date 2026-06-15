import { SHOW_STATUS_LABELS, type ShowStatus } from "@/lib/domain/enums";

const STYLES: Record<ShowStatus, string> = {
  PROPOSED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status in STYLES ? status : "PROPOSED") as ShowStatus;
  return <span className={`badge ${STYLES[s]}`}>{SHOW_STATUS_LABELS[s]}</span>;
}
