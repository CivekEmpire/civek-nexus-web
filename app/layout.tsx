import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIVEK NEXUS",
  description: "La primera red social que unifica Vida + Negocios + Élite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
