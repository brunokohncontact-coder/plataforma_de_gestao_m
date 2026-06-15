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

## 2026-06-15 — D4: Valores monetários em centavos (Int) e parsing pt-BR-first
- **Decisão:** toda quantia é armazenada/calculada como inteiro em **centavos**; formatação
  só na borda (UI). O parser de entrada (`src/lib/money.ts`) trata, no caso ambíguo de um
  único ponto seguido de 3 dígitos (ex.: `"1.500"`), como **separador de milhar** (= 1500),
  o padrão pt-BR; com 1–2 dígitos após o ponto, trata como decimal (tolerância a entrada en).
- **Justificativa:** evita erros de ponto flutuante em finanças; o produto é pt-BR-first
  (ver `mvp-scope.md`). O caso `"1.500"` é genuinamente ambíguo entre locales.
- **A revisar:** quando houver i18n/seleção de moeda, o parser deve respeitar o locale do
  workspace em vez da heurística fixa. Validar com usuários reais como digitam valores.

## 2026-06-15 — D5: Fase 1 fatiada — fundação (dados + lógica + testes) antes da UI/Auth
- **Decisão:** a 1ª sessão de código entrega scaffold + schema Prisma + lógica de negócio
  testada (P&L, agregações), **sem** auth/telas ainda. Landing estática como placeholder.
- **Justificativa:** segue a ordem de `mvp-scope.md` (lógica antes da UI) e mantém cada
  sessão com build/test verdes. Auth (Auth.js vs. própria) fica decidida na próxima sessão.
