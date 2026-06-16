# PROGRESS — Plataforma de Gestão de Carreira para Músicos (Palco)

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 (MVP) — núcleo funcional implementado.** O app builda (`npm run build`),
roda (`npm start`/`npm run dev`) e passa nos testes (`npm test`, 21 testes). As cinco
funcionalidades do MVP (F1–F5 de `docs/mvp-scope.md`) estão implementadas e navegáveis.
Próxima sessão: polir UX, ampliar testes e adicionar visão de calendário + vínculo
contato↔show pela UI.

## Stack escolhida (ver DECISIONS.md D3–D6)
Next.js 14.2 (App Router) + TypeScript + Prisma (SQLite em dev) + Tailwind. Auth própria
leve (bcrypt + JWT em cookie httpOnly via `jose`). Testes com Vitest. CI em `.github/workflows/ci.yml`.

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-16 (Fase 1 — scaffold + MVP)
- **Scaffold**: `package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind
  (`tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`), Vitest
  (`vitest.config.ts`), `.gitignore`, `.env.example`. CI em `.github/workflows/ci.yml`.
  Hook de sessão `scripts/session-setup.sh` + `.claude/settings.json` (prepara env em sessões web).
- **Modelo de dados** (`prisma/schema.prisma`): `User`, `Show`, `Transaction`, `Contact`,
  `ContactsOnShows`. Valores monetários em centavos (Int). Enums como String (D5).
  Seed de demonstração em `prisma/seed.ts` (`npm run db:seed`).
- **Lógica de negócio (pura, testada antes da UI)**:
  - `src/lib/finance.ts` — `computeShowPnL` (F4), `summarizeFinances`, `totalsByCategory`,
    `totalsByMonth`. `src/lib/money.ts` — centavos/reais e formatação BRL.
  - Testes: `src/lib/finance.test.ts` (13) + `src/lib/validation.test.ts` (8) = **21, verdes**.
- **Auth (F1)**: `src/lib/auth.ts`, `src/lib/session.ts`, `src/app/(auth)/*`
  (login, register, logout). Cookie httpOnly; `requireUser()` protege as rotas do app.
- **App shell**: `src/app/(app)/layout.tsx` (nav responsiva + logout), landing `src/app/page.tsx`.
- **F2 Shows**: lista, novo, detalhe, editar, excluir — `src/app/(app)/shows/*`.
- **F3 Finanças**: lista com resumo, nova transação, alternar recebido/pago, excluir —
  `src/app/(app)/financas/*`.
- **F4 Rentabilidade**: P&L na tela do show (`shows/[id]`) e blocos no dashboard
  (`src/app/(app)/dashboard/page.tsx`).
- **F5 Contatos**: lista, novo, editar, excluir — `src/app/(app)/contatos/*`.
- Verificação de runtime: servidor sobe; `/` e `/login` → 200; `/dashboard` sem sessão → 307→/login.

## Próximos passos (priorizados para a próxima sessão)
1. **Vincular contato ↔ show pela UI** — o schema (`ContactsOnShows`) e a exibição no
   detalhe do show já existem, mas falta a ação para associar/desassociar. Adicionar
   seletor de contatos na tela do show + action.
2. **Visão de calendário dos shows** (F2 prevê lista + calendário; só há lista). Mês a mês.
3. **Editar/excluir transação** com formulário (hoje só cria, alterna status e exclui).
4. **Ampliar testes**: incluir testes de integração das server actions (validação + posse
   por usuário) — ex.: garantir que um usuário não acessa shows de outro. Considerar
   `vitest` com um banco SQLite de teste isolado.
5. **Polimento UX**: estados de loading/erro, mensagens vazias, acessibilidade,
   confirmação antes de excluir (hoje exclui direto). Formatar input monetário ao digitar.
6. **Filtros/períodos nas Finanças** (por mês, por tipo, por show).
7. **Conta**: editar perfil (nome/nome artístico), trocar senha.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, multiusuário)
  precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses — validar.
- **Segurança em produção**: definir `AUTH_SECRET` forte e migrar para PostgreSQL antes
  de qualquer deploy real. Revisar advisories do Next (D6) e planejar upgrade p/ Next 15+.
- Exclusões na UI são imediatas (sem confirmação) — decidir padrão de confirmação.
