// Constantes de domínio e rótulos (pt-BR). Como o SQLite não suporta enums
// nativos, estes valores são a fonte da verdade para os campos String do Prisma.

export const SHOW_STATUSES = ["PROPOSED", "CONFIRMED", "PLAYED", "CANCELLED"] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  PLAYED: "Realizado",
  CANCELLED: "Cancelado",
};

export const SHOW_STATUS_COLORS: Record<ShowStatus, string> = {
  PROPOSED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PLAYED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-gray-200 text-gray-600",
};

// Cor sólida (fundo) para o "pílula"/ponto de status no calendário.
export const SHOW_STATUS_DOT: Record<ShowStatus, string> = {
  PROPOSED: "bg-amber-500",
  CONFIRMED: "bg-emerald-500",
  PLAYED: "bg-blue-500",
  CANCELLED: "bg-gray-400",
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
  PROMOTER: "Produtor/Promoter",
  BOOKER: "Contratante",
  PRODUCER: "Produtor musical",
  PRESS: "Imprensa",
  OTHER: "Outro",
};

// Categorias sugeridas de transação (o usuário pode digitar livremente).
export const SUGGESTED_INCOME_CATEGORIES = [
  "Cachê",
  "Merch",
  "Streaming",
  "Aula",
  "Patrocínio",
  "Outros",
];

export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Transporte",
  "Equipamento",
  "Hospedagem",
  "Alimentação",
  "Marketing",
  "Músicos de apoio",
  "Estúdio",
  "Outros",
];
