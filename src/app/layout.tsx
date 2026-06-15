import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palco — Gestão de carreira para músicos",
  description:
    "Agenda de shows, finanças e rentabilidade por show, e contatos da indústria — o back-office da sua carreira musical.",
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
