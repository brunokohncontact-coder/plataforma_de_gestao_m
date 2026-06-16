// Schemas de validação (Zod) reutilizados por API routes/server actions e formulários.
import { z } from "zod";
import { SHOW_STATUSES, TX_TYPES, TX_STATUSES, CONTACT_ROLES } from "./domain";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome ou o da banda").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(160),
  venue: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  status: z.enum(SHOW_STATUSES),
  fee: z.coerce.number().min(0, "O cachê não pode ser negativo"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  contactId: z.string().trim().optional().or(z.literal("")),
});

export const transactionSchema = z.object({
  type: z.enum(TX_TYPES),
  category: z.string().trim().min(1, "Informe uma categoria").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  status: z.enum(TX_STATUSES),
  showId: z.string().trim().optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(160),
  role: z.enum(CONTACT_ROLES),
  email: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ShowInput = z.infer<typeof showSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
