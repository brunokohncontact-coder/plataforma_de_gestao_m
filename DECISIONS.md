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

## 2026-06-15 — D4: Autenticação própria leve em vez de NextAuth/Auth.js
- **Decisão:** implementar autenticação própria — senha com `bcryptjs` + cookie de
  sessão `httpOnly` assinado com HMAC-SHA256 (`AUTH_SECRET`), verificado em tempo
  constante. Ver `src/lib/auth.ts`.
- **Justificativa:** o MVP só precisa de e-mail/senha e sessão simples. Auth.js
  adiciona dependências, configuração de adapter e conceitos (providers, callbacks)
  desproporcionais ao escopo atual; uma implementação enxuta e auditável de ~100 linhas
  cobre o caso de uso e mantém o build leve nas execuções remotas efêmeras.
- **Riscos/limitações:** sem refresh/expiração de sessão sofisticada, sem OAuth, sem
  rotação de segredo nem rate-limiting de login. `AUTH_SECRET` é **obrigatório em
  produção** (há fallback inseguro só para dev/CI).
- **A revisar:** ao adicionar login social, recuperação de senha ou múltiplos
  dispositivos, reavaliar migração para Auth.js. Considerar rate-limiting antes do beta.

## 2026-06-15 — D5: SQLite sem `enum` — status como String validada na aplicação
- **Decisão:** `ShowStatus`, `TransactionType` e `ContactRole` são colunas `String`
  no Prisma (SQLite não suporta `enum`), com valores válidos centralizados em
  `src/lib/enums.ts` e validados por Zod nas server actions.
- **Justificativa:** mantém o desenvolvimento com SQLite (D3) sem serviço externo.
- **A revisar:** ao migrar para PostgreSQL, é possível promover esses campos a `enum`
  nativos do banco para integridade no nível do schema.

## 2026-06-15 — D6: Valores monetários em centavos (Int)
- **Decisão:** todo dinheiro é armazenado e calculado em centavos (inteiro); a
  conversão/formatação BRL ocorre só na borda (UI), em `src/lib/money.ts`.
- **Justificativa:** evita erros de ponto flutuante em somas financeiras — crítico
  para o diferencial do produto (rentabilidade por show).
