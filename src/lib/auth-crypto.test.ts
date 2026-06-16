import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
} from "./auth-crypto";

describe("password hashing", () => {
  it("verifica a senha correta", () => {
    const h = hashPassword("senhaforte123");
    expect(verifyPassword("senhaforte123", h)).toBe(true);
  });

  it("rejeita senha incorreta", () => {
    const h = hashPassword("senhaforte123");
    expect(verifyPassword("errada", h)).toBe(false);
  });

  it("gera hashes diferentes (salt) para a mesma senha", () => {
    expect(hashPassword("x")).not.toBe(hashPassword("x"));
  });

  it("rejeita hash malformado sem quebrar", () => {
    expect(verifyPassword("x", "invalido")).toBe(false);
  });
});

describe("session token", () => {
  it("assina e verifica o userId", () => {
    const token = signSession("user123");
    expect(verifySession(token)).toBe("user123");
  });

  it("rejeita token adulterado", () => {
    const token = signSession("user123");
    const tampered = token.slice(0, -2) + "xy";
    expect(verifySession(tampered)).toBe(null);
  });

  it("rejeita token malformado", () => {
    expect(verifySession("sem-ponto")).toBe(null);
    expect(verifySession("")).toBe(null);
  });
});
