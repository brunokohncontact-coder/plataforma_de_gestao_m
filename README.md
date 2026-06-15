# Palco — Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> ✅ **Status:** Fase 0 (Descoberta) concluída · **MVP (v1) em construção** — F1 Auth,
> F2 Shows, F3 Finanças, F4 Rentabilidade por show e F5 Contatos já funcionais.
> Veja `PROGRESS.md` para o estado atual e os próximos passos.

## Stack
Next.js 14 (App Router) + TypeScript + Prisma + Tailwind CSS. **SQLite** em
desenvolvimento (zero dependência externa), portável para **PostgreSQL** em produção.
Autenticação própria (bcrypt + cookie de sessão assinado). Testes com Vitest.

## Como rodar (dev)
```bash
npm install            # instala deps e gera o Prisma Client (postinstall)
cp .env.example .env   # configura DATABASE_URL (SQLite) e AUTH_SECRET
npm run db:push        # cria o banco SQLite a partir do schema
npm run db:seed        # (opcional) dados de demo — login: demo@palco.app / demo12345
npm run dev            # http://localhost:3000
```

### Scripts
- `npm run dev` / `npm run build` / `npm start` — Next.js.
- `npm test` — testes da lógica de negócio (Vitest).
- `npm run db:push` / `db:migrate` / `db:seed` — banco (Prisma).

## Estrutura
```
prisma/schema.prisma        Modelo: User, Show, Transaction, Contact
prisma/seed.ts              Dados de demonstração
src/lib/domain/             Lógica de negócio PURA + testes (P&L, agregações)
src/lib/{auth,db,validation,format}.ts
src/app/actions/            Server Actions (shows, transactions, contacts, auth)
src/app/(auth)/             Login e cadastro
src/app/(app)/              App autenticado: dashboard, shows, finances, contacts
src/components/             Componentes de UI reutilizáveis
```

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.
