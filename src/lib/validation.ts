import { z } from "zod";

// Schemas de validação compartilhados (server actions). Mensagens em pt-BR.

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const showStatusEnum = z.enum([
  "PROPOSED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELED",
]);

export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título."),
  date: z.string().min(1, "Informe a data.").refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida."),
  venue: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: showStatusEnum,
  fee: z.string().optional(),
  notes: z.string().trim().optional(),
  contactIds: z.array(z.string()).optional(),
});

export const transactionTypeEnum = z.enum(["INCOME", "EXPENSE"]);
export const paymentStatusEnum = z.enum(["PENDING", "SETTLED"]);

export const transactionSchema = z.object({
  type: transactionTypeEnum,
  amount: z.string().min(1, "Informe o valor."),
  category: z.string().trim().min(1, "Informe a categoria."),
  description: z.string().trim().optional(),
  date: z.string().min(1, "Informe a data.").refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida."),
  status: paymentStatusEnum,
  showId: z.string().optional(),
});

export const contactRoleEnum = z.enum([
  "VENUE",
  "PROMOTER",
  "BOOKER",
  "PRODUCER",
  "PRESS",
  "OTHER",
]);

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  role: contactRoleEnum,
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
