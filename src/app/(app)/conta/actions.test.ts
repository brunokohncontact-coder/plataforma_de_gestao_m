// Testes de integração das server actions da Conta: atualização de perfil e
// troca de senha. Foco na regra de negócio sensível — só troca a senha com a
// senha atual correta, e o hash realmente muda no banco.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ currentUser: null as { id: string; passwordHash: string } | null }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireUser: vi.fn(async () => {
    if (!h.currentUser) throw new Error("não autenticado");
    return h.currentUser;
  }),
}));

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { resetDb } from "@/test/db";
import { changePasswordAction, updateProfileAction } from "./actions";

/** Cria um usuário com um hash de senha real (o helper padrão usa "x"). */
async function createUserWithPassword(email: string, password: string) {
  const user = await prisma.user.create({
    data: { email, name: email.split("@")[0], passwordHash: await hashPassword(password) },
  });
  return user;
}

function profileForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("name", "Maria Silva");
  fd.set("artistName", "MARIA");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function passwordForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("currentPassword", "senha-original");
  fd.set("newPassword", "nova-senha-segura");
  fd.set("confirmPassword", "nova-senha-segura");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetDb();
  h.currentUser = null;
});
afterEach(() => vi.clearAllMocks());

describe("updateProfileAction", () => {
  it("atualiza nome e nome artístico do usuário logado", async () => {
    const user = await createUserWithPassword("a@example.com", "senha-original");
    h.currentUser = user;

    const result = await updateProfileAction({}, profileForm());

    expect(result.success).toBeTruthy();
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh?.name).toBe("Maria Silva");
    expect(fresh?.artistName).toBe("MARIA");
  });

  it("limpa o nome artístico quando enviado vazio", async () => {
    const user = await createUserWithPassword("a@example.com", "senha-original");
    h.currentUser = user;

    await updateProfileAction({}, profileForm({ artistName: "" }));

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh?.artistName).toBeNull();
  });

  it("rejeita nome vazio sem gravar", async () => {
    const user = await createUserWithPassword("a@example.com", "senha-original");
    h.currentUser = user;

    const result = await updateProfileAction({}, profileForm({ name: "  " }));

    expect(result.error).toBeTruthy();
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fresh?.name).toBe("a"); // inalterado (email.split antes do @)
  });
});

describe("changePasswordAction", () => {
  it("troca a senha quando a senha atual está correta", async () => {
    const user = await createUserWithPassword("a@example.com", "senha-original");
    h.currentUser = user;

    const result = await changePasswordAction({}, passwordForm());

    expect(result.success).toBeTruthy();
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await verifyPassword("nova-senha-segura", fresh!.passwordHash)).toBe(true);
    expect(await verifyPassword("senha-original", fresh!.passwordHash)).toBe(false);
  });

  it("NÃO troca a senha quando a senha atual está incorreta", async () => {
    const user = await createUserWithPassword("a@example.com", "senha-original");
    h.currentUser = user;

    const result = await changePasswordAction(
      {},
      passwordForm({ currentPassword: "chute-errado" }),
    );

    expect(result.error).toBe("Senha atual incorreta.");
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await verifyPassword("senha-original", fresh!.passwordHash)).toBe(true);
  });

  it("rejeita quando a confirmação não corresponde", async () => {
    const user = await createUserWithPassword("a@example.com", "senha-original");
    h.currentUser = user;

    const result = await changePasswordAction(
      {},
      passwordForm({ confirmPassword: "diferente-123" }),
    );

    expect(result.error).toBeTruthy();
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await verifyPassword("senha-original", fresh!.passwordHash)).toBe(true);
  });
});
