import { describe, it, expect } from "vitest";
import {
  showInputSchema,
  transactionInputSchema,
  contactInputSchema,
  signupSchema,
} from "./validation";

describe("showInputSchema", () => {
  it("aceita show válido e aplica defaults", () => {
    const r = showInputSchema.parse({ title: "Show no Bar", date: "2026-07-01" });
    expect(r.status).toBe("proposto");
    expect(r.feeAgreed).toBe(0);
    expect(r.date).toBeInstanceOf(Date);
  });

  it("rejeita título vazio", () => {
    expect(showInputSchema.safeParse({ title: "", date: "2026-07-01" }).success).toBe(
      false,
    );
  });

  it("rejeita cachê negativo", () => {
    const r = showInputSchema.safeParse({
      title: "x",
      date: "2026-07-01",
      feeAgreed: -10,
    });
    expect(r.success).toBe(false);
  });

  it("rejeita status inválido", () => {
    const r = showInputSchema.safeParse({
      title: "x",
      date: "2026-07-01",
      status: "inexistente",
    });
    expect(r.success).toBe(false);
  });
});

describe("transactionInputSchema", () => {
  it("aceita transação válida", () => {
    const r = transactionInputSchema.parse({
      type: "receita",
      amount: 500,
      date: "2026-01-01",
    });
    expect(r.received).toBe(true);
    expect(r.category).toBe("outro");
  });

  it("rejeita valor zero", () => {
    const r = transactionInputSchema.safeParse({
      type: "despesa",
      amount: 0,
      date: "2026-01-01",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita tipo inválido", () => {
    const r = transactionInputSchema.safeParse({
      type: "transferencia",
      amount: 10,
      date: "2026-01-01",
    });
    expect(r.success).toBe(false);
  });
});

describe("contactInputSchema", () => {
  it("aceita contato com e-mail vazio", () => {
    const r = contactInputSchema.parse({ name: "João", role: "venue", email: "" });
    expect(r.name).toBe("João");
  });

  it("rejeita e-mail malformado", () => {
    const r = contactInputSchema.safeParse({ name: "x", role: "venue", email: "abc" });
    expect(r.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("rejeita senha curta", () => {
    const r = signupSchema.safeParse({
      name: "x",
      email: "a@b.com",
      password: "123",
    });
    expect(r.success).toBe(false);
  });

  it("aceita cadastro válido", () => {
    const r = signupSchema.parse({
      name: "Ana",
      email: "ana@exemplo.com",
      password: "senhaforte123",
    });
    expect(r.email).toBe("ana@exemplo.com");
  });
});
