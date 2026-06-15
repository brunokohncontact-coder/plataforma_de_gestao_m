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

## 2026-06-15 — D4: Autenticação por sessão própria (cookie HMAC) no MVP, em vez de Auth.js
- **Decisão:** sessão própria minimalista — cookie `httpOnly` assinado com HMAC-SHA256
  (`SESSION_SECRET`), senha com `bcryptjs`. Implementação em `src/lib/auth.ts`.
- **Justificativa:** Auth.js agrega dependências e configuração (provider, adapter, rotas
  de callback) que não pagam o custo enquanto só há login por e-mail/senha. A solução
  própria é pequena, testável e suficiente para o MVP; cobre o essencial de segurança
  (hash forte, cookie httpOnly/secure/sameSite, expiração, comparação em tempo constante).
- **Alternativas consideradas:** Auth.js/NextAuth (recomendado no PROGRESS da sessão 1 —
  melhor para OAuth/social login e padrões prontos, mas excessivo agora); Lucia (descontinuado).
- **A revisar / dívida:** ao adicionar login social, recuperação de senha ou multiusuário,
  reavaliar migração para Auth.js. **Importante:** definir `SESSION_SECRET` forte em produção
  (o fallback de dev é inseguro e propositalmente óbvio).

## 2026-06-15 — D5: Valores monetários em centavos (inteiros)
- **Decisão:** toda monetização é armazenada e calculada em **centavos (Int)**; conversão
  de/para texto em `src/lib/money.ts` (aceita vírgula e ponto, milhar pt-BR e en-US).
- **Justificativa:** evita erros de ponto flutuante em somas financeiras (núcleo do produto).
  Coberto por testes (`money.test.ts`, `finance.test.ts`).
