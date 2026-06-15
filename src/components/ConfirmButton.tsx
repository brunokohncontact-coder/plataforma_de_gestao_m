"use client";

// Botão de submit com confirmação (para exclusões). Usado dentro de um <form action=...>.
export function ConfirmButton({
  children,
  message = "Tem certeza?",
  className = "btn-danger",
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
