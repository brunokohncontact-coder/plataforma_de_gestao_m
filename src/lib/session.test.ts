import { describe, it, expect } from "vitest";
import { signSession, verifySession, type SessionPayload } from "./session";

const SECRET = "test-secret";

describe("signSession / verifySession", () => {
  const payload: SessionPayload = { userId: "u123", exp: Date.now() + 100000 };

  it("ida e volta: token assinado verifica e devolve o payload", () => {
    const token = signSession(payload, SECRET);
    const out = verifySession(token, SECRET);
    expect(out).toEqual(payload);
  });

  it("rejeita token com assinatura adulterada", () => {
    const token = signSession(payload, SECRET);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejeita token assinado com outro segredo", () => {
    const token = signSession(payload, SECRET);
    expect(verifySession(token, "outro-segredo")).toBeNull();
  });

  it("rejeita token expirado", () => {
    const expired = signSession({ userId: "u1", exp: 1000 }, SECRET);
    expect(verifySession(expired, SECRET, 2000)).toBeNull();
  });

  it("rejeita tokens malformados ou vazios", () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession(null, SECRET)).toBeNull();
    expect(verifySession("", SECRET)).toBeNull();
    expect(verifySession("semponto", SECRET)).toBeNull();
    expect(verifySession("a.b.c", SECRET)).toBeNull();
  });
});
