"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import type { ActionResult } from "./actions";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "register" && (
        <div>
          <Label htmlFor="name">Nome (seu ou da banda)</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      )}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Aguarde…"
          : mode === "register"
            ? "Criar conta"
            : "Entrar"}
      </Button>
    </form>
  );
}
