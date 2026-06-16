// Schemas de validação (Zod) para a borda da aplicação (forms / API).
// Os valores de "enum" são validados aqui, já que o SQLite os armazena como String.
import { z } from "zod";
import {
  SHOW_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  CONTACT_ROLES,
} from "./domain";

export const showInputSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  venue: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  date: z.coerce.date(),
  status: z.enum(SHOW_STATUSES).default("proposed"),
  feeCents: z.number().int().min(0).default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
  contactId: z.string().optional().nullable(),
});
export type ShowInput = z.infer<typeof showInputSchema>;

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  category: z.string().trim().min(1, "Categoria obrigatória").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  amountCents: z.number().int().min(0),
  date: z.coerce.date(),
  status: z.enum(TRANSACTION_STATUSES).default("received"),
  showId: z.string().optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  role: z.enum(CONTACT_ROLES).default("other"),
  email: z.string().trim().email("E-mail inválido").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;
