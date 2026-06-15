# Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚧 **Status:** Fase 1 em andamento. App funcional (builda, roda, testes verdes).
> Entregue: autenticação (F1), agenda de shows com rentabilidade por show (F2) e painel
> financeiro. Finanças (F3) e contatos (F5) em breve. Veja `PROGRESS.md`.

## Rodando localmente
```bash
cp .env.example .env
npm install
npm run db:push      # cria o SQLite dev.db a partir do schema Prisma
npm run db:seed      # opcional — usuário demo: demo@palco.app / senha123
npm run dev          # http://localhost:3000
npm test             # testes da lógica de negócio e de autenticação
```

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.

## Stack
Next.js 15 (App Router) + TypeScript + Prisma + Tailwind CSS. SQLite em desenvolvimento,
PostgreSQL em produção. Autenticação por cookie de sessão assinado (HMAC) + bcrypt.
(Justificativa em `DECISIONS.md`.)
