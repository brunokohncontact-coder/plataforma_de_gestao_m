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
- **Decisão:** usar **Palco** como nome de trabalho do produto (campo `name` no
  `package.json`, títulos e copy da landing).
- **Justificativa:** curto, memorável, em português (alinhado ao go-to-market LATAM,
  D1/PROGRESS), evoca o ponto de encontro de toda a carreira do músico. Domínio/marca
  não verificados.
- **A revisar:** validar disponibilidade de marca/domínio antes de qualquer lançamento.

## 2026-06-15 — D5: Valores monetários sempre em centavos (inteiros)
- **Decisão:** armazenar e calcular todo valor financeiro em **centavos** (`Int`), nunca
  em ponto flutuante. Conversão/formatação isolada em `src/lib/money.ts`.
- **Justificativa:** evita erros clássicos de arredondamento (`0.1 + 0.2`) na lógica que
  é o diferencial do produto (rentabilidade). Coberto por testes.

## 2026-06-15 — D6: Cálculo de rentabilidade reconhece a maior entre cachê e receita lançada
- **Decisão:** em `computeShowPnL`, a receita bruta do show = `max(cachê acordado,
  soma das receitas vinculadas)`. O resultado = receita bruta − despesas vinculadas.
- **Justificativa:** o show tem um cachê acordado no cadastro, mas o usuário também pode
  lançar receitas reais. Usar o `max` mantém o P&L útil tanto antes de lançar a receita
  (só há o cachê) quanto depois (receita real, ex.: bônus/merch acima do cachê) sem
  contagem dupla. **A revisar com usuários:** alguns podem querer somar cachê + extras em
  vez de `max`; decidir após validação (entrevistas).

## 2026-06-15 — D7: Auth ainda não implementada (seed usa hash placeholder)
- **Decisão:** o modelo `User` já tem `passwordHash`, mas o hashing/login real fica para
  a feature F1 na próxima sessão. O seed usa um placeholder explícito (não-funcional).
- **Justificativa:** priorizar modelo de dados + lógica de negócio testável antes da UI
  (ordem definida em `mvp-scope.md`). Recomendação pendente: Auth.js vs. hashing próprio
  (bcrypt/argon2) — decidir e registrar na próxima sessão.
