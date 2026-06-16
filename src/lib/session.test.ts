import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_MAX_AGE_MS,
} from "./session";

const SECRET = "test-secret";

describe("session token", () => {
  it("cria e verifica um token válido", () => {
    const token = createSessionToken("user-123", SECRET);
    const payload = verifySessionToken(token, SECRET);
    expect(payload?.uid).toBe("user-123");
  });

  it("rejeita assinatura inválida (secret errado)", () => {
    const token = createSessionToken("user-123", SECRET);
    expect(verifySessionToken(token, "outro-secret")).toBeNull();
  });

  it("rejeita token adulterado", () => {
    const token = createSessionToken("user-123", SECRET);
    const tampered = token.slice(0, -2) + "xy";
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejeita token expirado", () => {
    const now = Date.now();
    const token = createSessionToken("user-123", SECRET, 1000, now);
    expect(verifySessionToken(token, SECRET, now + 2000)).toBeNull();
  });

  it("aceita token dentro da validade", () => {
    const now = Date.now();
    const token = createSessionToken("user-123", SECRET, SESSION_MAX_AGE_MS, now);
    expect(verifySessionToken(token, SECRET, now + 1000)?.uid).toBe("user-123");
  });

  it("rejeita entradas malformadas sem lançar", () => {
    expect(verifySessionToken("", SECRET)).toBeNull();
    expect(verifySessionToken("semponto", SECRET)).toBeNull();
    expect(verifySessionToken(".abc", SECRET)).toBeNull();
  });
});
