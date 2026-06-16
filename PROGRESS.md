# PROGRESS — Plataforma de Gestão de Carreira para Músicos ("Palco")

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 1 em andamento — fundação técnica PRONTA.** O projeto builda (`npm run build`),
os testes passam (`npm test`, 20 testes) e o schema aplica no SQLite (`npm run db:push`).
A lógica financeira central (P&L por show, agregações) está implementada e testada.
A UI ainda é mínima: landing (`/`) + demo estática da rentabilidade (`/dashboard`).
**Ainda não há autenticação nem CRUD persistido pela UI.**

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/` — market-analysis, personas-and-needs, business-plan, mvp-scope.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack).

### Sessão 2 — 2026-06-16 (Fase 1: scaffold + dados + lógica)
- **Scaffold**: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`,
  `vitest.config.ts`, `.gitignore`, `.env`/`.env.example`. Stack: Next 15 + TS + Tailwind v4
  + Prisma + Vitest. `npm install` e `npm run build` verdes.
- **Modelo de dados**: `prisma/schema.prisma` com `Workspace`, `User`, `Show`,
  `Transaction`, `Contact` (+ índices, relações, onDelete). `prisma/seed.ts` funcional.
- **Lógica de negócio + testes (antes da UI)**:
  - `src/lib/money.ts` — centavos, parsing BR/US, formatação BRL. Testes em `money.test.ts`.
  - `src/lib/finance.ts` — `calcShowProfitability`, `summarize`, `summarizeByMonth`,
    `summarizeByCategory`. Testes em `finance.test.ts`. **20 testes passando.**
  - `src/lib/domain.ts` — tipos/constantes/rótulos pt-BR. `src/lib/validation.ts` — Zod.
  - `src/lib/db.ts` — singleton do Prisma Client.
- **UI inicial**: `src/app/page.tsx` (landing) e `src/app/dashboard/page.tsx` (demo da
  rentabilidade com dados fictícios, exercitando a lógica real).
- **CI**: `.github/workflows/ci.yml` — roda `npm test` + `npm run build` em push/PR.
- **Decisões**: D4 (dinheiro em centavos), D5 (enums como String no SQLite), D6
  (modelagem do P&L: cachê + receita extra − despesas).

## Próximos passos (priorizados para a próxima sessão)
1. **Autenticação (F1)**: decidir Auth.js (NextAuth) vs. solução simples (cookie de sessão
   + bcrypt). Recomendação em PROGRESS anterior: Auth.js. Implementar cadastro/login e
   associar cada usuário a um `Workspace`. Registrar decisão em DECISIONS.md.
2. **Camada de dados/serviços por workspace**: funções `src/lib/data/*` (ou server actions)
   para CRUD de Show/Transaction/Contact, sempre escopadas ao `workspaceId` do usuário logado.
   Cobrir com testes de integração (usar SQLite em memória/arquivo temporário).
3. **F2 Agenda de shows (UI real)**: lista + formulário (criar/editar/excluir), usando
   `showInputSchema`. Visão de lista primeiro; calendário depois.
4. **F3 Finanças (UI real)**: CRUD de transações com vínculo opcional a show; dashboard
   real consumindo `summarize`/`summarizeByMonth`/`summarizeByCategory`.
5. **F4 Rentabilidade**: tela do show com P&L (`calcShowProfitability`) sobre dados reais.
6. **F5 Contatos**: CRUD + vínculo a shows.
7. Polimento responsivo + estados vazios/erros.

## Notas técnicas / atenção
- Aviso de deprecação do Prisma: `package.json#prisma` → migrar para `prisma.config.ts`
  antes do Prisma 7 (não urgente; só warning).
- `dev.db` é gitignored (não versionar). Em CI/dev, rodar `npm run db:push` antes de usar o app.
- Sem ESLint config próprio ainda; `next build` faz checagem de tipos. Avaliar adicionar
  `eslint-config-next` se quiser `npm run lint`.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** (CRM, multiusuário) precisam de 5–10 entrevistas
  com músicos reais.
- Foco **português/LATAM** e faixas de preço (`business-plan.md`) são hipóteses de GTM.
- Modelagem do P&L (D6): validar se "receita vinculada = adicional" é intuitivo.
