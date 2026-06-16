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

## 2026-06-16 — D4: Definição de rentabilidade por show (P&L)
- **Decisão:** `resultado = cachê (fee) − Σ despesas vinculadas (showId)`. Transações de
  **receita** vinculadas a um show **não** são somadas ao cálculo, para não duplicar o cachê
  (o cachê já é representado por `Show.fee`). Implementado em `src/lib/finance.ts:showProfit`.
- **Justificativa:** o `fee` é a fonte única de verdade da receita do show; somar também a
  receita-cachê registrada como `Transaction` causaria contagem dupla. Mantém o número simples
  e previsível, alinhado ao escopo (`docs/mvp-scope.md` F4).
- **A revisar:** se no futuro um show tiver múltiplas fontes de receita (ex.: bilheteria +
  merch no show), considerar somar receitas vinculadas e tratar o `fee` como estimativa.

## 2026-06-16 — D5: Hash de senha com scrypt (stdlib do Node), sem lib externa
- **Decisão:** hashing próprio com `node:crypto` scrypt (`src/lib/password.ts`), formato
  `scrypt$salt$hash`, comparação em tempo constante. Auth de sessão ainda **não** implementada.
- **Justificativa:** zero dependência extra para o MVP; scrypt é adequado para senhas. Evita
  trazer NextAuth/bcrypt antes de validar o fluxo. A escolha de NextAuth/Auth.js para a camada
  de **sessão** (cookies/JWT) continua em aberto para a próxima sessão (ver PROGRESS).
- **A revisar:** se adotarmos Auth.js, ele pode encapsular o credential provider; manter
  `verifyPassword` como base é compatível.
