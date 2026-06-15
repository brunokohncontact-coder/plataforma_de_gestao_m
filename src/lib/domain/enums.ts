// Enums do domínio. SQLite não suporta enums no Prisma, então definimos aqui e
// validamos com Zod. Cada um traz um rótulo em PT-BR para a UI.

export const SHOW_STATUSES = ["PROPOSED", "CONFIRMED", "COMPLETED", "CANCELED"] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  COMPLETED: "Realizado",
  CANCELED: "Cancelado",
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

// Categorias sugeridas (não obrigatórias) para acelerar o lançamento financeiro.
export const SUGGESTED_INCOME_CATEGORIES = [
  "Cachê",
  "Venda de merch",
  "Streaming/Direitos",
  "Aula",
  "Outro",
];

export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Transporte",
  "Hospedagem",
  "Alimentação",
  "Equipamento",
  "Marketing",
  "Músicos/Equipe",
  "Estúdio",
  "Taxas/Impostos",
  "Outro",
];
