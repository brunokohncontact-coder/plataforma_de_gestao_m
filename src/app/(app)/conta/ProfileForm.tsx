"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { updateProfileAction, type FormState } from "./actions";

const initial: FormState = {};

export function ProfileForm({
  values,
}: {
  values: { name: string; artistName: string | null };
}) {
  const [state, formAction] = useFormState(updateProfileAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>
      )}

      <div>
        <label className="label" htmlFor="name">
          Nome
        </label>
        <input
          className="input"
          id="name"
          name="name"
          type="text"
          required
          defaultValue={values.name}
        />
      </div>

      <div>
        <label className="label" htmlFor="artistName">
          Nome artístico / da banda <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          className="input"
          id="artistName"
          name="artistName"
          type="text"
          defaultValue={values.artistName ?? ""}
        />
      </div>

      <div className="pt-2">
        <SubmitButton className="btn-primary">Salvar perfil</SubmitButton>
      </div>
    </form>
  );
}
