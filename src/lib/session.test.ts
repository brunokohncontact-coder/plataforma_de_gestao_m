import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";

const secret = "test-secret-0123456789";

describe("signSession / verifySession", () => {
  it("assina e verifica um token válido", () => {
    const token = signSession({ userId: "u1", iat: Date.now() }, secret);
    const payload = verifySession(token, secret);
    expect(payload?.userId).toBe("u1");
  });

  it("rejeita token com segredo errado", () => {
    const token = signSession({ userId: "u1", iat: Date.now() }, secret);
    expect(verifySession(token, "outro-segredo")).toBeNull();
  });

  it("rejeita token adulterado", () => {
    const token = signSession({ userId: "u1", iat: Date.now() }, secret);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifySession(tampered, secret)).toBeNull();
  });

  it("rejeita formato inválido e vazio", () => {
    expect(verifySession("", secret)).toBeNull();
    expect(verifySession(undefined, secret)).toBeNull();
    expect(verifySession("semponto", secret)).toBeNull();
    expect(verifySession("a.b.c", secret)).toBeNull();
  });

  it("rejeita token expirado quando maxAge é informado", () => {
    const old = signSession({ userId: "u1", iat: Date.now() - 10_000 }, secret);
    expect(verifySession(old, secret, 5_000)).toBeNull();
    expect(verifySession(old, secret, 60_000)?.userId).toBe("u1");
  });
});
