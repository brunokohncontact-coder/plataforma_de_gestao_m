import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./auth";

/** Garante que há um usuário logado; senão redireciona para /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
