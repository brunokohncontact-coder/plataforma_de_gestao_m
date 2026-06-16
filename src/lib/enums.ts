/**
 * Enums de domínio. Como o SQLite (Prisma) não suporta enums nativos, os campos
 * são `String` no banco e a validação acontece aqui, na aplicação, via Zod.
 * Em produção (Postgres) poderiam virar enums reais sem mudar a aplicação.
 */

import { z } from "zod";

export const SHOW_STATUSES = [
  "PROPOSED",
  "CONFIRMED",
  "DONE",
  "CANCELED",
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];
export const showStatusSchema = z.enum(SHOW_STATUSES);

export const SHOW_STATUS_LABELS: Record<ShowStatus, string> = {
  PROPOSED: "Proposto",
  CONFIRMED: "Confirmado",
  DONE: "Realizado",
  CANCELED: "Cancelado",
};

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

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
export const contactRoleSchema = z.enum(CONTACT_ROLES);

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  VENUE: "Casa de show",
  PROMOTER: "Produtor de eventos",
  BOOKER: "Contratante / booking",
  PRODUCER: "Produtor musical",
  PRESS: "Imprensa",
  OTHER: "Outro",
};
