"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  isResetTokenUsable,
  resetRequestWindowStart,
  isPasswordResetRateLimited,
} from "@/lib/passwordReset";

export interface AuthState {
  error?: string;
  /** Mensagem de sucesso (fluxos que não redirecionam, ex.: pedir o link). */
  success?: string;
  /** Só em desenvolvimento: o link de redefinição (sem provedor de e-mail). */
  devResetLink?: string;
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    artistName: formData.get("artistName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const { name, artistName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const user = await prisma.user.create({
    data: {
      name,
      artistName: artistName || null,
      email,
      passwordHash: await hashPassword(password),
    },
  });

  await setSessionCookie(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }

  await setSessionCookie(user.id);
  redirect("/dashboard");
}

// Mensagem genérica de sucesso para o pedido de redefinição — idêntica exista ou
// não a conta, para não revelar quais e-mails têm cadastro (anti-enumeração).
const RESET_REQUEST_MESSAGE =
  "Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.";

/**
 * Passo 1 do fluxo deslogado: o usuário informa o e-mail e pedimos um link de
 * redefinição. Cria um token de uso único (guardando só o hash) com validade
 * curta e invalida tokens pendentes anteriores da mesma conta. A resposta é
 * SEMPRE a mesma mensagem genérica, exista ou não a conta (anti-enumeração).
 *
 * Sem provedor de e-mail configurado (segredo de produção — ver DECISIONS.md
 * D259), em desenvolvimento devolvemos o link diretamente (`devResetLink`) e o
 * registramos no log do servidor para que o fluxo seja testável ponta a ponta.
 */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Sem conta: responde genérico sem criar nada (mesmo shape/tempo de resposta).
  if (!user) return { success: RESET_REQUEST_MESSAGE };

  const now = new Date();

  // Rate-limit anti-abuso: se a conta já pediu muitos links dentro da janela,
  // ignora silenciosamente (nenhum token novo) mantendo a mesma resposta genérica
  // — não gera spam de e-mail nem revela a existência da conta (anti-enumeração).
  const recentRequestCount = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: resetRequestWindowStart(now) } },
  });
  if (isPasswordResetRateLimited(recentRequestCount)) {
    return { success: RESET_REQUEST_MESSAGE };
  }

  // Limpeza oportunista: apaga os tokens já mortos desta conta (consumidos ou
  // expirados) que também já saíram da janela do rate-limit — os "podáveis" de
  // `isResetTokenPrunable`. Evita que a tabela acumule tokens inúteis sem um job
  // agendado (o container é efêmero), sem afetar a contagem anti-abuso nem os
  // tokens ainda válidos. Escopo por usuário: barato e movido pela atividade.
  const windowStart = resetRequestWindowStart(now);
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      createdAt: { lt: windowStart },
      OR: [{ usedAt: { not: null } }, { expiresAt: { lte: now } }],
    },
  });

  const rawToken = generateResetToken();

  // Invalida pedidos anteriores ainda pendentes desta conta (marca como usados),
  // para que só o link mais recente funcione.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: now },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(rawToken),
      expiresAt: resetTokenExpiry(now),
    },
  });

  const result: AuthState = { success: RESET_REQUEST_MESSAGE };

  if (process.env.NODE_ENV !== "production") {
    const link = `/redefinir-senha?token=${rawToken}`;
    // eslint-disable-next-line no-console
    console.log(`[dev] Link de redefinição de senha para ${email}: ${link}`);
    result.devResetLink = link;
  }

  return result;
}

/**
 * Passo 2: consome o token do link e grava a nova senha. Verifica que o token
 * existe, não expirou e não foi usado; então atualiza o hash da senha e marca
 * `passwordChangedAt` (o que também invalida sessões antigas — ver D10) e o
 * token como consumido (uso único), numa transação. Erros de token são
 * deliberadamente genéricos ("inválido ou expirado"). Em sucesso, redireciona
 * ao login já com o aviso — o usuário faz login com a senha nova.
 */
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const { token, newPassword } = parsed.data;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!record || !isResetTokenUsable(record, new Date())) {
    return {
      error: "Link de redefinição inválido ou expirado. Solicite um novo.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?redefinida=1");
}

export async function logoutAction(): Promise<void> {
  clearSessionCookie();
  redirect("/login");
}
