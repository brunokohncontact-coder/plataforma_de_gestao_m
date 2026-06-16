/**
 * Schemas de validação (Zod) para as entradas de formulário/server actions.
 * Centralizados para reuso e testes. Convertem strings de FormData nos tipos
 * corretos e aplicam as regras de domínio.
 */

import { z } from "zod";
import {
  showStatusSchema,
  transactionTypeSchema,
  contactRoleSchema,
} from "./enums";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

// --- Auth ---
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
  artistName: optionalString,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

// --- Show (F2) ---
export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título"),
  venue: optionalString,
  city: optionalString,
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  status: showStatusSchema.default("PROPOSED"),
  fee: z.coerce.number().min(0, "O cachê não pode ser negativo").default(0),
  notes: optionalString,
  contactId: optionalString,
});

// --- Transação (F3) ---
export const transactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  category: z.string().trim().min(1, "Informe uma categoria"),
  description: optionalString,
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  settled: z.coerce.boolean().default(true),
  showId: optionalString,
});

// --- Contato (F5) ---
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  role: contactRoleSchema.default("OTHER"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  phone: optionalString,
  company: optionalString,
  notes: optionalString,
});

export type ShowInput = z.infer<typeof showSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Helper para extrair o primeiro erro por campo de um ZodError, no formato
 * { campo: mensagem }, conveniente para exibir em formulários.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
