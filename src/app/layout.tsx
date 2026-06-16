import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palco — gestão de carreira para músicos",
  description:
    "Agenda de shows, finanças, rentabilidade por show e contatos. O back-office do artista, sem planilha.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
