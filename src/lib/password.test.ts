import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifica a senha correta", () => {
    const stored = hashPassword("s3nh4-f0rte");
    expect(verifyPassword("s3nh4-f0rte", stored)).toBe(true);
  });

  it("rejeita senha incorreta", () => {
    const stored = hashPassword("s3nh4-f0rte");
    expect(verifyPassword("errada", stored)).toBe(false);
  });

  it("gera hashes diferentes (salt) para a mesma senha", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });

  it("rejeita formato inválido sem lançar", () => {
    expect(verifyPassword("x", "formato-invalido")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });
});
