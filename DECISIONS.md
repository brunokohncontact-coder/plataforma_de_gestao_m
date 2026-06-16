# Decisões (para revisão humana)

Registro de decisões discutíveis tomadas autonomamente entre sessões. Cada entrada:
contexto, decisão, justificativa e alternativas consideradas.

---

## 2026-06-15 — D1: Foco do produto = back-office de gestão, não divulgação/distribuição
- **Decisão:** posicionar a plataforma como o "sistema operacional de gestão de carreira"
  (agenda, finanças, contatos, contratos), e **não** competir de frente com distribuição
  (Beatchain/TuneCore), site builder (Bandzoogle) ou descoberta de fãs (Bandsintown).
- **Justificativa:** a pesquisa de mercado (`docs/market-analysis.md`) mostra que a gestão
  operacional interna é a maior lacuna; o substituto atual é planilha/Notion.
- **Risco/validação:** depende de entrevistas com músicos reais. Tratar como hipótese.

## 2026-06-15 — D2: Núcleo do MVP = Shows + Finanças + Rentabilidade + CRM básico
- **Decisão:** v1 entrega F1–F5 de `docs/mvp-scope.md`; split de receita, contratos,
  EPK e distribuição ficam para fases futuras.
- **Justificativa:** são as necessidades mais consistentemente **validadas** e o
  diferencial (rentabilidade por show) não existe bem no mercado.

## 2026-06-15 — D3: Stack = Next.js + TypeScript + Prisma + Tailwind
- **Decisão:** Next.js (App Router) + TypeScript + Prisma ORM + Tailwind CSS. Banco:
  **SQLite em dev** (zero dependência externa, alinhado a execuções remotas efêmeras),
  com schema portável para **PostgreSQL** em produção.
- **Justificativa:**
  - Next.js: full-stack num só repo (UI + API routes/server actions), ótimo DX, deploy fácil.
  - TypeScript: segurança de tipos para lógica financeira.
  - Prisma: schema declarativo, migrations, troca SQLite→Postgres com mudança mínima.
  - Tailwind: prototipagem rápida e responsiva.
  - SQLite em dev: o container remoto é efêmero e sem Postgres garantido; SQLite permite
    `build`/`test`/`run` sem serviços externos, mantendo a regra "nunca deixar a base quebrada".
- **Alternativas consideradas:** Remix/SvelteKit (menos familiar/ecossistema); Postgres
  local em dev (exige serviço rodando — atrito nas execuções remotas); Drizzle (Prisma é
  mais maduro para migrations rápidas).
- **A revisar:** se produção exigir Postgres desde já, migrar o `provider` do Prisma.

## 2026-06-16 — D4: Valores monetários armazenados em centavos (inteiros)
- **Decisão:** todo valor monetário (`feeCents`, `amountCents`) é um `Int` em centavos no
  banco e na lógica de negócio. Conversão para/de reais via `toCents`/`fromCents`
  (`src/lib/domain.ts`); exibição via `formatMoney` (Intl, pt-BR/BRL por padrão).
- **Justificativa:** evita erros de ponto flutuante em somas financeiras (ex.: `0.1 + 0.2`),
  críticos para a confiança no produto. Padrão consagrado em sistemas financeiros.
- **A revisar:** moeda fixa em BRL por ora; internacionalização de moeda fica para depois.

## 2026-06-16 — D5: Rentabilidade por show usa o cachê como receita "headline"
- **Decisão:** `resultCents` de um show = `feeCents` (cachê acordado) − despesas vinculadas.
  Também expomos `realizedResultCents` = receitas vinculadas − despesas vinculadas, para
  quem prefere a visão de caixa. Ver `showProfitAndLoss` em `src/lib/finance.ts`.
- **Justificativa:** o cachê acordado é o número que o artista tem em mente ao avaliar um
  show; mantém o headline previsível mesmo antes de o pagamento entrar como transação.
- **Risco/validação:** confirmar com usuários se preferem visão "planejada" (cachê) ou
  "realizada" (transações) como número principal. Ambas estão disponíveis.

## 2026-06-16 — D6: Fragmentação de execuções — há 14 PRs paralelas da "Fase 1" ⚠️
- **Contexto (confirmado via API do GitHub):** existem **13 PRs abertas (#1–#13)** além desta
  (#14), TODAS de execuções remotas paralelas implementando a Fase 1 de forma independente e
  divergente, todas com base em `claude/sharp-ptolemy-to4m4d` (que só tem a Fase 0). O repo
  **não tem branch `main`**. Cada execução agendada cria um branch novo a partir da mesma base
  e não enxerga as outras → a "memória entre sessões via git" está quebrada na prática.
- **Várias PRs já entregam o MVP completo F1–F5** (#13, #11, #10, #9, #8, #7, #6, #5, #3, #1),
  mais completas que esta (esta é só fundação + lógica testada).
- **Decisão (desta sessão):** seguir a instrução e desenvolver em `claude/sleepy-bell-548tjb`,
  cujo `PROGRESS.md` indicava Fase 0 e nenhum código. Não houve como aproveitar trabalho de
  outras branches (objetos não vêm no clone raso). Não economizei: entreguei fundação + testes.
- **AÇÃO HUMANA NECESSÁRIA (bloqueante para a continuidade):**
  1. Escolher UMA implementação como base canônica (sugestão: a mais completa/testada, ex.: #13),
     mesclá-la e promovê-la a **`main`** (definir como branch padrão).
  2. Fechar as demais PRs para parar o ruído.
  3. Configurar as execuções futuras para partir SEMPRE de `main`.
  Sem isso, cada execução de 2h continuará gerando uma PR redundante.
