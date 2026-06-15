import { z } from "zod";
import { SHOW_STATUSES, TRANSACTION_TYPES, CONTACT_ROLES } from "./enums";
import { toCents } from "./money";

// Aceita string monetária (pt-BR ou ponto) ou número e converte para centavos.
const moneyToCents = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    try {
      const cents = toCents(v);
      if (cents < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor não pode ser negativo" });
        return z.NEVER;
      }
      return cents;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor monetário inválido" });
      return z.NEVER;
    }
  });

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// --- Auth ---
export const signupSchema = z.object({
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
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  venue: optionalString,
  city: optionalString,
  status: z.enum(SHOW_STATUSES).default("PROPOSED"),
  feeCents: moneyToCents.default(0),
  notes: optionalString,
});

// --- Transaction (F3) ---
export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amountCents: moneyToCents,
  category: z.string().trim().min(1, "Informe a categoria"),
  description: optionalString,
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  settled: z.coerce.boolean().default(true),
  showId: optionalString,
});

// --- Contact (F5) ---
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  role: z.enum(CONTACT_ROLES).default("OTHER"),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido")]).optional(),
  phone: optionalString,
  notes: optionalString,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ShowInput = z.infer<typeof showSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
