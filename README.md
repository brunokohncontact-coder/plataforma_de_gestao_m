# Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚧 **Status:** MVP (Fase 1, F1–F5) funcional de ponta a ponta — auth, shows, finanças,
> rentabilidade por show e contatos. Em polimento. Veja `PROGRESS.md` para o estado e os
> próximos passos.

## Rodando localmente
```bash
npm install
cp .env.example .env        # DATABASE_URL=file:./dev.db, AUTH_SECRET=...
npx prisma migrate dev      # cria o banco SQLite
npm run db:seed             # opcional: dados demo (login demo@palco.app / senha demo1234)
npm run dev                 # http://localhost:3000
```
Outros scripts: `npm test` (Vitest), `npm run build` (produção).

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Prisma 5 + Tailwind CSS. SQLite em
desenvolvimento, PostgreSQL em produção. Autenticação própria (cookie assinado HMAC) +
bcrypt. (Justificativas em `DECISIONS.md`.)
