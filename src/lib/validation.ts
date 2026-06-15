// Schemas Zod para validação de entrada nos server actions.
import { z } from "zod";
import {
  SHOW_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  CONTACT_ROLES,
} from "./domain";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome ou o da banda").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  venue: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(SHOW_STATUSES),
  feeAgreed: z.coerce.number().min(0, "O cachê não pode ser negativo").default(0),
  contactId: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  category: z.string().trim().min(1, "Informe a categoria").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  status: z.enum(TRANSACTION_STATUSES),
  showId: z.string().trim().optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(160),
  role: z.enum(CONTACT_ROLES),
  email: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ShowInputData = z.infer<typeof showSchema>;
export type TransactionInputData = z.infer<typeof transactionSchema>;
export type ContactInputData = z.infer<typeof contactSchema>;
