# Palco — Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> ✅ **Status:** Fase 0 (Descoberta) concluída. Fase 1 (MVP) em andamento — F1–F5
> implementadas e funcionais. Veja `PROGRESS.md` para o estado atual e próximos passos.

## Funcionalidades (MVP v1)
- **F1 — Autenticação e workspace** — cadastro/login, dados isolados por usuário.
- **F2 — Agenda de shows** — CRUD com data, local, status, cachê e notas.
- **F3 — Finanças** — receitas/despesas por categoria, contas a receber/pagar, saldo de caixa.
- **F4 — Rentabilidade por show** — cachê − despesas vinculadas = resultado (diferencial).
- **F5 — CRM de contatos** — venues, produtores, contratantes etc.

## Stack
Next.js 14 (App Router) + TypeScript + Prisma + Tailwind CSS. **SQLite** em
desenvolvimento, portável para **PostgreSQL** em produção. Auth própria leve
(bcrypt + JWT de sessão em cookie httpOnly via `jose`). Testes com Vitest.

## Como rodar localmente
```bash
npm install
cp .env.example .env            # ajuste AUTH_SECRET em produção
npx prisma db push              # cria o banco SQLite (dev.db)
npm run db:seed                 # (opcional) dados de demonstração
npm run dev                     # http://localhost:3000
```
Login de demonstração (após `db:seed`): `demo@palco.app` / `demo1234`.

## Scripts
- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção (roda `prisma generate`).
- `npm test` — testes da lógica de negócio (Vitest).
- `npm run db:seed` — popula dados de demonstração.

## Documentação de estratégia (`docs/`)
- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades.
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões
Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.
