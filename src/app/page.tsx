import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Raiz: entra direto no app se logado; senão, para a landing/login.
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
