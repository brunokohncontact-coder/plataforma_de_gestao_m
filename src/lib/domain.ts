// Tipos e constantes de domínio compartilhados (UI, API e lógica de negócio).
// Mantidos desacoplados do Prisma para que a lógica de negócio seja testável de forma pura.

export const SHOW_STATUSES = ["proposed", "confirmed", "done", "cancelled"] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  proposed: "Proposto",
  confirmed: "Confirmado",
  done: "Realizado",
  cancelled: "Cancelado",
};

export const TX_TYPES = ["income", "expense"] as const;
export type TxType = (typeof TX_TYPES)[number];

export const TX_TYPE_LABELS: Record<TxType, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const TX_STATUSES = ["received", "pending"] as const;
export type TxStatus = (typeof TX_STATUSES)[number];

export const TX_STATUS_LABELS: Record<TxStatus, string> = {
  received: "Recebido / Pago",
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
  venue: "Casa / Local",
  promoter: "Produtor / Promoter",
  booker: "Contratante / Booker",
  producer: "Produtor musical",
  press: "Imprensa",
  other: "Outro",
};

// Categorias sugeridas (o usuário pode digitar livremente; estas servem de atalho na UI).
export const SUGGESTED_INCOME_CATEGORIES = [
  "Cachê",
  "Venda de merch",
  "Streaming / Royalties",
  "Aula / Workshop",
  "Outro",
];

export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Transporte",
  "Hospedagem",
  "Equipamento",
  "Produção",
  "Marketing",
  "Equipe / Músicos",
  "Alimentação",
  "Outro",
];
