import { describe, expect, it } from "vitest";
import {
  RESET_CONFIRMATION_PHRASE,
  matchesResetConfirmation,
} from "./accountReset";

describe("matchesResetConfirmation", () => {
  it("aceita exatamente a frase exigida", () => {
    expect(matchesResetConfirmation(RESET_CONFIRMATION_PHRASE)).toBe(true);
  });

  it("é tolerante a caixa e espaços de sobra, sem afrouxar a intenção", () => {
    expect(matchesResetConfirmation("  apagar meus dados  ")).toBe(true);
    expect(matchesResetConfirmation("Apagar   Meus   Dados")).toBe(true);
  });

  it("recusa texto parcial, vazio ou diferente", () => {
    expect(matchesResetConfirmation("apagar")).toBe(false);
    expect(matchesResetConfirmation("apagar meus dado")).toBe(false);
    expect(matchesResetConfirmation("apagar meus dados agora")).toBe(false);
    expect(matchesResetConfirmation("")).toBe(false);
    expect(matchesResetConfirmation("   ")).toBe(false);
  });

  it("recusa valores não-textuais (nunca autoriza por acidente)", () => {
    expect(matchesResetConfirmation(undefined)).toBe(false);
    expect(matchesResetConfirmation(null)).toBe(false);
    expect(matchesResetConfirmation(123)).toBe(false);
    expect(matchesResetConfirmation({})).toBe(false);
  });
});
