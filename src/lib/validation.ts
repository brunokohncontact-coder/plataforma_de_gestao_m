import { z } from "zod";
import { SHOW_STATUSES, CONTACT_ROLES } from "./labels";

export const signupSchema = z.object({
  artistName: z.string().trim().min(1, "Informe o nome artístico").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const showSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(160),
  venue: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  date: z.string().min(1, "Informe a data"),
  status: z.enum(SHOW_STATUSES),
  fee: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.string().min(1, "Informe o valor"),
  category: z.string().trim().min(1, "Informe a categoria").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  date: z.string().min(1, "Informe a data"),
  paid: z.union([z.literal("on"), z.literal("true"), z.literal("")]).optional(),
  showId: z.string().optional().or(z.literal("")),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(160),
  role: z.enum(CONTACT_ROLES),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
