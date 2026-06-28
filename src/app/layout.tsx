import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promptoteca GIANT",
  description: "Biblioteca de prompts listos para usar en Enfermedades Infecciosas y Microbiología Clínica.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <AppHeader />
          {children}
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
