# PROGRESS — Plataforma de Gestão de Carreira para Músicos

> Memória entre sessões. Toda execução: `git pull`, ler isto por inteiro, seguir os
> próximos passos. Ao fim: commit + push e atualizar este arquivo.

## Estado atual
**Fase 0 (Descoberta e estratégia) — CONCLUÍDA.** Documentos de estratégia produzidos.
Ainda **não há código de aplicação** — a próxima sessão inicia a Fase 1 (scaffold).

## O que foi concluído

### Sessão 1 — 2026-06-15 (Fase 0)
- `docs/market-analysis.md` — análise de Bandzoogle, Beatchain, Sonicbids, Bandsintown/
  Songkick, Vampr e soluções DIY (Notion/Sheets/Gigditty); lacunas e posicionamento.
- `docs/personas-and-needs.md` — 4 personas (iniciante, banda, sessão/freelancer, artista
  com manager); necessidades marcadas como validada/hipótese; tabela-síntese priorizada.
- `docs/business-plan.md` — proposta de valor, monetização freemium/SaaS, diferenciais, riscos.
- `docs/mvp-scope.md` — escopo v1: F1 Auth/Workspace, F2 Agenda de shows, F3 Finanças,
  F4 Rentabilidade por show, F5 CRM de contatos. Fora de escopo e ordem de implementação.
- `DECISIONS.md` — D1 (foco back-office), D2 (núcleo MVP), D3 (stack Next.js+TS+Prisma+Tailwind, SQLite em dev).

## Próximos passos (priorizados para a próxima sessão — Fase 1)
1. **Scaffold do projeto**: Next.js (App Router) + TypeScript + Tailwind + Prisma.
   - `package.json`, `tsconfig`, config Tailwind, Prisma init com SQLite.
   - Script de teste (Vitest) e garantir `npm run build` + `npm test` verdes.
   - Adicionar `.gitignore` (node_modules, .next, *.db, .env).
2. **Modelo de dados (Prisma schema)**: `User`, `Show`, `Transaction`, `Contact`
   (ver `docs/mvp-scope.md` para campos). Migration inicial.
3. **Lógica de negócio + testes ANTES da UI**: cálculo de P&L por show
   (cachê − despesas vinculadas), agregações financeiras mensais/por categoria, status
   recebido/pendente. Testes unitários cobrindo esses cálculos.
4. Só então começar a UI: F1 → F2 → F3 → F4 → F5.

## Bloqueios / dúvidas (para validação humana)
- Necessidades marcadas como **hipótese** em `personas-and-needs.md` (CRM, EPK,
  multiusuário) precisam de 5–10 entrevistas com músicos reais antes de investimento pesado.
- Foco em **português/LATAM** como cunha inicial é hipótese de go-to-market — validar.
- Disposição a pagar e faixas de preço (`business-plan.md`) são estimativas — validar.
- Autenticação: definir na Fase 1 entre solução simples própria vs. lib (ex.: NextAuth/Auth.js).
  Recomendação: Auth.js para não reinventar segurança. Decidir e registrar em DECISIONS.md.
