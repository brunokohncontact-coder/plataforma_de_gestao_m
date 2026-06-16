// Constantes de domínio compartilhadas entre validação, lógica e UI.
// Mantidas como `as const` para derivar tipos e validar entradas sem enums do Prisma.

export const SHOW_STATUSES = [
  "proposto",
  "confirmado",
  "realizado",
  "cancelado",
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const TRANSACTION_TYPES = ["receita", "despesa"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_CATEGORIES = [
  "cache",
  "transporte",
  "equipamento",
  "hospedagem",
  "alimentacao",
  "producao",
  "marketing",
  "outro",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const CONTACT_ROLES = [
  "venue",
  "promoter",
  "contratante",
  "produtor",
  "imprensa",
  "outro",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

// Rótulos legíveis em pt-BR para exibição na UI.
export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  proposto: "Proposto",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  cache: "Cachê",
  transporte: "Transporte",
  equipamento: "Equipamento",
  hospedagem: "Hospedagem",
  alimentacao: "Alimentação",
  producao: "Produção",
  marketing: "Marketing",
  outro: "Outro",
};

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  venue: "Local / Venue",
  promoter: "Promoter",
  contratante: "Contratante",
  produtor: "Produtor",
  imprensa: "Imprensa",
  outro: "Outro",
};
