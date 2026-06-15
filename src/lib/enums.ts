// Constantes de domínio e validação. Como o SQLite não suporta enums do Prisma,
// centralizamos os valores aceitos aqui e validamos com Zod na borda da aplicação.

export const SHOW_STATUSES = [
  "proposto",
  "confirmado",
  "realizado",
  "cancelado",
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  proposto: "Proposto",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};

// Status de uma transação. Para receita: recebida/pendente; despesa: paga/pendente.
export const TRANSACTION_STATUSES = ["received", "paid", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  received: "Recebida",
  paid: "Paga",
  pending: "Pendente",
};

export const CONTACT_ROLES = [
  "venue",
  "promoter",
  "contratante",
  "produtor",
  "imprensa",
  "outro",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  venue: "Casa de shows",
  promoter: "Produtor(a) de eventos",
  contratante: "Contratante",
  produtor: "Produtor(a) musical",
  imprensa: "Imprensa",
  outro: "Outro",
};

// Categorias sugeridas (não obrigatórias) para transações.
export const SUGGESTED_INCOME_CATEGORIES = [
  "Cachê",
  "Venda de merch",
  "Streaming/Royalties",
  "Aula",
  "Patrocínio",
  "Outro",
];

export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Transporte",
  "Hospedagem",
  "Alimentação",
  "Equipamento",
  "Produção",
  "Marketing",
  "Taxas/Comissões",
  "Outro",
];
