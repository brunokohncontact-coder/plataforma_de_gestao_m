# Palco — Plataforma de Gestão de Carreira para Músicos

Plataforma web para músicos gerirem a carreira: **agenda de shows, finanças,
rentabilidade por show e contatos da indústria** — substituindo planilhas e apps avulsos.

> 🚀 **Status:** v1 (MVP) em desenvolvimento. F1–F5 implementadas (auth, shows,
> finanças, rentabilidade por show, contatos). Veja `PROGRESS.md` para o estado atual.

## Como rodar (desenvolvimento)

```bash
bash scripts/setup.sh   # instala deps, gera Prisma Client e cria o SQLite
npm run db:seed         # (opcional) dados de exemplo — login demo@palco.app / demo1234
npm run dev             # http://localhost:3000
```

Outros comandos:

```bash
npm run build   # build de produção (roda prisma generate + next build)
npm test        # testes da lógica de negócio (Vitest)
```

> O `SessionStart` hook (`.claude/settings.json`) roda `scripts/setup.sh`
> automaticamente em sessões web/remotas, garantindo que build e testes funcionem do zero.

## Stack

- **Next.js (App Router) + TypeScript** — full-stack num só repo (UI + server actions).
- **Prisma + SQLite** em dev (zero dependência externa); schema portável para **PostgreSQL**.
- **Tailwind CSS** — UI responsiva.
- **Vitest** — testes da lógica financeira (P&L por show, agregações, status de recebimento).
- **Zod** — validação de entrada compartilhada.
- Autenticação por sessão própria (cookie HMAC + bcrypt) — ver D4 em `DECISIONS.md`.

## Estrutura

```
prisma/schema.prisma        Modelo: User, Show, Transaction, Contact
src/lib/                    Lógica de negócio pura + testes (finance, money, dates, auth…)
src/app/(auth)/             Login / cadastro
src/app/(app)/              App autenticado: dashboard, shows, finances, contacts
```

## Documentação de estratégia (`docs/`)

- [`market-analysis.md`](docs/market-analysis.md) — concorrentes, lacunas e posicionamento.
- [`personas-and-needs.md`](docs/personas-and-needs.md) — personas e necessidades (validadas/hipóteses).
- [`business-plan.md`](docs/business-plan.md) — proposta de valor, monetização, diferenciais.
- [`mvp-scope.md`](docs/mvp-scope.md) — escopo da v1 e ordem de implementação.

## Decisões

Decisões técnicas e de produto tomadas autonomamente estão em [`DECISIONS.md`](DECISIONS.md)
para revisão humana.
