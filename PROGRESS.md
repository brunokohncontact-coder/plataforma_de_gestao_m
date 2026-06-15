# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.
>
> ⚙️ **Container efêmero:** rode `bash scripts/setup.sh` antes de buildar/testar (instala
> deps, gera Prisma Client, cria SQLite). Há um `SessionStart` hook que faz isso automaticamente.

## Estado atual
**Fase 1 (MVP) — núcleo funcional implementado.** O app builda (`npm run build` ✓),
testa (`npm test` ✓ 20 testes) e roda (`npm start` ✓). F1–F5 do `docs/mvp-scope.md`
estão implementadas. Falta polimento, testes de integração e algumas telas auxiliares.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-15 (Fase 1 — scaffold + MVP F1–F5)
- **Scaffold**: Next.js 15 (App Router) + TS + Tailwind + Prisma + Vitest + Zod.
  - `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`,
    `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env` (gitignored).
  - `scripts/setup.sh` + `.claude/settings.json` (SessionStart hook) para o container efêmero.
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`.
  Monetização em centavos (Int). Status/roles/types como String (portável p/ Postgres).
  `prisma/seed.ts` cria artista demo (login `demo@palco.app` / `demo1234`).
- **Lógica de negócio + testes (ANTES da UI)** — `src/lib/`:
  - `money.ts` — `toCents`/`formatCents` (pt-BR e en-US) + `money.test.ts` (9 testes).
  - `finance.ts` — `calcShowProfitability` (P&L por show), `summarize`, `aggregateByMonth`,
    `aggregateByCategory`, `monthKey` + `finance.test.ts` (11 testes). **20/20 passando.**
  - `validation.ts` (zod), `auth.ts` (sessão HMAC + bcrypt), `db.ts`, `session.ts`,
    `dates.ts`, `labels.ts`.
- **UI (F1→F5)** — `src/app/`:
  - F1 Auth: `(auth)/login`, `(auth)/signup`, `AuthForm.tsx`, `actions.ts` (useActionState).
  - Layout autenticado `(app)/layout.tsx` + `NavLink.tsx` (nav responsiva).
  - F2 Shows: lista, novo, detalhe, editar + `actions.ts` (CRUD, checagem de posse/IDOR).
  - F3 Finanças: lista com resumo, novo, editar, toggle recebido/a receber, excluir.
  - F4 Rentabilidade: P&L na tela do show + bloco "rentabilidade por show" no dashboard.
  - F5 Contatos: lista, novo, editar, excluir; vínculo show↔contato.
  - Dashboard `(app)/dashboard`: resumo financeiro, próximos shows, fluxo mensal (barras),
    rentabilidade por show.
- `DECISIONS.md` — +D4 (auth própria vs Auth.js), +D5 (centavos).

## Próximos passos (priorizados para a próxima sessão)
1. **Testes de integração das server actions** (criar/editar/excluir show e transação,
   isolamento por usuário). Hoje os testes cobrem só a lógica pura — cobrir o caminho
   com banco (usar SQLite de teste em memória/arquivo temporário).
2. **Agregação por categoria na UI** — `aggregateByCategory` já existe e é testada, mas
   ainda não tem tela. Adicionar ao dashboard ou à página de finanças (gráfico/barras).
3. **Filtros e visão de calendário em Shows** (mvp-scope F2 cita "lista e calendário";
   hoje só há lista). Filtro por status/período em Shows e Finanças.
4. **Validação de formulário no cliente com feedback** (hoje erros de zod nas server
   actions de show/transação são `throw` → tela de erro do Next; melhorar UX com
   useActionState como no auth).
5. **Polir responsivido + estados vazios + acessibilidade**; favicon/branding.
6. **`prisma.config.ts`** para silenciar o aviso de depreciação do `package.json#prisma`.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, EPK, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) seguem como hipóteses.
- **Produção:** definir `SESSION_SECRET` forte e migrar `provider` do Prisma para `postgresql`
  (o schema já é portável). Ver D4/D3 em `DECISIONS.md`.
