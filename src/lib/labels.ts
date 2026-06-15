// Rótulos legíveis (pt-BR) para os enums do domínio.

export const SHOW_STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  PLAYED: "Realizado",
  CANCELLED: "Cancelado",
};

export const SHOW_STATUS_OPTIONS = Object.entries(SHOW_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const SETTLEMENT_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  SETTLED: "Liquidado",
};

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  VENUE: "Casa de show",
  PROMOTER: "Promoter",
  BOOKER: "Contratante",
  PRODUCER: "Produtor",
  PRESS: "Imprensa",
  OTHER: "Outro",
};

export const CONTACT_ROLE_OPTIONS = Object.entries(CONTACT_ROLE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const TX_TYPE_LABELS: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

/** Cor de badge (classes Tailwind) por status de show. */
export const SHOW_STATUS_BADGE: Record<string, string> = {
  PROPOSED: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PLAYED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};
