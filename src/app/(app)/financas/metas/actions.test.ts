// Testes de integração das server actions da Meta de faturamento: cria/atualiza
// (upsert por ano) e remove, sempre escopado ao usuário logado (isolamento).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ currentUser: null as { id: string } | null }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireUser: vi.fn(async () => {
    if (!h.currentUser) throw new Error("não autenticado");
    return h.currentUser;
  }),
}));

import { prisma } from "@/lib/prisma";
import { resetDb, createUser } from "@/test/db";
import { setRevenueGoalAction, deleteRevenueGoalAction } from "./actions";

function goalForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("year", "2026");
  fd.set("amount", "120.000,00"); // máscara pt-BR → 12_000_000 centavos
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(async () => {
  await resetDb();
  h.currentUser = null;
});
afterEach(() => vi.clearAllMocks());

describe("setRevenueGoalAction", () => {
  it("cria a meta do ano para o usuário logado", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const result = await setRevenueGoalAction({}, goalForm());

    expect(result.success).toBeTruthy();
    const saved = await prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: user.id, year: 2026 } },
    });
    expect(saved?.amount).toBe(120_000_00);
  });

  it("atualiza a meta existente do mesmo ano (upsert, não duplica)", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    await setRevenueGoalAction({}, goalForm());
    await setRevenueGoalAction({}, goalForm({ amount: "150.000,00" }));

    const all = await prisma.revenueGoal.findMany({ where: { userId: user.id } });
    expect(all).toHaveLength(1);
    expect(all[0].amount).toBe(150_000_00);
  });

  it("rejeita meta zero/negativa sem gravar", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;

    const result = await setRevenueGoalAction({}, goalForm({ amount: "0,00" }));

    expect(result.error).toBeTruthy();
    const count = await prisma.revenueGoal.count({ where: { userId: user.id } });
    expect(count).toBe(0);
  });

  it("metas de usuários diferentes para o mesmo ano não colidem", async () => {
    const a = await createUser("a@example.com");
    const b = await createUser("b@example.com");

    h.currentUser = a;
    await setRevenueGoalAction({}, goalForm({ amount: "100.000,00" }));
    h.currentUser = b;
    await setRevenueGoalAction({}, goalForm({ amount: "200.000,00" }));

    const aGoal = await prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: a.id, year: 2026 } },
    });
    const bGoal = await prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: b.id, year: 2026 } },
    });
    expect(aGoal?.amount).toBe(100_000_00);
    expect(bGoal?.amount).toBe(200_000_00);
  });
});

describe("deleteRevenueGoalAction", () => {
  it("remove a meta do ano do usuário logado", async () => {
    const user = await createUser("a@example.com");
    h.currentUser = user;
    await setRevenueGoalAction({}, goalForm());

    const fd = new FormData();
    fd.set("id", "2026"); // convenção do DeleteButton
    await deleteRevenueGoalAction(fd);

    const count = await prisma.revenueGoal.count({ where: { userId: user.id } });
    expect(count).toBe(0);
  });

  it("não remove a meta de outro usuário", async () => {
    const a = await createUser("a@example.com");
    const b = await createUser("b@example.com");
    h.currentUser = b;
    await setRevenueGoalAction({}, goalForm());
    h.currentUser = a; // 'a' tenta remover a meta de 2026 — só apaga as suas

    const fd = new FormData();
    fd.set("id", "2026");
    await deleteRevenueGoalAction(fd);

    const bGoal = await prisma.revenueGoal.findUnique({
      where: { userId_year: { userId: b.id, year: 2026 } },
    });
    expect(bGoal).not.toBeNull(); // intacta
  });
});
