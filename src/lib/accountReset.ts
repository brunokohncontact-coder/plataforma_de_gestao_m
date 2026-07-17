// Esvaziar a conta ("apagar todos os meus dados"): a operação DESTRUTIVA que
// remove toda a carteira do músico — shows, transações, contatos e metas de
// faturamento —, mantendo a IDENTIDADE da conta (nome, e-mail, senha) e as
// configurações de perfil (nome artístico, alíquota). É a contrapartida do
// backup/restore: como a restauração só grava numa conta VAZIA (para nunca
// sobrescrever/duplicar), este passo é o que destrava a restauração para quem
// já tem dados — e, por si só, um "recomeçar do zero" / direito de apagar os
// próprios dados (LGPD). Ver DECISIONS.md.
//
// Camada PURA: só a frase de confirmação e sua validação. A escrita no banco
// (deleteMany em ordem de chave estrangeira) vive na server action, que é
// testada de ponta a ponta contra o banco.

/**
 * Frase que o usuário precisa digitar para confirmar o apagamento. Um passo
 * deliberado — não um clique acidental — à altura do risco de uma ação
 * irreversível que zera a carteira inteira.
 */
export const RESET_CONFIRMATION_PHRASE = "APAGAR MEUS DADOS";

/**
 * A confirmação digitada bate com a frase exigida?
 *
 * Normaliza de forma tolerante ao acessório sem afrouxar a INTENÇÃO: apara as
 * pontas, colapsa espaços internos e ignora caixa — mas o texto ainda tem de
 * ser exatamente a frase. Um valor ausente/errado nunca autoriza.
 */
export function matchesResetConfirmation(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return normalize(input) === normalize(RESET_CONFIRMATION_PHRASE);
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}
