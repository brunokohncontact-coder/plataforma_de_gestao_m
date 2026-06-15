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

## 2026-06-15 — D3.1: SQLite/Prisma não suporta enums → String + validação no app
- **Contexto:** ao gerar o client, o Prisma rejeitou os `enum` do schema porque o provider
  é SQLite (enums só em Postgres/MySQL).
- **Decisão:** `ShowStatus`, `TransactionType` e `ContactRole` viram campos `String` no
  banco, com os valores válidos definidos em `src/lib/domain/enums.ts` e validados por Zod
  (`src/lib/validation.ts`). Rótulos PT-BR para a UI no mesmo lugar.
- **Justificativa:** mantém dev sem dependência externa (regra "nunca quebrar a base").
- **A revisar:** ao migrar para Postgres, esses campos podem virar enums nativos.

## 2026-06-15 — D4: Convenção de cálculo do P&L por show (evitar double-count)
- **Contexto:** F4 cruza o cachê (`show.fee`) com as transações vinculadas. Há risco do
  usuário lançar o cachê duas vezes (no campo `fee` e como transação de receita).
- **Decisão:** o campo `fee` **é** a receita-base do show. A receita bruta do show =
  `fee + receitas adicionais vinculadas` (ex.: merch); resultado = receita bruta −
  despesas vinculadas. A UI orienta o usuário a **não** lançar o cachê também como
  transação. Ver `src/lib/domain/finance.ts` (`computeShowPnL`) e seus testes.
- **A validar com usuários:** se na prática preferem lançar tudo como transação e tratar
  `fee` apenas como "valor combinado" (informativo). Hipótese a confirmar em entrevistas.

## 2026-06-15 — D5: Autenticação própria simples no MVP (não Auth.js ainda)
- **Decisão:** auth própria — senha com **bcrypt** + sessão por **cookie HttpOnly
  assinado com HMAC** (`src/lib/auth.ts`). Sem provider externo nem tabela de sessões.
- **Justificativa:** zero dependência de serviço, simples de testar em execuções remotas
  efêmeras, suficiente para validar o produto. Escopo do MVP é single-user por workspace.
- **A revisar:** ao adicionar OAuth (Google/Spotify), reset de senha ou multiusuário,
  migrar para **Auth.js** em vez de expandir a solução caseira.
