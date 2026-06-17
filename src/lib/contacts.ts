// Lógica de negócio do CRM de contatos (pura, sem dependência de banco/UI).
// Testada em contacts.test.ts. Valores monetários em CENTAVOS (inteiros).

import { normalizeText } from "./finance";
import { CONTACT_ROLES, SHOW_STATUSES, type ContactRole, type ShowStatus } from "./domain";

/** Forma mínima de show exigida pela agregação por contato. */
export interface ContactShowLike {
  id: string;
  title: string;
  date: Date | string;
  status: string;
  fee: number; // cachê acordado em centavos
}

export interface ContactShowsSummary<T extends ContactShowLike> {
  /** Total de shows vinculados ao contato. */
  total: number;
  /** Shows futuros (data >= agora), em ordem crescente de data. */
  upcoming: T[];
  /** Shows passados (data < agora), em ordem decrescente de data. */
  past: T[];
  /** Contagem por status (sempre inclui todos os status, mesmo com 0). */
  byStatus: Record<ShowStatus, number>;
  /** Soma do cachê dos shows não cancelados (centavos). */
  totalFee: number;
  /** Próximo show futuro não cancelado (o de data mais próxima), ou null. */
  nextShow: T | null;
}

function toTime(date: Date | string): number {
  return (typeof date === "string" ? new Date(date) : date).getTime();
}

/**
 * Resume o histórico de shows de um contato: separa futuros/passados, conta por
 * status, soma o cachê (excluindo cancelados) e aponta o próximo show.
 *
 * Regras:
 * - "Futuro" é `date >= now`; "passado" é `date < now` (limite no instante `now`).
 * - `totalFee` ignora shows CANCELLED (cachê que não vai/foi acontecer).
 * - `nextShow` é o futuro não cancelado de menor data; null se não houver.
 * - `now` é injetável para testes determinísticos.
 */
export function summarizeContactShows<T extends ContactShowLike>(
  shows: T[],
  now: Date = new Date(),
): ContactShowsSummary<T> {
  const nowTime = now.getTime();

  const byStatus = Object.fromEntries(
    SHOW_STATUSES.map((s) => [s, 0]),
  ) as Record<ShowStatus, number>;

  let totalFee = 0;
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const show of shows) {
    if (SHOW_STATUSES.includes(show.status as ShowStatus)) {
      byStatus[show.status as ShowStatus] += 1;
    }
    if (show.status !== "CANCELLED") {
      totalFee += show.fee;
    }
    if (toTime(show.date) >= nowTime) {
      upcoming.push(show);
    } else {
      past.push(show);
    }
  }

  upcoming.sort((a, b) => toTime(a.date) - toTime(b.date));
  past.sort((a, b) => toTime(b.date) - toTime(a.date));

  const nextShow = upcoming.find((s) => s.status !== "CANCELLED") ?? null;

  return {
    total: shows.length,
    upcoming,
    past,
    byStatus,
    totalFee,
    nextShow,
  };
}

// ── Filtro da lista de contatos ────────────────────────────────────────────
// Espelha o padrão de `filterShows`/`filterTransactions`: critérios via query
// string, filtragem em memória sobre o recorte já carregado do usuário (D9).

/** Forma mínima de contato exigida pela filtragem da lista. */
export interface ContactLike {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  role: string;
}

export interface ContactFilter {
  /** Termo de busca livre (casa nome + e-mail + telefone + notas, sem acento/caixa). */
  q?: string | null;
  /** Papel exato (VENUE/PROMOTER/...); inválido é ignorado. */
  role?: string | null;
}

/** True se `value` é um papel de contato conhecido. */
export function isValidContactRole(
  value: string | undefined | null,
): value is ContactRole {
  return Boolean(value) && (CONTACT_ROLES as readonly string[]).includes(value as string);
}

/** True se ao menos um critério do filtro está ativo (e válido). */
export function hasActiveContactFilter(filter: ContactFilter): boolean {
  return Boolean(normalizeText(filter.q) || isValidContactRole(filter.role));
}

/**
 * Filtra contatos pelos critérios informados. Critérios ausentes/inválidos são
 * ignorados. O termo `q` casa contra nome + e-mail + telefone + notas
 * normalizados (substring), combinado em AND com o papel. Pura.
 */
export function filterContacts<T extends ContactLike>(
  contacts: T[],
  filter: ContactFilter,
): T[] {
  const q = normalizeText(filter.q);
  const role = isValidContactRole(filter.role) ? filter.role : null;
  return contacts.filter((c) => {
    if (role && c.role !== role) return false;
    if (q) {
      const haystack = `${normalizeText(c.name)} ${normalizeText(c.email)} ${normalizeText(
        c.phone,
      )} ${normalizeText(c.notes)}`;
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

// ── Ranking de contratantes (atividade por contato) ─────────────────────────
// Quais contatos mais trazem shows e cachê. Espelha `rankShowsByProfit`
// (src/lib/finance.ts): lógica pura, genérica sobre metadados de exibição.

/** Forma mínima de show exigida pela agregação por contato no ranking. */
export interface ContactRankShowLike {
  status: string;
  date: Date | string;
  fee: number; // cachê acordado em centavos
}

/** Metadados mínimos do contato (para desempate e exibição). */
export interface ContactRankLike {
  id: string;
  name: string;
}

/** Um contato e os shows aos quais está vinculado. */
export interface ContactWithShows<C extends ContactRankLike> {
  contact: C;
  shows: ContactRankShowLike[];
}

export interface ContactRankRow<C extends ContactRankLike> {
  contact: C;
  /** Total de shows vinculados (todos os status). */
  totalShows: number;
  /** Shows não cancelados. */
  activeShows: number;
  /** Shows futuros não cancelados (`date >= now`). */
  upcomingShows: number;
  /** Soma do cachê dos shows não cancelados (centavos). */
  totalFee: number;
  /** Data do show não cancelado mais recente (passado ou futuro), ou null. */
  lastShowDate: Date | null;
}

export interface ContactsRanking<C extends ContactRankLike> {
  rows: ContactRankRow<C>[];
  /** Nº de contatos no ranking (com ao menos 1 show vinculado). */
  count: number;
  /** Contato no topo do ranking, ou null. */
  top: ContactRankRow<C> | null;
}

/**
 * Ordena os contatos pela atividade que geram: prioriza o cachê total (shows
 * não cancelados), depois o nº de shows ativos, e desempata por nome (pt-BR) e
 * id — ordenação estável e determinística. Considera apenas contatos com ao
 * menos um show vinculado (qualquer status). O cachê é por contato: um show com
 * vários contatos conta para cada um (cada relação é contabilizada).
 *
 * Regras:
 * - Shows CANCELLED não somam cachê nem contam como ativos/futuros.
 * - `upcomingShows` usa `date >= now` (mesma convenção de `summarizeContactShows`).
 * - `lastShowDate` é o show não cancelado de maior data (ou null se só houver
 *   cancelados).
 * - `now` é injetável para testes determinísticos.
 */
export function rankContactsByActivity<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  now: Date = new Date(),
): ContactsRanking<C> {
  const nowTime = now.getTime();
  const rows: ContactRankRow<C>[] = [];

  for (const { contact, shows } of items) {
    if (shows.length === 0) continue;

    let activeShows = 0;
    let upcomingShows = 0;
    let totalFee = 0;
    let lastTime = -Infinity;

    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      const t = toTime(s.date);
      activeShows += 1;
      totalFee += s.fee;
      if (t >= nowTime) upcomingShows += 1;
      if (t > lastTime) lastTime = t;
    }

    rows.push({
      contact,
      totalShows: shows.length,
      activeShows,
      upcomingShows,
      totalFee,
      lastShowDate: lastTime === -Infinity ? null : new Date(lastTime),
    });
  }

  rows.sort((a, b) => {
    if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee;
    if (b.activeShows !== a.activeShows) return b.activeShows - a.activeShows;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  return { rows, count: rows.length, top: rows[0] ?? null };
}
