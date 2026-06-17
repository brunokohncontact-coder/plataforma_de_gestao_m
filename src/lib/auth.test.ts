// Testes da regra pura de validade de sessão frente à troca de senha (D10).
// `isSessionFresh` decide se um token (pelo seu `iat`) ainda vale dado o
// `passwordChangedAt` do usuário — base da invalidação de logins antigos.
import { describe, expect, it } from "vitest";
import { isSessionFresh } from "./auth";

const at = (iso: string) => new Date(iso);
/** `iat` (segundos UNIX) de uma data ISO, como o JWT armazena. */
const iat = (iso: string) => Math.floor(at(iso).getTime() / 1000);

describe("isSessionFresh", () => {
  it("aceita token emitido após a troca de senha", () => {
    const changedAt = at("2026-06-17T10:00:00Z");
    expect(isSessionFresh(iat("2026-06-17T10:05:00Z"), changedAt)).toBe(true);
  });

  it("rejeita token emitido antes da troca de senha", () => {
    const changedAt = at("2026-06-17T10:00:00Z");
    expect(isSessionFresh(iat("2026-06-17T09:59:00Z"), changedAt)).toBe(false);
  });

  it("aceita token emitido no mesmo segundo da troca (tolerância de arredondamento)", () => {
    // passwordChangedAt com milissegundos; o token novo é emitido logo depois,
    // mas o `iat` (em segundos) cai no mesmo segundo de `changedAt`.
    const changedAt = at("2026-06-17T10:00:00.500Z");
    const tokenIat = Math.floor(at("2026-06-17T10:00:00.900Z").getTime() / 1000);
    expect(isSessionFresh(tokenIat, changedAt)).toBe(true);
  });

  it("trata ausência de passwordChangedAt como válido (compat com registros legados)", () => {
    expect(isSessionFresh(iat("2020-01-01T00:00:00Z"), null)).toBe(true);
    expect(isSessionFresh(iat("2020-01-01T00:00:00Z"), undefined)).toBe(true);
  });

  it("rejeita token sem `iat` quando há marca de troca (não dá para comparar)", () => {
    expect(isSessionFresh(undefined, at("2026-06-17T10:00:00Z"))).toBe(false);
  });

  it("aceita token sem `iat` quando não há marca de troca", () => {
    expect(isSessionFresh(undefined, null)).toBe(true);
  });
});
