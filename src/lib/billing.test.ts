import { describe, it, expect } from "vitest";
import {
  pickBillingContact,
  buildDunningMessage,
  normalizeWhatsappPhone,
  buildMailtoUrl,
  buildWhatsappUrl,
  buildShowBilling,
  type BillingContactLike,
  type BillingShowInfo,
} from "./billing";

function contact(over: Partial<BillingContactLike> & { id: string }): BillingContactLike {
  return { name: "Contato", role: "OTHER", email: null, phone: null, ...over };
}

const SHOW: BillingShowInfo = {
  title: "Show no Bar do Zé",
  date: "2026-05-10T23:00:00Z",
  venue: "Bar do Zé",
  city: "Recife",
  outstanding: 1_250_00,
};

describe("pickBillingContact", () => {
  it("retorna null quando nenhum contato tem canal", () => {
    expect(pickBillingContact([])).toBeNull();
    expect(
      pickBillingContact([contact({ id: "a", email: "  ", phone: "" })]),
    ).toBeNull();
  });

  it("ignora contatos sem e-mail nem telefone", () => {
    const c = pickBillingContact([
      contact({ id: "a", name: "Sem canal" }),
      contact({ id: "b", name: "Com email", email: "b@x.com" }),
    ]);
    expect(c?.id).toBe("b");
  });

  it("prioriza pelo papel (contratante/promoter antes da casa)", () => {
    const c = pickBillingContact([
      contact({ id: "v", name: "Casa", role: "VENUE", email: "v@x.com" }),
      contact({ id: "b", name: "Booker", role: "BOOKER", email: "b@x.com" }),
      contact({ id: "p", name: "Promoter", role: "PROMOTER", phone: "81999998888" }),
    ]);
    expect(c?.id).toBe("b");
  });

  it("desempata por nome quando o papel é igual", () => {
    const c = pickBillingContact([
      contact({ id: "1", name: "Bruno", role: "VENUE", email: "x@x.com" }),
      contact({ id: "2", name: "Ana", role: "VENUE", email: "y@x.com" }),
    ]);
    expect(c?.id).toBe("2");
  });

  it("trata papel ausente como OTHER (não derruba)", () => {
    const c = pickBillingContact([
      contact({ id: "a", name: "Z", role: null, phone: "81999998888" }),
    ]);
    expect(c?.id).toBe("a");
  });
});

describe("buildDunningMessage", () => {
  it("inclui título, data (UTC), local e valor formatado", () => {
    const m = buildDunningMessage(SHOW);
    expect(m.subject).toBe("Cachê pendente — Show no Bar do Zé");
    expect(m.body).toContain("Show no Bar do Zé");
    expect(m.body).toContain("10/05/2026");
    expect(m.body).toContain("Bar do Zé · Recife");
    // O Intl usa espaço não separável entre "R$" e o número; testa o número.
    expect(m.body).toContain("1.250,00");
  });

  it("personaliza a saudação e assina com o remetente", () => {
    const m = buildDunningMessage(SHOW, { contactName: "Maria", fromName: "Trio Acústico" });
    expect(m.body.startsWith("Olá, Maria!")).toBe(true);
    expect(m.body.trimEnd().endsWith("Trio Acústico")).toBe(true);
  });

  it("usa saudação genérica sem nome do contato", () => {
    const m = buildDunningMessage(SHOW, {});
    expect(m.body.startsWith("Olá!")).toBe(true);
  });

  it("omite o local quando não há venue nem city", () => {
    const m = buildDunningMessage({ ...SHOW, venue: null, city: null });
    expect(m.body).toContain("realizado em 10/05/2026 no valor");
    expect(m.body).not.toContain(" em , ");
  });
});

describe("normalizeWhatsappPhone", () => {
  it("retorna null para vazio ou curto demais", () => {
    expect(normalizeWhatsappPhone(null)).toBeNull();
    expect(normalizeWhatsappPhone("")).toBeNull();
    expect(normalizeWhatsappPhone("123")).toBeNull();
  });

  it("prepende o DDI 55 a número local de 10–11 dígitos", () => {
    expect(normalizeWhatsappPhone("(81) 99999-8888")).toBe("5581999998888");
    expect(normalizeWhatsappPhone("81 3333-4444")).toBe("558133334444");
  });

  it("mantém número que já tem DDI 55 (12–13 dígitos)", () => {
    expect(normalizeWhatsappPhone("+55 81 99999-8888")).toBe("5581999998888");
    expect(normalizeWhatsappPhone("55 81 3333-4444")).toBe("558133334444");
  });

  it("usa como veio quando já tem outro DDI (12+ dígitos, sem 55)", () => {
    // +44 20 7946 0958 (Reino Unido) — 12 dígitos, não começa com 55.
    expect(normalizeWhatsappPhone("+44 20 7946 0958")).toBe("442079460958");
  });
});

describe("buildMailtoUrl / buildWhatsappUrl", () => {
  it("monta mailto com assunto e corpo codificados", () => {
    const url = buildMailtoUrl("dono@bar.com", "Cachê & nota", "Olá, tudo bem?");
    expect(url).toContain("mailto:dono%40bar.com?");
    expect(url).toContain("subject=Cach%C3%AA%20%26%20nota");
    expect(url).toContain("body=Ol%C3%A1%2C%20tudo%20bem%3F");
  });

  it("retorna null sem e-mail", () => {
    expect(buildMailtoUrl(null, "s", "b")).toBeNull();
    expect(buildMailtoUrl("  ", "s", "b")).toBeNull();
  });

  it("monta wa.me com o telefone normalizado e texto codificado", () => {
    const url = buildWhatsappUrl("(81) 99999-8888", "Olá!");
    expect(url).toBe("https://wa.me/5581999998888?text=Ol%C3%A1!");
  });

  it("retorna null quando o telefone não serve", () => {
    expect(buildWhatsappUrl(null, "x")).toBeNull();
    expect(buildWhatsappUrl("123", "x")).toBeNull();
  });
});

describe("buildShowBilling", () => {
  it("retorna null sem contato alcançável", () => {
    expect(buildShowBilling(SHOW, [])).toBeNull();
    expect(buildShowBilling(SHOW, [contact({ id: "a" })])).toBeNull();
  });

  it("escolhe o contato, redige a mensagem e monta os dois atalhos", () => {
    const r = buildShowBilling(
      SHOW,
      [
        contact({ id: "v", name: "Casa", role: "VENUE", email: "casa@x.com" }),
        contact({
          id: "b",
          name: "Booker",
          role: "BOOKER",
          email: "booker@x.com",
          phone: "81999998888",
        }),
      ],
      { fromName: "Trio Acústico" },
    );
    expect(r?.contact.id).toBe("b");
    expect(r?.subject).toBe("Cachê pendente — Show no Bar do Zé");
    expect(r?.mailtoUrl).toContain("mailto:booker%40x.com?");
    expect(r?.whatsappUrl).toContain("https://wa.me/5581999998888?text=");
    // WhatsApp manda só o corpo (sem assunto).
    expect(r?.whatsappUrl).toContain(encodeURIComponent("Olá, Booker!"));
  });

  it("monta só o canal disponível (e-mail sem telefone)", () => {
    const r = buildShowBilling(SHOW, [
      contact({ id: "a", name: "Só email", role: "VENUE", email: "a@x.com" }),
    ]);
    expect(r?.mailtoUrl).not.toBeNull();
    expect(r?.whatsappUrl).toBeNull();
  });
});
