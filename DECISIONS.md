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

## 2026-06-15 — D4: Autenticação própria (bcrypt + JWT em cookie) em vez de NextAuth
- **Decisão:** implementar auth própria no MVP — senha com hash `bcryptjs` e sessão como
  JWT HS256 (lib `jose`) em cookie `httpOnly`/`SameSite=Lax`/`Secure` em prod
  (`src/lib/auth.ts`). Segredo via `AUTH_SECRET`. Todo dado é escopado por `userId`.
- **Justificativa:** o MVP tem só e-mail/senha; NextAuth/Auth.js agregaria configuração,
  dependências e abstrações desnecessárias agora. A solução escolhida é pequena, explícita
  e fácil de testar. O modelo de dados (`User`) já está pronto para trocar por Auth.js depois
  sem migração.
- **Riscos/limitações (a endereçar antes de produção):** sem verificação de e-mail, sem
  reset de senha, sem rate limiting/proteção contra brute force, sem rotação de sessão.
  Tratar como dívida técnica explícita para a fase de hardening.
- **Alternativas consideradas:** Auth.js (mais robusto, porém mais peso para o MVP);
  Lucia (descontinuado como lib); sessões em banco (mais simples de revogar, porém exige
  consulta a cada request — adiado).

## 2026-06-15 — D5: Valores monetários em centavos (inteiros)
- **Decisão:** armazenar todo valor monetário como inteiro de centavos (`feeCents`,
  `amountCents`); converter/formatar só na borda (UI), com locale pt-BR/BRL.
- **Justificativa:** evita erros de ponto flutuante em cálculos financeiros — crítico para
  o diferencial de rentabilidade. Coberto por testes (`src/lib/money.test.ts`).
