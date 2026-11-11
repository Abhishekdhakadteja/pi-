import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang } from "@/lib/lang-server";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "ClinicEase",
  description: "Simple clinic management for small clinics",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
