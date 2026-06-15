/** Rótulos e cores de exibição para enums do domínio (pt-BR). */

export const SHOW_STATUS_LABEL: Record<string, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  DONE: "Realizado",
  CANCELLED: "Cancelado",
};

export const SHOW_STATUS_BADGE: Record<string, string> = {
  PROPOSED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  DONE: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-600",
};

export const SHOW_STATUSES = ["PROPOSED", "CONFIRMED", "DONE", "CANCELLED"] as const;

export const CONTACT_ROLE_LABEL: Record<string, string> = {
  VENUE: "Casa de shows",
  PROMOTER: "Produtor/Promoter",
  BOOKER: "Contratante",
  PRODUCER: "Produtor musical",
  PRESS: "Imprensa",
  OTHER: "Outro",
};

export const CONTACT_ROLES = ["VENUE", "PROMOTER", "BOOKER", "PRODUCER", "PRESS", "OTHER"] as const;

export const TX_TYPE_LABEL: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

/** Categorias sugeridas (não exaustivo; o usuário pode digitar livremente). */
export const INCOME_CATEGORIES = ["Cachê", "Aulas", "Streaming", "Merchandising", "Outro"];
export const EXPENSE_CATEGORIES = [
  "Transporte",
  "Hospedagem",
  "Alimentação",
  "Equipamento",
  "Estúdio",
  "Marketing",
  "Software",
  "Banda/Músicos",
  "Outro",
];
