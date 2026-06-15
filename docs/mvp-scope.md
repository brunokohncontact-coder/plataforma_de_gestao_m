# Escopo do MVP (v1)

> Documento da Fase 0 — a ponte para o desenvolvimento (Fase 1+).
> Deriva diretamente das necessidades **validadas** em `personas-and-needs.md`.

## Princípio
Atacar o núcleo mais validado e pior atendido pelo mercado: a **gestão operacional
interna** do artista. Fazer pouco, muito bem, e simples o bastante para quem "odeia
planilha". Tudo o que não for essencial para provar esse valor fica de fora da v1.

## As funcionalidades essenciais da v1

### F1 — Autenticação e workspace do artista
Cadastro/login; cada usuário tem seu workspace. (Multiusuário/manager fica para depois,
mas o modelo de dados já prevê um `workspace`/`user` para não retrabalhar.)
**Por quê:** base para qualquer dado privado. Necessidade transversal.

### F2 — Agenda de shows
CRUD de shows: data/hora, local (venue), cidade, status (proposto / confirmado /
realizado / cancelado), cachê acordado, notas. Visões de lista e calendário.
**Por quê:** Necessidade #1 (validada), comum a todas as personas.

### F3 — Finanças: receitas e despesas
CRUD de transações (receita/despesa), com categoria, data, valor, e **vínculo opcional a
um show**. Dashboard com totais por mês e por categoria. Marcar receita como
**recebida/pendente** (cobre "contas a receber" — Necessidade #6).
**Por quê:** Necessidade #2 e #6 (validadas). Maior lacuna de mercado.

### F4 — Rentabilidade por show
Como F2 + F3 se cruzam: cada show mostra `cachê − despesas vinculadas = resultado`.
Tela do show exibe o P&L; dashboard agrega "lucro por show/mês".
**Por quê:** Necessidade #3 (validada). **Principal diferencial** do produto.

### F5 — CRM básico de contatos
CRUD de contatos da indústria (nome, papel: venue/promoter/contratante/produtor/imprensa,
contato, notas). Vincular contato a shows.
**Por quê:** Necessidade #4 (hipótese forte). Baixo custo, completa o ciclo
"show ↔ dinheiro ↔ pessoa". Marcado para **validar** com usuários.

## Fora do escopo da v1 (e por quê)
- **Split de receita entre membros / multiusuário** — alto custo de modelagem e UX;
  só vale após validar o núcleo. (Fase 2 — Persona 2 e 4.)
- **Repositório de contratos / upload de arquivos** — exige storage + segurança;
  adiar até haver tração. (Fase 2.)
- **EPK / página pública** — concorre com Bandzoogle; não é o diferencial. (Fase 3.)
- **Distribuição / marketing / analytics de streaming** — território de Beatchain/Bandsintown;
  melhor **integrar** depois do que construir. (Fase 3+.)
- **Marketplace de oportunidades de show** — efeito de rede caro; fase de monetização futura.
- **App mobile nativo** — começar responsivo/web; nativo depois.

## Critérios de pronto da v1 (Definition of Done do MVP)
1. Usuário cria conta, registra shows e transações, vincula despesas a shows.
2. Vê rentabilidade por show e um resumo financeiro mensal.
3. Gerencia uma lista de contatos e os associa a shows.
4. App builda, roda e tem testes para a lógica de negócio (cálculo de P&L, agregações
   financeiras, status de recebimento).
5. Responsivo (usável no celular).

## Stack proposta (decisão registrada em DECISIONS.md)
**Next.js (App Router) + TypeScript + Prisma + PostgreSQL + Tailwind.** Justificativa
completa em `DECISIONS.md`. Para desenvolvimento sem dependência de serviço externo,
começar com **SQLite via Prisma** e manter o schema portável para Postgres.

## Ordem de implementação (Fase 1+)
1. Scaffold do projeto + stack + CI básico (build/test).
2. Modelo de dados (Prisma): `User`, `Show`, `Transaction`, `Contact`.
3. Lógica de negócio + testes (P&L por show, agregações financeiras) — **antes da UI**.
4. F1 Auth → F2 Shows → F3 Finanças → F4 Rentabilidade → F5 Contatos.
5. Polimento responsivo + dashboard.
