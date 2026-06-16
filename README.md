# Palco — Gestão de carreira para músicos

Plataforma web de **back-office** para músicos: agenda de shows, finanças,
**rentabilidade por show** e CRM de contatos da indústria. O diferencial é cruzar
shows × dinheiro para mostrar o lucro real de cada apresentação — algo que planilhas
e os concorrentes resolvem mal.

> Estágio: **MVP em desenvolvimento** (Fase 1). Estratégia e pesquisa em `docs/`.
> Decisões de produto/arquitetura em `DECISIONS.md`. Roadmap em `PROGRESS.md`.

## Stack
- **Next.js 14** (App Router) + **TypeScript** + Server Actions / RSC
- **Prisma** ORM — **SQLite** em dev (portável para **PostgreSQL** em produção)
- **Tailwind CSS** · **Zod** (validação) · **Vitest** (testes)
- Autenticação própria (scrypt + cookie de sessão assinado), sem dependências externas

## Funcionalidades (MVP)
- **F1** Autenticação e workspace por usuário
- **F2** Agenda de shows (CRUD, status, cachê, local, contato vinculado)
- **F3** Finanças (receitas/despesas, categorias, contas a receber/pagar)
- **F4** Rentabilidade por show (`cachê + extras − despesas vinculadas`)
- **F5** CRM de contatos (casas, produtores, contratantes, imprensa)

## Como rodar

```bash
npm install
cp .env.example .env          # ajuste AUTH_SECRET se quiser
npx prisma migrate dev        # cria o banco SQLite (dev.db) e aplica migrations
npm run db:seed               # (opcional) dados demo — login: demo@palco.app / demo12345
npm run dev                   # http://localhost:3000
```

## Scripts
- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (gera o Prisma Client antes)
- `npm start` — servidor de produção
- `npm test` — testes (Vitest)
- `npm run db:seed` — popula dados de demonstração

## Estrutura
```
src/
  app/
    (auth)/        login, register, ações de autenticação
    (app)/         área logada: dashboard, shows, transactions, contacts
  components/      componentes de UI (forms, nav, cards)
  lib/
    finance.ts     P&L por show, agregações financeiras (testado)
    session.ts     tokens de sessão assinados (testado)
    password.ts    hash de senha scrypt (testado)
    validation.ts  schemas Zod (testado)
    enums.ts       enums de domínio + rótulos
    auth.ts        sessão/cookies + Prisma
    prisma.ts      cliente Prisma (singleton)
prisma/
  schema.prisma    modelo de dados
  seed.ts          dados de demonstração
docs/              pesquisa de mercado, personas, plano de negócio, escopo do MVP
```

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) · [`personas-and-needs.md`](docs/personas-and-needs.md)
- [`business-plan.md`](docs/business-plan.md) · [`mvp-scope.md`](docs/mvp-scope.md)
- Decisões técnicas/produto: [`DECISIONS.md`](DECISIONS.md) · Roadmap: [`PROGRESS.md`](PROGRESS.md)

## Testes
A lógica de negócio crítica (rentabilidade, agregações financeiras, sessão, validação,
hash de senha) tem cobertura unitária — pré-requisito para mexer no financeiro com segurança.
Rode `npm test` (34 testes).
