// Schemas de validação (Zod) — fonte única de verdade para entradas de formulário e API.
import { z } from "zod";
import {
  SHOW_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  CONTACT_ROLES,
} from "./constants";

const moneyField = z
  .number({ invalid_type_error: "Informe um valor numérico" })
  .nonnegative("O valor não pode ser negativo")
  .finite("Valor inválido");

export const showInputSchema = z.object({
  title: z.string().trim().min(1, "Informe um título"),
  venue: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  date: z.coerce.date({ invalid_type_error: "Data inválida" }),
  status: z.enum(SHOW_STATUSES).default("proposto"),
  feeAgreed: moneyField.default(0),
  notes: z.string().trim().optional().or(z.literal("")),
});
export type ShowInput = z.infer<typeof showInputSchema>;

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: moneyField.refine((v) => v > 0, "O valor deve ser maior que zero"),
  category: z.enum(TRANSACTION_CATEGORIES).default("outro"),
  description: z.string().trim().optional().or(z.literal("")),
  date: z.coerce.date({ invalid_type_error: "Data inválida" }),
  received: z.boolean().default(true),
  showId: z.string().trim().optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  role: z.enum(CONTACT_ROLES).default("outro"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
  artistName: z.string().trim().optional().or(z.literal("")),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;
