# Personas e Necessidades

> Documento da Fase 0 (Descoberta). Baseado na pesquisa de `market-analysis.md`.
> Cada necessidade é marcada como **[validada]** (corroborada por fontes/observação de
> mercado) ou **[hipótese a confirmar]** (precisa de entrevistas/validação humana).

---

## Persona 1 — Artista independente iniciante ("Camila")
**Perfil:** cantora/compositora solo, 1–3 anos de carreira, toca em bares e eventos
pequenos, lança singles no Spotify via distribuidora. Renda do show é dinheiro/Pix,
sem controle. Usa o bloco de notas do celular e WhatsApp para tudo.

**Dores:**
- Não sabe se um show "valeu a pena" depois de descontar transporte/equipe — **[validada]**
  (renda irregular + finanças deixadas de lado é padrão documentado).
- Perde contato de quem a contratou; não tem histórico de contatos — **[hipótese a confirmar]**.
- Agenda confusa entre WhatsApp, Instagram DMs e memória — **[validada]**.
- Detesta planilha e por isso não controla nada financeiro — **[validada]**.
- Não tem EPK/material organizado para mandar a um contratante — **[hipótese a confirmar]**.

**O que mais ajudaria:** registrar um show em 30s (data, local, cachê), anexar o contato,
e ver no fim do mês quanto entrou/saiu.

---

## Persona 2 — Banda em ascensão ("Os Trânsito")
**Perfil:** banda de 4 integrantes, fazem mini-turnês regionais, têm merch, dividem
receita entre membros, começam a ser procurados por casas maiores e festivais.

**Dores:**
- **Split de receita** entre membros é fonte de atrito; quem pagou a van, quem recebe
  quanto — **[validada]** (gestão de banda + finanças é dor central nos templates de mercado).
- Rentabilidade por turnê (cachês × deslocamento × hospedagem × alimentação) é opaca — **[validada]**.
- Coordenar agenda entre 4 pessoas + técnico + venues — **[hipótese a confirmar]**.
- Aplicar para festivais (estilo Sonicbids) exige EPK e organização de material — **[validada]**.
- Gerir contatos de venues/promoters/imprensa num CRM — **[hipótese a confirmar]**.

**O que mais ajudaria:** visão de turnê com P&L (lucro/prejuízo) e split automático
de receita por membro.

---

## Persona 3 — Músico de sessão / freelancer ("Rafael")
**Perfil:** instrumentista que toca com vários artistas, grava em estúdio, dá aulas.
Múltiplas fontes de renda, vários "clientes" (os artistas/bandas que o contratam).

**Dores:**
- Múltiplos contratantes e cachês a receber; controle de **quem ainda deve** — **[validada]**
  (renda irregular/múltiplas fontes é documentada).
- Conflito de agenda entre compromissos de diferentes artistas — **[hipótese a confirmar]**.
- Emitir/registrar recibos e acompanhar pagamentos pendentes — **[hipótese a confirmar]**.
- Visão consolidada de renda por cliente/fonte para impostos — **[validada]**.

**O que mais ajudaria:** um "contas a receber" simples por contratante + agenda sem conflitos.

---

## Persona 4 — Artista com pequena equipe ("Marina + manager")
**Perfil:** artista em estágio mais avançado com 1 manager/empresário. Operação maior:
contratos formais, riders, fornecedores, calendário de releases + shows.

**Dores:**
- Centralizar **contratos e documentos** (riders, acordos, NDAs) — **[validada]** (lacuna de mercado).
- Manager e artista precisam da **mesma fonte de verdade** (colaboração multiusuário) — **[hipótese a confirmar]**.
- Cruzar calendário de divulgação (releases) com agenda de shows — **[hipótese a confirmar]**.
- Relatórios financeiros para contador — **[validada]**.

**O que mais ajudaria:** workspace compartilhado com agenda, finanças e repositório de contratos.

---

## Síntese — Necessidades transversais (priorizadas)

| # | Necessidade | Personas | Status |
|---|-------------|----------|--------|
| 1 | Agenda operacional de shows (data, local, cachê, status) | Todas | **[validada]** |
| 2 | Controle financeiro: receitas/despesas por show e por mês | Todas | **[validada]** |
| 3 | Rentabilidade por show/turnê (P&L) | 1, 2, 4 | **[validada]** |
| 4 | CRM de contatos da indústria (venues, promoters, contratantes) | Todas | **[hipótese a confirmar]** |
| 5 | Split de receita entre membros | 2 | **[validada]** |
| 6 | Contas a receber (cachês pendentes) | 1, 3, 4 | **[validada]** |
| 7 | Repositório de contratos/documentos | 2, 4 | **[validada]** |
| 8 | EPK / material organizado | 1, 2 | **[hipótese a confirmar]** |
| 9 | Colaboração multiusuário (artista + manager/banda) | 2, 4 | **[hipótese a confirmar]** |

**Conclusão para o MVP:** o núcleo mais consistentemente validado e mal atendido pelo
mercado é **Agenda de shows + Finanças (receitas/despesas) + Rentabilidade por show +
CRM básico de contatos**. Estas viram a base de `mvp-scope.md`.

> ⚠️ Validação humana necessária: as necessidades marcadas como "hipótese" devem ser
> confirmadas com 5–10 entrevistas de músicos reais antes de investir pesado nelas.
