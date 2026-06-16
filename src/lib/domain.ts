/**
 * Tipos de domínio, uniões de valores e validação (Zod).
 *
 * SQLite não tem enums; aqui centralizamos os valores permitidos para status,
 * tipos e categorias, além dos helpers de dinheiro (tudo em centavos).
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Uniões de domínio
// ---------------------------------------------------------------------------

export const SHOW_STATUSES = [
  "proposto",
  "confirmado",
  "realizado",
  "cancelado",
] as const;
export type ShowStatus = (typeof SHOW_STATUSES)[number];

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["received", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const CONTACT_ROLES = [
  "venue",
  "promoter",
  "contratante",
  "produtor",
  "imprensa",
  "outro",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

// ---------------------------------------------------------------------------
// Dinheiro — sempre em centavos (inteiro) internamente
// ---------------------------------------------------------------------------

/** Converte um valor em reais (ex.: 1234.56) para centavos inteiros (123456). */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("Valor monetário inválido");
  }
  return Math.round(amount * 100);
}

/** Converte centavos para reais (número decimal). */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Formata centavos como moeda. Default: pt-BR / BRL.
 */
export function formatMoney(
  cents: number,
  { locale = "pt-BR", currency = "BRL" }: { locale?: string; currency?: string } = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(fromCents(cents));
}

// ---------------------------------------------------------------------------
// Schemas de validação (Zod) — usados por API/forms na Fase 1+
// ---------------------------------------------------------------------------

const moneyCents = z
  .number()
  .int("Valor deve estar em centavos (inteiro)")
  .nonnegative("Valor não pode ser negativo");

export const showInputSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200),
  date: z.coerce.date(),
  venue: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  status: z.enum(SHOW_STATUSES).default("proposto"),
  feeCents: moneyCents.default(0),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type ShowInput = z.infer<typeof showInputSchema>;

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  category: z.string().trim().min(1, "Categoria é obrigatória").max(80),
  amountCents: moneyCents.refine((v) => v > 0, "Valor deve ser maior que zero"),
  date: z.coerce.date(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(TRANSACTION_STATUSES).default("received"),
  showId: z.string().cuid().optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(160),
  role: z.enum(CONTACT_ROLES).default("outro"),
  email: z.string().trim().email("E-mail inválido").optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;
