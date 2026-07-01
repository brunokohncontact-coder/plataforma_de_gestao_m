// Lógica de negócio do CRM de contatos (pura, sem dependência de banco/UI).
// Testada em contacts.test.ts. Valores monetários em CENTAVOS (inteiros).

import { normalizeText, computeShowPnL, type TxLike } from "./finance";
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
  const totalShows = rows.reduce((acc, r) => acc + r.activeShows, 0);
  const totalFee = rows.reduce((acc, r) => acc + r.totalFee, 0);
  const recurringFee = recurring.reduce((acc, r) => acc + r.totalFee, 0);

  return {
    rows,
    recurring,
    totalClients,
    recurringClients,
    oneTimeClients: totalClients - recurringClients,
    repeatRate: totalClients > 0 ? recurringClients / totalClients : null,
    totalShows,
    totalFee,
    recurringFee,
    recurringFeeShare: totalFee > 0 ? recurringFee / totalFee : null,
    avgShowsPerClient: totalClients > 0 ? totalShows / totalClients : 0,
    mostLoyal: rows[0] ?? null,
  };
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
