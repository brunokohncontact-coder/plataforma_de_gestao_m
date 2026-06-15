import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

/** Garante que há usuário autenticado; redireciona para /login caso contrário. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
