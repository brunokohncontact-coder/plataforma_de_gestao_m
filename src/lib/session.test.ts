// Teste de integração da invalidação de sessão por troca de senha (D10):
// getCurrentUser deve recusar um token emitido antes de `passwordChangedAt`,
// mesmo que o JWT em si seja válido e o usuário exista.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ token: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (_name: string) => (h.token ? { value: h.token } : undefined),
  }),
}));

import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { resetDb } from "@/test/db";

beforeEach(async () => {
  await resetDb();
  h.token = undefined;
});
afterEach(() => vi.clearAllMocks());

async function makeUser(passwordChangedAt: Date) {
  return prisma.user.create({
    data: { email: "a@example.com", name: "a", passwordHash: "x", passwordChangedAt },
  });
}

describe("getCurrentUser — validade da sessão", () => {
  it("retorna o usuário quando o token foi emitido após a troca de senha", async () => {
    // Senha trocada no passado: o token recém-emitido é mais novo → válido.
    const user = await makeUser(new Date(Date.now() - 60_000));
    h.token = await createSessionToken(user.id);

    const result = await getCurrentUser();
    expect(result?.id).toBe(user.id);
  });

  it("recusa um token emitido antes da última troca de senha", async () => {
    // Token emitido agora; senha 'trocada' 5s no futuro → token fica obsoleto.
    const user = await makeUser(new Date(Date.now() + 5_000));
    h.token = await createSessionToken(user.id);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("retorna null sem cookie de sessão", async () => {
    h.token = undefined;
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});
