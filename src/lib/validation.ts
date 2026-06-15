/** Schemas de validação (zod) compartilhados entre server actions e formulários. */
import { z } from "zod";

export const SHOW_STATUSES = ["proposed", "confirmed", "done", "cancelled"] as const;
export const TRANSACTION_TYPES = ["income", "expense"] as const;
export const CONTACT_ROLES = [
  "venue",
  "promoter",
  "booker",
  "producer",
  "press",
  "other",
] as const;

export const signupSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  artistName: z.string().min(1, "Nome artístico é obrigatório").max(120),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const showSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  date: z.string().min(1, "Data é obrigatória"),
  venue: z.string().max(200).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  status: z.enum(SHOW_STATUSES).default("proposed"),
  feeCents: z.number().int().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
  contactId: z.string().optional().nullable(),
});

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amountCents: z.number().int().positive("Valor deve ser positivo"),
  category: z.string().min(1, "Categoria é obrigatória").max(80),
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().max(2000).optional().nullable(),
  received: z.boolean().default(true),
  showId: z.string().optional().nullable(),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(160),
  role: z.enum(CONTACT_ROLES).default("other"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type ShowInput = z.infer<typeof showSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
