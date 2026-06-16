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

## 2026-06-16 — D4: Cachê do show via campo `fee`, não como transação (anti double-count)
- **Decisão:** o cachê acordado de um show é representado pelo campo `Show.fee`. Transações
  de **receita** vinculadas a um show representam receita **adicional** (merch, couvert),
  somadas por cima do cachê no cálculo de rentabilidade (`showProfitability`).
- **Justificativa:** evita contar o cachê duas vezes (uma no `fee`, outra como transação).
  Mantém o P&L por show previsível: `resultado = fee + receitas extras − despesas vinculadas`.
- **Risco/validação:** usuários podem, ainda assim, lançar o cachê como transação de receita
  e duplicar. Mitigar na UI (texto de ajuda) e, futuramente, oferecer "gerar receita a partir
  do cachê" como ação explícita. Revisar após testes de usabilidade.

## 2026-06-16 — D5: Autenticação própria simples (scrypt + cookie HMAC) no MVP
- **Decisão:** auth própria — senha com `scrypt` (node:crypto) e sessão em cookie httpOnly
  assinado com HMAC-SHA256 (`src/lib/session.ts`, `src/lib/auth.ts`). Sem dependência externa.
- **Justificativa:** zero dependências/serviços, fácil de rodar em container efêmero, e o
  escopo (e-mail+senha) não exige OAuth ainda. Lógica criptográfica isolada e testada.
- **Alternativas consideradas:** Auth.js/NextAuth (recomendado no PROGRESS da Fase 0) — mais
  robusto e com OAuth, porém adiciona configuração/dependência sem necessidade imediata.
- **A revisar:** migrar para Auth.js quando precisarmos de login social, recuperação de senha
  ou multiusuário/manager (Fase 2). A camada de auth está isolada para facilitar a troca.

## 2026-06-16 — D6: Enums de domínio como `String` no SQLite, validados na aplicação
- **Decisão:** `ShowStatus`, `TransactionType` e `ContactRole` são colunas `String` no Prisma
  (SQLite não suporta `enum`), validadas por Zod em `src/lib/enums.ts`/`validation.ts`.
- **Justificativa:** mantém o schema portável e o dev sem dependências. Em Postgres, podem
  virar enums nativos sem alterar a camada de aplicação.
