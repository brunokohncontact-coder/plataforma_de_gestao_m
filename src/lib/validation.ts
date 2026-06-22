// Schemas de validação (Zod) para os formulários/server actions.
import { z } from "zod";
import {
  SHOW_STATUSES,
  TRANSACTION_TYPES,
  CONTACT_ROLES,
} from "./domain";

// Converte uma string de valor monetário em reais ("1.234,56" ou "1234.56")
// para centavos inteiros. Aceita vírgula ou ponto como separador decimal.
export function parseMoneyToCents(input: string): number {
  const cleaned = input.trim().replace(/\s/g, "").replace(/r\$/i, "");
  // remove separadores de milhar, normaliza decimal para ponto
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    // formato pt-BR: ponto = milhar, vírgula = decimal
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

const moneyField = z
  .string()
  .transform((v) => parseMoneyToCents(v))
  .refine((n) => Number.isFinite(n) && n >= 0, {
    message: "Valor inválido",
  });

const optionalMoneyField = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? parseMoneyToCents(v) : 0))
  .refine((n) => Number.isFinite(n) && n >= 0, { message: "Valor inválido" });

// ── Auth ────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  artistName: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

// ── Conta (perfil + senha) ───────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  artistName: z.string().trim().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "A confirmação não corresponde à nova senha",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "A nova senha deve ser diferente da atual",
    path: ["newPassword"],
  });

// ── Meta de faturamento anual ────────────────────────────────────────────────
export const revenueGoalSchema = z.object({
  year: z.coerce
    .number()
    .int("Ano inválido")
    .min(1970, "Ano inválido")
    .max(2999, "Ano inválido"),
  // O valor chega como string mascarada (MoneyInput) — reusa o parser monetário.
  amount: moneyField.refine((n) => n > 0, { message: "Informe uma meta maior que zero" }),
});

// ── Show ──────────────────────────────────────────────────────────────────
export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título"),
  date: z.string().min(1, "Informe a data"), // datetime-local string
  venue: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: z.enum(SHOW_STATUSES),
  fee: optionalMoneyField,
  notes: z.string().trim().optional(),
});

// ── Transaction ─────────────────────────────────────────────────────────────
export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  description: z.string().trim().min(1, "Informe uma descrição"),
  category: z.string().trim().min(1, "Informe uma categoria"),
  amount: moneyField,
  date: z.string().min(1, "Informe a data"),
  received: z.coerce.boolean(),
  showId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

// ── Contact ───────────────────────────────────────────────────────────────
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  role: z.enum(CONTACT_ROLES),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-mail inválido",
    }),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
