// Lógica de negócio do CRM de contatos (pura, sem dependência de banco/UI).
// Testada em contacts.test.ts. Valores monetários em CENTAVOS (inteiros).

import {
  normalizeText,
  computeShowPnL,
  CONVERSION_TREND_EPSILON,
  type TxLike,
} from "./finance";
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

// ── Rentabilidade do contato (P&L dos shows que ele traz) ───────────────────
// Complementa `summarizeContactShows` (volume bruto de cachê) com o líquido
// depois dos custos, respondendo "este cliente dá dinheiro de verdade?" já no
// detalhe do contato. Reaproveita `computeShowPnL` (fonte única do P&L por show).

export interface ContactProfitSummary {
  /** Nº de shows considerados (não cancelados). */
  showCount: number;
  /** Cachê somado dos shows considerados (centavos). */
  totalFee: number;
  /** Receitas extras vinculadas somadas (centavos). */
  totalExtra: number;
  /** Despesas vinculadas somadas (centavos). */
  totalExpenses: number;
  /** Resultado líquido = cachê + extras − despesas (centavos). */
  totalNet: number;
  /** Resultado líquido médio por show (centavos, arredondado; 0 sem shows). */
  avgNet: number;
  /** Margem agregada (net / receita bruta), 0 se receita bruta 0. */
  margin: number;
}

/**
 * Agrega o P&L dos shows de UM contato (os já vinculados a ele), para exibir a
 * rentabilidade no detalhe do contato. Diferente de `rankContactsByProfit`
 * (finance.ts), que atribui cada show a um único pagador para reconciliar o
 * total: aqui o recorte já é "os shows deste contato", então somamos o P&L de
 * todos eles diretamente.
 *
 * Regras (espelham `summarizeContactShows.totalFee`):
 * - Exclui shows CANCELLED (cachê que não vai/foi acontecer).
 * - `txs` deve conter as transações vinculadas aos shows (filtradas por `showId`
 *   dentro de `computeShowPnL`); transações soltas não atrapalham.
 */
export function summarizeContactProfit<T extends ContactShowLike>(
  shows: T[],
  txs: TxLike[],
): ContactProfitSummary {
  let showCount = 0;
  let totalFee = 0;
  let totalExtra = 0;
  let totalExpenses = 0;
  let totalNet = 0;

  for (const show of shows) {
    if (show.status === "CANCELLED") continue;
    const pnl = computeShowPnL(show, txs);
    showCount += 1;
    totalFee += pnl.fee;
    totalExtra += pnl.extraIncome;
    totalExpenses += pnl.expenses;
    totalNet += pnl.net;
  }

  const gross = totalFee + totalExtra;
  return {
    showCount,
    totalFee,
    totalExtra,
    totalExpenses,
    totalNet,
    avgNet: showCount > 0 ? Math.round(totalNet / showCount) : 0,
    margin: gross === 0 ? 0 : totalNet / gross,
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

// ── Contatos para reativar (follow-up de relações dormentes) ────────────────
// Responde "quem eu deveria contatar de novo pra conseguir mais shows?": parte
// dos contatos que já trabalharam comigo (tiveram shows não cancelados no
// passado), mas estão "frios" — sem nada agendado e há tempo sem tocar.

/** Meia-noite UTC do dia de `date` (mesma convenção de dia de finance.ts). */
function utcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const DAY_MS = 86_400_000;

export interface ReengageRow<C extends ContactRankLike> {
  contact: C;
  /** Show não cancelado mais recente (sempre no passado para um row incluído). */
  lastShowDate: Date;
  /** Dias inteiros (UTC) desde o último show até `now`. */
  daysSinceLastShow: number;
  /** Nº de shows não cancelados já realizados (passados). */
  pastShows: number;
  /** Soma do cachê dos shows não cancelados (centavos) — valor da relação. */
  totalFee: number;
}

export interface ReengageList<C extends ContactRankLike> {
  rows: ReengageRow<C>[];
  count: number;
  /** Limite de dias sem contato usado para considerar a relação dormente. */
  staleDays: number;
}

export interface ReengageOptions {
  now?: Date;
  /** Dias sem show para a relação ser considerada dormente (padrão 60). */
  staleDays?: number;
}

/**
 * Lista os contatos dormentes que valem um follow-up. Inclui um contato quando:
 * - tem ao menos um show não cancelado no passado (`date < now`);
 * - não tem nenhum show não cancelado futuro (`date >= now`) — nada agendado;
 * - o último show não cancelado é há `>= staleDays` dias (padrão 60).
 *
 * Ordena pelos mais esquecidos primeiro (maior `daysSinceLastShow`), desempatando
 * pelo maior cachê acumulado (relações mais valiosas), depois nome (pt-BR) e id —
 * estável e determinística. Shows CANCELLED são ignorados em tudo. Pura;
 * `now`/`staleDays` injetáveis para testes.
 */
export function findContactsToReengage<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  opts: ReengageOptions = {},
): ReengageList<C> {
  const now = opts.now ?? new Date();
  const staleDays = Math.max(0, opts.staleDays ?? 60);
  const nowTime = now.getTime();
  const nowMidnight = utcMidnight(now);

  const rows: ReengageRow<C>[] = [];

  for (const { contact, shows } of items) {
    let pastShows = 0;
    let totalFee = 0;
    let lastTime = -Infinity;
    let hasUpcoming = false;

    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      const t = toTime(s.date);
      totalFee += s.fee;
      if (t >= nowTime) {
        hasUpcoming = true;
      } else {
        pastShows += 1;
        if (t > lastTime) lastTime = t;
      }
    }

    // Precisa de histórico passado e nada agendado adiante.
    if (hasUpcoming || pastShows === 0) continue;

    const lastShowDate = new Date(lastTime);
    const daysSinceLastShow = Math.floor((nowMidnight - utcMidnight(lastShowDate)) / DAY_MS);
    if (daysSinceLastShow < staleDays) continue;

    rows.push({ contact, lastShowDate, daysSinceLastShow, pastShows, totalFee });
  }

  rows.sort((a, b) => {
    if (b.daysSinceLastShow !== a.daysSinceLastShow) {
      return b.daysSinceLastShow - a.daysSinceLastShow;
    }
    if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  return { rows, count: rows.length, staleDays };
}

// ── Retenção / fidelização de contratantes (visão de carteira) ──────────────
// Responde "quanto da minha agenda vem de quem volta a me contratar?": uma
// métrica de CARTEIRA (não por contato como o ranking, nem dormente como o
// reativar). Mede quantos contratantes voltaram (≥2 shows não cancelados) e
// que fatia do faturamento eles representam — o sinal de booking sustentável
// (cliente fiel) vs. dependência de prospecção constante. Ver DECISIONS.md D47.

export interface RetentionRow<C extends ContactRankLike> {
  contact: C;
  /** Shows não cancelados vinculados (qualquer status exceto CANCELLED). */
  activeShows: number;
  /** Soma do cachê dos shows não cancelados (centavos). */
  totalFee: number;
  /** Data do show não cancelado mais recente, ou null. */
  lastShowDate: Date | null;
  /** True quando o contratante voltou (activeShows >= 2). */
  recurring: boolean;
}

export interface ClientRetention<C extends ContactRankLike> {
  /** Todos os contratantes com ≥1 show não cancelado, ordenados. */
  rows: RetentionRow<C>[];
  /** Subconjunto recorrente (≥2 shows não cancelados), na mesma ordem. */
  recurring: RetentionRow<C>[];
  /** Nº de contratantes com ≥1 show não cancelado. */
  totalClients: number;
  /** Nº de contratantes recorrentes (≥2 shows). */
  recurringClients: number;
  /** Nº de contratantes de um show só. */
  oneTimeClients: number;
  /** recurringClients / totalClients; null sem contratantes. */
  repeatRate: number | null;
  /** Soma dos shows não cancelados de todos os contratantes. */
  totalShows: number;
  /** Soma do cachê não cancelado de todos os contratantes (centavos). */
  totalFee: number;
  /** Soma do cachê dos contratantes recorrentes (centavos). */
  recurringFee: number;
  /** recurringFee / totalFee; null sem faturamento. */
  recurringFeeShare: number | null;
  /** Nº de shows não cancelados vindos dos contratantes recorrentes. */
  recurringShows: number;
  /** Soma do cachê dos contratantes de um show só (centavos). */
  oneTimeFee: number;
  /** Cachê médio POR SHOW dos recorrentes (centavos); null sem shows recorrentes. */
  recurringAvgFee: number | null;
  /** Cachê médio POR SHOW dos únicos (centavos); null sem contratante único. */
  oneTimeAvgFee: number | null;
  /** Média de shows por contratante; 0 sem contratantes. */
  avgShowsPerClient: number;
  /** Contratante com mais shows não cancelados (o mais fiel), ou null. */
  mostLoyal: RetentionRow<C> | null;
}

/**
 * Resume a fidelização da carteira de contratantes. Considera só contatos com
 * ao menos um show NÃO cancelado (quem de fato te contratou); um contatante é
 * "recorrente" quando tem ≥2 shows não cancelados (voltou a contratar).
 *
 * O cachê é por contato (um show com vários contatos conta para cada um), igual
 * ao ranking (D18). Inclui shows futuros não cancelados: uma re-contratação já
 * confirmada também é fidelização. Shows CANCELLED são ignorados em tudo.
 *
 * Ordena por nº de shows (desc), depois cachê (desc), nome (pt-BR) e id —
 * estável e determinística. Pura; `now` injetável para `lastShowDate`/testes.
 */
export function clientRetention<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  _now: Date = new Date(),
): ClientRetention<C> {
  const rows: RetentionRow<C>[] = [];

  for (const { contact, shows } of items) {
    let activeShows = 0;
    let totalFee = 0;
    let lastTime = -Infinity;

    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      const t = toTime(s.date);
      activeShows += 1;
      totalFee += s.fee;
      if (t > lastTime) lastTime = t;
    }

    if (activeShows === 0) continue;

    rows.push({
      contact,
      activeShows,
      totalFee,
      lastShowDate: lastTime === -Infinity ? null : new Date(lastTime),
      recurring: activeShows >= 2,
    });
  }

  rows.sort((a, b) => {
    if (b.activeShows !== a.activeShows) return b.activeShows - a.activeShows;
    if (b.totalFee !== a.totalFee) return b.totalFee - a.totalFee;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  const recurring = rows.filter((r) => r.recurring);
  const totalClients = rows.length;
  const recurringClients = recurring.length;
  const oneTimeClients = totalClients - recurringClients;
  const totalShows = rows.reduce((acc, r) => acc + r.activeShows, 0);
  const totalFee = rows.reduce((acc, r) => acc + r.totalFee, 0);
  const recurringFee = recurring.reduce((acc, r) => acc + r.totalFee, 0);
  const recurringShows = recurring.reduce((acc, r) => acc + r.activeShows, 0);
  // Contratantes de um show só têm exatamente 1 show cada, então o nº de shows
  // únicos == oneTimeClients e o cachê médio por show == oneTimeFee / clientes.
  const oneTimeFee = totalFee - recurringFee;

  return {
    rows,
    recurring,
    totalClients,
    recurringClients,
    oneTimeClients,
    repeatRate: totalClients > 0 ? recurringClients / totalClients : null,
    totalShows,
    totalFee,
    recurringFee,
    recurringFeeShare: totalFee > 0 ? recurringFee / totalFee : null,
    recurringShows,
    oneTimeFee,
    recurringAvgFee: recurringShows > 0 ? recurringFee / recurringShows : null,
    oneTimeAvgFee: oneTimeClients > 0 ? oneTimeFee / oneTimeClients : null,
    avgShowsPerClient: totalClients > 0 ? totalShows / totalClients : 0,
    mostLoyal: rows[0] ?? null,
  };
}

// ── Preço da fidelidade (cachê por show: recorrentes × únicos) ──────────────
// Responde "meus clientes fiéis pagam mais ou menos por gig do que quem me
// contrata uma vez só?" — o sinal de LOYALTY CREEP (desconto de fidelidade
// silencioso) vs. prêmio de recorrência. Compara o cachê MÉDIO POR SHOW dos
// dois segmentos da retenção; distinto do `recurringFeeShare` (que é fatia de
// VOLUME, não preço unitário). Ver DECISIONS.md D344.

/** Limiar RELATIVO (5%) abaixo do qual os preços dos dois segmentos empatam. */
export const RETENTION_PRICING_EPSILON = 0.05;

export type RetentionPricingDirection = "recurring-more" | "recurring-less" | "similar";

export interface RetentionPricingSignal {
  /** Cachê médio por show dos recorrentes (centavos). */
  recurringAvgFee: number;
  /** Cachê médio por show dos únicos (centavos). */
  oneTimeAvgFee: number;
  /** recurringAvgFee − oneTimeAvgFee (centavos, com sinal). */
  delta: number;
  /** delta / max(recurringAvgFee, oneTimeAvgFee); em [-1, 1]. */
  relativeDelta: number;
  direction: RetentionPricingDirection;
}

/**
 * Compara o cachê médio POR SHOW entre contratantes recorrentes e de um show
 * só, a partir de um `ClientRetention` já computado (zero recomputação). Só faz
 * sentido quando existem os DOIS segmentos com faturamento mensurável (ambos os
 * médios > 0); devolve `null` caso contrário. `direction` usa um limiar
 * RELATIVO (`RETENTION_PRICING_EPSILON`): dentro dele os preços são
 * equivalentes ("similar"), acima o recorrente paga mais/menos por gig.
 * Pura/determinística.
 */
export function retentionPricingSignal<C extends ContactRankLike>(
  retention: ClientRetention<C>,
): RetentionPricingSignal | null {
  const { recurringAvgFee, oneTimeAvgFee } = retention;
  if (recurringAvgFee == null || oneTimeAvgFee == null) return null;
  if (recurringAvgFee <= 0 || oneTimeAvgFee <= 0) return null;

  const delta = recurringAvgFee - oneTimeAvgFee;
  const denom = Math.max(recurringAvgFee, oneTimeAvgFee);
  const relativeDelta = denom > 0 ? delta / denom : 0;

  let direction: RetentionPricingDirection = "similar";
  if (relativeDelta > RETENTION_PRICING_EPSILON) direction = "recurring-more";
  else if (relativeDelta < -RETENTION_PRICING_EPSILON) direction = "recurring-less";

  return { recurringAvgFee, oneTimeAvgFee, delta, relativeDelta, direction };
}

// ── Fiéis cobrando abaixo do balcão (lista acionável do desconto de fidelidade) ──
// O `retentionPricingSignal` (D344) dá o veredito AGREGADO ("seus fiéis pagam
// menos por show"), mas uma média de carteira pode esconder o caso individual:
// mesmo quando o agregado dá "recurring-more", há recorrentes específicos que
// você cobra ABAIXO do que um estranho paga. Este helper transforma o sinal em
// LISTA acionável — exatamente com quem renegociar o preço na renovação —
// comparando o cachê médio POR SHOW de cada recorrente ao balcão dos únicos
// (`oneTimeAvgFee`). Ver DECISIONS.md D346.

export interface UnderpricedLoyalClient<C extends ContactRankLike> {
  contact: C;
  /** Shows não cancelados do recorrente. */
  activeShows: number;
  /** Cachê somado do recorrente (centavos). */
  totalFee: number;
  /** Cachê médio POR SHOW do recorrente (centavos, arredondado). */
  avgFeePerShow: number;
  /** Quanto abaixo do balcão dos únicos, em centavos (sempre > 0). */
  shortfall: number;
  /** shortfall / benchmark (0..1) — o tamanho relativo do desconto. */
  shortfallPct: number;
}

export interface UnderpricedLoyalClients<C extends ContactRankLike> {
  /** Balcão de referência: cachê médio por show dos contratantes de um show só (centavos). */
  benchmark: number;
  /** Recorrentes cobrando abaixo do balcão, do maior desconto ao menor. */
  clients: UnderpricedLoyalClient<C>[];
}

/**
 * A partir de um `ClientRetention` já computado, lista os contratantes
 * RECORRENTES cujo cachê médio por show está MEANINGFULLY abaixo do balcão dos
 * contratantes de um show só (`oneTimeAvgFee`) — os alvos concretos de
 * renegociação do "desconto de fidelidade silencioso" (D344). "Abaixo" usa o
 * mesmo limiar RELATIVO da D344 (`RETENTION_PRICING_EPSILON`, 5%): só entra quem
 * cobra menos que `benchmark * (1 − epsilon)`, evitando ruído de centavos.
 *
 * Independe da DIREÇÃO agregada: mesmo com o agregado dando "recurring-more" um
 * recorrente pontual pode estar barato, e ele deve aparecer. Devolve `null`
 * quando não há balcão mensurável (sem contratante único com cachê). Ordena pelo
 * maior desconto absoluto (centavos), depois nome (pt-BR) e id — determinística.
 * Pura; zero recomputação (deriva de `retention.recurring`).
 */
export function underpricedLoyalClients<C extends ContactRankLike>(
  retention: ClientRetention<C>,
  epsilon: number = RETENTION_PRICING_EPSILON,
): UnderpricedLoyalClients<C> | null {
  const benchmark = retention.oneTimeAvgFee;
  if (benchmark == null || benchmark <= 0) return null;

  const threshold = benchmark * (1 - epsilon);
  const clients: UnderpricedLoyalClient<C>[] = [];

  for (const row of retention.recurring) {
    if (row.activeShows <= 0) continue;
    const avgFeePerShow = Math.round(row.totalFee / row.activeShows);
    if (avgFeePerShow >= threshold) continue;

    const shortfall = benchmark - avgFeePerShow;
    clients.push({
      contact: row.contact,
      activeShows: row.activeShows,
      totalFee: row.totalFee,
      avgFeePerShow,
      shortfall,
      shortfallPct: shortfall / benchmark,
    });
  }

  clients.sort(
    (a, b) =>
      b.shortfall - a.shortfall ||
      a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
      a.contact.id.localeCompare(b.contact.id),
  );

  return { benchmark, clients };
}

// ── Movimento do desconto de fidelidade ano a ano ───────────────────────────
// O `retentionPricingSignal` (D344) dá um retrato ESTÁTICO da carteira inteira
// ("hoje seus fiéis pagam menos por gig"), mas não diz se isso está PIORANDO ou
// MELHORANDO. Um desconto de fidelidade que se aprofunda ano após ano é um
// vazamento de preço silencioso; um que encolhe é o músico recuperando margem.
// Este helper recorta os shows por ano civil (UTC), calcula o sinal de preço de
// cada ano isoladamente — dentro do ano, "recorrente" = ≥2 shows NAQUELE ano —
// e compara o ano cheio mais recente com o anterior, como os demais comparativos
// ano a ano (`compareCancellationRate`/D122). Distinto do sinal agregado: ali a
// recorrência é conceito de CARTEIRA (todo o histórico); aqui é dentro do ano,
// para que "fiel × único" faça sentido no recorte anual. Ver DECISIONS.md D351.

export interface RetentionPricingComparison {
  /** Ano civil (UTC) do período atual (o mais recente comparável). */
  year: number;
  /** Ano civil anterior (`year - 1`). */
  previousYear: number;
  /** Sinal de preço da fidelidade DENTRO do ano atual. */
  current: RetentionPricingSignal;
  /** Sinal de preço da fidelidade DENTRO do ano anterior. */
  previous: RetentionPricingSignal;
  /**
   * Variação do gap relativo de preço (`current.relativeDelta −
   * previous.relativeDelta`, em pontos, faixa -2..2). Positivo = os fiéis
   * passaram a pagar relativamente MAIS por gig (prêmio cresceu / desconto
   * encolheu); negativo = o desconto de fidelidade se aprofundou.
   */
  gapDelta: number;
  /**
   * Direção do movimento contra o limiar `RETENTION_PRICING_EPSILON`:
   * - "improved": o preço da fidelidade moveu a favor (gap subiu além do limiar);
   * - "worsened": desconto de fidelidade se aprofundou (gap caiu além do limiar);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Sinal de preço da fidelidade (`retentionPricingSignal`) restrito aos shows de
 * um ANO civil (UTC) específico. Recorta cada contato aos shows daquele ano
 * ANTES de computar a retenção, de modo que "recorrente" passa a significar ≥2
 * shows NAQUELE ano — o recorte honesto para uma leitura anual (a carteira toda
 * segue no sinal agregado). Devolve `null` quando o ano não tem os dois
 * segmentos com cachê mensurável. Pura e determinística; usa o ano UTC da `date`,
 * consistente com `filterShowsByYear`/`clientConcentrationYears`.
 */
export function retentionPricingSignalForYear<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  year: number,
): RetentionPricingSignal | null {
  const filtered = items.map(({ contact, shows }) => ({
    contact,
    shows: shows.filter((s) => new Date(s.date).getUTCFullYear() === year),
  }));
  return retentionPricingSignal(clientRetention(filtered));
}

/**
 * Compara o preço da fidelidade entre o ano cheio mais recente que tem sinal e o
 * ano IMEDIATAMENTE anterior — a "ano a ano" honesta exige anos consecutivos, do
 * contrário a sazonalidade da carteira polui a leitura. Varre os anos com shows
 * não cancelados do mais novo ao mais antigo e devolve o primeiro par
 * consecutivo `(y, y-1)` em que AMBOS têm um sinal mensurável; `null` se nenhum
 * par consecutivo qualifica (carteira nova, ano isolado, ou algum ano sem os dois
 * segmentos). O veredito de tendência usa o mesmo limiar relativo do sinal
 * (`RETENTION_PRICING_EPSILON`, 5%). Pura, sem I/O nem `now`: o recorte é por ano
 * civil da `date`, não pelo relógio.
 */
export function compareRetentionPricingYoY<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  epsilon: number = RETENTION_PRICING_EPSILON,
): RetentionPricingComparison | null {
  const years = new Set<number>();
  for (const { shows } of items) {
    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      years.add(new Date(s.date).getUTCFullYear());
    }
  }

  const sorted = [...years].sort((a, b) => b - a);
  for (const year of sorted) {
    const current = retentionPricingSignalForYear(items, year);
    if (!current) continue;
    const previous = retentionPricingSignalForYear(items, year - 1);
    if (!previous) continue;

    const gapDelta = current.relativeDelta - previous.relativeDelta;
    const trend =
      gapDelta >= epsilon ? "improved" : gapDelta <= -epsilon ? "worsened" : "stable";

    return { year, previousYear: year - 1, current, previous, gapDelta, trend };
  }

  return null;
}

// ── Movers individuais do preço ano a ano (quem você subiu/baixou) ──────────
// O `compareRetentionPricingYoY` (D351) dá o movimento AGREGADO do desconto de
// fidelidade ("a carteira melhorou/piorou"), mas uma média esconde o caso
// individual: dentro de um "melhorou" há contratantes que você BAIXOU o preço, e
// dentro de um "piorou" há quem você SUBIU. Este helper abre o mesmo par de anos
// por CONTATO — o cachê médio por show de cada contratante em `year` × `previousYear`
// — e separa quem subiu de quem baixou, com o tamanho da variação. É a lista
// acionável do movimento de preço: exatamente com quem você renegociou (para bem
// ou para mal) de um ano para o outro. Ver DECISIONS.md D352.

export type RetentionPriceMoveDirection = "up" | "down" | "flat";

export interface RetentionPriceMover<C extends ContactRankLike> {
  contact: C;
  /** Cachê médio por show no ano anterior (centavos, arredondado). */
  previousAvgFee: number;
  /** Cachê médio por show no ano atual (centavos, arredondado). */
  currentAvgFee: number;
  /** Shows não cancelados no ano anterior. */
  previousShows: number;
  /** Shows não cancelados no ano atual. */
  currentShows: number;
  /** currentAvgFee − previousAvgFee (centavos, com sinal). */
  delta: number;
  /** delta / previousAvgFee — variação percentual do preço ano a ano. */
  relativeDelta: number;
  direction: RetentionPriceMoveDirection;
}

export interface RetentionPriceMovers<C extends ContactRankLike> {
  /** Ano atual do comparativo. */
  year: number;
  /** Ano anterior (`year - 1`). */
  previousYear: number;
  /** Contatos presentes com cachê nos DOIS anos, do maior movimento ao menor. */
  movers: RetentionPriceMover<C>[];
  /** Subconjunto que você SUBIU o preço (`direction === "up"`), maior alta primeiro. */
  raised: RetentionPriceMover<C>[];
  /** Subconjunto que você BAIXOU o preço (`direction === "down"`), maior queda primeiro. */
  lowered: RetentionPriceMover<C>[];
  /** Quantos ficaram estáveis (variação dentro do limiar). */
  flatCount: number;
}

/** Cachê médio por show (arredondado) de um contato num ano civil UTC; null sem cachê. */
function contactYearAvgFee<C extends ContactRankLike>(
  { shows }: ContactWithShows<C>,
  year: number,
): { avgFee: number; shows: number } | null {
  let count = 0;
  let fee = 0;
  for (const s of shows) {
    if (s.status === "CANCELLED") continue;
    if (new Date(s.date).getUTCFullYear() !== year) continue;
    count += 1;
    fee += s.fee;
  }
  if (count === 0 || fee <= 0) return null;
  return { avgFee: Math.round(fee / count), shows: count };
}

/**
 * Abre o movimento de preço ano a ano por CONTATO, para um par de anos já
 * escolhido (tipicamente o mesmo par do `compareRetentionPricingYoY`/D351, para
 * que o agregado e os movers contem a mesma história). Para cada contato compara
 * o cachê médio por show em `previousYear` com o de `year` e classifica em
 * subiu/baixou/estável contra o limiar RELATIVO (`RETENTION_PRICING_EPSILON`, 5%
 * sobre `previousAvgFee`).
 *
 * Só entram contatos com cachê MENSURÁVEL nos DOIS anos (≥1 show não cancelado e
 * soma > 0 em cada), pois sem os dois lados não há variação a medir — quem entrou
 * ou saiu da carteira no intervalo é churn/aquisição, outro eixo. `direction`
 * independe do movimento AGREGADO: um "melhorou" de carteira pode conter quedas
 * individuais, e elas aparecem em `lowered`. Pura e determinística; recorte por
 * ano civil UTC da `date`, sem `now`.
 */
export function retentionPriceMovers<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  year: number,
  previousYear: number,
  epsilon: number = RETENTION_PRICING_EPSILON,
): RetentionPriceMovers<C> {
  const movers: RetentionPriceMover<C>[] = [];

  for (const item of items) {
    const prev = contactYearAvgFee(item, previousYear);
    if (!prev) continue;
    const curr = contactYearAvgFee(item, year);
    if (!curr) continue;

    const delta = curr.avgFee - prev.avgFee;
    const relativeDelta = delta / prev.avgFee;
    const direction: RetentionPriceMoveDirection =
      relativeDelta > epsilon ? "up" : relativeDelta < -epsilon ? "down" : "flat";

    movers.push({
      contact: item.contact,
      previousAvgFee: prev.avgFee,
      currentAvgFee: curr.avgFee,
      previousShows: prev.shows,
      currentShows: curr.shows,
      delta,
      relativeDelta,
      direction,
    });
  }

  // Ordena pelo maior movimento absoluto (centavos), depois nome (pt-BR) e id.
  movers.sort(
    (a, b) =>
      Math.abs(b.delta) - Math.abs(a.delta) ||
      a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
      a.contact.id.localeCompare(b.contact.id),
  );

  const raised = movers
    .filter((m) => m.direction === "up")
    .sort(
      (a, b) =>
        b.delta - a.delta ||
        a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
        a.contact.id.localeCompare(b.contact.id),
    );
  const lowered = movers
    .filter((m) => m.direction === "down")
    .sort(
      (a, b) =>
        a.delta - b.delta ||
        a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
        a.contact.id.localeCompare(b.contact.id),
    );
  const flatCount = movers.length - raised.length - lowered.length;

  return { year, previousYear, movers, raised, lowered, flatCount };
}

// ── Concentração de receita por contratante (risco de dependência) ──────────
// Responde "quão dependente a minha receita é de poucos contratantes?": uma
// leitura de RISCO (não de volume como o ranking, nem de recompra como a
// retenção). Mede quanto do cachê vem do maior contratante e se a carteira é
// concentrada — o equivalente do mix de receitas (incomeMix/D45) no eixo de
// contratantes. Perder um cliente que responde por 70% do faturamento é um
// risco operacional que nenhuma tela apontava. Ver DECISIONS.md D50.

export type ClientConcentrationLevel = "concentrated" | "moderate" | "diversified";

export interface ClientShareRow<C extends ContactRankLike> {
  contact: C;
  /** Soma do cachê dos shows não cancelados (centavos). */
  totalFee: number;
  /** Nº de shows não cancelados que trouxe. */
  activeShows: number;
  /** Participação no cachê total da carteira (0..1). */
  share: number;
}

export interface ClientConcentration<C extends ContactRankLike> {
  /** Contratantes com cachê > 0, ordem decrescente por cachê. */
  rows: ClientShareRow<C>[];
  /** Nº de contratantes com faturamento (cachê > 0). */
  clientCount: number;
  /** Soma do cachê não cancelado de todos os contratantes (centavos). */
  totalFee: number;
  /** Maior contratante por cachê, ou null se não há faturamento. */
  top: ClientShareRow<C> | null;
  /** Participação do maior contratante (0..1). */
  topShare: number;
  /** Participação acumulada dos 3 maiores (0..1). */
  top3Share: number;
  /**
   * Índice de Herfindahl–Hirschman (HHI): soma dos quadrados das participações
   * (0..1). 1 = um único contratante; quanto menor, mais distribuído.
   */
  hhi: number;
  /**
   * Nº efetivo de contratantes (1/HHI, índice de Simpson): "como se" a receita
   * viesse de N contratantes de mesmo tamanho. 0 quando não há faturamento.
   */
  effectiveClients: number;
  /** Veredito de concentração (derivado do HHI e do nº de contratantes). */
  level: ClientConcentrationLevel;
}

/**
 * Classifica a concentração a partir do HHI e do nº de contratantes. Mesmos
 * limiares do mix de receitas (incomeMix/D45), por consistência: um cliente só,
 * ou HHI ≥ 0,45 → concentrada; HHI ≥ 0,25 → moderada; abaixo → diversificada.
 */
function concentrationLevel(hhi: number, clientCount: number): ClientConcentrationLevel {
  if (clientCount <= 1) return "concentrated";
  if (hhi >= 0.45) return "concentrated";
  if (hhi >= 0.25) return "moderate";
  return "diversified";
}

/**
 * Mede a concentração da receita entre os contratantes: quanto do cachê total
 * vem do maior cliente (`topShare`), dos três maiores (`top3Share`), o HHI, o
 * nº efetivo de contratantes e um veredito de dependência.
 *
 * O cachê é por contato (um show com vários contatos conta para cada um, igual
 * ao ranking D18); o denominador é a soma desses cachês, então as participações
 * sempre somam 1. Considera só shows NÃO cancelados; contatos sem faturamento
 * (cachê total 0) ficam de fora (não há dependência de quem não traz dinheiro).
 * Pura e determinística; ordena por cachê (desc), nome (pt-BR) e id.
 */
export function clientConcentration<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
): ClientConcentration<C> {
  const tally: { contact: C; totalFee: number; activeShows: number }[] = [];
  let totalFee = 0;

  for (const { contact, shows } of items) {
    let fee = 0;
    let activeShows = 0;
    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      fee += s.fee;
      activeShows += 1;
    }
    if (fee <= 0) continue; // sem faturamento → não entra na concentração
    tally.push({ contact, totalFee: fee, activeShows });
    totalFee += fee;
  }

  const rows: ClientShareRow<C>[] = tally
    .map(({ contact, totalFee: fee, activeShows }) => ({
      contact,
      totalFee: fee,
      activeShows,
      share: totalFee === 0 ? 0 : fee / totalFee,
    }))
    .sort(
      (a, b) =>
        b.totalFee - a.totalFee ||
        a.contact.name.localeCompare(b.contact.name, "pt-BR") ||
        a.contact.id.localeCompare(b.contact.id),
    );

  const hhi = rows.reduce((acc, r) => acc + r.share * r.share, 0);
  const top3Share = rows.slice(0, 3).reduce((acc, r) => acc + r.share, 0);
  const top = rows[0] ?? null;

  return {
    rows,
    clientCount: rows.length,
    totalFee,
    top,
    topShare: top?.share ?? 0,
    top3Share,
    hhi,
    effectiveClients: hhi === 0 ? 0 : 1 / hhi,
    level: concentrationLevel(hhi, rows.length),
  };
}

/**
 * Limiar (em participação, 0..1) abaixo do qual a variação de share de um
 * contratante entre dois anos é ruído — não vira 🟢/🔴 na coluna "vs. {ano-1}".
 * 0,02 = 2 pontos percentuais, na mesma escala inteira que a página exibe.
 */
export const CLIENT_SHARE_TREND_EPSILON = 0.02;

/** Direção da variação da participação de UM contratante entre dois anos. */
export type ClientShareTrend = "up" | "down" | "flat";

export interface ClientShareChange<C extends ContactRankLike> {
  contact: C;
  /** Participação no cachê total no ano atual (0..1). */
  currentShare: number;
  /** Participação no cachê total no ano anterior (0..1). */
  previousShare: number;
  /** Variação da participação (atual − anterior), em pontos de participação. */
  shareDelta: number;
  /**
   * `up` = a receita ficou MAIS dependente deste contratante que no ano anterior
   * (participação subiu além do epsilon); `down` = menos dependente; `flat` =
   * variação dentro de `CLIENT_SHARE_TREND_EPSILON` (ruído).
   */
  trend: ClientShareTrend;
}

/**
 * Situação de uma linha da tabela de concentração (ano atual) frente ao ano
 * anterior, para a coluna "vs. {ano-1}":
 * - "changed": o contratante faturou nos dois anos — traz a variação de share;
 * - "new": só apareceu no ano atual (começou a faturar agora);
 * - "none": id desconhecido / não comparável.
 */
export type ClientShareRowStatus<C extends ContactRankLike> =
  | { kind: "changed"; change: ClientShareChange<C> }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da concentração do ano atual com sua situação frente ao ano
 * anterior, indexando por `contact.id` para o consumidor resolver a coluna
 * "vs. {ano-1}" em O(1) — o detalhe por contratante do card-manchete agregado
 * (`compareClientConcentration`/D120), espelhando `indexContactPaymentLagChanges`
 * (D196). Puro: recebe as duas `clientConcentration` já computadas e devolve uma
 * função de lookup. Um contratante com cachê nos dois anos vira "changed" (com o
 * `shareDelta` e o `trend` gateado por `CLIENT_SHARE_TREND_EPSILON`); um que só
 * faturou no atual vira "new"; qualquer id fora da carteira atual vira "none".
 *
 * A leitura de share é aplicada ao card-manchete por-linha: subir a dependência
 * de UM contratante (`up`) é o sinal de concentração (🔴 na página), na mesma
 * moldura em que o card agregado trata `topShare` subindo como piora.
 */
export function indexClientShareChanges<C extends ContactRankLike>(
  current: ClientConcentration<C>,
  previous: ClientConcentration<C>,
): (contactId: string | null | undefined) => ClientShareRowStatus<C> {
  const currById = new Map<string, ClientShareRow<C>>();
  for (const r of current.rows) currById.set(r.contact.id, r);
  const prevById = new Map<string, ClientShareRow<C>>();
  for (const r of previous.rows) prevById.set(r.contact.id, r);

  return (contactId) => {
    if (!contactId) return { kind: "none" };
    const cur = currById.get(contactId);
    if (!cur) return { kind: "none" };
    const prev = prevById.get(contactId);
    if (!prev) return { kind: "new" };
    const shareDelta = cur.share - prev.share;
    const trend: ClientShareTrend =
      shareDelta > CLIENT_SHARE_TREND_EPSILON
        ? "up"
        : shareDelta < -CLIENT_SHARE_TREND_EPSILON
          ? "down"
          : "flat";
    return {
      kind: "changed",
      change: {
        contact: cur.contact,
        currentShare: cur.share,
        previousShare: prev.share,
        shareDelta,
        trend,
      },
    };
  };
}

/**
 * Anos (UTC, decrescente) dos shows que ENTRAM na concentração de contratantes —
 * não cancelados e com cachê > 0. Ancora o seletor de período no próprio sinal
 * (e não em todos os shows vinculados): um ano só com cancelados ou cachê 0 não
 * mede concentração e viraria uma pílula que cai num estado vazio — mesma
 * disciplina de `cancelledShowYears`/`bookingLeadTimeYears`. Pura e determinística;
 * deduplica e usa o ano UTC da `date`, consistente com `filterShowsByYear`/D108.
 */
export function clientConcentrationYears<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
): number[] {
  const years = new Set<number>();
  for (const { shows } of items) {
    for (const s of shows) {
      if (s.status === "CANCELLED") continue;
      if (s.fee <= 0) continue;
      years.add(new Date(s.date).getUTCFullYear());
    }
  }
  return [...years].sort((a, b) => b - a);
}

// ── Cancelamentos por contratante (quem mais fura o combinado?) ─────────────
// Responde "quais contratantes mais cancelam shows já marcados?": para cada
// contato, cruza os shows CANCELLED com o total de shows vinculados e mede a
// taxa de cancelamento e o cachê perdido. Em todo o resto da plataforma os
// cancelados são ruído a excluir (concentração, ranking, fidelização); aqui
// são o próprio sinal — a confiabilidade do comprador. Distinto da taxa global
// do funil (`showPipeline.conversionRate`, agregada, sem recorte por quem paga).
//
// Contagem por relação (um show com vários contatos conta para cada um, igual
// ao ranking/concentração). Só entram na lista contatos com >=1 cancelamento;
// os agregados do topo somam todos os contatos com shows vinculados.

/** Amostra mínima de shows para a taxa de cancelamento ser confiável. */
export const MIN_CANCELLATION_SAMPLE = 3;

export interface CancellationRow<C extends ContactRankLike> {
  contact: C;
  /** Total de shows vinculados (todos os status). */
  totalShows: number;
  /** Shows CANCELLED vinculados. */
  cancelledShows: number;
  /** Fração de cancelamento (cancelledShows / totalShows, 0..1). */
  cancellationRate: number;
  /** Soma do cachê dos shows cancelados (centavos) — o combinado que caiu. */
  lostFee: number;
  /** true quando totalShows >= minSample (taxa estatisticamente confiável). */
  reliable: boolean;
}

export interface ContactCancellations<C extends ContactRankLike> {
  /** Contatos com >=1 cancelamento, do mais problemático ao menos. */
  rows: CancellationRow<C>[];
  /** Nº de contatos com ao menos um cancelamento. */
  contactCount: number;
  /** Total de relações show×contato consideradas (todos os status). */
  totalShows: number;
  /** Total de shows cancelados (somando as relações). */
  totalCancelled: number;
  /** Cachê total perdido em cancelamentos (centavos). */
  totalLostFee: number;
  /** Taxa de cancelamento da carteira (totalCancelled / totalShows, 0..1). */
  overallRate: number;
  /** Amostra mínima aplicada ao campo `reliable` de cada linha. */
  minSample: number;
}

/**
 * Mede a taxa de cancelamento por contratante: quantos dos shows marcados com
 * cada contato acabaram cancelados, e quanto de cachê combinado caiu junto.
 *
 * A contagem é por relação (um show com vários contatos conta para cada um,
 * igual ao ranking/concentração). Só viram linha os contatos com ao menos um
 * cancelamento; os totais do agregado somam todos os contatos com shows. A taxa
 * de um contato com poucos shows é ruidosa — `reliable` marca as linhas com
 * `totalShows >= minSample` (padrão `MIN_CANCELLATION_SAMPLE`), e a ordenação
 * põe as confiáveis primeiro (depois taxa desc, cancelados desc, cachê perdido
 * desc, nome pt-BR, id). Pura e determinística.
 */
export function cancellationByContact<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
  minSample: number = MIN_CANCELLATION_SAMPLE,
): ContactCancellations<C> {
  const rows: CancellationRow<C>[] = [];
  let totalShows = 0;
  let totalCancelled = 0;
  let totalLostFee = 0;

  for (const { contact, shows } of items) {
    if (shows.length === 0) continue;

    let cancelled = 0;
    let lostFee = 0;
    for (const s of shows) {
      if (s.status === "CANCELLED") {
        cancelled += 1;
        lostFee += s.fee;
      }
    }

    totalShows += shows.length;
    totalCancelled += cancelled;
    totalLostFee += lostFee;

    if (cancelled === 0) continue; // sem cancelamento → não entra na lista
    rows.push({
      contact,
      totalShows: shows.length,
      cancelledShows: cancelled,
      cancellationRate: cancelled / shows.length,
      lostFee,
      reliable: shows.length >= minSample,
    });
  }

  rows.sort((a, b) => {
    // Taxas confiáveis (amostra suficiente) primeiro.
    if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
    if (b.cancellationRate !== a.cancellationRate)
      return b.cancellationRate - a.cancellationRate;
    if (b.cancelledShows !== a.cancelledShows)
      return b.cancelledShows - a.cancelledShows;
    if (b.lostFee !== a.lostFee) return b.lostFee - a.lostFee;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  return {
    rows,
    contactCount: rows.length,
    totalShows,
    totalCancelled,
    totalLostFee,
    overallRate: totalShows === 0 ? 0 : totalCancelled / totalShows,
    minSample,
  };
}

/**
 * Anos (UTC, decrescente) dos shows **cancelados** vinculados aos contatos —
 * para montar o seletor de período de `/contatos/cancelamentos`. Diferente de
 * `showProfitYears` (que olha os shows ativos): aqui só entram anos com ao menos
 * um cancelamento, para o seletor nunca oferecer um ano que renderizaria a lista
 * vazia (o cancelamento é o próprio sinal da tela). Aceita `date` como `Date` ou
 * string ISO (normaliza via `new Date`), consistente com `ContactRankShowLike`.
 * Pura e determinística.
 */
export function cancelledShowYears<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
): number[] {
  const years = new Set<number>();
  for (const { shows } of items) {
    for (const s of shows) {
      if (s.status === "CANCELLED") {
        years.add(new Date(s.date).getUTCFullYear());
      }
    }
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Taxa de cancelamento a partir da qual um contratante **confiável** (amostra
 * suficiente) vira nudge no Painel. Abaixo disso o cancelamento é ocasional, não
 * um padrão que mereça alerta.
 */
export const HIGH_CANCELLATION_RATE = 0.3;
/** Taxa a partir da qual o nudge sobe o tom (crítico): metade ou mais fura. */
export const CRITICAL_CANCELLATION_RATE = 0.5;

export interface CancellationHeadline<C extends ContactRankLike> {
  /**
   * Deve aparecer no Painel? Só quando há um contratante **confiável**
   * (`totalShows >= minSample`) cuja taxa de cancelamento bate `highRate` — um
   * padrão de furar o combinado, não azar pontual. Contatos de amostra pequena
   * são ignorados de propósito (uma taxa alta com 1–2 shows é ruído), mesma
   * disciplina do selo "amostra pequena" da página (D177).
   */
  show: boolean;
  /** O pior confiável fura ≥ `criticalRate` (metade dos shows) — tom mais forte. */
  critical: boolean;
  /** Contratante mais problemático (maior taxa entre os confiáveis), ou null. */
  contact: C | null;
  /** Taxa de cancelamento desse contratante (0..1). */
  cancellationRate: number;
  /** Shows cancelados desse contratante. */
  cancelledShows: number;
  /** Total de shows vinculados a esse contratante (todos os status). */
  totalShows: number;
  /** Cachê perdido com os cancelamentos desse contratante (centavos). */
  lostFee: number;
  /**
   * Nº de contratantes confiáveis com taxa ≥ `highRate` (o pior + os demais) —
   * permite ao Painel dizer "e mais N" sem recontar.
   */
  flaggedCount: number;
}

/**
 * Resumo de Painel dos **cancelamentos por contratante**: deriva, de uma
 * `cancellationByContact` já computada, se o nudge de risco de confiabilidade
 * deve aparecer e com que urgência. Puro, sem I/O — espelha
 * `clientConcentrationHeadline`/`paymentLagHeadline`: a regra de exibição vive
 * aqui, o Painel só consome. Só dispara quando existe um contratante **confiável**
 * (amostra suficiente) que fura o combinado acima de `highRate`; contatos de
 * amostra pequena não contam (a mesma ressalva da página, resolvida no gate).
 */
export function cancellationHeadline<C extends ContactRankLike>(
  report: ContactCancellations<C>,
  highRate: number = HIGH_CANCELLATION_RATE,
  criticalRate: number = CRITICAL_CANCELLATION_RATE,
): CancellationHeadline<C> {
  // `rows` já vem ordenado confiáveis-primeiro e taxa desc, então o primeiro
  // confiável acima do limiar é o pior — mas filtrar deixa a intenção explícita
  // e dá a contagem dos demais sinalizados de brinde.
  const flagged = report.rows.filter(
    (r) => r.reliable && r.cancellationRate >= highRate,
  );
  const worst = flagged[0] ?? null;
  const critical = worst !== null && worst.cancellationRate >= criticalRate;
  return {
    show: worst !== null,
    critical,
    contact: worst?.contact ?? null,
    cancellationRate: worst?.cancellationRate ?? 0,
    cancelledShows: worst?.cancelledShows ?? 0,
    totalShows: worst?.totalShows ?? 0,
    lostFee: worst?.lostFee ?? 0,
    flaggedCount: flagged.length,
  };
}

/**
 * Limiar (em pontos de taxa, 0..1) abaixo do qual a variação da taxa de
 * cancelamento da carteira entre dois períodos é ruído ("stable"). 5 pontos —
 * espelha `GEO_TREND_EPSILON` no eixo de cancelamento: grande o bastante para
 * não oscilar a cada show isolado, pequeno o bastante para captar uma mudança
 * real de confiabilidade dos combinados.
 */
export const CANCELLATION_TREND_EPSILON = 0.05;

export interface CancellationComparison<C extends ContactRankLike> {
  /** Cancelamentos do período atual (tipicamente o ano selecionado). */
  current: ContactCancellations<C>;
  /** Cancelamentos do período de comparação (tipicamente o ano anterior). */
  previous: ContactCancellations<C>;
  /**
   * Variação da taxa de cancelamento da carteira (atual − anterior, em pontos
   * -1..1). Positivo = a carteira cancela **mais** agora (piora).
   */
  overallRateDelta: number;
  /**
   * Variação do cachê total perdido em cancelamentos (atual − anterior, em
   * centavos). Positivo = caiu **mais** combinado que no período anterior.
   */
  lostFeeDelta: number;
  /**
   * Direção da confiabilidade dos combinados entre os dois períodos, decidida
   * pela variação da taxa da carteira contra `CANCELLATION_TREND_EPSILON`:
   * - "improved": cancela menos agora (a taxa caiu além do limiar);
   * - "worsened": cancela mais agora (a taxa subiu além do limiar);
   * - "stable": variação dentro do limiar (ruído, sem leitura de tendência).
   */
  trend: "improved" | "worsened" | "stable";
}

/**
 * Compara a **taxa de cancelamento da carteira** entre dois períodos (atual ×
 * anterior), espelhando o comparativo ano a ano de `compareGeoConcentration`/
 * `compareClientConcentration` (D120/D122) no eixo de confiabilidade dos
 * combinados. Pura, sem I/O: recebe duas `cancellationByContact` já computadas
 * (cada uma sobre os shows do seu período) e devolve a variação da taxa da
 * carteira e do cachê perdido, além de um veredito de tendência. Ao contrário da
 * concentração, aqui **subir** a taxa é a piora — o veredito reflete isso. O
 * chamador decide quando exibir (tipicamente só com um ano específico e o ano
 * anterior tendo shows vinculados — caso contrário a leitura seria enganosa).
 */
export function compareCancellationRate<C extends ContactRankLike>(
  current: ContactCancellations<C>,
  previous: ContactCancellations<C>,
): CancellationComparison<C> {
  const overallRateDelta = current.overallRate - previous.overallRate;
  return {
    current,
    previous,
    overallRateDelta,
    lostFeeDelta: current.totalLostFee - previous.totalLostFee,
    trend:
      overallRateDelta <= -CANCELLATION_TREND_EPSILON
        ? "improved"
        : overallRateDelta >= CANCELLATION_TREND_EPSILON
          ? "worsened"
          : "stable",
  };
}

// ── Funil por contratante (quem tem mais cachê em negociação) ────────────────
//
// Retrato do pipeline **aberto** por quem paga: de cada contratante, quanto
// cachê está em aberto (PROPOSED + CONFIRMED — dinheiro ainda não realizado) e
// qual foi historicamente a taxa de concretização dos seus shows já decididos
// (PLAYED / (PLAYED + CANCELLED)). Responde "com quem tenho mais para fechar na
// agenda futura e quão confiável esse contratante costuma ser". Distinto dos
// cancelamentos (`cancellationByContact`: o passado que furou) e dos recebíveis
// (`outstandingByContact`: shows já tocados e ainda não pagos). Como o funil
// global (`showPipeline`), é um retrato do estado atual — sem log de transições.
// A contagem é por relação (um show com vários contatos conta para cada um,
// igual ao ranking/concentração/cancelamentos). Pura e determinística.

export interface ContactPipelineRow<C extends ContactRankLike> {
  contact: C;
  /** Total de shows vinculados (todos os status). */
  totalShows: number;
  /** Shows PROPOSED (em negociação). */
  proposedCount: number;
  /** Cachê dos PROPOSED (centavos). */
  proposedValue: number;
  /** Shows CONFIRMED (fechados, ainda não tocados). */
  confirmedCount: number;
  /** Cachê dos CONFIRMED (centavos). */
  confirmedValue: number;
  /** Shows em aberto: PROPOSED + CONFIRMED. */
  openCount: number;
  /** Cachê em aberto: PROPOSED + CONFIRMED (centavos) — o que há para fechar. */
  openValue: number;
  /** Shows realizados (PLAYED). */
  playedCount: number;
  /** Shows cancelados (CANCELLED). */
  cancelledCount: number;
  /** Shows já decididos: PLAYED + CANCELLED. */
  decidedCount: number;
  /**
   * Taxa de concretização histórica deste contratante: PLAYED / decididos.
   * `null` quando nada foi decidido ainda (sem histórico para julgar).
   */
  conversionRate: number | null;
}

export interface ContactPipeline<C extends ContactRankLike> {
  /** Contratantes com pipeline aberto (openCount >= 1), maior cachê aberto primeiro. */
  rows: ContactPipelineRow<C>[];
  /** Nº de contratantes com pipeline aberto. */
  contactCount: number;
  /** Cachê total em aberto na carteira (centavos). */
  totalOpenValue: number;
  /** Shows em aberto na carteira (PROPOSED + CONFIRMED). */
  totalOpenCount: number;
  /** Cachê total em negociação (PROPOSED) na carteira (centavos). */
  totalProposedValue: number;
  /** Cachê total confirmado (CONFIRMED, ainda não tocado) na carteira (centavos). */
  totalConfirmedValue: number;
  /**
   * Taxa de concretização da carteira inteira (PLAYED / decididos, sobre TODOS
   * os contatos com shows, não só os listados). `null` se nada foi decidido.
   */
  overallConversionRate: number | null;
}

/**
 * Agrega o funil de shows por contratante, destacando o cachê **em aberto**
 * (PROPOSED + CONFIRMED) de cada um e sua taxa de concretização histórica. Só
 * viram linha os contatos com ao menos um show em aberto (há o que fechar); os
 * agregados da carteira (`totalOpen*`, `overallConversionRate`) somam todos os
 * contatos com shows. Ordena por cachê em aberto desc, depois nº de shows em
 * aberto desc, cachê confirmado desc, nome pt-BR e id. Pura e determinística.
 */
export function pipelineByContact<C extends ContactRankLike>(
  items: ContactWithShows<C>[],
): ContactPipeline<C> {
  const rows: ContactPipelineRow<C>[] = [];
  let totalOpenValue = 0;
  let totalOpenCount = 0;
  let totalProposedValue = 0;
  let totalConfirmedValue = 0;
  let totalPlayed = 0;
  let totalDecided = 0;

  for (const { contact, shows } of items) {
    if (shows.length === 0) continue;

    let proposedCount = 0;
    let proposedValue = 0;
    let confirmedCount = 0;
    let confirmedValue = 0;
    let playedCount = 0;
    let cancelledCount = 0;
    for (const s of shows) {
      switch (s.status) {
        case "PROPOSED":
          proposedCount += 1;
          proposedValue += s.fee;
          break;
        case "CONFIRMED":
          confirmedCount += 1;
          confirmedValue += s.fee;
          break;
        case "PLAYED":
          playedCount += 1;
          break;
        case "CANCELLED":
          cancelledCount += 1;
          break;
        // status desconhecido é ignorado (não entra em nenhum balde)
      }
    }

    const openCount = proposedCount + confirmedCount;
    const openValue = proposedValue + confirmedValue;
    const decidedCount = playedCount + cancelledCount;

    totalProposedValue += proposedValue;
    totalConfirmedValue += confirmedValue;
    totalOpenValue += openValue;
    totalOpenCount += openCount;
    totalPlayed += playedCount;
    totalDecided += decidedCount;

    if (openCount === 0) continue; // sem pipeline aberto → fora da lista

    rows.push({
      contact,
      totalShows: shows.length,
      proposedCount,
      proposedValue,
      confirmedCount,
      confirmedValue,
      openCount,
      openValue,
      playedCount,
      cancelledCount,
      decidedCount,
      conversionRate: decidedCount === 0 ? null : playedCount / decidedCount,
    });
  }

  rows.sort((a, b) => {
    if (b.openValue !== a.openValue) return b.openValue - a.openValue;
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    if (b.confirmedValue !== a.confirmedValue)
      return b.confirmedValue - a.confirmedValue;
    const byName = a.contact.name.localeCompare(b.contact.name, "pt-BR");
    if (byName !== 0) return byName;
    return a.contact.id.localeCompare(b.contact.id);
  });

  return {
    rows,
    contactCount: rows.length,
    totalOpenValue,
    totalOpenCount,
    totalProposedValue,
    totalConfirmedValue,
    overallConversionRate: totalDecided === 0 ? null : totalPlayed / totalDecided,
  };
}

/**
 * Participação a partir da qual o maior contratante concentra o pipeline aberto
 * o bastante para virar nudge (metade ou mais do cachê a fechar está com ele).
 */
export const PIPELINE_CONCENTRATION_HIGH_SHARE = 0.5;
/**
 * Participação a partir da qual o nudge sobe o tom (crítico): dois terços ou mais
 * do pipeline aberto num único contratante — espelha o 2/3 de
 * `clientConcentrationHeadline`.
 */
export const PIPELINE_CONCENTRATION_CRITICAL_SHARE = 2 / 3;

export interface PipelineByContactHeadline<C extends ContactRankLike> {
  /**
   * Deve aparecer no Painel? Só quando o **pipeline aberto** (PROPOSED +
   * CONFIRMED — a receita futura ainda não realizada) está concentrado num único
   * contratante que responde por `highShare` ou mais do cachê a fechar. Com o
   * pipeline distribuído o aviso seria ruído (mesma disciplina de
   * `clientConcentrationHeadline`/`cancellationHeadline`: o nudge só surge quando
   * a dependência morde). Distinto da concentração de receita
   * (`clientConcentration`, sobre o cachê já realizado): aqui o eixo é o que está
   * **por vir** — se o maior deal cair, quanto da agenda futura vai junto.
   */
  show: boolean;
  /**
   * Caso extremo: **um único** contratante tem todo o pipeline aberto, ou o maior
   * sozinho carrega ≥ 2/3 dele. Permite ao Painel subir o tom (🔴 vs 🟠).
   */
  critical: boolean;
  /** Maior contratante por cachê em aberto, ou null se não há pipeline. */
  contact: C | null;
  /** Cachê em aberto desse contratante (PROPOSED + CONFIRMED, centavos). */
  openValue: number;
  /** Shows em aberto desse contratante. */
  openCount: number;
  /** Participação desse contratante no pipeline aberto da carteira (0..1). */
  topShare: number;
  /** Cachê total em aberto na carteira (centavos). */
  totalOpenValue: number;
  /** Nº de contratantes com pipeline aberto. */
  contactCount: number;
}

/**
 * Resumo de Painel do **funil por contratante**: deriva, de uma
 * `pipelineByContact` já computada, se o nudge de dependência do pipeline aberto
 * deve aparecer e com que urgência. Puro, sem I/O — espelha
 * `clientConcentrationHeadline`/`cancellationHeadline`: a regra de exibição vive
 * aqui, o Painel só consome. Só dispara quando o maior contratante concentra
 * `highShare` ou mais do cachê a fechar (receita futura refém de um só pagador);
 * `critical` quando é um contratante único ou o maior passa de `criticalShare`.
 * `report.rows` já vem ordenado por cachê em aberto desc, então `rows[0]` é o topo.
 */
export function pipelineByContactHeadline<C extends ContactRankLike>(
  report: ContactPipeline<C>,
  highShare: number = PIPELINE_CONCENTRATION_HIGH_SHARE,
  criticalShare: number = PIPELINE_CONCENTRATION_CRITICAL_SHARE,
): PipelineByContactHeadline<C> {
  const top = report.rows[0] ?? null;
  const topShare =
    top !== null && report.totalOpenValue > 0
      ? top.openValue / report.totalOpenValue
      : 0;
  const show = top !== null && report.totalOpenValue > 0 && topShare >= highShare;
  const critical =
    show && (report.contactCount === 1 || topShare >= criticalShare);
  return {
    show,
    critical,
    contact: top?.contact ?? null,
    openValue: top?.openValue ?? 0,
    openCount: top?.openCount ?? 0,
    topShare,
    totalOpenValue: report.totalOpenValue,
    contactCount: report.contactCount,
  };
}

// ── Comparativo ano a ano do funil por contratante (quem passou a fechar mais) ─
//
// Espelho por contratante do comparativo do funil geral (`compareShowPipelines`/
// D209): casa os contratantes de dois `pipelineByContact` (ano atual × anterior)
// por `contact.id` e destila os dois "movers" — quem mais melhorou e quem mais
// piorou a **taxa de concretização** (PLAYED / decididos) de um ano para o outro.
// Como no funil geral, **subir** a taxa é a melhora (fecha uma fração maior do que
// negocia), direção oposta ao DSO/cancelamento. Ancora na taxa (não no cachê em
// aberto): "passar a fechar mais" é sobre converter, não sobre ter mais na mesa.
// Reusa `CONVERSION_TREND_EPSILON` (=0.05) como limiar, o mesmo do funil geral.
//
// Pura, sem I/O: recebe dois `pipelineByContact` já computados (cada um sobre os
// shows do seu período). Só entram em `changes` os contratantes com pipeline
// aberto nos DOIS períodos (é a lente da página); os demais viram
// `newContacts`/`droppedContacts`. A taxa por contratante fica `null` num período
// sem shows decididos — aí `conversionRateDelta` é `null` e o veredito "stable"
// (sem base para ler tendência), como no funil geral.

export interface ContactPipelineChange<C extends ContactRankLike> {
  /** Contratante comparado (presente nos dois períodos). */
  contact: C;
  /** Linha do contratante no período atual. */
  current: ContactPipelineRow<C>;
  /** Linha do contratante no período anterior. */
  previous: ContactPipelineRow<C>;
  /**
   * Variação da taxa de concretização (atual − anterior, em pontos 0..1).
   * `null` quando algum período não tem show decidido (taxa indefinida) — sem
   * base para comparar. Positivo = fechando uma fração maior agora (melhora);
   * negativo = perdendo mais do que negocia (piora).
   */
  conversionRateDelta: number | null;
  /** Variação do cachê em aberto (atual − anterior, centavos) — só informativo. */
  openValueDelta: number;
  /** Variação da contagem de shows realizados (atual − anterior). */
  playedCountDelta: number;
  /**
   * Direção do fechamento entre os dois períodos, pela variação da taxa de
   * concretização contra `CONVERSION_TREND_EPSILON`:
   * - "improved": a taxa subiu além do limiar (fechando mais do que negocia);
   * - "worsened": a taxa caiu além do limiar (perdendo mais do que negocia);
   * - "stable": variação dentro do limiar, ou taxa indefinida em algum período.
   * Aqui **subir** a taxa é a melhora (igual ao funil geral, oposto ao DSO).
   */
  trend: "improved" | "worsened" | "stable";
}

export interface ContactPipelineComparison<C extends ContactRankLike> {
  /**
   * Contratantes com pipeline aberto nos DOIS períodos, com a variação da taxa.
   * Ordenados da maior piora à maior melhora (quem passou a fechar menos primeiro),
   * para o "mover" de cima do card ser o que mais merece atenção; taxa indefinida
   * em algum período vai ao fim.
   */
  changes: ContactPipelineChange<C>[];
  /** Quem mais melhorou a concretização (maior variação positiva entre os "improved"). */
  biggestImprovement: ContactPipelineChange<C> | null;
  /** Quem mais piorou a concretização (variação mais negativa entre os "worsened"). */
  biggestWorsening: ContactPipelineChange<C> | null;
  /** Contratantes com pipeline aberto só no período atual (novos na mesa). */
  newContacts: ContactPipelineRow<C>[];
  /** Contratantes com pipeline aberto no anterior mas não no atual (saíram da mesa). */
  droppedContacts: ContactPipelineRow<C>[];
}

/**
 * Compara o **funil por contratante** entre dois períodos (atual × anterior),
 * casando os contratantes por `contact.id`. Para cada um com pipeline aberto nos
 * dois períodos devolve a variação da taxa de concretização (quem passou a fechar
 * mais / menos); os que só têm pipeline aberto num período viram `newContacts`/
 * `droppedContacts`. Pura, sem I/O: recebe dois `pipelineByContact` já computados.
 * O chamador decide quando exibir (tipicamente só com um ano específico e ambos os
 * períodos com pipeline).
 */
export function compareContactPipelines<C extends ContactRankLike>(
  current: ContactPipeline<C>,
  previous: ContactPipeline<C>,
): ContactPipelineComparison<C> {
  const prevById = new Map<string, ContactPipelineRow<C>>();
  for (const r of previous.rows) prevById.set(r.contact.id, r);

  const currentIds = new Set<string>();
  const changes: ContactPipelineChange<C>[] = [];
  const newContacts: ContactPipelineRow<C>[] = [];

  for (const cur of current.rows) {
    currentIds.add(cur.contact.id);
    const prev = prevById.get(cur.contact.id);
    if (!prev) {
      newContacts.push(cur);
      continue;
    }
    const conversionRateDelta =
      cur.conversionRate == null || prev.conversionRate == null
        ? null
        : cur.conversionRate - prev.conversionRate;
    changes.push({
      contact: cur.contact,
      current: cur,
      previous: prev,
      conversionRateDelta,
      openValueDelta: cur.openValue - prev.openValue,
      playedCountDelta: cur.playedCount - prev.playedCount,
      trend:
        conversionRateDelta == null
          ? "stable"
          : conversionRateDelta >= CONVERSION_TREND_EPSILON
            ? "improved"
            : conversionRateDelta <= -CONVERSION_TREND_EPSILON
              ? "worsened"
              : "stable",
    });
  }

  const droppedContacts = previous.rows.filter(
    (r) => !currentIds.has(r.contact.id),
  );

  // Maior piora no topo: variação da taxa asc (mais negativa primeiro). Taxa
  // indefinida (delta null) vai ao fim; empate estável pelo id.
  changes.sort((a, b) => {
    const av = a.conversionRateDelta;
    const bv = b.conversionRateDelta;
    if (av == null && bv == null) return a.contact.id.localeCompare(b.contact.id);
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv || a.contact.id.localeCompare(b.contact.id);
  });

  let biggestImprovement: ContactPipelineChange<C> | null = null;
  let biggestWorsening: ContactPipelineChange<C> | null = null;
  for (const c of changes) {
    if (c.conversionRateDelta == null) continue;
    if (
      c.trend === "improved" &&
      (!biggestImprovement ||
        c.conversionRateDelta > biggestImprovement.conversionRateDelta!)
    ) {
      biggestImprovement = c;
    }
    if (
      c.trend === "worsened" &&
      (!biggestWorsening ||
        c.conversionRateDelta < biggestWorsening.conversionRateDelta!)
    ) {
      biggestWorsening = c;
    }
  }

  return {
    changes,
    biggestImprovement,
    biggestWorsening,
    newContacts,
    droppedContacts,
  };
}

/**
 * Status de uma linha da tabela do funil por contratante (período atual) frente
 * ao período anterior, para a coluna "vs. {ano-1}":
 * - "changed": o contratante tinha pipeline aberto nos dois períodos — traz a
 *   variação da taxa de concretização (`conversionRateDelta` pode ser `null`
 *   quando algum período não tem show decidido);
 * - "new": só apareceu no período atual (pipeline aberto agora);
 * - "none": não é comparável (não está na carteira atual).
 */
export type ContactPipelineRowStatus<C extends ContactRankLike> =
  | { kind: "changed"; change: ContactPipelineChange<C> }
  | { kind: "new" }
  | { kind: "none" };

/**
 * Casa cada linha da tabela do funil por contratante (período atual) com sua
 * situação no comparativo `compareContactPipelines`, indexando por `contact.id`
 * para o consumidor resolver a coluna "vs. {ano-1}" em O(1) — sem repetir a
 * varredura na apresentação. Puro: recebe o comparativo já computado e devolve
 * uma função de lookup. Um contratante presente nos dois períodos vira "changed";
 * um que só está no atual (em `newContacts`) vira "new"; qualquer outro id vira
 * "none". Espelha `indexContactPaymentLagChanges` (D196) e `indexClientShareChanges`.
 */
export function indexContactPipelineChanges<C extends ContactRankLike>(
  comparison: ContactPipelineComparison<C>,
): (contactId: string | null | undefined) => ContactPipelineRowStatus<C> {
  const changedById = new Map<string, ContactPipelineChange<C>>();
  for (const c of comparison.changes) changedById.set(c.contact.id, c);
  const newIds = new Set<string>();
  for (const r of comparison.newContacts) newIds.add(r.contact.id);

  return (contactId) => {
    if (!contactId) return { kind: "none" };
    const change = changedById.get(contactId);
    if (change) return { kind: "changed", change };
    if (newIds.has(contactId)) return { kind: "new" };
    return { kind: "none" };
  };
}
