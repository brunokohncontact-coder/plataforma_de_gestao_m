# Palco — Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚧 **Status:** Fase 1 em andamento. Scaffold + modelo de dados + lógica de negócio
> (com testes) prontos. UI das features F1–F5 é o próximo passo. Veja `PROGRESS.md`.

## Stack
Next.js (App Router) + TypeScript + Prisma + Tailwind CSS. SQLite em desenvolvimento,
PostgreSQL em produção. Testes com Vitest. (Justificativa em `DECISIONS.md`.)

## Começando

```bash
npm install
cp .env.example .env        # DATABASE_URL aponta para SQLite local
npx prisma db push          # cria o schema no SQLite
npm run db:seed             # (opcional) dados de demonstração
npm run dev                 # http://localhost:3000
```

## Scripts
- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção (gera o Prisma Client antes).
- `npm test` — testes da lógica de negócio (Vitest).
- `npm run db:push` / `db:migrate` — sincroniza o schema Prisma.
- `npm run db:seed` — popula um artista demo com shows, finanças e contatos.
- `npm run db:studio` — abre o Prisma Studio.

## Estrutura
- `src/app/` — UI (Next.js App Router).
- `src/lib/domain.ts` — tipos de domínio, validação (Zod) e helpers de dinheiro (centavos).
- `src/lib/finance.ts` — lógica financeira pura: P&L por show (F4), agregações (F3).
- `src/lib/*.test.ts` — testes da lógica de negócio.
- `prisma/schema.prisma` — modelo de dados (`User`, `Show`, `Transaction`, `Contact`).

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.
