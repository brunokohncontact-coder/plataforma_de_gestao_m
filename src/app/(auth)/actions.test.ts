// Testes de integração do fluxo deslogado de recuperação de senha (server
// actions). Foco na regra sensível: anti-enumeração no pedido, e um token de
// uso único, com validade e que realmente troca o hash da senha no resgate.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `redirect` lança um sinal especial no Next; aqui capturamos o destino.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  hashResetToken,
  RESET_REQUEST_MAX_PER_WINDOW,
  RESET_REQUEST_WINDOW_MINUTES,
} from "@/lib/passwordReset";
import { resetDb } from "@/test/db";
import { requestPasswordResetAction, resetPasswordAction } from "./actions";

async function createUser(email: string, password: string) {
  return prisma.user.create({
    data: { email, name: email.split("@")[0], passwordHash: await hashPassword(password) },
  });
}

function requestForm(email: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

function resetForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("token", "");
  fd.set("newPassword", "nova-senha-123");
  fd.set("confirmPassword", "nova-senha-123");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

/** Extrai o token cru do `devResetLink` (?token=...) devolvido em dev. */
function tokenFromDevLink(link: string | undefined): string {
  const m = (link ?? "").match(/token=([^&]+)/);
  if (!m) throw new Error(`sem token no link: ${link}`);
  return decodeURIComponent(m[1]);
}

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("requestPasswordResetAction", () => {
  it("cria um token (só o hash) e devolve o link em dev quando a conta existe", async () => {
    await createUser("musico@example.com", "senha-original");

    const result = await requestPasswordResetAction({}, requestForm("musico@example.com"));

    expect(result.success).toBeTruthy();
    expect(result.error).toBeUndefined();
    const token = tokenFromDevLink(result.devResetLink);

    const stored = await prisma.passwordResetToken.findMany();
    expect(stored).toHaveLength(1);
    // Guarda o HASH, nunca o token cru.
    expect(stored[0].tokenHash).toBe(hashResetToken(token));
    expect(stored[0].tokenHash).not.toBe(token);
    expect(stored[0].usedAt).toBeNull();
    expect(stored[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("não revela se a conta existe (mesma mensagem, sem token) para e-mail desconhecido", async () => {
    const result = await requestPasswordResetAction({}, requestForm("ninguem@example.com"));

    expect(result.success).toBeTruthy();
    expect(result.devResetLink).toBeUndefined();
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });

  it("invalida o token pendente anterior ao pedir um novo", async () => {
    await createUser("musico@example.com", "senha-original");

    const first = await requestPasswordResetAction({}, requestForm("musico@example.com"));
    const firstToken = tokenFromDevLink(first.devResetLink);
    await requestPasswordResetAction({}, requestForm("musico@example.com"));

    const old = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(firstToken) },
    });
    expect(old?.usedAt).not.toBeNull(); // o antigo foi marcado como consumido
    // Só o token mais novo continua pendente.
    expect(await prisma.passwordResetToken.count({ where: { usedAt: null } })).toBe(1);
  });

  it("rejeita e-mail inválido", async () => {
    const result = await requestPasswordResetAction({}, requestForm("nao-e-email"));
    expect(result.error).toBeTruthy();
  });

  it("barra pedidos além do limite na janela (rate-limit), sem gerar novo token", async () => {
    await createUser("musico@example.com", "senha-original");

    // Os primeiros pedidos passam e criam tokens (cada um invalida o anterior).
    for (let i = 0; i < RESET_REQUEST_MAX_PER_WINDOW; i++) {
      const ok = await requestPasswordResetAction({}, requestForm("musico@example.com"));
      expect(ok.devResetLink).toBeTruthy();
    }
    const countAfterLimit = await prisma.passwordResetToken.count();
    expect(countAfterLimit).toBe(RESET_REQUEST_MAX_PER_WINDOW);

    // O pedido seguinte é barrado: mesma mensagem genérica, nenhum link/token novo.
    const blocked = await requestPasswordResetAction({}, requestForm("musico@example.com"));
    expect(blocked.success).toBeTruthy();
    expect(blocked.error).toBeUndefined();
    expect(blocked.devResetLink).toBeUndefined();
    expect(await prisma.passwordResetToken.count()).toBe(countAfterLimit);
  });

  it("não conta pedidos fora da janela deslizante ao aplicar o rate-limit", async () => {
    const user = await createUser("musico@example.com", "senha-original");

    // Pedidos antigos (fora da janela) não devem contar para o limite.
    const old = new Date(Date.now() - (RESET_REQUEST_WINDOW_MINUTES + 5) * 60 * 1000);
    for (let i = 0; i < RESET_REQUEST_MAX_PER_WINDOW; i++) {
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(`antigo-${i}`),
          expiresAt: new Date(old.getTime() + 60 * 60 * 1000),
          usedAt: old,
          createdAt: old,
        },
      });
    }

    const result = await requestPasswordResetAction({}, requestForm("musico@example.com"));
    expect(result.devResetLink).toBeTruthy(); // não barrado: os antigos não contam
  });
});

describe("resetPasswordAction", () => {
  async function requestTokenFor(email: string): Promise<string> {
    const res = await requestPasswordResetAction({}, requestForm(email));
    return tokenFromDevLink(res.devResetLink);
  }

  it("troca o hash da senha, marca passwordChangedAt e consome o token", async () => {
    const user = await createUser("musico@example.com", "senha-original");
    const token = await requestTokenFor("musico@example.com");

    await expect(
      resetPasswordAction({}, resetForm({ token })),
    ).rejects.toThrow("REDIRECT:/login?redefinida=1");

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await verifyPassword("nova-senha-123", fresh!.passwordHash)).toBe(true);
    expect(await verifyPassword("senha-original", fresh!.passwordHash)).toBe(false);
    expect(fresh!.passwordChangedAt.getTime()).toBeGreaterThanOrEqual(
      user.passwordChangedAt.getTime(),
    );

    const stored = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
    });
    expect(stored?.usedAt).not.toBeNull(); // uso único
  });

  it("recusa um token já usado (não pode redefinir duas vezes)", async () => {
    await createUser("musico@example.com", "senha-original");
    const token = await requestTokenFor("musico@example.com");

    await expect(resetPasswordAction({}, resetForm({ token }))).rejects.toThrow("REDIRECT:");

    const second = await resetPasswordAction({}, resetForm({ token }));
    expect(second.error).toMatch(/inválido ou expirado/i);
  });

  it("recusa um token expirado", async () => {
    const user = await createUser("musico@example.com", "senha-original");
    const token = await requestTokenFor("musico@example.com");
    // Força a expiração no passado.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await resetPasswordAction({}, resetForm({ token }));
    expect(result.error).toMatch(/inválido ou expirado/i);
  });

  it("recusa um token inexistente", async () => {
    await createUser("musico@example.com", "senha-original");
    const result = await resetPasswordAction({}, resetForm({ token: "token-que-nao-existe" }));
    expect(result.error).toMatch(/inválido ou expirado/i);
  });

  it("recusa quando a confirmação não corresponde", async () => {
    await createUser("musico@example.com", "senha-original");
    const token = await requestTokenFor("musico@example.com");
    const result = await resetPasswordAction(
      {},
      resetForm({ token, confirmPassword: "outra-coisa" }),
    );
    expect(result.error).toBeTruthy();
    // A senha NÃO foi trocada.
    const user = await prisma.user.findUnique({ where: { email: "musico@example.com" } });
    expect(await verifyPassword("senha-original", user!.passwordHash)).toBe(true);
  });

  it("recusa senha curta (< 8)", async () => {
    await createUser("musico@example.com", "senha-original");
    const token = await requestTokenFor("musico@example.com");
    const result = await resetPasswordAction(
      {},
      resetForm({ token, newPassword: "curta", confirmPassword: "curta" }),
    );
    expect(result.error).toBeTruthy();
  });
});
