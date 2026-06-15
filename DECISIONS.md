# Decisões (para revisão humana)

Registro de decisões discutíveis tomadas autonomamente entre sessões. Cada entrada:
contexto, decisão, justificativa e alternativas consideradas.

---

## 2026-06-15 — D1: Foco do produto = back-office de gestão, não divulgação/distribuição
- **Decisão:** posicionar a plataforma como o "sistema operacional de gestão de carreira"
  (agenda, finanças, contatos, contratos), e **não** competir de frente com distribuição
  (Beatchain/TuneCore), site builder (Bandzoogle) ou descoberta de fãs (Bandsintown).
- **Justificativa:** a pesquisa de mercado (`docs/market-analysis.md`) mostra que a gestão
  operacional interna é a maior lacuna; o substituto atual é planilha/Notion.
- **Risco/validação:** depende de entrevistas com músicos reais. Tratar como hipótese.

## 2026-06-15 — D2: Núcleo do MVP = Shows + Finanças + Rentabilidade + CRM básico
- **Decisão:** v1 entrega F1–F5 de `docs/mvp-scope.md`; split de receita, contratos,
  EPK e distribuição ficam para fases futuras.
- **Justificativa:** são as necessidades mais consistentemente **validadas** e o
  diferencial (rentabilidade por show) não existe bem no mercado.

## 2026-06-15 — D3: Stack = Next.js + TypeScript + Prisma + Tailwind
- **Decisão:** Next.js (App Router) + TypeScript + Prisma ORM + Tailwind CSS. Banco:
  **SQLite em dev** (zero dependência externa, alinhado a execuções remotas efêmeras),
  com schema portável para **PostgreSQL** em produção.
- **Justificativa:**
  - Next.js: full-stack num só repo (UI + API routes/server actions), ótimo DX, deploy fácil.
  - TypeScript: segurança de tipos para lógica financeira.
  - Prisma: schema declarativo, migrations, troca SQLite→Postgres com mudança mínima.
  - Tailwind: prototipagem rápida e responsiva.
  - SQLite em dev: o container remoto é efêmero e sem Postgres garantido; SQLite permite
    `build`/`test`/`run` sem serviços externos, mantendo a regra "nunca deixar a base quebrada".
- **Alternativas consideradas:** Remix/SvelteKit (menos familiar/ecossistema); Postgres
  local em dev (exige serviço rodando — atrito nas execuções remotas); Drizzle (Prisma é
  mais maduro para migrations rápidas).
- **A revisar:** se produção exigir Postgres desde já, migrar o `provider` do Prisma.

## 2026-06-15 — D4: Autenticação própria com cookie assinado (HMAC) em vez de Auth.js
- **Decisão:** implementar sessão stateless própria — cookie `httpOnly` com token
  `base64url(payload).base64url(HMAC-SHA256)` assinado por `AUTH_SECRET` (ver
  `src/lib/session.ts`); senhas com `bcryptjs`.
- **Justificativa:** o MVP só precisa de e-mail/senha simples; evitar a superfície de
  config do NextAuth/Auth.js (providers, adapters) acelera a v1. A lógica de assinatura é
  pura e coberta por testes (`session.test.ts`), reduzindo risco.
- **Alternativas:** Auth.js (mais robusto, porém mais peso/config); Lucia (bom, mas +dep).
- **A revisar:** ao adicionar OAuth (Google/Spotify), reset de senha ou multiusuário,
  migrar para Auth.js. Não rolar criptografia própria além deste escopo simples.

## 2026-06-15 — D5: Cachê do show é o valor combinado; transações vinculadas são adicionais
- **Decisão:** no P&L (`showProfitAndLoss`), `Show.feeAgreed` é o cachê combinado e as
  transações `income` vinculadas ao show contam como receita ADICIONAL (ex.: merch, bônus),
  não como o próprio cachê. Resultado = cachê + receitas vinculadas − despesas vinculadas.
- **Justificativa:** evita dupla contagem se o usuário lançar o cachê também como transação.
  Mantém o cachê visível mesmo sem nenhum lançamento financeiro.
- **A revisar:** validar com uso real; se confundir usuários, considerar derivar o cachê de
  uma transação "income/cachê" canônica em vez de um campo separado.

## 2026-06-15 — D6: Subir o scaffold para Next.js 16 / React 19 por segurança
- **Decisão:** após o scaffold inicial em Next 14, atualizar para Next 16 + React 19.
- **Justificativa:** `npm audit` apontou vulnerabilidades críticas/altas no Next 14.x sem
  patch na linha 14; a linha mantida e segura é a 16. As mudanças do App Router usadas aqui
  (`params` como Promise, server actions) são compatíveis. Build e testes seguem verdes.
- **Resíduo:** restam 2 avisos *moderate* transitivos (postcss dentro do `next`, build-time)
  sem fix sem quebrar o `next`; aceitável para o MVP. Revisar em atualizações futuras.
