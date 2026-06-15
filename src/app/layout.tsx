import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palco — Gestão de carreira para músicos",
  description:
    "Agenda de shows, finanças, rentabilidade por show e contatos da indústria, em um só lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
