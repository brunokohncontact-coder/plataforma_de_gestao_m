// Cobrança de cachês a receber — montagem das mensagens e atalhos de contato.
//
// Liga a página "Cachês a receber" (src/lib/finance.ts → reconcileShowFees) ao CRM:
// dado um show com saldo em aberto e os contatos vinculados a ele, escolhe o melhor
// contato para cobrar e monta a mensagem de cobrança + os atalhos mailto/WhatsApp.
// Tudo PURO (sem I/O, sem Intl dependente de timezone), para ser testável e
// determinístico — a UI só renderiza os links prontos.

import { formatMoney } from "./money";

/** Forma mínima de contato para a cobrança. */
export interface BillingContactLike {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Dados do show necessários para redigir a cobrança. */
export interface BillingShowInfo {
  title: string;
  date: Date | string;
  venue?: string | null;
  city?: string | null;
  /** Valor em aberto, em centavos. */
  outstanding: number;
}

export interface DunningMessage {
  subject: string;
  body: string;
}

export interface ShowBilling {
  /** Contato escolhido para a cobrança (tem ao menos um canal). */
  contact: BillingContactLike;
  subject: string;
  body: string;
  /** mailto: pronto (só quando o contato tem e-mail). */
  mailtoUrl: string | null;
  /** https://wa.me/... pronto (só quando o telefone é utilizável). */
  whatsappUrl: string | null;
}

// Quem normalmente paga o cachê primeiro. O contratante (BOOKER) e o produtor/
// promoter respondem pelo pagamento antes da casa; imprensa quase nunca paga.
const ROLE_PRIORITY: Record<string, number> = {
  BOOKER: 0,
  PROMOTER: 1,
  VENUE: 2,
  PRODUCER: 3,
  OTHER: 4,
  PRESS: 5,
};

function roleRank(role?: string | null): number {
  if (!role) return ROLE_PRIORITY.OTHER;
  return ROLE_PRIORITY[role] ?? ROLE_PRIORITY.OTHER;
}

function hasChannel(c: BillingContactLike): boolean {
  return Boolean((c.email && c.email.trim()) || (c.phone && c.phone.trim()));
}

// Ordem de prioridade de cobrança: papel, depois nome (pt-BR) e id (estável).
function compareBillingContacts(a: BillingContactLike, b: BillingContactLike): number {
  return (
    roleRank(a.role) - roleRank(b.role) ||
    a.name.localeCompare(b.name, "pt-BR") ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Lista os contatos alcançáveis (com e-mail ou telefone) vinculados ao show, em
 * ordem de prioridade de cobrança (contratante/promoter antes da casa; desempate
 * por nome/id). O primeiro é a escolha automática; os demais ficam disponíveis para
 * o usuário escolher manualmente quem cobrar.
 */
export function reachableBillingContacts(
  contacts: BillingContactLike[],
): BillingContactLike[] {
  return contacts.filter(hasChannel).sort(compareBillingContacts);
}

/**
 * Escolhe o melhor contato para cobrar entre os vinculados ao show: só os que têm
 * algum canal (e-mail ou telefone); prioriza pelo papel (contratante/promoter antes
 * da casa), desempatando por nome (pt-BR) e id para ser estável. `null` se nenhum
 * contato tem como ser alcançado.
 */
export function pickBillingContact(
  contacts: BillingContactLike[],
): BillingContactLike | null {
  return reachableBillingContacts(contacts)[0] ?? null;
}

/**
 * Escolhe o contato responsável pelo PAGAMENTO do show (o "contratante"): prioriza
 * pelo papel (contratante/promoter antes da casa), desempatando por nome (pt-BR) e
 * id. Diferente de `pickBillingContact`, NÃO exige canal de contato — serve para
 * atribuir/agrupar shows por quem paga, mesmo sem e-mail/telefone cadastrado.
 * `null` se o show não tem nenhum contato vinculado.
 */
export function pickPayerContact<C extends BillingContactLike>(
  contacts: C[],
): C | null {
  if (contacts.length === 0) return null;
  return [...contacts].sort(compareBillingContacts)[0];
}

/** "YYYY-MM-DD"/Date → "DD/MM/AAAA" em UTC (sem depender de locale/timezone). */
function billingDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Local do show para a mensagem: "venue · city", ou um dos dois, ou "". */
function venueLabel(show: BillingShowInfo): string {
  const venue = show.venue?.trim() || "";
  const city = show.city?.trim() || "";
  if (venue && city) return `${venue} · ${city}`;
  return venue || city || "";
}

/**
 * Redige a mensagem de cobrança (assunto + corpo) em pt-BR. Educada e objetiva:
 * referencia o show (título, data, local), o valor em aberto e pede a confirmação
 * do pagamento. Assina com o nome artístico/usuário quando informado.
 */
export function buildDunningMessage(
  show: BillingShowInfo,
  opts: { contactName?: string | null; fromName?: string | null } = {},
): DunningMessage {
  const valor = formatMoney(show.outstanding);
  const data = billingDate(show.date);
  const local = venueLabel(show);
  const ondeQuando = local ? `em ${data}, em ${local},` : `em ${data}`;

  const saudacao = opts.contactName?.trim()
    ? `Olá, ${opts.contactName.trim()}!`
    : "Olá!";

  const lines = [
    saudacao,
    "",
    `Tudo bem? Passando para confirmar o pagamento do cachê do show "${show.title}", ` +
      `realizado ${ondeQuando} no valor de ${valor}.`,
    "",
    "Poderia me confirmar a previsão de pagamento? Se já tiver sido pago, " +
      "me avise para eu dar baixa por aqui. Obrigado!",
  ];
  if (opts.fromName?.trim()) {
    lines.push("", opts.fromName.trim());
  }

  return {
    subject: `Cachê pendente — ${show.title}`,
    body: lines.join("\n"),
  };
}

// DDI padrão da base (foco pt-BR/LATAM — ver business-plan.md).
const DEFAULT_COUNTRY = "55";

/**
 * Normaliza um telefone para o formato aceito pelo wa.me (só dígitos, com DDI).
 * Heurística pt-BR: número local de 10–11 dígitos (DDD + assinante) ganha o DDI
 * 55; número que já começa com "55" e tem 12–13 dígitos é tratado como já tendo
 * o DDI; qualquer outro comprimento (e ≥ 8 dígitos) é usado como veio, assumindo
 * que já traz o código internacional. Abaixo de 8 dígitos → inválido (`null`).
 */
export function normalizeWhatsappPhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith(DEFAULT_COUNTRY) && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return DEFAULT_COUNTRY + digits;
  }
  // Já parece internacional (outro DDI ou formato longo): usa como veio.
  return digits;
}

/** Monta um mailto: com assunto/corpo codificados. `null` se não houver e-mail. */
export function buildMailtoUrl(
  email: string | null | undefined,
  subject: string,
  body: string,
): string | null {
  const addr = email?.trim();
  if (!addr) return null;
  const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${encodeURIComponent(addr)}?${params}`;
}

/** Monta um link wa.me com o texto pré-preenchido. `null` se o telefone não servir. */
export function buildWhatsappUrl(
  phone: string | null | undefined,
  text: string,
): string | null {
  const normalized = normalizeWhatsappPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

// Redige a cobrança e monta os atalhos para UM contato (já sabido alcançável).
function billingFor(
  show: BillingShowInfo,
  contact: BillingContactLike,
  fromName?: string | null,
): ShowBilling {
  const { subject, body } = buildDunningMessage(show, {
    contactName: contact.name,
    fromName,
  });
  return {
    contact,
    subject,
    body,
    mailtoUrl: buildMailtoUrl(contact.email, subject, body),
    // O WhatsApp não usa assunto; manda só o corpo da mensagem.
    whatsappUrl: buildWhatsappUrl(contact.phone, body),
  };
}

/**
 * Monta a cobrança para TODOS os contatos alcançáveis do show, em ordem de
 * prioridade (o primeiro é a escolha automática — ver `reachableBillingContacts`).
 * Permite à UI oferecer um seletor de "quem cobrar" sem recalcular nada no cliente.
 * Lista vazia quando o show não tem nenhum contato alcançável vinculado.
 */
export function buildShowBillings(
  show: BillingShowInfo,
  contacts: BillingContactLike[],
  opts: { fromName?: string | null } = {},
): ShowBilling[] {
  return reachableBillingContacts(contacts).map((contact) =>
    billingFor(show, contact, opts.fromName),
  );
}

/**
 * Junta tudo para o contato de maior prioridade: escolhe o contato a cobrar, redige
 * a mensagem e monta os atalhos mailto/WhatsApp prontos para a UI. `null` quando o
 * show não tem nenhum contato alcançável vinculado (a UI então sugere vincular um).
 */
export function buildShowBilling(
  show: BillingShowInfo,
  contacts: BillingContactLike[],
  opts: { fromName?: string | null } = {},
): ShowBilling | null {
  return buildShowBillings(show, contacts, opts)[0] ?? null;
}
