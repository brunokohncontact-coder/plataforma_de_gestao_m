import { describe, it, expect } from "vitest";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
  isResetTokenUsable,
  resetRequestWindowStart,
  isPasswordResetRateLimited,
  isResetTokenPrunable,
  RESET_TOKEN_TTL_MINUTES,
  RESET_REQUEST_WINDOW_MINUTES,
  RESET_REQUEST_MAX_PER_WINDOW,
} from "./passwordReset";

describe("generateResetToken", () => {
  it("gera tokens URL-safe (base64url, sem caracteres inseguros)", () => {
    const token = generateResetToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("gera um token diferente a cada chamada (entropia)", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateResetToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("hashResetToken", () => {
  it("é determinístico e devolve SHA-256 em hex (64 chars)", () => {
    const token = "algum-token-cru";
    const a = hashResetToken(token);
    const b = hashResetToken(token);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("tokens diferentes geram hashes diferentes", () => {
    expect(hashResetToken("a")).not.toBe(hashResetToken("b"));
  });

  it("não guarda o token cru (o hash não contém o token)", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).not.toContain(token);
  });
});

describe("resetTokenExpiry", () => {
  it("expira TTL minutos após o instante base", () => {
    const now = new Date("2026-07-08T12:00:00.000Z");
    const expiry = resetTokenExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  });
});

describe("isResetTokenUsable", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");
  const future = new Date("2026-07-08T13:00:00.000Z");
  const past = new Date("2026-07-08T11:00:00.000Z");

  it("token não usado e não expirado é utilizável", () => {
    expect(isResetTokenUsable({ expiresAt: future, usedAt: null }, now)).toBe(true);
  });

  it("token já usado NÃO é utilizável (uso único)", () => {
    expect(isResetTokenUsable({ expiresAt: future, usedAt: past }, now)).toBe(false);
  });

  it("token expirado NÃO é utilizável", () => {
    expect(isResetTokenUsable({ expiresAt: past, usedAt: null }, now)).toBe(false);
  });

  it("no instante exato da expiração já não vale (comparação estrita)", () => {
    expect(isResetTokenUsable({ expiresAt: now, usedAt: null }, now)).toBe(false);
  });

  it("usado tem precedência mesmo que ainda não tenha expirado", () => {
    expect(isResetTokenUsable({ expiresAt: future, usedAt: now }, now)).toBe(false);
  });
});

describe("resetRequestWindowStart", () => {
  it("recua a janela minutos antes do instante base", () => {
    const now = new Date("2026-07-08T12:00:00.000Z");
    const start = resetRequestWindowStart(now);
    expect(now.getTime() - start.getTime()).toBe(
      RESET_REQUEST_WINDOW_MINUTES * 60 * 1000,
    );
  });
});

describe("isPasswordResetRateLimited", () => {
  it("permite enquanto os pedidos recentes ficam abaixo do máximo", () => {
    expect(isPasswordResetRateLimited(0)).toBe(false);
    expect(isPasswordResetRateLimited(RESET_REQUEST_MAX_PER_WINDOW - 1)).toBe(false);
  });

  it("barra ao atingir o máximo de pedidos na janela", () => {
    expect(isPasswordResetRateLimited(RESET_REQUEST_MAX_PER_WINDOW)).toBe(true);
  });

  it("segue barrando acima do máximo", () => {
    expect(isPasswordResetRateLimited(RESET_REQUEST_MAX_PER_WINDOW + 5)).toBe(true);
  });
});

describe("isResetTokenPrunable", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");
  const future = new Date("2026-07-08T13:00:00.000Z");
  // Fora da janela do rate-limit (mais antigo que RESET_REQUEST_WINDOW_MINUTES).
  const oldCreated = new Date(
    now.getTime() - (RESET_REQUEST_WINDOW_MINUTES + 5) * 60 * 1000,
  );
  // Dentro da janela do rate-limit.
  const recentCreated = new Date(
    now.getTime() - (RESET_REQUEST_WINDOW_MINUTES - 5) * 60 * 1000,
  );
  const expiredAt = new Date(now.getTime() - 1000); // já expirou

  it("token consumido e fora da janela é podável", () => {
    expect(
      isResetTokenPrunable(
        { usedAt: oldCreated, expiresAt: future, createdAt: oldCreated },
        now,
      ),
    ).toBe(true);
  });

  it("token expirado (não usado) e fora da janela é podável", () => {
    expect(
      isResetTokenPrunable(
        { usedAt: null, expiresAt: expiredAt, createdAt: oldCreated },
        now,
      ),
    ).toBe(true);
  });

  it("token morto mas AINDA na janela do rate-limit NÃO é podável", () => {
    // Consumido, porém recente: ainda conta para o anti-abuso — não apagar.
    expect(
      isResetTokenPrunable(
        { usedAt: recentCreated, expiresAt: future, createdAt: recentCreated },
        now,
      ),
    ).toBe(false);
  });

  it("token ainda utilizável nunca é podável, mesmo se antigo", () => {
    expect(
      isResetTokenPrunable(
        { usedAt: null, expiresAt: future, createdAt: oldCreated },
        now,
      ),
    ).toBe(false);
  });

  it("no limite exato da janela ainda conta (comparação estrita), não poda", () => {
    const atWindowStart = resetRequestWindowStart(now);
    expect(
      isResetTokenPrunable(
        { usedAt: atWindowStart, expiresAt: future, createdAt: atWindowStart },
        now,
      ),
    ).toBe(false);
  });
});
