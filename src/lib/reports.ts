// Catálogo central dos relatórios / análises do Palco.
//
// O app acumulou mais de duas dezenas de páginas de análise (rentabilidade,
// recebíveis, sazonalidade, retenção…), até aqui só alcançáveis por barras de
// botões espalhadas em /shows e /financas. Este módulo é a fonte única de
// verdade desse acervo: dados puros (sem React, sem I/O) que a página
// `/relatorios` renderiza como um índice navegável e que os testes verificam
// quanto a invariantes (hrefs únicos, campos preenchidos, grupos não vazios).
//
// Ao adicionar um novo relatório, registre-o aqui (e só aqui) para que ele
// apareça no hub automaticamente. Ver DECISIONS.md (D53).

import { normalizeText } from "./finance";

export type ReportArea = "shows" | "financas" | "contatos";

export interface ReportEntry {
  /** Rótulo curto, idealmente igual ao <h1> da própria página. */
  title: string;
  /** Caminho absoluto da rota (começa com "/"). */
  href: string;
  /** Uma frase respondendo "que pergunta este relatório responde?". */
  description: string;
  /**
   * Subtema dentro da área, usado para agrupar visualmente os relatórios no
   * hub (ex.: "Recebíveis", "Custos & metas"). Entradas com o mesmo subtema
   * aparecem juntas; a ordem dos subtemas segue a primeira aparição.
   */
  subtopic: string;
  /** Emoji decorativo para o card (opcional). */
  icon?: string;
}

export interface ReportGroup {
  area: ReportArea;
  /** Título do grupo no hub. */
  label: string;
  entries: ReportEntry[];
}

// Ordem dos grupos = ordem de exibição no hub. Dentro de cada grupo, as
// entradas ficam contíguas por subtema, e a ordem segue do mais usado/decisivo
// para o mais específico.
export const REPORT_GROUPS: readonly ReportGroup[] = [
  {
    area: "shows",
    label: "Shows",
    entries: [
      {
        title: "Funil de propostas",
        href: "/shows/funil",
        description:
          "Quanto cachê está na mesa por etapa e quantas propostas viram show (taxa de concretização).",
        subtopic: "Agenda & pipeline",
        icon: "🪜",
      },
      {
        title: "Por dia da semana",
        href: "/shows/dias-semana",
        description: "Quais dias da semana rendem mais shows e mais dinheiro.",
        subtopic: "Agenda & pipeline",
        icon: "📅",
      },
      {
        title: "Cadência de shows",
        href: "/shows/cadencia",
        description: "Quantos shows você toca por mês ao longo do tempo — se a agenda está mais cheia.",
        subtopic: "Agenda & pipeline",
        icon: "🎶",
      },
      {
        title: "Sazonalidade de shows",
        href: "/shows/sazonalidade",
        description: "Quais meses do ano rendem mais shows e maiores cachês, somando todos os anos — para planejar a temporada.",
        subtopic: "Agenda & pipeline",
        icon: "🌤️",
      },
      {
        title: "Conflitos de agenda",
        href: "/shows/conflitos",
        description: "Dias com dois ou mais shows marcados, para resolver choques de agenda.",
        subtopic: "Agenda & pipeline",
        icon: "⚠️",
      },
      {
        title: "Fins de semana livres",
        href: "/shows/fins-de-semana-livres",
        description:
          "Quais fins de semana (sexta a domingo) ainda estão sem show — onde focar a prospecção.",
        subtopic: "Agenda & pipeline",
        icon: "🗓️",
      },
      {
        title: "Receita agendada",
        href: "/shows/receita-agendada",
        description: "Os cachês dos shows futuros projetados por mês (confirmado x a confirmar).",
        subtopic: "Agenda & pipeline",
        icon: "🔮",
      },
      {
        title: "Antecedência de agendamento",
        href: "/shows/antecedencia",
        description:
          "Com quantos dias de antecedência os shows entram na agenda — mais lead dá previsibilidade de caixa.",
        subtopic: "Agenda & pipeline",
        icon: "⏳",
      },
      {
        title: "Praças para revisitar",
        href: "/shows/cidades/revisitar",
        description:
          "Cidades onde você já tocou mas parou de voltar — as praças frias para planejar um retorno.",
        subtopic: "Agenda & pipeline",
        icon: "📍",
      },
      {
        title: "Casas para revisitar",
        href: "/shows/locais/revisitar",
        description:
          "Locais/palcos onde você já tocou mas parou de voltar — as casas frias para planejar um retorno.",
        subtopic: "Agenda & pipeline",
        icon: "🏛",
      },
      {
        title: "Rentabilidade por show",
        href: "/shows/rentabilidade",
        description: "O resultado líquido (cachê − despesas) de cada show realizado, do mais ao menos rentável.",
        subtopic: "Rentabilidade & preço",
        icon: "💸",
      },
      {
        title: "Rentabilidade por local",
        href: "/shows/locais",
        description: "Quais casas/venues valem a pena, somando o P&L dos shows por local.",
        subtopic: "Rentabilidade & preço",
        icon: "🏠",
      },
      {
        title: "Atuação por cidade",
        href: "/shows/cidades",
        description: "Onde você toca e fatura mais, agregando shows e resultado por cidade.",
        subtopic: "Rentabilidade & preço",
        icon: "🗺️",
      },
      {
        title: "Evolução do cachê",
        href: "/shows/evolucao-cache",
        description: "Se o seu preço médio por show sobe com o tempo, mês a mês.",
        subtopic: "Rentabilidade & preço",
        icon: "📈",
      },
      {
        title: "Faixas de cachê",
        href: "/shows/faixas-de-cache",
        description: "Como os cachês se distribuem por faixa de preço.",
        subtopic: "Rentabilidade & preço",
        icon: "📊",
      },
      {
        title: "Cachês a receber",
        href: "/shows/a-receber",
        description: "O dinheiro esquecido: shows já realizados cujo cachê ainda não entrou no caixa.",
        subtopic: "Recebíveis",
        icon: "🎤",
      },
      {
        title: "A receber por contratante",
        href: "/shows/a-receber/por-contratante",
        description: "Quem está te devendo — e há quanto tempo: o saldo em aberto agrupado por devedor.",
        subtopic: "Recebíveis",
        icon: "📨",
      },
      {
        title: "Prazo de recebimento",
        href: "/shows/prazo-recebimento",
        description: "Quantos dias, em média, o cachê leva para cair na conta depois do show (DSO).",
        subtopic: "Recebíveis",
        icon: "⏱️",
      },
      {
        title: "Prazo por contratante",
        href: "/shows/prazo-recebimento/por-contratante",
        description: "Quem paga rápido e quem paga devagar, com o prazo médio por contratante.",
        subtopic: "Recebíveis",
        icon: "🐢",
      },
    ],
  },
  {
    area: "financas",
    label: "Finanças",
    entries: [
      {
        title: "Ritmo do mês",
        href: "/financas/ritmo-do-mes",
        description:
          "Como o mês corrente vai até agora e como deve fechar, comparado a um mês típico recente.",
        subtopic: "Fechamentos",
        icon: "⏱️",
      },
      {
        title: "Ritmo do ano",
        href: "/financas/ritmo-do-ano",
        description:
          "O acumulado do ano até hoje comparado ao mesmo ponto do ano passado — estou à frente de onde estava nesta época?",
        subtopic: "Fechamentos",
        icon: "📅",
      },
      {
        title: "Relatório mensal",
        href: "/financas/relatorio",
        description: "O fechamento de um mês com receitas, despesas, saldo e quebra por categoria.",
        subtopic: "Fechamentos",
        icon: "🗓️",
      },
      {
        title: "Variação por categoria",
        href: "/financas/variacao",
        description:
          "O que mudou de um mês para o outro, categoria por categoria — qual gasto ou receita explica a diferença.",
        subtopic: "Fechamentos",
        icon: "🔀",
      },
      {
        title: "Resumo anual",
        href: "/financas/anual",
        description: "Os 12 meses do ano lado a lado, com totais e o melhor/pior mês.",
        subtopic: "Fechamentos",
        icon: "📆",
      },
      {
        title: "Resumo trimestral",
        href: "/financas/trimestral",
        description: "Os 4 trimestres do ano, com totais e o melhor/pior — a revisão entre o mês e o ano.",
        subtopic: "Fechamentos",
        icon: "🗂️",
      },
      {
        title: "Projeção de fechamento",
        href: "/financas/projecao-ano",
        description:
          "Como o ano deve fechar: caixa realizado + pendências + cachês de shows futuros ainda não lançados.",
        subtopic: "Fechamentos",
        icon: "🔭",
      },
      {
        title: "Sazonalidade",
        href: "/financas/sazonalidade",
        description: "Qual época do ano costuma render mais, somando todos os anos do histórico.",
        subtopic: "Fechamentos",
        icon: "🌦️",
      },
      {
        title: "Crescimento ano a ano",
        href: "/financas/crescimento",
        description: "Os seus anos lado a lado, com o crescimento do resultado — a carreira está faturando mais?",
        subtopic: "Fechamentos",
        icon: "📈",
      },
      {
        title: "Fontes de renda",
        href: "/financas/fontes-de-renda",
        description: "De onde vem o seu dinheiro: o mix de receitas por categoria.",
        subtopic: "Receitas & pendências",
        icon: "🧩",
      },
      {
        title: "A pagar e receber",
        href: "/financas/agenda",
        description: "As pendências distribuídas por janela de vencimento, das vencidas às futuras.",
        subtopic: "Receitas & pendências",
        icon: "📥",
      },
      {
        title: "Fluxo de caixa projetado",
        href: "/financas/fluxo-de-caixa",
        description:
          "Como o caixa evolui mês a mês com o que está a receber e a pagar, e quando aperta.",
        subtopic: "Receitas & pendências",
        icon: "🌊",
      },
      {
        title: "Meta de faturamento",
        href: "/financas/metas",
        description: "Defina quanto quer faturar no ano e acompanhe o quanto já recebeu e a projeção.",
        subtopic: "Custos & metas",
        icon: "🎯",
      },
      {
        title: "Custos fixos",
        href: "/financas/custos-fixos",
        description: "Quanto você precisa faturar todo mês só para se manter (despesas recorrentes).",
        subtopic: "Custos & metas",
        icon: "🔁",
      },
      {
        title: "Para onde vai o dinheiro",
        href: "/financas/composicao-despesas",
        description: "A composição das suas despesas por categoria e qual gasto domina o orçamento.",
        subtopic: "Custos & metas",
        icon: "💸",
      },
      {
        title: "Ponto de equilíbrio",
        href: "/financas/ponto-de-equilibrio",
        description: "Quantos shows por mês cobrem os seus custos fixos.",
        subtopic: "Custos & metas",
        icon: "⚖️",
      },
      {
        title: "Reserva para impostos",
        href: "/financas/reserva-impostos",
        description: "Quanto guardar de cada cachê recebido para o imposto, mês a mês.",
        subtopic: "Custos & metas",
        icon: "🧾",
      },
      {
        title: "Fôlego de caixa",
        href: "/financas/folego-de-caixa",
        description: "Por quantos meses seu caixa atual cobre os custos fixos se as receitas pararem.",
        subtopic: "Custos & metas",
        icon: "🛟",
      },
    ],
  },
  {
    area: "contatos",
    label: "Contatos",
    entries: [
      {
        title: "Ranking de contatos",
        href: "/contatos/ranking",
        description: "Quem mais te movimenta, ordenado por cachê total e número de shows.",
        subtopic: "Quem move a carreira",
        icon: "🏆",
      },
      {
        title: "Concentração de contratantes",
        href: "/contatos/concentracao",
        description: "O quanto a sua renda depende de poucos contratantes (risco de dependência).",
        subtopic: "Quem move a carreira",
        icon: "🎯",
      },
      {
        title: "Rentabilidade por contratante",
        href: "/contatos/rentabilidade",
        description: "Quais clientes dão dinheiro de verdade — resultado líquido somado por quem paga.",
        subtopic: "Quem move a carreira",
        icon: "💸",
      },
      {
        title: "Rentabilidade por papel",
        href: "/contatos/rentabilidade/por-papel",
        description: "Que tipo de comprador (casa, produtor, contratante…) rende mais — resultado somado por papel de quem paga.",
        subtopic: "Quem move a carreira",
        icon: "🎭",
      },
      {
        title: "Funil por contratante",
        href: "/contatos/funil",
        description: "Com quem você tem mais cachê em negociação ou confirmado — o pipeline aberto por quem paga.",
        subtopic: "Quem move a carreira",
        icon: "🔭",
      },
      {
        title: "Fidelização de contratantes",
        href: "/contatos/retencao",
        description: "Quem repete contratação e quem chamou uma vez só.",
        subtopic: "Relacionamento",
        icon: "🤝",
      },
      {
        title: "Cancelamentos por contratante",
        href: "/contatos/cancelamentos",
        description: "Quem mais fura o combinado — taxa de cancelamento e cachê perdido por contratante.",
        subtopic: "Relacionamento",
        icon: "🚫",
      },
      {
        title: "Contatos para reativar",
        href: "/contatos/reativar",
        description: "Contratantes dormentes que já tocaram mas sumiram — follow-up de prospecção.",
        subtopic: "Relacionamento",
        icon: "📨",
      },
    ],
  },
];

/** Lista achatada de todos os relatórios, na ordem dos grupos. */
export function allReports(): ReportEntry[] {
  return REPORT_GROUPS.flatMap((g) => g.entries);
}

/** Total de relatórios catalogados. */
export function reportCount(): number {
  return REPORT_GROUPS.reduce((n, g) => n + g.entries.length, 0);
}

export interface ReportSubgroup {
  /** Nome do subtema (ex.: "Recebíveis"). */
  subtopic: string;
  entries: ReportEntry[];
}

/**
 * Agrupa as entradas de um grupo por subtema, para a renderização em
 * subseções no hub. A ordem dos subtemas segue a **primeira aparição** de cada
 * um na lista de entradas (que já é mantida contígua em `REPORT_GROUPS`), e a
 * ordem das entradas dentro de cada subtema é preservada. Não muta as entradas.
 */
export function subgroupEntries(entries: readonly ReportEntry[]): ReportSubgroup[] {
  const order: string[] = [];
  const byTopic = new Map<string, ReportEntry[]>();
  for (const entry of entries) {
    const key = entry.subtopic;
    let bucket = byTopic.get(key);
    if (!bucket) {
      bucket = [];
      byTopic.set(key, bucket);
      order.push(key);
    }
    bucket.push(entry);
  }
  return order.map((subtopic) => ({ subtopic, entries: byTopic.get(subtopic)! }));
}

// Índice de salto rápido: com mais de duas dezenas de relatórios, o hub ganha
// um sumário no topo que leva direto a cada subtema (âncoras). A lógica pura
// abaixo gera os ids de âncora e o índice navegável (área → subtemas), para ser
// testável e compartilhada entre a renderização das seções e a do sumário.

/**
 * Id de âncora estável para um subtema dentro de uma área, no formato
 * `<area>-<subtema-em-kebab>` (sem acento/caixa). Prefixar com a área evita
 * colisão entre subtemas homônimos de áreas diferentes. Determinístico: a mesma
 * (área, subtema) sempre gera o mesmo id, para casar o link do sumário com o
 * `id` da seção renderizada.
 */
export function subtopicSlug(area: ReportArea, subtopic: string): string {
  const kebab = normalizeText(subtopic)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${area}-${kebab}`;
}

export interface ReportNavSubtopic {
  subtopic: string;
  /** Id de âncora (igual ao `id` da subseção no hub). */
  anchor: string;
  /** Quantos relatórios há neste subtema. */
  count: number;
}

export interface ReportNavArea {
  area: ReportArea;
  label: string;
  /** Id de âncora da área (igual ao `id` da seção no hub). */
  anchor: string;
  /** Total de relatórios da área. */
  count: number;
  subtopics: ReportNavSubtopic[];
}

/**
 * Índice navegável do acervo (área → subtemas), na ordem de exibição do hub,
 * com contagem por subtema e por área e os ids de âncora correspondentes. Serve
 * de fonte para o sumário de salto rápido no topo do hub.
 */
export function reportsNavIndex(): ReportNavArea[] {
  return REPORT_GROUPS.map((group) => ({
    area: group.area,
    label: group.label,
    anchor: group.area,
    count: group.entries.length,
    subtopics: subgroupEntries(group.entries).map((sub) => ({
      subtopic: sub.subtopic,
      anchor: subtopicSlug(group.area, sub.subtopic),
      count: sub.entries.length,
    })),
  }));
}

// ── Scroll-spy do sumário de salto rápido ───────────────────────────────────
// Conforme o acervo cresce, o sumário de âncoras no topo do hub ganha um
// destaque "onde estou" que acompanha a rolagem: a pílula do subtema visível
// fica realçada. A decisão de qual seção está ativa é lógica pura (recebe as
// medições de offset feitas no cliente), para ser testável sem DOM.

/** Offset (topo, em px, relativo ao documento) de uma seção-âncora do hub. */
export interface SectionOffset {
  /** Id da âncora — igual ao `id` da seção no hub e ao `anchor` do índice. */
  anchor: string;
  /** `offsetTop` medido no cliente; `NaN`/±Infinity = ainda não medido. */
  top: number;
}

/**
 * Dada a lista de offsets das seções, a posição de rolagem atual e uma margem
 * (a linha de ativação fica em `scrollY + margin`, logo abaixo do topo da
 * viewport), devolve a âncora da seção **ativa**: a última cujo topo já cruzou a
 * linha de ativação. Antes de a primeira cruzar, devolve a primeira seção; sem
 * seções mensuráveis, `null`. Quando `atBottom` é `true` (rolagem no fim da
 * página), devolve sempre a última seção — assim a última âncora, curta demais
 * para alcançar a linha de ativação, ainda fica acessível.
 *
 * Pura: não lê o DOM. Robusta à ordem de entrada (ordena por `top`) e ignora
 * offsets não finitos (medições pendentes).
 */
export function activeSectionAnchor(
  sections: readonly SectionOffset[],
  scrollY: number,
  margin: number,
  atBottom = false,
): string | null {
  const valid = sections
    .filter((s) => Number.isFinite(s.top))
    .sort((a, b) => a.top - b.top);
  if (valid.length === 0) return null;
  if (atBottom) return valid[valid.length - 1].anchor;

  const line = scrollY + margin;
  let active = valid[0].anchor;
  for (const section of valid) {
    if (section.top <= line) active = section.anchor;
    else break;
  }
  return active;
}

// Busca textual sobre o acervo: conforme o catálogo cresce (já passou de duas
// dezenas), o hub ganha um campo que filtra os relatórios pelo texto digitado.
// Lógica pura (sem React) para ser testável e reutilizável no client component.

/**
 * Filtra os grupos de relatórios por um texto livre. O casamento é
 * insensível a acento/caixa (via `normalizeText`) e por termo (AND): "cachê
 * prazo" só casa entradas que contenham ambos os termos. A consulta varre o
 * título, a descrição, o subtema e o rótulo do grupo da entrada — assim
 * "shows" traz todos os relatórios da área e "recebíveis" traz o subtema.
 * Consulta vazia devolve todos os grupos. Grupos que ficam sem nenhuma
 * entrada são omitidos do resultado.
 */
export function filterReports(query: string): ReportGroup[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return REPORT_GROUPS.map((g) => ({ ...g, entries: [...g.entries] }));

  return REPORT_GROUPS.map((group) => {
    const label = normalizeText(group.label);
    const entries = group.entries.filter((entry) => {
      const haystack = `${normalizeText(entry.title)} ${normalizeText(entry.description)} ${normalizeText(entry.subtopic)} ${label}`;
      return terms.every((term) => haystack.includes(term));
    });
    return { ...group, entries };
  }).filter((group) => group.entries.length > 0);
}

/** Quantos relatórios casam com a consulta (achatado entre os grupos). */
export function countFilteredReports(query: string): number {
  return filterReports(query).reduce((n, g) => n + g.entries.length, 0);
}
