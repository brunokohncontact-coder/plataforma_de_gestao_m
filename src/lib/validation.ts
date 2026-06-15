// Schemas de validação (zod) compartilhados entre server actions e formulários.
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  artistName: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

const showStatus = z.enum(["PROPOSED", "CONFIRMED", "PLAYED", "CANCELLED"]);
const settlement = z.enum(["PENDING", "SETTLED"]);

// Coerção tolerante para valores vindos de FormData (strings).
const money = z.coerce.number().min(0, "Valor não pode ser negativo");

export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do show"),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  venue: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: showStatus.default("PROPOSED"),
  fee: money.default(0),
  feeStatus: settlement.default("PENDING"),
  notes: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
});

export type ShowInput = z.infer<typeof showSchema>;

const txType = z.enum(["INCOME", "EXPENSE"]);

export const transactionSchema = z.object({
  type: txType,
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  category: z.string().trim().min(1, "Informe a categoria"),
  description: z.string().trim().optional(),
  date: z.coerce.date({ errorMap: () => ({ message: "Data inválida" }) }),
  status: settlement.default("PENDING"),
  showId: z.string().trim().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

const contactRole = z.enum([
  "VENUE",
  "PROMOTER",
  "BOOKER",
  "PRODUCER",
  "PRESS",
  "OTHER",
]);

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  role: contactRole.default("OTHER"),
  email: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
