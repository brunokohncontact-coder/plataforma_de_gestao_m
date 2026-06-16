// Tipos e constantes do domínio de negócio do Palco.
// Mantidos independentes do framework e do ORM para facilitar testes da lógica.

export const SHOW_STATUSES = [
  "proposed",
  "confirmed",
  "done",
  "cancelled",
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["received", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const CONTACT_ROLES = [
  "venue",
  "promoter",
  "booker",
  "producer",
  "press",
  "other",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

// Representações "leves" usadas pela lógica de cálculo. As entidades do Prisma
// são compatíveis estruturalmente com estes tipos.
export interface ShowLike {
  id: string;
  date: Date;
  status: ShowStatus | string;
  feeCents: number;
}

export interface TransactionLike {
  id: string;
  type: TransactionType | string;
  category: string;
  amountCents: number;
  date: Date;
  status: TransactionStatus | string;
  showId?: string | null;
}

// Rótulos legíveis (pt-BR) para a UI.
export const SHOW_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposto",
  confirmed: "Confirmado",
  done: "Realizado",
  cancelled: "Cancelado",
};

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  venue: "Casa de show",
  promoter: "Produtor(a) de evento",
  booker: "Contratante / booker",
  producer: "Produtor(a) musical",
  press: "Imprensa",
  other: "Outro",
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  received: "Recebido",
  pending: "Pendente",
};
