import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifica a senha correta e rejeita a errada", async () => {
    const hash = await hashPassword("segredo-forte-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("segredo-forte-123", hash)).toBe(true);
    expect(await verifyPassword("senha-errada", hash)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const a = await hashPassword("igual");
    const b = await hashPassword("igual");
    expect(a).not.toBe(b);
  });

  it("rejeita formato de hash inválido sem lançar erro", async () => {
    expect(await verifyPassword("x", "formato-invalido")).toBe(false);
  });
});
