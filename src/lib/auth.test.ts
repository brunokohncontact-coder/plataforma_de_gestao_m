import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
} from "./auth";

const SECRET = "test-secret";

describe("session token", () => {
  it("cria e verifica um token válido, retornando o userId", () => {
    const token = createSessionToken("user-123", SECRET);
    expect(verifySessionToken(token, SECRET)).toBe("user-123");
  });

  it("rejeita token com segredo diferente", () => {
    const token = createSessionToken("user-123", SECRET);
    expect(verifySessionToken(token, "outro-segredo")).toBeNull();
  });

  it("rejeita token adulterado", () => {
    const token = createSessionToken("user-123", SECRET);
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejeita token expirado", () => {
    const past = Date.now() - 1000 * 60 * 60 * 24 * 365; // 1 ano atrás
    const token = createSessionToken("user-123", SECRET, past);
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejeita valores malformados", () => {
    expect(verifySessionToken(null, SECRET)).toBeNull();
    expect(verifySessionToken(undefined, SECRET)).toBeNull();
    expect(verifySessionToken("", SECRET)).toBeNull();
    expect(verifySessionToken("semponto", SECRET)).toBeNull();
    expect(verifySessionToken("a.b.c", SECRET)).toBeNull();
  });
});

describe("password hashing", () => {
  it("faz hash e verifica a senha correta", async () => {
    const hash = await hashPassword("minhasenha");
    expect(hash).not.toBe("minhasenha");
    expect(await verifyPassword("minhasenha", hash)).toBe(true);
  });

  it("rejeita senha incorreta", async () => {
    const hash = await hashPassword("minhasenha");
    expect(await verifyPassword("errada", hash)).toBe(false);
  });
});
