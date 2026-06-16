import { describe, it, expect } from "vitest";
import { signupSchema, showSchema, transactionSchema } from "./validation";

describe("signupSchema", () => {
  it("aceita dados válidos e normaliza e-mail", () => {
    const r = signupSchema.parse({
      name: "  Banda X ",
      email: "  TESTE@Email.com ",
      password: "segredo12",
    });
    expect(r.name).toBe("Banda X");
    expect(r.email).toBe("teste@email.com");
  });

  it("rejeita senha curta", () => {
    expect(signupSchema.safeParse({ name: "A", email: "a@b.com", password: "123" }).success).toBe(
      false,
    );
  });
});

describe("showSchema", () => {
  it("coage fee/data e valida status", () => {
    const r = showSchema.parse({
      title: "Show",
      date: "2026-07-01",
      status: "confirmed",
      fee: "1500",
    });
    expect(r.fee).toBe(1500);
    expect(r.date).toBeInstanceOf(Date);
  });

  it("rejeita cachê negativo e status inválido", () => {
    expect(
      showSchema.safeParse({ title: "x", date: "2026-07-01", status: "confirmed", fee: -1 })
        .success,
    ).toBe(false);
    expect(
      showSchema.safeParse({ title: "x", date: "2026-07-01", status: "wat", fee: 1 }).success,
    ).toBe(false);
  });
});

describe("transactionSchema", () => {
  it("exige valor positivo", () => {
    expect(
      transactionSchema.safeParse({
        type: "expense",
        category: "Transporte",
        amount: 0,
        date: "2026-01-01",
        status: "received",
      }).success,
    ).toBe(false);
  });
});
