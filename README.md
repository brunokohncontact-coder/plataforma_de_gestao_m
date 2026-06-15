# Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚧 **Status:** Fase 1 em andamento. Fundação pronta — scaffold Next.js, modelo de dados
> (Prisma) e lógica de rentabilidade testada. Auth e telas vêm a seguir. Veja
> `PROGRESS.md` para o estado atual e os próximos passos.

## Desenvolvimento
```bash
npm install
cp .env.example .env
npx prisma migrate dev   # cria o SQLite local (dev.db)
npm run dev              # http://localhost:3000
npm test                 # testes da lógica de negócio (Vitest)
npm run build            # build de produção
```

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.

## Stack proposta
Next.js (App Router) + TypeScript + Prisma + Tailwind CSS. SQLite em desenvolvimento,
PostgreSQL em produção. (Justificativa em `DECISIONS.md`.)
