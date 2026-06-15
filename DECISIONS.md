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

## 2026-06-15 — D4: Nome do produto = "Palco"
- **Decisão:** adotar **Palco** como nome de trabalho do produto (package `palco`,
  títulos e UI).
- **Justificativa:** curto, em português, evoca o ambiente do músico (o palco); fácil de
  lembrar. É um nome de trabalho — não houve verificação de marca/domínio.
- **A revisar:** checar disponibilidade de marca e domínio antes de qualquer go-to-market.

## 2026-06-15 — D5: Autenticação própria com cookie de sessão assinado (HMAC), sem NextAuth
- **Decisão:** implementar auth própria e minimalista — senha com **bcrypt** + cookie
  httpOnly contendo token **HMAC-SHA256** assinado (`src/lib/session.ts` + `src/lib/auth.ts`),
  em vez de adotar NextAuth/Auth.js nesta fase.
- **Justificativa:** o MVP usa apenas e-mail/senha; Auth.js agregaria dependências e
  abstrações desnecessárias agora. A assinatura HMAC é testável (funções puras) e o segredo
  vem de `AUTH_SECRET`. Migrar para Auth.js depois (OAuth, magic link) é viável.
- **Riscos:** sem reset de senha/verificação de e-mail/OAuth ainda; rotação de segredo
  invalida sessões. Aceitável para MVP. **A revisar** ao adicionar login social ou
  recuperação de senha.

## 2026-06-15 — D6: Modelo de rentabilidade (P&L) por show
- **Decisão:** o "resultado" headline do show usa **cachê acordado − despesas vinculadas**
  (`result`), e expõe à parte `realizedIncome`/`netRealized` quando há receitas lançadas e
  vinculadas — evitando dupla contagem entre o campo `fee` do show e transações de receita.
- **Justificativa:** o cachê acordado é conhecido cedo (na proposta/confirmação) e dá a
  projeção de rentabilidade antes do show; o resultado de caixa realizado complementa após
  o evento. Lógica pura e testada em `src/lib/finance.ts`.
- **A revisar:** validar com usuários se o headline deve priorizar o realizado quando o
  show já é "realizado".
