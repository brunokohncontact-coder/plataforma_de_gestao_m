# Palco — Gestão de Carreira para Músicos

Plataforma web (back-office) para músicos gerirem a carreira: **agenda de shows,
finanças, rentabilidade por show e contatos da indústria** — substituindo planilhas
e apps avulsos.

> **Status:** MVP (v1) em desenvolvimento. Fase 0 (Descoberta) concluída; F1–F5 do
> escopo implementadas. Veja `PROGRESS.md` para o estado atual e próximos passos.

## Funcionalidades (v1)
- **F1 — Auth/Workspace:** cadastro/login; cada usuário tem seu workspace isolado.
- **F2 — Agenda de shows:** CRUD com data, local, cidade, status e cachê.
- **F3 — Finanças:** receitas/despesas por categoria, contas a receber/pagar.
- **F4 — Rentabilidade por show:** cachê − despesas vinculadas = resultado (diferencial).
- **F5 — Contatos:** CRM básico, vinculável a shows.

## Stack
Next.js 15 (App Router) + React 19 + TypeScript + Prisma + Tailwind CSS.
SQLite em desenvolvimento, PostgreSQL em produção. (Justificativa em `DECISIONS.md`.)

## Rodando localmente
```bash
npm install
cp .env.example .env       # ajuste AUTH_SECRET
npx prisma db push         # cria o banco SQLite (dev.db)
npm run db:seed            # (opcional) dados demo — login: demo@palco.app / demodemo
npm run dev                # http://localhost:3000
```

## Scripts
- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção (roda `prisma generate`).
- `npm test` — testes da lógica de negócio (Vitest).
- `npm run db:push` / `db:migrate` / `db:seed` — banco de dados.

## Estrutura
- `src/lib/` — lógica de negócio pura (finanças, dinheiro) + infra (db, auth, sessão).
- `src/app/actions/` — server actions (auth, shows, transações, contatos).
- `src/app/app/` — área autenticada (painel, shows, finanças, contatos).
- `src/components/` — componentes de UI reutilizáveis.
- `prisma/schema.prisma` — modelo de dados.
- `docs/` — documentação de estratégia (Fase 0).

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades.
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

Decisões técnicas/de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md).
