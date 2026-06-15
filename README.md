# Palco — gestão de carreira para músicos

O **back-office do artista**: agenda de shows, finanças, rentabilidade por show e CRM
de contatos. Feito para o músico que odeia planilha mas precisa de controle.

> 🚧 **Status:** Fase 1 em andamento — scaffold, modelo de dados e lógica de negócio
> (com testes) prontos. UI sendo construída feature a feature. Veja `PROGRESS.md`.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Prisma** ORM — SQLite em desenvolvimento, portável para PostgreSQL em produção
- **Tailwind CSS** v3
- **Vitest** para testes da lógica de negócio
- **Zod** para validação

Justificativa da stack em `DECISIONS.md` (D3).

## Rodando localmente

```bash
npm install
cp .env.example .env        # DATABASE_URL aponta para SQLite local
npx prisma migrate dev      # cria o banco e aplica o schema
npm run db:seed             # (opcional) popula dados de demonstração
npm run dev                 # http://localhost:3000
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o Prisma Client e builda para produção |
| `npm test` | Roda os testes (Vitest) |
| `npm run db:migrate` | Aplica/gera migrations do Prisma |
| `npm run db:seed` | Popula dados de demonstração |

## Estrutura

```
docs/            Estratégia (Fase 0): mercado, personas, plano de negócio, escopo do MVP
prisma/          schema.prisma, migrations e seed
src/app/         Rotas (App Router)
src/lib/         Lógica de negócio (finance, money) + Prisma client
```

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades.
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Funcionalidades do MVP (v1)

F1 Auth/Workspace · F2 Agenda de shows · F3 Finanças · F4 Rentabilidade por show ·
F5 CRM de contatos. Detalhes em `docs/mvp-scope.md`.
