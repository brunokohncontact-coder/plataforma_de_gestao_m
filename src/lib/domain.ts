// Constantes e tipos de domínio compartilhados entre lógica de negócio e UI.
// SQLite não tem enum nativo, então centralizamos os valores válidos aqui.

export const SHOW_STATUSES = ["proposed", "confirmed", "done", "canceled"] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  proposed: "Proposto",
  confirmed: "Confirmado",
  done: "Realizado",
  canceled: "Cancelado",
};

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};

// Categorias sugeridas (livres, mas guiamos o usuário com estas).
export const INCOME_CATEGORIES = ["Cachê", "Venda de merch", "Streaming", "Aula", "Outros"] as const;
export const EXPENSE_CATEGORIES = [
  "Transporte",
  "Hospedagem",
  "Alimentação",
  "Equipamento",
  "Produção",
  "Marketing",
  "Taxas/Comissão",
  "Outros",
] as const;

export const CONTACT_ROLES = [
  "venue",
  "promoter",
  "booker",
  "producer",
  "press",
  "other",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  venue: "Casa de show",
  promoter: "Produtor de eventos",
  booker: "Contratante / Booking",
  producer: "Produtor musical",
  press: "Imprensa",
  other: "Outro",
};

export function isShowStatus(value: string): value is ShowStatus {
  return (SHOW_STATUSES as readonly string[]).includes(value);
}

export function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export function isContactRole(value: string): value is ContactRole {
  return (CONTACT_ROLES as readonly string[]).includes(value);
}
