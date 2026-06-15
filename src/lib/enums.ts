// Enumerações de domínio. Como o SQLite não suporta `enum` no Prisma,
// armazenamos strings e centralizamos os valores válidos aqui.

export const SHOW_STATUSES = [
  "PROPOSED",
  "CONFIRMED",
  "PERFORMED",
  "CANCELLED",
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  PERFORMED: "Realizado",
  CANCELLED: "Cancelado",
};

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
};

export const CONTACT_ROLES = [
  "VENUE",
  "PROMOTER",
  "BOOKER",
  "PRODUCER",
  "PRESS",
  "OTHER",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  VENUE: "Casa de show",
  PROMOTER: "Produtor de eventos",
  BOOKER: "Contratante",
  PRODUCER: "Produtor musical",
  PRESS: "Imprensa",
  OTHER: "Outro",
};

// Categorias sugeridas para transações (o usuário pode digitar livremente).
export const SUGGESTED_INCOME_CATEGORIES = [
  "Cachê",
  "Venda de merch",
  "Streaming/Royalties",
  "Aula",
  "Outro",
];

export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Transporte",
  "Hospedagem",
  "Alimentação",
  "Equipamento",
  "Marketing",
  "Equipe/Músicos",
  "Outro",
];
