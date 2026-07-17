"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { matchesResetConfirmation } from "@/lib/accountReset";
import { deleteAccountWallet } from "@/lib/accountWrite";

// Apagar todos os dados da conta (esvaziar a carteira). Ação DESTRUTIVA e
// irreversível: remove shows, transações, contatos e metas de faturamento do
// usuário logado, mantendo a identidade da conta (nome/e-mail/senha) e as
// configurações de perfil. Guardada por uma frase de confirmação digitada.
// Ver DECISIONS.md.

export interface ResetState {
  /** Erros bloqueantes (confirmação incorreta). */
  errors?: string[];
  /** Preenchido no apagamento bem-sucedido — o que foi removido. */
  deleted?: {
    shows: number;
    transactions: number;
    contacts: number;
    revenueGoals: number;
  };
}

/**
 * Esvazia a carteira do usuário logado. Só executa se a frase de confirmação
 * digitada bater exatamente com a exigida — sem ela, nada é apagado.
 */
export async function resetAccountDataAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const user = await requireUser();

  if (!matchesResetConfirmation(formData.get("confirmacao"))) {
    return {
      errors: [
        "Para apagar seus dados, digite a frase de confirmação exatamente como pedida.",
      ],
    };
  }

  // Remove tudo atomicamente, na ordem das chaves estrangeiras (a junção N:N e
  // os eventos do funil dependem dos shows). Escopado por `userId` — nunca toca
  // dados de outra conta. O perfil (identidade + configurações) é preservado.
  // A MESMA remoção é reusada pela substituição de backup (`/conta/dados/importar`).
  const deleted = await prisma.$transaction((tx) =>
    deleteAccountWallet(tx, user.id),
  );

  // Esvaziar a conta mexe em toda a carteira — revalida as áreas afetadas.
  for (const path of [
    "/dashboard",
    "/shows",
    "/financas",
    "/contatos",
    "/conta",
    "/conta/dados/importar",
  ]) {
    revalidatePath(path);
  }

  return { deleted };
}
