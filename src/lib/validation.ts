// Schemas de validação (Zod). Como SQLite/Prisma não tem enums, validamos aqui as
// strings de status/tipo/papel e os formatos de entrada dos formulários.
import { z } from "zod";
import { SHOW_STATUSES, TRANSACTION_TYPES, CONTACT_ROLES } from "./domain/enums";

// ---- Auth ----
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

// ---- Helpers ----
const optionalString = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : null));

// Aceita "1.234,56" (BR) ou "1234.56"; retorna número >= 0.
const moneyField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\./g, "").replace(",", "."))
  .pipe(z.coerce.number().min(0, "Valor inválido"))
  .or(z.coerce.number().min(0));

const dateField = z.coerce.date({ invalid_type_error: "Data inválida" });

// ---- Show (F2) ----
export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  venue: optionalString,
  city: optionalString,
  date: dateField,
  status: z.enum(SHOW_STATUSES),
  fee: moneyField.default(0),
  feePaid: z.coerce.boolean().default(false),
  notes: optionalString,
  contactId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});
export type ShowInput = z.infer<typeof showSchema>;

// ---- Transaction (F3) ----
export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: moneyField,
  category: z.string().trim().min(1, "Informe uma categoria").max(120),
  date: dateField,
  received: z.coerce.boolean().default(true),
  note: optionalString,
  showId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

// ---- Contact (F5) ----
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(160),
  role: z.enum(CONTACT_ROLES).default("OTHER"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  phone: optionalString,
  notes: optionalString,
});
export type ContactInput = z.infer<typeof contactSchema>;
