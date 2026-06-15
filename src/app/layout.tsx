import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palco — gestão de carreira para músicos",
  description:
    "O back-office do artista: agenda de shows, finanças, rentabilidade por show e contatos da indústria — sem planilha.",
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
