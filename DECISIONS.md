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

## 2026-06-16 — D6: Fragmentação de branches entre execuções remotas
- **Contexto:** o repositório tem ~14 branches `claude/*` de execuções anteriores; os
  objetos remotos não vêm no clone raso, dificultando inspecionar/mesclar trabalho paralelo.
- **Decisão (desta sessão):** seguir a instrução e desenvolver em `claude/sleepy-bell-548tjb`,
  cujo `PROGRESS.md` indicava Fase 0 concluída e nenhum código. Não houve como aproveitar
  trabalho de outras branches (inacessíveis).
- **A revisar (humano):** consolidar o trabalho numa única branch/`main` para que a "memória
  entre sessões" não se fragmente. Idealmente as execuções futuras partem sempre da mesma base.
