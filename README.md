# Palco — Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> ✅ **Status:** MVP (v1) funcional. F1–F5 do escopo implementadas. Veja `PROGRESS.md`
> para o estado atual e os próximos passos.

## Funcionalidades (MVP v1)
- **F1 — Autenticação e workspace**: cadastro/login com sessão por cookie assinado; dados isolados por usuário.
- **F2 — Agenda de shows**: CRUD de shows (data, local, cidade, status, cachê, notas).
- **F3 — Finanças**: CRUD de receitas/despesas com categoria, status (recebida/paga/pendente) e resumo mensal/por categoria.
- **F4 — Rentabilidade por show**: cada show mostra `cachê − despesas vinculadas = resultado` e margem.
- **F5 — CRM de contatos**: CRUD de contatos da indústria, vinculáveis a shows.

## Stack
Next.js 14 (App Router) + TypeScript + Prisma + Tailwind CSS. SQLite em desenvolvimento,
PostgreSQL em produção (ver `DECISIONS.md`).

## Como rodar localmente
```bash
npm install
cp .env.example .env          # ajuste AUTH_SECRET em produção
npm run db:migrate            # aplica as migrations (cria o SQLite dev.db)
npm run db:seed               # (opcional) dados de demonstração
npm run dev                   # http://localhost:3000
```
Conta de demonstração (após o seed): **demo@palco.app** / **demo1234**

## Scripts
- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção (gera o Prisma Client antes).
- `npm test` — testes unitários (Vitest) da lógica de negócio.
- `npm run db:migrate` / `npm run db:seed` — banco de dados.

## Lógica de negócio testada
O núcleo financeiro (rentabilidade por show, agregações mensais/por categoria, separação
recebido/pendente) e a assinatura de sessão ficam em `src/lib/` com testes em
`src/lib/*.test.ts` — funções puras, desacopladas do banco.

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.
