// Esquemas Zod para validar entradas na borda (forms / server actions).
import { z } from "zod";
import {
  SHOW_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  CONTACT_ROLES,
} from "./enums";

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres").max(200),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const showSchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal("")),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  venue: z.string().trim().min(1, "Informe o local").max(160),
  city: z.string().trim().min(1, "Informe a cidade").max(120),
  status: z.enum(SHOW_STATUSES),
  fee: z.coerce.number().min(0, "O cachê não pode ser negativo").default(0),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  category: z.string().trim().min(1, "Informe a categoria").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  amount: z.coerce.number().positive("O valor precisa ser maior que zero"),
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

export type ShowInput = z.infer<typeof showSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
