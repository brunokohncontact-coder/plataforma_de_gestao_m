// Tipos e constantes de domínio compartilhados (validação dos "enums" em String).
// Fonte única da verdade para valores permitidos e seus rótulos em PT-BR.

export const SHOW_STATUSES = ["proposed", "confirmed", "done", "cancelled"] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  proposed: "Proposto",
  confirmed: "Confirmado",
  done: "Realizado",
  cancelled: "Cancelado",
};

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const TRANSACTION_STATUSES = ["received", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  received: "Recebido/Pago",
  pending: "Pendente",
};

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
  venue: "Casa de show / Venue",
  promoter: "Produtor de evento",
  booker: "Contratante / Booker",
  producer: "Produtor musical",
  press: "Imprensa",
  other: "Outro",
};

export function isShowStatus(v: string): v is ShowStatus {
  return (SHOW_STATUSES as readonly string[]).includes(v);
}
export function isTransactionType(v: string): v is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(v);
}
export function isTransactionStatus(v: string): v is TransactionStatus {
  return (TRANSACTION_STATUSES as readonly string[]).includes(v);
}
export function isContactRole(v: string): v is ContactRole {
  return (CONTACT_ROLES as readonly string[]).includes(v);
}
