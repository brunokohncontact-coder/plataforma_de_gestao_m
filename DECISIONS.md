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

## 2026-06-15 — D4: Valores monetários em centavos (Int)
- **Decisão:** todo valor monetário é armazenado e calculado em **centavos como inteiro**
  (`Int`), nunca como float/decimal. Conversão para reais só nas bordas (entrada/exibição),
  via `src/lib/money.ts` (`toCents`/`formatMoney`).
- **Justificativa:** evita erros de ponto flutuante (ex.: 0,1 + 0,2) — crítico para uma
  ferramenta financeira. Inteiro é exato, simples e portável SQLite↔Postgres.
- **A revisar:** se houver multi-moeda no futuro, adicionar campo `currency` por transação.

## 2026-06-15 — D5: Autenticação própria (cookie JWT + bcrypt), não Auth.js (por ora)
- **Decisão:** v1 usa autenticação própria e mínima — senha com **bcrypt** e sessão em
  **cookie httpOnly** assinado com **JWT (jose, HS256)**. Ver `src/lib/auth.ts`.
- **Justificativa:** o MVP só precisa de e-mail+senha de usuário único por workspace.
  Auth.js adiciona dependências, configuração de adapter e abstrações desnecessárias agora;
  a implementação atual é pequena, auditável e sem serviço externo (alinha a execuções
  efêmeras). bcrypt+jose são padrões maduros — não estamos reinventando criptografia.
- **Alternativas consideradas:** Auth.js/NextAuth (recomendado no PROGRESS, mas peso extra),
  Lucia, Clerk/Supabase Auth (serviço externo).
- **A revisar:** ao introduzir OAuth (Google/Spotify), multiusuário ou reset de senha por
  e-mail, **migrar para Auth.js** — o ponto de troca é antes da Fase 2 (multiusuário).
  Falta hoje: verificação de e-mail e fluxo de "esqueci a senha".
