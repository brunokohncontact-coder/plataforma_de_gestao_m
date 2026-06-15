"use client";

type Action = (formData: FormData) => void | Promise<void>;

export function DeleteButton({
  action,
  id,
  label = "Excluir",
  confirmText = "Tem certeza? Esta ação não pode ser desfeita.",
}: {
  action: Action;
  id: string;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-danger py-1.5 text-xs">
        {label}
      </button>
    </form>
  );
}
