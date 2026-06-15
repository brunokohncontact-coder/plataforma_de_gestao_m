import { getSessionUserId } from "./auth";

/** Garante que há um usuário autenticado e retorna seu id; lança caso contrário.
 *  Uso em server actions, onde os dados pertencem sempre ao usuário da sessão. */
export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}
