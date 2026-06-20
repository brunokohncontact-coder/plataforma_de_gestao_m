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

export type ReportArea = "shows" | "financas" | "contatos";

export interface ReportEntry {
  /** Rótulo curto, idealmente igual ao <h1> da própria página. */
  title: string;
  /** Caminho absoluto da rota (começa com "/"). */
  href: string;
  /** Uma frase respondendo "que pergunta este relatório responde?". */
  description: string;
  /** Emoji decorativo para o card (opcional). */
  icon?: string;
}

export interface ReportGroup {
  area: ReportArea;
  /** Título do grupo no hub. */
  label: string;
  entries: ReportEntry[];
}

// Ordem dos grupos = ordem de exibição no hub. Dentro de cada grupo, a ordem
// segue do mais usado/decisivo para o mais específico.
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
        icon: "🪜",
      },
      {
        title: "Rentabilidade por show",
        href: "/shows/rentabilidade",
        description: "O resultado líquido (cachê − despesas) de cada show realizado, do mais ao menos rentável.",
        icon: "💸",
      },
      {
        title: "Rentabilidade por local",
        href: "/shows/locais",
        description: "Quais casas/venues valem a pena, somando o P&L dos shows por local.",
        icon: "🏠",
      },
      {
        title: "Atuação por cidade",
        href: "/shows/cidades",
        description: "Onde você toca e fatura mais, agregando shows e resultado por cidade.",
        icon: "🗺️",
      },
      {
        title: "Evolução do cachê",
        href: "/shows/evolucao-cache",
        description: "Se o seu preço médio por show sobe com o tempo, mês a mês.",
        icon: "📈",
      },
      {
        title: "Faixas de cachê",
        href: "/shows/faixas-de-cache",
        description: "Como os cachês se distribuem por faixa de preço.",
        icon: "📊",
      },
      {
        title: "Por dia da semana",
        href: "/shows/dias-semana",
        description: "Quais dias da semana rendem mais shows e mais dinheiro.",
        icon: "📅",
      },
      {
        title: "Conflitos de agenda",
        href: "/shows/conflitos",
        description: "Dias com dois ou mais shows marcados, para resolver choques de agenda.",
        icon: "⚠️",
      },
      {
        title: "Receita agendada",
        href: "/shows/receita-agendada",
        description: "Os cachês dos shows futuros projetados por mês (confirmado x a confirmar).",
        icon: "🔮",
      },
      {
        title: "Cachês a receber",
        href: "/shows/a-receber",
        description: "O dinheiro esquecido: shows já realizados cujo cachê ainda não entrou no caixa.",
        icon: "🎤",
      },
      {
        title: "Prazo de recebimento",
        href: "/shows/prazo-recebimento",
        description: "Quantos dias, em média, o cachê leva para cair na conta depois do show (DSO).",
        icon: "⏱️",
      },
      {
        title: "Prazo por contratante",
        href: "/shows/prazo-recebimento/por-contratante",
        description: "Quem paga rápido e quem paga devagar, com o prazo médio por contratante.",
        icon: "🐢",
      },
    ],
  },
  {
    area: "financas",
    label: "Finanças",
    entries: [
      {
        title: "Relatório mensal",
        href: "/financas/relatorio",
        description: "O fechamento de um mês com receitas, despesas, saldo e quebra por categoria.",
        icon: "🗓️",
      },
      {
        title: "Resumo anual",
        href: "/financas/anual",
        description: "Os 12 meses do ano lado a lado, com totais e o melhor/pior mês.",
        icon: "📆",
      },
      {
        title: "A pagar e receber",
        href: "/financas/agenda",
        description: "As pendências distribuídas por janela de vencimento, das vencidas às futuras.",
        icon: "📥",
      },
      {
        title: "Sazonalidade",
        href: "/financas/sazonalidade",
        description: "Qual época do ano costuma render mais, somando todos os anos do histórico.",
        icon: "🌦️",
      },
      {
        title: "Fontes de renda",
        href: "/financas/fontes-de-renda",
        description: "De onde vem o seu dinheiro: o mix de receitas por categoria.",
        icon: "🧩",
      },
      {
        title: "Custos fixos",
        href: "/financas/custos-fixos",
        description: "Quanto você precisa faturar todo mês só para se manter (despesas recorrentes).",
        icon: "🔁",
      },
      {
        title: "Ponto de equilíbrio",
        href: "/financas/ponto-de-equilibrio",
        description: "Quantos shows por mês cobrem os seus custos fixos.",
        icon: "⚖️",
      },
      {
        title: "Reserva para impostos",
        href: "/financas/reserva-impostos",
        description: "Quanto guardar de cada cachê recebido para o imposto, mês a mês.",
        icon: "🧾",
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
        icon: "🏆",
      },
      {
        title: "Concentração de contratantes",
        href: "/contatos/concentracao",
        description: "O quanto a sua renda depende de poucos contratantes (risco de dependência).",
        icon: "🎯",
      },
      {
        title: "Fidelização de contratantes",
        href: "/contatos/retencao",
        description: "Quem repete contratação e quem chamou uma vez só.",
        icon: "🤝",
      },
      {
        title: "Contatos para reativar",
        href: "/contatos/reativar",
        description: "Contratantes dormentes que já tocaram mas sumiram — follow-up de prospecção.",
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
