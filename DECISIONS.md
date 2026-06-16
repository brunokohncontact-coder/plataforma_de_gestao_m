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

## 2026-06-16 — D4: Representação monetária = Float na unidade (reais), não centavos em inteiro
- **Decisão:** valores monetários (`feeAgreed`, `amount`) são `Float` na unidade monetária
  (reais), com arredondamento a 2 casas via `round2()` na camada de domínio.
- **Justificativa:** simplicidade no MVP; SQLite/Prisma lidam bem com Float; toda agregação
  passa por `round2` para evitar erros de ponto flutuante (testado em `finance.test.ts`).
- **Risco/A revisar:** para precisão financeira rigorosa (juros, muitos lançamentos),
  migrar para inteiro em centavos ou `Decimal`. Aceitável para o escopo atual.

## 2026-06-16 — D5: Autenticação própria mínima (scrypt + cookie HMAC), não Auth.js (ainda)
- **Decisão:** auth própria — senha com `scrypt`+salt (crypto nativo) e sessão em cookie
  httpOnly assinado por HMAC-SHA256 (`src/lib/auth-crypto.ts` + `src/lib/auth.ts`).
- **Justificativa:** zero dependências externas, sem necessidade de OAuth no MVP; o núcleo
  criptográfico é puro e coberto por testes. Evita a complexidade de configurar Auth.js
  (adapters, providers) antes de haver login social.
- **Risco/A revisar:** em produção, definir `SESSION_SECRET` forte (env) — há fallback
  inseguro só para dev. Quando entrar login social/recuperação de senha, migrar para Auth.js.

## 2026-06-16 — D6: P&L expõe resultado planejado E realizado
- **Decisão:** `computeShowPnL` retorna `plannedResult` (cachê − despesas) como headline e
  `actualResult` (receitas lançadas − despesas) em paralelo, para evitar dupla contagem
  entre o campo `feeAgreed` do show e transações de receita vinculadas.
- **Justificativa:** o usuário pode (a) só preencher o cachê no show, ou (b) lançar a receita
  como transação. Separar os dois números evita ambiguidade. A UI usa `plannedResult`.
- **A revisar:** validar com usuários qual número é o mais intuitivo como "resultado do show".
