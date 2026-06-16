import { describe, it, expect } from "vitest";
import {
  registerSchema,
  showSchema,
  transactionSchema,
  contactSchema,
  fieldErrors,
} from "./validation";

describe("registerSchema", () => {
  it("normaliza e-mail e aceita dados válidos", () => {
    const r = registerSchema.parse({
      name: " Ana ",
      email: "ANA@Example.com ",
      password: "12345678",
      artistName: "",
    });
    expect(r.email).toBe("ana@example.com");
    expect(r.name).toBe("Ana");
    expect(r.artistName).toBeNull();
  });

  it("rejeita senha curta", () => {
    const r = registerSchema.safeParse({
      name: "Ana",
      email: "a@b.com",
      password: "123",
    });
    expect(r.success).toBe(false);
  });
});

describe("showSchema", () => {
  it("coage fee e data; aplica defaults", () => {
    const r = showSchema.parse({
      title: "Show X",
      date: "2026-07-01",
      fee: "1500",
    });
    expect(r.fee).toBe(1500);
    expect(r.status).toBe("PROPOSED");
    expect(r.date).toBeInstanceOf(Date);
  });

  it("rejeita fee negativo e status inválido", () => {
    expect(
      showSchema.safeParse({ title: "X", date: "2026-07-01", fee: "-1" }).success
    ).toBe(false);
    expect(
      showSchema.safeParse({ title: "X", date: "2026-07-01", status: "FOO" })
        .success
    ).toBe(false);
  });
});

describe("transactionSchema", () => {
  it("aceita transação válida com valor coagido", () => {
    const r = transactionSchema.parse({
      type: "EXPENSE",
      amount: "300.50",
      category: "Transporte",
      date: "2026-07-01",
    });
    expect(r.amount).toBe(300.5);
    expect(r.settled).toBe(true);
  });

  it("rejeita valor não positivo", () => {
    expect(
      transactionSchema.safeParse({
        type: "INCOME",
        amount: "0",
        category: "x",
        date: "2026-07-01",
      }).success
    ).toBe(false);
  });
});

describe("contactSchema", () => {
  it("transforma e-mail vazio em null", () => {
    const r = contactSchema.parse({ name: "João", email: "" });
    expect(r.email).toBeNull();
    expect(r.role).toBe("OTHER");
  });
});

describe("fieldErrors", () => {
  it("mapeia o primeiro erro por campo", () => {
    const r = registerSchema.safeParse({ name: "", email: "x", password: "1" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs.name).toBeTruthy();
      expect(errs.email).toBeTruthy();
      expect(errs.password).toBeTruthy();
    }
  });
});
