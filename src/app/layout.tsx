import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sora } from "next/font/google";
import { getLang } from "@/lib/lang-server";
import { LangProvider } from "@/components/LangProvider";

const brandFont = Sora({ subsets: ["latin"], weight: ["700"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: "Clinic Easy",
  applicationName: "Clinic Easy",
  appleWebApp: { capable: true, title: "Clinic Easy", statusBarStyle: "default" },
  description: "Simple clinic management for small clinics",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050b1a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={brandFont.variable}>
      <body className="min-h-screen antialiased">
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
