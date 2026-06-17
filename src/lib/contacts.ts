// Lógica de negócio do CRM de contatos (pura, sem dependência de banco/UI).
// Testada em contacts.test.ts. Valores monetários em CENTAVOS (inteiros).

import { SHOW_STATUSES, type ShowStatus } from "./domain";

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
