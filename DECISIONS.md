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

## 2026-06-16 — D4: Valores monetários em centavos (inteiros)
- **Decisão:** todo dinheiro é persistido e calculado em **centavos (Int)**; a conversão
  para reais (number) ocorre só na borda (UI/IO), em `src/lib/money.ts`.
- **Justificativa:** evita erros de ponto flutuante em somas/margens (lógica financeira é
  o diferencial do produto). `parseAmountToCents` aceita formatos BR e US.
- **A revisar:** se surgirem múltiplas moedas, adicionar campo `currency` por workspace.

## 2026-06-16 — D5: "Enums" como String (limitação do SQLite no Prisma)
- **Decisão:** `status`, `type`, `role` são `String` no schema; os valores permitidos e a
  validação ficam na aplicação (`src/lib/domain.ts` + Zod em `src/lib/validation.ts`).
- **Justificativa:** o provider SQLite do Prisma não suporta `enum` nativo. Manter String
  preserva a portabilidade para Postgres sem migration disruptiva.
- **A revisar:** ao migrar para Postgres, avaliar converter para enums nativos do Prisma.

## 2026-06-16 — D6: Modelagem do P&L por show (cachê vs. transações vinculadas)
- **Decisão:** em `calcShowProfitability`, o `feeCents` do show é a receita principal;
  transações de receita vinculadas ao show são tratadas como receita **adicional**
  (ex.: merch), e despesas vinculadas são subtraídas. Resultado = cachê + extra − despesas.
- **Justificativa:** evita contar o cachê em dobro quando o usuário registra também a
  transação de recebimento do cachê. Documentado no docstring da função.
- **Risco/validação:** comportamento pode confundir quem espera somar todas as receitas
  vinculadas. Validar com usuários; possivelmente tornar configurável.
