# Palco — Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚧 **Status:** Fase 1 em andamento. Fundação técnica pronta (scaffold, modelo de
> dados, lógica financeira testada). Veja `PROGRESS.md` para estado e próximos passos.

## Stack
Next.js 15 (App Router) + TypeScript + Prisma + Tailwind CSS v4 + Vitest.
SQLite em desenvolvimento, PostgreSQL em produção. (Justificativa em `DECISIONS.md`.)

## Como rodar (dev)

```bash
npm install
cp .env.example .env        # DATABASE_URL aponta para SQLite local
npm run db:push             # cria o schema no SQLite
npm run db:seed             # (opcional) popula dados de exemplo
npm run dev                 # http://localhost:3000
```

Outros comandos:

```bash
npm run build   # gera o Prisma Client e compila a produção
npm test        # roda os testes da lógica de negócio (Vitest)
```

## Estrutura
- `src/app/` — páginas (App Router). `/` landing, `/dashboard` demo da rentabilidade.
- `src/lib/finance.ts` — **lógica central**: P&L por show, resumos financeiros (mês/categoria).
- `src/lib/money.ts` — utilitários monetários (centavos, parsing e formatação BRL).
- `src/lib/domain.ts` — tipos e constantes do domínio.
- `src/lib/validation.ts` — schemas Zod para a borda (forms/API).
- `prisma/schema.prisma` — modelo de dados (`Workspace`, `User`, `Show`, `Transaction`, `Contact`).

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.
