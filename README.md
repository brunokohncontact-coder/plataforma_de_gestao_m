# Palco — gestão de carreira para músicos

O back-office da carreira na música: **agenda de shows, finanças, rentabilidade por show
e contatos da indústria** em um só lugar. Simples o bastante para quem odeia planilha.

> Documentos de estratégia (mercado, personas, plano de negócio, escopo do MVP) em `docs/`.
> Decisões técnicas discutíveis em `DECISIONS.md`. Estado e próximos passos em `PROGRESS.md`.

## Stack
- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** ORM — SQLite em dev, schema portável para PostgreSQL em produção
- **Tailwind CSS**
- **Zod** para validação · **Vitest** para testes
- Autenticação própria (scrypt + cookie de sessão assinado) — ver `DECISIONS.md` D5

## Como rodar (dev)

```bash
npm install                # instala deps e gera o Prisma Client
cp .env.example .env       # define DATABASE_URL (SQLite por padrão)
npm run db:push            # cria o banco SQLite a partir do schema
npm run db:seed            # (opcional) dados de demonstração
npm run dev                # http://localhost:3000
```

Usuário demo (após o seed): `demo@palco.app` / senha `demodemo123`.

## Scripts
| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o Prisma Client e builda para produção |
| `npm start` | Servidor de produção |
| `npm test` | Roda os testes (Vitest) |
| `npm run typecheck` | Checagem de tipos (tsc) |
| `npm run db:push` | Sincroniza o schema com o banco |
| `npm run db:seed` | Popula dados de demonstração |

## Funcionalidades do MVP (v1)
- **F1 — Auth/Workspace:** cadastro e login; cada usuário tem seu espaço privado.
- **F2 — Shows:** CRUD com status (proposto/confirmado/realizado/cancelado), cachê, local.
- **F3 — Finanças:** receitas/despesas com categoria, status recebido/pendente, vínculo a show.
- **F4 — Rentabilidade por show:** cachê − despesas vinculadas = resultado; agregação no painel.
- **F5 — Contatos:** CRM básico da indústria.

## Estrutura
```
src/
  app/                # rotas (App Router)
    (app)/            # área autenticada: dashboard, shows, financas, contatos
    login, signup     # autenticação
    auth-actions.ts   # server actions de login/cadastro/logout
  components/         # UI (forms, dialog, badges…)
  lib/
    domain/           # LÓGICA DE NEGÓCIO PURA + testes (finance, validation, constants)
    auth.ts, auth-crypto.ts, db.ts
prisma/
  schema.prisma       # modelo de dados
  seed.ts             # dados de demonstração
docs/                 # estratégia (Fase 0)
```

A lógica de negócio crítica (cálculo de P&L, agregações financeiras, validação, cripto de
auth) é pura e coberta por testes em `src/lib/**/*.test.ts`.
